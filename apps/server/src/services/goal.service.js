import { goalRepository } from '../repositories/goal.repository';
import { domainEventBus } from '../events/eventBus';
import { runInTransaction } from '../prisma';
export class GoalService {
    async listGoals(workspaceId) {
        return goalRepository.findManyByWorkspace(workspaceId);
    }
    async getGoal(id, workspaceId) {
        const goal = await goalRepository.findById(id);
        if (!goal || goal.deletedAt || goal.workspaceId !== workspaceId) {
            throw new Error('Goal not found');
        }
        return goal;
    }
    async createGoal(data, userId) {
        return runInTransaction(async (tx) => {
            const goal = await goalRepository.create({
                ...data,
                createdBy: userId,
                updatedBy: userId,
            }, tx);
            domainEventBus.emitEvent('GOAL_CREATED', { goalId: goal.id, workspaceId: goal.workspaceId });
            return goal;
        });
    }
    async updateGoal(id, workspaceId, data, userId) {
        return runInTransaction(async (tx) => {
            const existing = await goalRepository.findById(id, tx);
            if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
                throw new Error('Goal not found');
            }
            if (existing.version !== data.version) {
                throw new Error('Conflict: version mismatch');
            }
            const { version, workspaceId: _, ...updateData } = data;
            const goal = await goalRepository.update(id, {
                ...updateData,
                version: { increment: 1 },
                updatedBy: userId,
            }, tx);
            domainEventBus.emitEvent('GOAL_UPDATED', { goalId: goal.id, workspaceId: goal.workspaceId });
            return goal;
        });
    }
    async deleteGoal(id, workspaceId, userId) {
        return runInTransaction(async (tx) => {
            const existing = await goalRepository.findById(id, tx);
            if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
                throw new Error('Goal not found');
            }
            const goal = await goalRepository.update(id, {
                deletedAt: new Date(),
                updatedBy: userId,
            }, tx);
            domainEventBus.emitEvent('GOAL_DELETED', { goalId: goal.id, workspaceId: goal.workspaceId });
            return goal;
        });
    }
}
export const goalService = new GoalService();
//# sourceMappingURL=goal.service.js.map