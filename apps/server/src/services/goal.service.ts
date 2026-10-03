import { goalRepository } from '../repositories/goal.repository';
import { runInTransaction, type TxClient } from '../prisma';
import type { Prisma } from '@prisma/client';
import { redisService } from './redis.service';

/** Coerce an unknown JSON value into a plain object (metadata is `Json?`). */
const toRecord = (v: unknown): Record<string, unknown> =>
  (typeof v === 'object' && v !== null && !Array.isArray(v)) ? (v as Record<string, unknown>) : {};

/** KR weight for the weighted rollup — a positive number in `metadata.weight`, else 1. */
const weightOf = (metadata: unknown): number => {
  const w = Number(toRecord(metadata).weight);
  return Number.isFinite(w) && w > 0 ? w : 1;
};

/**
 * Auto-progress metric: DONE / (tasks excluding CANCELED), as a rounded 0-100 percent.
 * Returns 0 when there are no countable tasks. Pure — unit-tested independently of the DB.
 */
export function computeAutoProgress(tasks: Array<{ status: string }>): number {
  const relevant = tasks.filter((t) => t.status !== 'CANCELED');
  const total = relevant.length;
  if (total === 0) return 0;
  const done = relevant.filter((t) => t.status === 'DONE').length;
  return Math.round((done / total) * 100);
}

/**
 * Weighted rollup: Σ(progress·weight) / Σ(weight), default weight 1 (→ plain average).
 * Returns 0 for no siblings. Pure — unit-tested independently of the DB.
 */
export function computeWeightedRollup(siblings: Array<{ progress: number; metadata: unknown }>): number {
  if (siblings.length === 0) return 0;
  const totalWeight = siblings.reduce((sum, s) => sum + weightOf(s.metadata), 0) || 1;
  return Math.round(
    siblings.reduce((sum, s) => sum + s.progress * weightOf(s.metadata), 0) / totalWeight
  );
}

