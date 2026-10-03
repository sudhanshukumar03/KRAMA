import { habitRepository } from '../repositories/habit.repository';
import { runInTransaction, type TxClient } from '../prisma';
import { calculateHabitStats, resolveUserTimeZone } from './habitStreak.service';

// Recompute a habit's current + best streak from its full completion history so
// the stored values stay consistent with the authoritative calculation (which
// skips offSchedule logs and breaks on missed scheduled days / weeks) instead
// of a naive increment/decrement that ignores gaps. `timeZone` must match the
// nightly worker's resolution so log-time and recompute agree.
async function computeStreak(
  habit: { scheduledDays: number[]; cadence?: string | null; metadata?: any },
  habitId: string,
  timeZone: string,
  tx: TxClient
): Promise<{ current: number; best: number }> {
  const completions = await tx.habitCompletion.findMany({
    where: { habitId },
    select: { id: true, date: true, offSchedule: true },
  });
  const scheduledDays = habit.scheduledDays && habit.scheduledDays.length > 0
    ? habit.scheduledDays
    : [0, 1, 2, 3, 4, 5, 6];
  return calculateHabitStats(
    { scheduledDays, completions, cadence: habit.cadence, metadata: habit.metadata },
    new Date(),
    timeZone
  );
}

function formatHabit(h: any) {
  if (!h) return h;
  const meta = typeof h.metadata === 'object' && h.metadata ? h.metadata : {};
  return {
    ...h,
    timeOfDay: meta.timeOfDay ?? h.timeOfDay,
    pinnedToPlanner: meta.pinnedToPlanner ?? false,
    weeklyTarget: meta.weeklyTarget ?? undefined,
  };
}

class HabitService {
  async listHabits(workspaceId: string) {
    const habits = await habitRepository.findManyByWorkspace(workspaceId);
    return habits.map(formatHabit);
  }

  async getHabit(id: string, workspaceId: string) {
    const habit = await habitRepository.findById(id);
    if (!habit || habit.deletedAt || habit.workspaceId !== workspaceId) {
      throw new Error('Habit not found');
    }
    return formatHabit(habit);
  }

  async createHabit(data: any, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const { timeOfDay, pinnedToPlanner, weeklyTarget, ...restData } = data;
      const metadata: Record<string, any> = {};
      if (timeOfDay !== undefined) metadata.timeOfDay = timeOfDay;
      if (pinnedToPlanner !== undefined) metadata.pinnedToPlanner = pinnedToPlanner;
      if (weeklyTarget !== undefined) metadata.weeklyTarget = weeklyTarget;

      const habit = await habitRepository.create({
        ...restData,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        createdBy: userId,
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_CREATED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return formatHabit(habit);
    });
  }

  async updateHabit(id: string, workspaceId: string, data: any, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Habit not found');
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const { timeOfDay, pinnedToPlanner, weeklyTarget, version: _version, workspaceId: _, ...restData } = data;
      const existingMeta = typeof existing.metadata === 'object' && existing.metadata ? (existing.metadata as Record<string, any>) : {};
      const metadata = {
        ...existingMeta,
        ...(timeOfDay !== undefined ? { timeOfDay } : {}),
        ...(pinnedToPlanner !== undefined ? { pinnedToPlanner } : {}),
        ...(weeklyTarget !== undefined ? { weeklyTarget } : {}),
      };



      const habit = await habitRepository.update(id, {
        ...restData,
        metadata,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_UPDATED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return formatHabit(habit);
    });
  }

  async deleteHabit(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Habit not found');
      }

