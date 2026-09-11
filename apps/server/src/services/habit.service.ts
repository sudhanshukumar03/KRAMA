import { SkillService } from './skill.service';
import { habitRepository } from '../repositories/habit.repository';
import { runInTransaction } from '../prisma';

function formatHabit(h: any) {
  if (!h) return h;
  const meta = typeof h.metadata === 'object' && h.metadata ? h.metadata : {};
  return {
    ...h,
    timeOfDay: meta.timeOfDay ?? h.timeOfDay,
    pinnedToPlanner: meta.pinnedToPlanner ?? false,
  };
}

export class HabitService {
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
      const { timeOfDay, pinnedToPlanner, ...restData } = data;
      const metadata: Record<string, any> = {};
      if (timeOfDay !== undefined) metadata.timeOfDay = timeOfDay;
      if (pinnedToPlanner !== undefined) metadata.pinnedToPlanner = pinnedToPlanner;

      
      if (data.skillIds !== undefined) {
        await SkillService.validateSkillLinking(userId, data.workspaceId, data.skillIds);
        const ids = data.skillIds;
        delete data.skillIds;
        (data as any).skills = { connect: ids.map((id: string) => ({ id })) };
      }

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

      const { timeOfDay, pinnedToPlanner, version, workspaceId: _, ...restData } = data;
      const existingMeta = typeof existing.metadata === 'object' && existing.metadata ? (existing.metadata as Record<string, any>) : {};
      const metadata = {
        ...existingMeta,
        ...(timeOfDay !== undefined ? { timeOfDay } : {}),
        ...(pinnedToPlanner !== undefined ? { pinnedToPlanner } : {}),
      };

      
      if (data.skillIds !== undefined) {
        await SkillService.validateSkillLinking(userId, workspaceId, data.skillIds);
        const ids = data.skillIds;
        delete data.skillIds;
        (data as any).skills = { set: ids.map((id: string) => ({ id })) };
      }

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

      const habit = await habitRepository.delete(id, tx);
      // We also update the 'updatedBy' to trace who archived it
      await habitRepository.update(id, { updatedBy: userId }, tx);

      publishAfterCommit('HABIT_DELETED', { habitId: habit.id, workspaceId: habit.workspaceId });
      return habit;
    });
  }

  async logHabitCompletion(id: string, workspaceId: string, userId: string, dateStr?: string, dateIso?: string) {
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

      const offSchedule = !scheduled.includes(targetDate.getUTCDay());
      if (offSchedule) {
        throw new Error('Habit not scheduled for today');
      }

      const completionsToday = await habitRepository.getCompletionCountToday(id, targetDate, tx);
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

      // Increment streak
      const updatedHabit = await habitRepository.update(id, {
        streak: { increment: 1 },
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      publishAfterCommit('HABIT_LOGGED', { habitId: id, workspaceId, streak: updatedHabit.streak });
      return updatedHabit;
    });
  }

  async unlogHabitCompletion(id: string, workspaceId: string, userId: string, dateStr?: string, dateIso?: string) {
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

      const completionsToday = await habitRepository.getCompletionCountToday(id, targetDate, tx);
      if (completionsToday === 0) {
        throw new Error('Habit not logged for today');
      }

      await habitRepository.removeCompletionToday(id, targetDate, tx);

      // Decrement streak, but don't let it go below 0
      const newStreak = Math.max(0, existing.streak - completionsToday);

      const updatedHabit = await habitRepository.update(id, {
        streak: newStreak,
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