/** Fields accepted when creating a goal. `createdBy`/`updatedBy` are injected by the service. */
type CreateGoalDto = Omit<Prisma.GoalUncheckedCreateInput, 'createdBy' | 'updatedBy' | 'metadata'> & {
  status?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Fields accepted when updating a goal.
 * - `version` is used for optimistic-lock checking (not written directly).
 * - `workspaceId` is stripped before the update query.
 * - `status` is merged into the JSON `metadata` column.
 * - `note` is a transient per-update check-in note written onto today's snapshot
 *   (not persisted on the goal itself).
 */
type UpdateGoalDto = Partial<Omit<Prisma.GoalUncheckedUpdateInput, 'updatedBy' | 'version' | 'metadata'>> & {
  version?: number;
  workspaceId?: string;
  status?: string;
  metadata?: Prisma.InputJsonValue;
  progress?: number;
  note?: string;
};

class GoalService {
  private getCacheKey(workspaceId: string, lite = false): string {
    return lite ? `goals:workspace:lite:${workspaceId}` : `goals:workspace:${workspaceId}`;
  }

  async invalidateGoalCache(workspaceId: string): Promise<void> {
    try {
      await Promise.all([
        redisService.del(`goals:workspace:${workspaceId}`),
        redisService.del(`goals:workspace:lite:${workspaceId}`),
      ]);
    } catch {
      // Invalidation errors should not fail caller
    }
  }

  async listGoals(workspaceId: string) {
    const cacheKey = this.getCacheKey(workspaceId, false);
    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Cache miss or error, query DB
    }

    const goals = await goalRepository.findManyByWorkspace(workspaceId);
    try {
      await redisService.set(cacheKey, JSON.stringify(goals), 60); // 60s TTL
    } catch {}
    return goals;
  }

  async listGoalsLite(workspaceId: string) {
    const cacheKey = this.getCacheKey(workspaceId, true);
    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Cache miss or error, query DB
    }

    const goals = await goalRepository.findManyLiteByWorkspace(workspaceId);
    try {
      await redisService.set(cacheKey, JSON.stringify(goals), 60); // 60s TTL
    } catch {}
    return goals;
  }

  async getGoal(id: string, workspaceId: string) {
    const goal = await goalRepository.findById(id);
    if (!goal || goal.deletedAt || goal.workspaceId !== workspaceId) {
      throw new Error('Goal not found');
    }
    return goal;
  }

  async createGoal(data: CreateGoalDto, userId: string) {
    const createdGoal = await runInTransaction(async (tx, publishAfterCommit) => {
      const { status, metadata: incomingMetadata, ...restData } = data;
      // Preserve caller-supplied metadata (measurable-KR fields, progressMode, color)
      // instead of discarding everything but status.
      const merged = { ...toRecord(incomingMetadata), ...(status ? { status } : {}) };
      const metadata = Object.keys(merged).length > 0 ? merged : undefined;

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

      // If this goal is a child (Key Result under an Objective), roll its initial
      // progress up into the parent so the Objective's stored progress reflects
      // the new child immediately (not only on a later child *update*).
      if (goal.parentGoalId) {
        await this.recalculateParentRollup(goal.parentGoalId, userId, tx, publishAfterCommit);
      }

      publishAfterCommit('GOAL_CREATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return goal;
    });

    await this.invalidateGoalCache(createdGoal.workspaceId);
    return createdGoal;
  }

  async updateGoal(id: string, workspaceId: string, data: UpdateGoalDto, userId: string) {
    const { goal, isAuto } = await runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await goalRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Goal not found');
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const { version: _version, workspaceId: _, status, metadata: incomingMetadata, note, ...updateData } = data;

      // Merge metadata onto the goal's CURRENT persisted metadata so a partial edit
      // (changing only status, or only color) never clobbers other keys. Previously
      // the base was taken from the *incoming* payload, so editing status wiped a
      // saved color and editing color wiped the saved status (the only home for
      // PAUSED/CANCELED).
      const mergedMetadata = {
        ...toRecord(existing.metadata),
        ...toRecord(incomingMetadata),
        ...(status ? { status } : {}),
      };
      const metadataChanged = status !== undefined || incomingMetadata !== undefined;

      const goal = await goalRepository.update(id, {
        ...(updateData as Prisma.GoalUncheckedUpdateInput),
        ...(metadataChanged ? { metadata: mergedMetadata as Prisma.InputJsonValue } : {}),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx);

      // Upsert today's snapshot on a progress change (Bug #2: prevents same-day duplicates)
      // and roll the value up into the parent. A check-in `note` without a progress change
      // still lands on today's snapshot at the current progress.
      const progressChanged = updateData.progress !== undefined && updateData.progress !== existing.progress;
      if (progressChanged) {
        await this.writeProgressSnapshot(tx, goal.id, existing.parentGoalId, Number(updateData.progress), userId, note, publishAfterCommit);
      } else if (note) {
        await this.writeProgressSnapshot(tx, goal.id, existing.parentGoalId, existing.progress, userId, note, publishAfterCommit);
      }

      publishAfterCommit('GOAL_UPDATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return { goal, isAuto: toRecord(mergedMetadata).progressMode === 'auto' && metadataChanged };
    });

    await this.invalidateGoalCache(goal.workspaceId);

    // When a goal is switched to (or reconfigured in) auto mode, derive its progress
    // from linked tasks immediately rather than waiting for the next task event — the
    // manual `progress` sent alongside the toggle is only a seed. Runs post-commit in its
    // own transaction; a recompute failure must not fail the accepted update. Re-fetch the
    // full goal afterwards so the response carries the derived progress (recomputeAutoProgress
    // returns only a projection/bare row, without the default includes the client expects).
    if (isAuto) {
      try {
        await this.recomputeAutoProgress(id, userId);
        const refreshed = await goalRepository.findById(id);
        if (refreshed) return refreshed;
      } catch (err) {
        console.warn('[goal.updateGoal] auto-progress recompute failed:', (err as any)?.message || err);
      }
    }
    return goal;
  }

  /**
   * Upsert today's progress snapshot for a goal and roll the value up into its parent.
   * Shared by manual updates (`updateGoal`) and automatic recompute (`recomputeAutoProgress`).
   * `note` is written onto the snapshot when provided (check-in flow).
   */
  private async writeProgressSnapshot(
    tx: TxClient,
    goalId: string,
    parentGoalId: string | null,
    progress: number,
    userId: string,
    note?: string | null,
    publishAfterCommit?: (event: string, payload: any) => void,
  ) {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const existingSnap = await tx.goalProgressSnapshot.findFirst({
      where: { goalId, date: { gte: todayStart, lte: todayEnd } }
    });

    if (existingSnap) {
      await tx.goalProgressSnapshot.update({
        where: { id: existingSnap.id },
        data: { progress, ...(note ? { notes: note } : {}) }
      });
    } else {
      await tx.goalProgressSnapshot.create({
        data: { goalId, progress, date: new Date(), ...(note ? { notes: note } : {}) }
      });
    }

    if (parentGoalId) {
      await this.recalculateParentRollup(parentGoalId, userId, tx, publishAfterCommit);
    }
  }

  /**
   * Feature #1 — automatic progress. For a goal in `metadata.progressMode === 'auto'`,
   * derive progress from completion of tasks across its linked (non-deleted) projects
   * (CANCELED excluded), persist it, snapshot it, and roll up the parent. No-op for
   * manual goals or when the derived value is unchanged. Invoked post-commit from the
   * task/project domain-event subscribers, so it runs in its own transaction.
   */
  async recomputeAutoProgress(goalId: string, userId: string) {
    const result = await runInTransaction(async (tx, publishAfterCommit) => {
      const goal = await tx.goal.findUnique({
        where: { id: goalId },
        select: { id: true, parentGoalId: true, progress: true, workspaceId: true, metadata: true, deletedAt: true },
      });
      if (!goal || goal.deletedAt) return null;
      if (toRecord(goal.metadata).progressMode !== 'auto') return null;

      const tasks = await tx.task.findMany({
        where: {
          deletedAt: null,
          status: { not: 'CANCELED' },
          project: { goalId: goal.id, deletedAt: null },
        },
        select: { status: true },
      });
      const progress = computeAutoProgress(tasks);

      if (progress === goal.progress) return goal;

      const updated = await tx.goal.update({
        where: { id: goal.id },
        data: { progress, updatedBy: userId, version: { increment: 1 } },
      });
      await this.writeProgressSnapshot(tx, goal.id, goal.parentGoalId, progress, userId, undefined, publishAfterCommit);

      publishAfterCommit('GOAL_UPDATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return updated;
    });

    if (result && 'workspaceId' in result && (result as any).workspaceId) {
      await this.invalidateGoalCache((result as any).workspaceId);
    }
    return result;
  }

  private async recalculateParentRollup(
    parentGoalId: string,
    userId: string,
    tx: TxClient,
    publishAfterCommit?: (event: string, payload: any) => void,
  ) {
    const siblings = await tx.goal.findMany({
      where: { parentGoalId, deletedAt: null },
      select: { progress: true, metadata: true }
    });

    if (siblings.length === 0) {
      const parent = await tx.goal.findUnique({
        where: { id: parentGoalId },
        select: { parentGoalId: true },
      });
      if (parent?.parentGoalId) {
        await this.recalculateParentRollup(parent.parentGoalId, userId, tx, publishAfterCommit);
      }
      return;
    }

    // Weighted average by KR `metadata.weight` (default 1 → equal weights, matching the
    // previous plain average). Lets an Objective weight its Key Results.
    const avgProgress = computeWeightedRollup(siblings);

    const updatedParent = await tx.goal.update({
      where: { id: parentGoalId },
      data: {
        progress: avgProgress,
        updatedBy: userId,
        version: { increment: 1 },
      },
      select: { id: true, parentGoalId: true, workspaceId: true },
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

    await this.invalidateGoalCache(updatedParent.workspaceId);

    if (publishAfterCommit) {
      publishAfterCommit('GOAL_UPDATED', { goalId: updatedParent.id, workspaceId: updatedParent.workspaceId });
    }

    // Roll further up the hierarchy: an Objective can itself be a child of a
    // higher Objective (the UI supports 3 levels), so recompute grandparents too.
    if (updatedParent.parentGoalId) {
      await this.recalculateParentRollup(updatedParent.parentGoalId, userId, tx, publishAfterCommit);
    }
  }

  async deleteGoal(id: string, workspaceId: string, userId: string) {
    const goal = await runInTransaction(async (tx, publishAfterCommit) => {
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

      let grandchildIds: string[] = [];
      if (childIds.length > 0) {
        grandchildIds = (await tx.goal.findMany({
          where: { parentGoalId: { in: childIds } },
          select: { id: true },
        })).map((c: { id: string }) => c.id);

        await tx.goal.updateMany({
          where: { parentGoalId: { in: childIds }, deletedAt: null },
          data: { deletedAt: new Date(), updatedBy: userId },
        });
      }

      // GOL-01: Unlink Project.goalId and Habit.linkedGoalId on goal soft delete
      const allDeletedGoalIds = [id, ...childIds, ...grandchildIds];
      const projectWhere = allDeletedGoalIds.length === 1 
        ? { goalId: id } 
        : { goalId: { in: allDeletedGoalIds } };
      await tx.project.updateMany({
        where: projectWhere,
        data: { goalId: null, updatedBy: userId },
      });

      const habitWhere = allDeletedGoalIds.length === 1 
        ? { linkedGoalId: id } 
        : { linkedGoalId: { in: allDeletedGoalIds } };
      await tx.habit.updateMany({
        where: habitWhere,
        data: { linkedGoalId: null },
      });

      const updated = await tx.goal.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy: userId,
        },
        select: { id: true, parentGoalId: true, workspaceId: true },
      });

      if (existing.parentGoalId) {
        await this.recalculateParentRollup(existing.parentGoalId, userId, tx, publishAfterCommit);
      }

      publishAfterCommit('GOAL_DELETED', { goalId: updated.id, workspaceId: updated.workspaceId });
      return updated;
    });

    await this.invalidateGoalCache(workspaceId);
    return goal;
  }

  async restoreGoal(id: string, workspaceId: string, userId: string) {
    const goal = await runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await goalRepository.findById(id, tx);
      if (!existing) throw new Error('Goal not found');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new Error('Conflict: nothing to restore');

      // Recursively restore child goals
      await tx.goal.updateMany({
        where: { parentGoalId: id, deletedAt: { not: null } },
        data: { deletedAt: null, updatedBy: userId },
      });

      const childIds = (await tx.goal.findMany({
        where: { parentGoalId: id },
        select: { id: true },
      })).map((c: { id: string }) => c.id);

      if (childIds.length > 0) {
        await tx.goal.updateMany({
          where: { parentGoalId: { in: childIds }, deletedAt: { not: null } },
          data: { deletedAt: null, updatedBy: userId },
        });
      }

      const updated = await goalRepository.update(id, {
        deletedAt: null,
        updatedBy: userId,
      }, tx);

      if (existing.parentGoalId) {
        await this.recalculateParentRollup(existing.parentGoalId, userId, tx, publishAfterCommit);
      }

      publishAfterCommit('GOAL_RESTORED', { goalId: updated.id, workspaceId: updated.workspaceId });
      return updated;
    });

    await this.invalidateGoalCache(workspaceId);
    return goal;
  }
}

export const goalService = new GoalService();