      const habit = await habitRepository.update(id, {
        deletedAt: new Date(),
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_DELETED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return habit;
    });
  }

  async logHabitCompletion(
    idOrOptions: string | { id: string; workspaceId: string; userId: string; dateStr?: string; dateIso?: string },
    workspaceIdArg?: string,
    userIdArg?: string,
    dateStrArg?: string,
    dateIsoArg?: string
  ) {
    let id: string;
    let workspaceId: string;
    let userId: string;
    let dateStr: string | undefined;
    let dateIso: string | undefined;

    if (typeof idOrOptions === 'object') {
      id = idOrOptions.id;
      workspaceId = idOrOptions.workspaceId;
      userId = idOrOptions.userId;
      dateStr = idOrOptions.dateStr;
      dateIso = idOrOptions.dateIso;
    } else {
      id = idOrOptions;
      workspaceId = workspaceIdArg!;
      userId = userIdArg!;
      dateStr = dateStrArg;
      dateIso = dateIsoArg;
    }

    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Habit not found');
      }

      let now = new Date();
      if (dateIso) now = new Date(dateIso);
      else if (dateStr) now = new Date(dateStr);

      const dateKeyStr = now.toISOString().split('T')[0];
      const targetDate = new Date(`${dateKeyStr}T12:00:00.000Z`);

      const scheduled = existing.scheduledDays && existing.scheduledDays.length > 0
        ? existing.scheduledDays
        : [0, 1, 2, 3, 4, 5, 6];

      // Weekly habits are loggable on any day of the week (the target is N
      // completions/week, not per-day), so a weekly completion is never
      // off-schedule regardless of scheduledDays. Only daily habits gate on the
      // scheduled weekday. Without this, a daily habit edited into a weekly one
      // keeps its restricted scheduledDays and its off-day logs get silently
      // dropped from the weekly target/streak.
      const offSchedule = existing.cadence === 'weekly'
        ? false
        : !scheduled.includes(targetDate.getUTCDay());

      const completionsToday = await habitRepository.getCompletionCountToday(id, userId, targetDate, tx);
      if (completionsToday > 0) {
        throw new Error('Habit already logged for today');
      }

      await habitRepository.addCompletion({
        habitId: id,
        userId,
        date: targetDate,
        completedAt: new Date(),
        offSchedule,
      }, tx);

      // Recompute current + best streak from full history rather than blindly
      // incrementing. Resolve the user's timezone the same way the nightly
      // worker does so log-time and recompute agree (A1).
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { metadata: true, countryCode: true },
      });
      const timeZone = resolveUserTimeZone(user);
      const { current, best } = await computeStreak(existing, id, timeZone, tx);
      const updatedHabit = await habitRepository.update(id, {
        streak: current,
        bestStreak: best,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_LOGGED', { habitId: id, workspaceId, streak: updatedHabit.streak });
      return updatedHabit;
    });
  }

  async unlogHabitCompletion(
    idOrOptions: string | { id: string; workspaceId: string; userId: string; dateStr?: string; dateIso?: string },
    workspaceIdArg?: string,
    userIdArg?: string,
    dateStrArg?: string,
    dateIsoArg?: string
  ) {
    let id: string;
    let workspaceId: string;
    let userId: string;
    let dateStr: string | undefined;
    let dateIso: string | undefined;

    if (typeof idOrOptions === 'object') {
      id = idOrOptions.id;
      workspaceId = idOrOptions.workspaceId;
      userId = idOrOptions.userId;
      dateStr = idOrOptions.dateStr;
      dateIso = idOrOptions.dateIso;
    } else {
      id = idOrOptions;
      workspaceId = workspaceIdArg!;
      userId = userIdArg!;
      dateStr = dateStrArg;
      dateIso = dateIsoArg;
    }

    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Habit not found');
      }

      let now = new Date();
      if (dateIso) now = new Date(dateIso);
      else if (dateStr) now = new Date(dateStr);

      const dateKeyStr = now.toISOString().split('T')[0];
      const targetDate = new Date(`${dateKeyStr}T12:00:00.000Z`);

      const completionsToday = await habitRepository.getCompletionCountToday(id, userId, targetDate, tx);
      if (completionsToday === 0) {
        throw new Error('Habit not logged for today');
      }

      await habitRepository.removeCompletionToday(id, userId, targetDate, tx);

      // Recompute current + best streak from remaining history rather than
      // blindly decrementing. Resolve tz identically to the nightly worker (A1).
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { metadata: true, countryCode: true },
      });
      const timeZone = resolveUserTimeZone(user);
      const { current, best } = await computeStreak(existing, id, timeZone, tx);

      const updatedHabit = await habitRepository.update(id, {
        streak: current,
        bestStreak: best,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_UNLOGGED', { habitId: id, workspaceId, streak: updatedHabit.streak });
      return updatedHabit;
    });
  }

  async getStreak(id: string, workspaceId: string) {
    const habit = await this.getHabit(id, workspaceId);
    return { streak: habit.streak };
  }

  async restoreHabit(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing) throw new Error('Habit not found');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new Error('Conflict: nothing to restore');

      const habit = await habitRepository.update(id, {
        deletedAt: null,
        updatedBy: userId
      }, tx);

      publishAfterCommit('HABIT_RESTORED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return habit;
    });
  }
}

export const habitService = new HabitService();
