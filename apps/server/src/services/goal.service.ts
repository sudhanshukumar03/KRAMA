import { goalRepository } from '../repositories/goal.repository';
import { runInTransaction } from '../prisma';
import type { Prisma } from '@prisma/client';

/** Fields accepted when creating a goal. `createdBy`/`updatedBy` are injected by the service. */
type CreateGoalDto = Omit<Prisma.GoalUncheckedCreateInput, 'createdBy' | 'updatedBy' | 'metadata'> & {
  status?: string;
};

/**
 * Fields accepted when updating a goal.
 * - `version` is used for optimistic-lock checking (not written directly).
 * - `workspaceId` is stripped before the update query.
 * - `status` is merged into the JSON `metadata` column.
 */
type UpdateGoalDto = Partial<Omit<Prisma.GoalUncheckedUpdateInput, 'updatedBy' | 'version' | 'metadata'>> & {
  version?: number;
  workspaceId?: string;
  status?: string;
  metadata?: Prisma.InputJsonValue;
  progress?: number;
};

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

  async createGoal(data: CreateGoalDto, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const { status, ...restData } = data;
      const metadata = status ? { status } : undefined;

      const goal = await goalRepository.create({
        ...restData,
        metadata,
        createdBy: userId,
        updatedBy: userId,
      }, tx);

      // Record initial baseline progress snapshot (upsert for idempotency)
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const existingSnap = await tx.goalProgressSnapshot.findFirst({
        where: { goalId: goal.id, date: { gte: todayStart, lte: todayEnd } }
      });
      if (!existingSnap) {
        await tx.goalProgressSnapshot.create({
          data: {
            goalId: goal.id,
            progress: restData.progress !== undefined ? Number(restData.progress) : 0,
            date: new Date(),
          }
        });
      }

      publishAfterCommit('GOAL_CREATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });
  }

  async updateGoal(id: string, workspaceId: string, data: UpdateGoalDto, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await goalRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Goal not found');
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const { version, workspaceId: _, status, metadata: existingMetadata, ...updateData } = data;

      const metadataBase: Record<string, unknown> =
        (typeof existingMetadata === 'object' && existingMetadata !== null && !Array.isArray(existingMetadata))
          ? (existingMetadata as Record<string, unknown>)
          : {};
      const newMetadata: Prisma.InputJsonValue | undefined = status
        ? { ...metadataBase, status }
        : existingMetadata;

      const goal = await goalRepository.update(id, {
        ...(updateData as Prisma.GoalUncheckedUpdateInput),
        ...(newMetadata !== undefined ? { metadata: newMetadata } : {}),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      // Bug #2 fix: upsert today's snapshot instead of blindly inserting (prevents same-day duplicates)
      if (updateData.progress !== undefined && updateData.progress !== existing.progress) {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        const existingSnap = await tx.goalProgressSnapshot.findFirst({
          where: { goalId: goal.id, date: { gte: todayStart, lte: todayEnd } }
        });

        if (existingSnap) {
          await tx.goalProgressSnapshot.update({
            where: { id: existingSnap.id },
            data: { progress: updateData.progress }
          });
        } else {
          await tx.goalProgressSnapshot.create({
            data: { goalId: goal.id, progress: updateData.progress, date: new Date() }
          });
        }

        // Feature #1: Auto-rollup — if this is a KR (has parent), recompute parent's progress
        if (existing.parentGoalId) {
          await this.recalculateParentRollup(existing.parentGoalId, userId, tx);
        }
      }

      publishAfterCommit('GOAL_UPDATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });
  }

  private async recalculateParentRollup(parentGoalId: string, userId: string, tx: Prisma.TransactionClient) {
    const siblings = await tx.goal.findMany({
      where: { parentGoalId, deletedAt: null },
      select: { progress: true }
    });

    const avgProgress = siblings.length > 0
      ? Math.round(siblings.reduce((sum: number, s: { progress: number }) => sum + s.progress, 0) / siblings.length)
      : 0;

    await tx.goal.update({
      where: { id: parentGoalId },
      data: {
        progress: avgProgress,
        updatedBy: userId,
        version: { increment: 1 },
      }
    });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const parentSnapToday = await tx.goalProgressSnapshot.findFirst({
      where: { goalId: parentGoalId, date: { gte: todayStart, lte: todayEnd } }
    });
    if (parentSnapToday) {
      await tx.goalProgressSnapshot.update({
        where: { id: parentSnapToday.id },
        data: { progress: avgProgress }
      });
    } else {
      await tx.goalProgressSnapshot.create({
        data: { goalId: parentGoalId, progress: avgProgress, date: new Date() }
      });
    }
  }

  async deleteGoal(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await goalRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Goal not found');
      }

      // Bug #4 fix: recursively soft-delete all child goals in the same transaction
      await tx.goal.updateMany({
        where: { parentGoalId: id, deletedAt: null },
        data: { deletedAt: new Date(), updatedBy: userId },
      });

      // Also cascade one level deeper (grandchildren)
      const childIds = (await tx.goal.findMany({
        where: { parentGoalId: id },
        select: { id: true }
      })).map((c: { id: string }) => c.id);

      if (childIds.length > 0) {
        await tx.goal.updateMany({
          where: { parentGoalId: { in: childIds }, deletedAt: null },
          data: { deletedAt: new Date(), updatedBy: userId },
        });
      }

      const goal = await goalRepository.update(id, {
        deletedAt: new Date(),
        updatedBy: userId,
      }, tx);

      if (existing.parentGoalId) {
        await this.recalculateParentRollup(existing.parentGoalId, userId, tx);
      }

      publishAfterCommit('GOAL_DELETED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });
  }

  async restoreGoal(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await goalRepository.findById(id, tx);
      if (!existing) throw new Error('Goal not found');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new Error('Conflict: nothing to restore');

      const goal = await goalRepository.update(id, {
        deletedAt: null,
        updatedBy: userId
      }, tx);

      if (existing.parentGoalId) {
        await this.recalculateParentRollup(existing.parentGoalId, userId, tx);
      }

      publishAfterCommit('GOAL_RESTORED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });
  }
}

export const goalService = new GoalService();
