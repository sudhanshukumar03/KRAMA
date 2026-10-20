import { AppError } from '../utils/errors';
import { goalRepository } from '../repositories/goal.repository';
import { runInTransaction, type TxClient, type PostCommitPublisher } from '../prisma';
import type { Prisma } from '@prisma/client';
import { redisService } from './redis.service';
import { reportingClock, shiftDay } from './reportingTime';

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
  private async snapshotDay(tx: TxClient, userId: string) {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
    const clock = reportingClock(user);
    const now = new Date();
    const day = clock.dateKey(now);
    return { now, range: { gte: clock.dayStart(day), lt: clock.dayStart(shiftDay(day, 1)) } };
  }

  private async validateParent(parentId: string | null | undefined, workspaceId: string, tx: TxClient, goalId?: string) {
    const visited = new Set(goalId ? [goalId] : []);
    let cursor = parentId;
    while (cursor) {
      if (visited.has(cursor)) throw new AppError('Invalid goal hierarchy: cycles are not allowed', 400, 'INVALID_GOAL_INPUT');
      visited.add(cursor);
      const parent = await tx.goal.findFirst({ where: { id: cursor, workspaceId, deletedAt: null }, select: { parentGoalId: true } });
      if (!parent) throw new AppError('Invalid parent goal', 400, 'INVALID_GOAL_INPUT');
      cursor = parent.parentGoalId;
    }
  }

  private getCacheKey(workspaceId: string, lite = false): string {
    return lite ? `goals:workspace:lite:${workspaceId}` : `goals:workspace:tree-v2:${workspaceId}`;
  }

  async invalidateGoalCache(workspaceId: string): Promise<void> {
    try {
      await Promise.all([
        redisService.del(this.getCacheKey(workspaceId)),
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
      throw new AppError('Goal not found', 404, 'NOT_FOUND');
    }
    return goal;
  }

  async createGoal(data: CreateGoalDto, userId: string) {
    const createdGoal = await runInTransaction(async (tx, publishAfterCommit) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${data.workspaceId} FOR UPDATE`;
      const { status, metadata: incomingMetadata, ...restData } = data;
      await this.validateParent(restData.parentGoalId, restData.workspaceId, tx);
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
      const snapshot = await this.snapshotDay(tx, userId);
      const existingSnap = await tx.goalProgressSnapshot.findFirst({
        where: { goalId: goal.id, date: snapshot.range }
      });
      if (!existingSnap) {
        await tx.goalProgressSnapshot.create({
          data: {
            goalId: goal.id,
            progress: restData.progress !== undefined ? Number(restData.progress) : 0,
            date: snapshot.now,
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
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      const existing = await goalRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new AppError('Goal not found', 404, 'NOT_FOUND');
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw new AppError('Conflict: version mismatch', 409, 'CONFLICT');
      }
      const parentId = data.parentGoalId === undefined ? existing.parentGoalId : data.parentGoalId as string | null;
      await this.validateParent(parentId, workspaceId, tx, id);

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
      const children = await tx.goal.findMany({ where: { parentGoalId: id, workspaceId, deletedAt: null }, select: { progress: true, metadata: true } });
      const isAutomatic = children.length > 0 || toRecord(mergedMetadata).progressMode === 'auto';
      if (isAutomatic) delete updateData.progress;

      const goal = await goalRepository.update(id, {
        ...(updateData as Prisma.GoalUncheckedUpdateInput),
        ...(metadataChanged ? { metadata: mergedMetadata as Prisma.InputJsonValue } : {}),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx, { id, workspaceId, deletedAt: null, version: existing.version });

      // Upsert today's snapshot on a progress change (Bug #2: prevents same-day duplicates)
      // and roll the value up into the parent. A check-in `note` without a progress change
      // still lands on today's snapshot at the current progress.
      const progressChanged = updateData.progress !== undefined && updateData.progress !== existing.progress;
      if (progressChanged) {
        await this.writeProgressSnapshot(tx, goal.id, existing.parentGoalId, Number(updateData.progress), userId, note, publishAfterCommit);
      } else if (note) {
        await this.writeProgressSnapshot(tx, goal.id, existing.parentGoalId, existing.progress, userId, note, publishAfterCommit);
      }
      if (existing.parentGoalId && (parentId !== existing.parentGoalId || incomingMetadata !== undefined)) {
        await this.recalculateParentRollup(existing.parentGoalId, userId, tx, publishAfterCommit);
      }
      if (parentId && parentId !== existing.parentGoalId) await this.recalculateParentRollup(parentId, userId, tx, publishAfterCommit);

      publishAfterCommit('GOAL_UPDATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return { goal, isAuto: isAutomatic };
    });

    await this.invalidateGoalCache(goal.workspaceId);

    // Derive parent progress from key results, or auto leaf progress from linked
    // tasks, immediately rather than waiting for the next domain event — the
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
    const snapshot = await this.snapshotDay(tx, userId);

    const existingSnap = await tx.goalProgressSnapshot.findFirst({
      where: { goalId, date: snapshot.range }
    });

    if (existingSnap) {
      await tx.goalProgressSnapshot.update({
        where: { id: existingSnap.id },
        data: { progress, ...(note ? { notes: note } : {}) }
      });
    } else {
      await tx.goalProgressSnapshot.create({
        data: { goalId, progress, date: snapshot.now, ...(note ? { notes: note } : {}) }
      });
    }

    if (parentGoalId) {
      await this.recalculateParentRollup(parentGoalId, userId, tx, publishAfterCommit);
    }
  }

  /**
   * Parents always use weighted key results. Auto leaves use completed tasks across
   * linked non-deleted projects (CANCELED excluded). Persist changes, snapshot, and
   * roll up ancestors. No-op for manual leaves or unchanged values. Invoked from the
   * task/project domain-event subscribers, so it runs in its own transaction.
   */
  async recomputeAutoProgress(goalId: string, userId: string) {
    const result = await runInTransaction((tx, publishAfterCommit) =>
      this.recomputeAutoProgressWithinTransaction(goalId, userId, tx, publishAfterCommit));
    if (result) await this.invalidateGoalCache(result.workspaceId);
    return result;
  }

  async recomputeAutoProgressWithinTransaction(goalId: string, userId: string, tx: TxClient, publishAfterCommit: PostCommitPublisher) {
      // Use the same workspace lock as child edits so an older task event cannot
      // overwrite a newer key-result rollup with a stale child snapshot.
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = (SELECT "workspaceId" FROM "Goal" WHERE id = ${goalId}) FOR UPDATE`;
      const goal = await tx.goal.findUnique({
        where: { id: goalId },
        select: { id: true, parentGoalId: true, progress: true, workspaceId: true, metadata: true, deletedAt: true },
      });
      if (!goal || goal.deletedAt) return null;
      const children = await tx.goal.findMany({ where: { parentGoalId: goal.id, workspaceId: goal.workspaceId, deletedAt: null }, select: { progress: true, metadata: true } });
      if (children.length === 0 && toRecord(goal.metadata).progressMode !== 'auto') return null;

      const tasks = children.length ? [] : await tx.task.findMany({
        where: {
          deletedAt: null,
          status: { not: 'CANCELED' },
          workspaceId: goal.workspaceId,
          project: { goalId: goal.id, workspaceId: goal.workspaceId, deletedAt: null },
        },
        select: { status: true },
      });
      const progress = children.length ? computeWeightedRollup(children) : computeAutoProgress(tasks);

      if (progress === goal.progress) return goal;

      const updated = await tx.goal.update({
        where: { id: goal.id },
        data: { progress, updatedBy: userId, version: { increment: 1 } },
      });
      await this.writeProgressSnapshot(tx, goal.id, goal.parentGoalId, progress, userId, undefined, publishAfterCommit);

      publishAfterCommit('GOAL_UPDATED', { goalId: goal.id, workspaceId: goal.workspaceId });
      return updated;
  }

  private async recalculateParentRollup(
    parentGoalId: string,
    userId: string,
    tx: TxClient,
    publishAfterCommit?: (event: string, payload: any) => void,
    visited = new Set<string>(),
  ) {
    if (visited.has(parentGoalId)) return;
    visited.add(parentGoalId);
    const parent = await tx.goal.findUnique({ where: { id: parentGoalId }, select: { workspaceId: true, deletedAt: true, metadata: true } });
    if (!parent || parent.deletedAt) return;
    const siblings = await tx.goal.findMany({
      where: { parentGoalId, workspaceId: parent.workspaceId, deletedAt: null },
      select: { progress: true, metadata: true }
    });


    // Weighted average by KR `metadata.weight` (default 1 → equal weights, matching the
    // previous plain average). Lets an Objective weight its Key Results.
    // Removing/reparenting the last key result makes this an automatic leaf again.
    const avgProgress = siblings.length === 0 && toRecord(parent.metadata).progressMode === 'auto'
      ? computeAutoProgress(await tx.task.findMany({
        where: { workspaceId: parent.workspaceId, deletedAt: null, status: { not: 'CANCELED' }, project: { goalId: parentGoalId, workspaceId: parent.workspaceId, deletedAt: null } },
        select: { status: true },
      }))
      : computeWeightedRollup(siblings);

    const updatedParent = await tx.goal.update({
      where: { id: parentGoalId },
      data: {
        progress: avgProgress,
        updatedBy: userId,
        version: { increment: 1 },
      },
      select: { id: true, parentGoalId: true, workspaceId: true },
    });

    const snapshot = await this.snapshotDay(tx, userId);

    const parentSnapToday = await tx.goalProgressSnapshot.findFirst({
      where: { goalId: parentGoalId, date: snapshot.range }
    });
    if (parentSnapToday) {
      await tx.goalProgressSnapshot.update({
        where: { id: parentSnapToday.id },
        data: { progress: avgProgress }
      });
    } else {
      await tx.goalProgressSnapshot.create({
        data: { goalId: parentGoalId, progress: avgProgress, date: snapshot.now }
      });
    }

    await this.invalidateGoalCache(updatedParent.workspaceId);

    if (publishAfterCommit) {
      publishAfterCommit('GOAL_UPDATED', { goalId: updatedParent.id, workspaceId: updatedParent.workspaceId });
    }

    // Roll further up the hierarchy: an Objective can itself be a child of a
    // higher Objective (the UI supports 3 levels), so recompute grandparents too.
    if (updatedParent.parentGoalId) {
      await this.recalculateParentRollup(updatedParent.parentGoalId, userId, tx, publishAfterCommit, visited);
    }
  }

  async deleteGoal(id: string, workspaceId: string, userId: string) {
    const goal = await runInTransaction((tx, publishAfterCommit) =>
      this.deleteGoalWithinTransaction(id, workspaceId, userId, tx, publishAfterCommit));
    await this.invalidateGoalCache(workspaceId);
    return goal;
  }

  async deleteGoalWithinTransaction(id: string, workspaceId: string, userId: string, tx: TxClient, publishAfterCommit: PostCommitPublisher) {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      const existing = await goalRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new AppError('Goal not found', 404, 'NOT_FOUND');
      }

      const deletionTime = new Date();
      const allDeletedGoalIds = [id];
      let frontier = [id];
      while (frontier.length) {
        const children = await tx.goal.findMany({ where: { workspaceId, parentGoalId: { in: frontier }, deletedAt: null }, select: { id: true } });
        frontier = children.map(c => c.id).filter(childId => !allDeletedGoalIds.includes(childId));
        allDeletedGoalIds.push(...frontier);
      }
      await tx.goal.updateMany({ where: { id: { in: allDeletedGoalIds }, workspaceId, deletedAt: null }, data: { deletedAt: deletionTime, updatedBy: userId, version: { increment: 1 } } });

      // Remember only associations removed by this deletion; later explicit
      // relinking clears the marker and must take precedence over Undo.
      for (const project of await tx.project.findMany({ where: { workspaceId, goalId: { in: allDeletedGoalIds } } })) {
        const metadata = { ...(project.metadata as any), goalUndo: { rootId: id, goalId: project.goalId, deletedAt: deletionTime.toISOString() } };
        await tx.project.update({ where: { id: project.id }, data: { goalId: null, metadata, updatedBy: userId, version: { increment: 1 } } });
        publishAfterCommit('PROJECT_UPDATED', { projectId: project.id, workspaceId });
      }
      for (const habit of await tx.habit.findMany({ where: { workspaceId, linkedGoalId: { in: allDeletedGoalIds } } })) {
        const metadata = { ...(habit.metadata as any), goalUndo: { rootId: id, goalId: habit.linkedGoalId, deletedAt: deletionTime.toISOString() } };
        await tx.habit.update({ where: { id: habit.id }, data: { linkedGoalId: null, metadata, updatedBy: userId, version: { increment: 1 } } });
        publishAfterCommit('HABIT_UPDATED', { habitId: habit.id, workspaceId });
      }

      const updated = await tx.goal.update({
        where: { id },
        data: {
          deletedAt: deletionTime,
          updatedBy: userId,
        },
        select: { id: true, parentGoalId: true, workspaceId: true },
      });

      if (existing.parentGoalId) {
        await this.recalculateParentRollup(existing.parentGoalId, userId, tx, publishAfterCommit);
      }

      publishAfterCommit('GOAL_DELETED', { goalId: updated.id, workspaceId: updated.workspaceId });
      return updated;
  }

  async restoreGoal(id: string, workspaceId: string, userId: string) {
    const restoredGoalIds: string[] = [];
    const goal = await runInTransaction(async (tx, publishAfterCommit) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      const existing = await goalRepository.findById(id, tx);
      if (!existing) throw new AppError('Goal not found', 404, 'NOT_FOUND');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new AppError('Conflict: nothing to restore', 409, 'CONFLICT');

      if (existing.parentGoalId) await this.validateParent(existing.parentGoalId, workspaceId, tx, id);
      // Restore only descendants removed by this deletion, leaving earlier deletions alone.
      const restoreIds = [id];
      let frontier = [id];
      while (frontier.length) {
        const children = await tx.goal.findMany({ where: { workspaceId, parentGoalId: { in: frontier }, deletedAt: existing.deletedAt }, select: { id: true } });
        frontier = children.map(c => c.id).filter(childId => !restoreIds.includes(childId));
        restoreIds.push(...frontier);
      }
      restoredGoalIds.push(...restoreIds);
      await tx.goal.updateMany({ where: { id: { in: restoreIds }, workspaceId, deletedAt: existing.deletedAt }, data: { deletedAt: null, updatedBy: userId, version: { increment: 1 } } });

      for (const project of await tx.project.findMany({ where: { workspaceId, deletedAt: null, goalId: null, metadata: { path: ['goalUndo', 'rootId'], equals: id } } })) {
        const { goalUndo, ...metadata } = project.metadata as any;
        if (goalUndo.deletedAt !== existing.deletedAt.toISOString() || !restoreIds.includes(goalUndo.goalId)) continue;
        await tx.project.update({ where: { id: project.id }, data: { goalId: goalUndo.goalId, metadata, version: { increment: 1 }, updatedBy: userId } });
        publishAfterCommit('PROJECT_UPDATED', { projectId: project.id, workspaceId });
      }
      for (const habit of await tx.habit.findMany({ where: { workspaceId, deletedAt: null, linkedGoalId: null, metadata: { path: ['goalUndo', 'rootId'], equals: id } } })) {
        const { goalUndo, ...metadata } = habit.metadata as any;
        if (goalUndo.deletedAt !== existing.deletedAt.toISOString() || !restoreIds.includes(goalUndo.goalId)) continue;
        await tx.habit.update({ where: { id: habit.id }, data: { linkedGoalId: goalUndo.goalId, metadata, version: { increment: 1 }, updatedBy: userId } });
        publishAfterCommit('HABIT_UPDATED', { habitId: habit.id, workspaceId });
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

    for (const restoredId of restoredGoalIds) await this.recomputeAutoProgress(restoredId, userId);
    await this.invalidateGoalCache(workspaceId);
    return goal;
  }
}

export const goalService = new GoalService();
