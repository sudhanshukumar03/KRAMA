import { goalRepository } from '../repositories/goal.repository';
import { domainEventBus } from '../events/eventBus';
import { runInTransaction } from '../prisma';

export class GoalService {
  async listGoals(workspaceId: string) {
    return goalRepository.findManyByWorkspace(workspaceId);
  }

  async getGoal(id: string, workspaceId: string) {
    const goal = await goalRepository.findById(id);
    if (!goal || goal.deletedAt || goal.workspaceId !== workspaceId) {
      throw new Error('Goal not found');
    }
    return goal;
  }

  async createGoal(data: any, userId: string) {
    return runInTransaction(async (tx) => {
      const { status, ...restData } = data;
      const metadata = status ? { status } : undefined;

      const goal = await goalRepository.create({
        ...restData,
        metadata,
        createdBy: userId,
        updatedBy: userId,
      }, tx);

      domainEventBus.emitEvent('GOAL_CREATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });
  }

  async updateGoal(id: string, workspaceId: string, data: any, userId: string) {
    return runInTransaction(async (tx) => {
      const existing = await goalRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Goal not found');
      }

      if (existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const { version, workspaceId: _, status, metadata: existingMetadata, ...updateData } = data;
      
      const newMetadata = status ? { ...(existingMetadata || {}), status } : existingMetadata;

      const goal = await goalRepository.update(id, {
        ...updateData,
        ...(newMetadata !== undefined ? { metadata: newMetadata } : {}),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      if (updateData.progress !== undefined && updateData.progress !== existing.progress) {
        await tx.goalProgressSnapshot.create({
          data: {
            goalId: goal.id,
            progress: updateData.progress,
            date: new Date(),
          }
        });
      }

      domainEventBus.emitEvent('GOAL_UPDATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });
  }

  async deleteGoal(id: string, workspaceId: string, userId: string) {
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

  async restoreGoal(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx) => {
      const existing = await goalRepository.findById(id, tx);
      if (!existing) throw new Error('Goal not found');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new Error('Conflict: nothing to restore');

      const goal = await goalRepository.update(id, {
        deletedAt: null,
        updatedBy: userId
      }, tx);

      domainEventBus.emitEvent('GOAL_RESTORED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });
  }
}

export const goalService = new GoalService();
