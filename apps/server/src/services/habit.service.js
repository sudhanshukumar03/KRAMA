import { habitRepository } from '../repositories/habit.repository';
import { domainEventBus } from '../events/eventBus';
import { runInTransaction } from '../prisma';
export class HabitService {
    async listHabits(workspaceId) {
        return habitRepository.findManyByWorkspace(workspaceId);
    }
    async getHabit(id, workspaceId) {
        const habit = await habitRepository.findById(id);
        if (!habit || habit.deletedAt || habit.workspaceId !== workspaceId) {
            throw new Error('Habit not found');
        }
        return habit;
    }
    async createHabit(data, userId) {
        return runInTransaction(async (tx) => {
            const habit = await habitRepository.create({
                ...data,
                createdBy: userId,
                updatedBy: userId,
            }, tx);
            domainEventBus.emitEvent('HABIT_CREATED', { habitId: habit.id, workspaceId: habit.workspaceId });
            return habit;
        });
    }
    async updateHabit(id, workspaceId, data, userId) {
        return runInTransaction(async (tx) => {
            const existing = await habitRepository.findById(id, tx);
            if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
                throw new Error('Habit not found');
            }
            if (existing.version !== data.version) {
                throw new Error('Conflict: version mismatch');
            }
            const { version, workspaceId: _, ...updateData } = data;
            const habit = await habitRepository.update(id, {
                ...updateData,
                version: { increment: 1 },
                updatedBy: userId,
            }, tx);
            domainEventBus.emitEvent('HABIT_UPDATED', { habitId: habit.id, workspaceId: habit.workspaceId });
            return habit;
        });
    }
    async deleteHabit(id, workspaceId, userId) {
        return runInTransaction(async (tx) => {
            const existing = await habitRepository.findById(id, tx);
            if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
                throw new Error('Habit not found');
            }
            const habit = await habitRepository.update(id, {
                deletedAt: new Date(),
                updatedBy: userId,
            }, tx);
            domainEventBus.emitEvent('HABIT_DELETED', { habitId: habit.id, workspaceId: habit.workspaceId });
            return habit;
        });
    }
    async logHabitCompletion(id, workspaceId, userId) {
        return runInTransaction(async (tx) => {
            const existing = await habitRepository.findById(id, tx);
            if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
                throw new Error('Habit not found');
            }
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const completionsToday = await habitRepository.getCompletionCountToday(id, todayStart, todayEnd, tx);
            if (completionsToday > 0) {
                throw new Error('Habit already logged for today');
            }
            await habitRepository.addCompletion({
                habitId: id,
                userId,
                completedAt: now,
            }, tx);
            // Increment streak
            const updatedHabit = await habitRepository.update(id, {
                streak: { increment: 1 },
                version: { increment: 1 },
                updatedBy: userId,
            }, tx);
            domainEventBus.emitEvent('HABIT_LOGGED', { habitId: id, workspaceId, streak: updatedHabit.streak });
            return updatedHabit;
        });
    }
}
export const habitService = new HabitService();
//# sourceMappingURL=habit.service.js.map