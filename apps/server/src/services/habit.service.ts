import { AppError } from '../utils/errors';
import { habitRepository } from '../repositories/habit.repository';
import { prisma, runInTransaction, type TxClient } from '../prisma';
import { calculateHabitStats, resolveUserTimeZone, getUserLocalDateStr } from './habitStreak.service';
import { habitCompletionUnavailableReason } from './habitCompletionDate';
import { rememberUserTimeZone } from './userTimeZone.service';
import { readPersonalHabits } from './habitRead.service';

// Recompute a habit's current + best streak from its full completion history so
// the stored values stay consistent with the authoritative calculation (which
// skips offSchedule logs and breaks on missed scheduled days / weeks) instead
// of a naive increment/decrement that ignores gaps. `timeZone` must match the
// nightly worker's resolution so log-time and recompute agree.
async function computeStreak(
  habit: { scheduledDays: number[]; cadence?: string | null; metadata?: any },
  habitId: string,
  timeZone: string,
  tx: TxClient,
  userId: string
): Promise<{ current: number; best: number }> {
  const completions = await tx.habitCompletion.findMany({
    where: { habitId, userId },
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
  private async validateGoal(goalId: string | null | undefined, workspaceId: string, tx: TxClient) {
    if (goalId && !await tx.goal.findFirst({ where: { id: goalId, workspaceId, deletedAt: null }, select: { id: true } })) throw new AppError('Invalid linked goal', 400, 'INVALID_HABIT_INPUT');
  }

  async listHabits(workspaceId: string, userId?: string, requestedZone?: string, view: 'full' | 'tracker' = 'full') {
    if (userId) return (await readPersonalHabits(workspaceId, userId, requestedZone, view)).map(formatHabit);
    const habits = await habitRepository.findManyByWorkspace(workspaceId, undefined, userId);
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } }) : null;
    return habits.map(h => {
      const completions = (h as any).completions || [];
      const stats = calculateHabitStats({ ...h, completions }, new Date(), resolveUserTimeZone(user, requestedZone));
      return formatHabit({ ...h, streak: stats.current, bestStreak: stats.best, completions: completions.slice(0, 120) });
    });
  }

  async getHabit(id: string, workspaceId: string, userId?: string, requestedZone?: string) {
    const habit = await habitRepository.findById(id, undefined, userId);
    if (!habit || habit.deletedAt || habit.workspaceId !== workspaceId) {
      throw new AppError('Habit not found', 404, 'NOT_FOUND');
    }
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } }) : null;
    const stats = calculateHabitStats({ ...habit, completions: (habit as any).completions || [] }, new Date(), resolveUserTimeZone(user, requestedZone));
    return formatHabit({ ...habit, streak: stats.current, bestStreak: stats.best, completions: (habit as any).completions?.slice(0, 120) });
  }

  async createHabit(data: any, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const { timeOfDay, pinnedToPlanner, weeklyTarget, metadata: incomingMetadata, ...restData } = data;
      await this.validateGoal(restData.linkedGoalId, restData.workspaceId, tx);
      const metadata: Record<string, any> = typeof incomingMetadata === "object" && incomingMetadata && !Array.isArray(incomingMetadata) ? { ...incomingMetadata } : {};
      delete metadata.streakUserId; // Snapshot ownership is set only by Log/Undo.
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
        throw new AppError('Habit not found', 404, 'NOT_FOUND');
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw new AppError('Conflict: version mismatch', 409, 'CONFLICT');
      }

      await this.validateGoal(data.linkedGoalId === undefined ? existing.linkedGoalId : data.linkedGoalId, workspaceId, tx);
      const { timeOfDay, pinnedToPlanner, weeklyTarget, version: _version, workspaceId: _, metadata: incomingMetadata, ...restData } = data;
      const existingMeta = typeof existing.metadata === 'object' && existing.metadata ? (existing.metadata as Record<string, any>) : {};
      const metadata = {
        ...existingMeta,
        ...(typeof incomingMetadata === "object" && incomingMetadata && !Array.isArray(incomingMetadata) ? incomingMetadata : {}),
        ...(timeOfDay !== undefined ? { timeOfDay } : {}),
        ...(pinnedToPlanner !== undefined ? { pinnedToPlanner } : {}),
        ...(weeklyTarget !== undefined ? { weeklyTarget } : {}),
      };



      delete metadata.goalUndo;
      if (data.linkedGoalId === undefined && existingMeta.goalUndo) metadata.goalUndo = existingMeta.goalUndo;
      delete metadata.streakUserId;
      if (typeof existingMeta.streakUserId === 'string') metadata.streakUserId = existingMeta.streakUserId;
      const habit = await habitRepository.update(id, {
        ...restData,
        metadata,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx, { id, workspaceId, deletedAt: null, version: existing.version });

      publishAfterCommit('HABIT_UPDATED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return formatHabit(habit);
    });
  }

  async deleteHabit(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new AppError('Habit not found', 404, 'NOT_FOUND');
      }

      const habit = await habitRepository.update(id, {
        deletedAt: new Date(),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_DELETED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return habit;
    });
  }

  async logHabitCompletion(
    idOrOptions: string | { id: string; workspaceId: string; userId: string; dateStr?: string; dateIso?: string; timeZone?: string },
    workspaceIdArg?: string,
    userIdArg?: string,
    dateStrArg?: string,
    dateIsoArg?: string,
    timeZoneArg?: string,
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

    const requestedZone = typeof idOrOptions === 'object' ? idOrOptions.timeZone : timeZoneArg;
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw Object.assign(new AppError('Habit not found', 404, 'NOT_FOUND'), { statusCode: 404 });
      }

      // Lock the habit row before checking completion history. Concurrent Log/Undo
      // requests must recompute streaks in order, even though this lock leaves version unchanged.
      const lockedHabit = await tx.habit.update({ where: { id, workspaceId, deletedAt: null }, data: { version: { increment: 0 } } });
      const dateUser = await tx.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
      const dateKeyStr = dateStr || (dateIso ? new Date(dateIso).toISOString().slice(0, 10) : getUserLocalDateStr(new Date(), resolveUserTimeZone(dateUser, requestedZone)));
      const targetDate = new Date(`${dateKeyStr}T12:00:00.000Z`);
      if (Number.isNaN(targetDate.getTime()) || targetDate.toISOString().slice(0, 10) !== dateKeyStr || (dateStr && dateIso && new Date(dateIso).toISOString().slice(0, 10) !== dateStr)) throw Object.assign(new Error('Invalid completion date'), { statusCode: 400 });

      const unavailableReason = habitCompletionUnavailableReason(existing.createdAt, dateKeyStr, new Date(), resolveUserTimeZone(dateUser, requestedZone));
      if (unavailableReason === 'before_creation') throw Object.assign(new Error('Invalid completion date: this habit had not been created yet.'), { statusCode: 400 });
      if (unavailableReason === 'future') throw Object.assign(new Error('Invalid completion date: future days cannot be completed.'), { statusCode: 400 });

      const scheduled = lockedHabit.scheduledDays && lockedHabit.scheduledDays.length > 0
        ? lockedHabit.scheduledDays
        : [0, 1, 2, 3, 4, 5, 6];

      // Weekly habits are loggable on any day of the week (the target is N
      // completions/week, not per-day), so a weekly completion is never
      // off-schedule regardless of scheduledDays. Only daily habits gate on the
      // scheduled weekday. Without this, a daily habit edited into a weekly one
      // keeps its restricted scheduledDays and its off-day logs get silently
      // dropped from the weekly target/streak.
      const offSchedule = lockedHabit.cadence === 'weekly'
        ? false
        : !scheduled.includes(targetDate.getUTCDay());

      const completionsToday = await habitRepository.getCompletionCountToday(id, userId, targetDate, tx);
      if (completionsToday > 0) {
        throw Object.assign(new Error('Habit already logged for today'), { statusCode: 400 });
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
      const timeZone = resolveUserTimeZone(user, requestedZone);
      await rememberUserTimeZone(userId, requestedZone, tx);
      const { current, best } = await computeStreak(lockedHabit, id, timeZone, tx, userId);
      const updatedHabit = await habitRepository.update(id, {
        streak: current,
        bestStreak: best,
        metadata: { ...(typeof lockedHabit.metadata === 'object' && lockedHabit.metadata ? lockedHabit.metadata : {}), streakUserId: userId },
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_LOGGED', { habitId: id, workspaceId, streak: updatedHabit.streak });
      return updatedHabit;
    });
  }

  async unlogHabitCompletion(
    idOrOptions: string | { id: string; workspaceId: string; userId: string; dateStr?: string; dateIso?: string; timeZone?: string },
    workspaceIdArg?: string,
    userIdArg?: string,
    dateStrArg?: string,
    dateIsoArg?: string,
    timeZoneArg?: string,
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

    const requestedZone = typeof idOrOptions === 'object' ? idOrOptions.timeZone : timeZoneArg;
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw Object.assign(new AppError('Habit not found', 404, 'NOT_FOUND'), { statusCode: 404 });
      }

      // Lock the habit row before checking completion history. Concurrent Log/Undo
      // requests must recompute streaks in order, even though this lock leaves version unchanged.
      const lockedHabit = await tx.habit.update({ where: { id, workspaceId, deletedAt: null }, data: { version: { increment: 0 } } });
      const dateUser = await tx.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
      const dateKeyStr = dateStr || (dateIso ? new Date(dateIso).toISOString().slice(0, 10) : getUserLocalDateStr(new Date(), resolveUserTimeZone(dateUser, requestedZone)));
      const targetDate = new Date(`${dateKeyStr}T12:00:00.000Z`);
      if (Number.isNaN(targetDate.getTime()) || targetDate.toISOString().slice(0, 10) !== dateKeyStr || (dateStr && dateIso && new Date(dateIso).toISOString().slice(0, 10) !== dateStr)) throw Object.assign(new Error('Invalid completion date'), { statusCode: 400 });

      const completionsToday = await habitRepository.getCompletionCountToday(id, userId, targetDate, tx);
      if (completionsToday === 0) {
        throw Object.assign(new Error('Habit not logged for today'), { statusCode: 400 });
      }

      await habitRepository.removeCompletionToday(id, userId, targetDate, tx);

      // Recompute current + best streak from remaining history rather than
      // blindly decrementing. Resolve tz identically to the nightly worker (A1).
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { metadata: true, countryCode: true },
      });
      const timeZone = resolveUserTimeZone(user, requestedZone);
      await rememberUserTimeZone(userId, requestedZone, tx);
      const { current, best } = await computeStreak(lockedHabit, id, timeZone, tx, userId);

      const updatedHabit = await habitRepository.update(id, {
        streak: current,
        bestStreak: best,
        metadata: { ...(typeof lockedHabit.metadata === 'object' && lockedHabit.metadata ? lockedHabit.metadata : {}), streakUserId: userId },
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_UNLOGGED', { habitId: id, workspaceId, streak: updatedHabit.streak });
      return updatedHabit;
    });
  }

  async getStreak(id: string, workspaceId: string, userId?: string, requestedZone?: string) {
    const habit = await this.getHabit(id, workspaceId, userId, requestedZone);
    return { streak: habit.streak };
  }

  async restoreHabit(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await habitRepository.findById(id, tx);
      if (!existing) throw new AppError('Habit not found', 404, 'NOT_FOUND');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new AppError('Conflict: nothing to restore', 409, 'CONFLICT');

      const habit = await habitRepository.update(id, {
        deletedAt: null,
        version: { increment: 1 },
        updatedBy: userId
      }, tx);

      publishAfterCommit('HABIT_RESTORED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return habit;
    });
  }
}

export const habitService = new HabitService();
