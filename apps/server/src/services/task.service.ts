import { taskRepository } from '../repositories/task.repository';
import { TaskStatus } from '@prisma/client';
import { runInTransaction, type TxClient, type PostCommitPublisher } from '../prisma';
import { clearTodayTaskReview } from './personalDay.service';

/**
 * Keep the original completion timestamp while an already-Done task is edited.
 * A transition out of Done clears it; a later completion gets a new timestamp.
 */
function completionMetadata(data: any, existing?: any) {
  const old = typeof existing?.metadata === 'object' && existing.metadata && !Array.isArray(existing.metadata) ? existing.metadata : {};
  const incoming = typeof data.metadata === 'object' && data.metadata && !Array.isArray(data.metadata) ? data.metadata : {};
  const status = data.status ?? existing?.status;
  return { ...old, ...incoming, completedAt: status === 'DONE' ? (existing?.status === 'DONE' ? old.completedAt || existing.updatedAt.toISOString() : new Date().toISOString()) : null };
}

async function validateTaskLinks(tx: any, workspaceId: string, data: any, taskId?: string) {
  const invalid = (message: string) => { throw Object.assign(new Error(message), { statusCode: 400, code: 'INVALID_TASK_LINK' }); };
  if (data.projectId) {
    const project = await tx.project.findFirst({ where: { id: data.projectId, workspaceId, deletedAt: null }, select: { id: true } });
    if (!project) invalid('Choose an active project in this workspace.');
  }
  if (data.assigneeId) {
    const member = await tx.workspaceMember.findFirst({ where: { workspaceId, userId: data.assigneeId } });
    if (!member) invalid('Assignee must be a member of this workspace.');
  }
  if (data.blockedById !== undefined || data.parentTaskId !== undefined) {
    // Serialize graph edits so two simultaneous changes cannot introduce a cycle.
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    for (const field of ['blockedById', 'parentTaskId']) {
      let next = data[field]; const seen = new Set<string>();
      while (next) {
        if (next === taskId || seen.has(next)) invalid('Task links cannot create a cycle.');
        seen.add(next);
        const linked = await tx.task.findFirst({ where: { id: next, workspaceId, deletedAt: null }, select: { id: true, blockedById: true, parentTaskId: true } });
        if (!linked) invalid('Choose an active task in this workspace.');
        next = linked[field];
      }
    }
  }
}

class TaskService {
  
  async rebalanceTasks(workspaceId: string, userId: string): Promise<void> {
    await runInTransaction(async (tx, publishAfterCommit) => {
      // Allow the FK checks made by an editor's activity-log insert while that
      // editor still holds a task row lock. Ordering operations still serialize.
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR NO KEY UPDATE`;
      // Lock before computing positions, including against edits that do not take
      // the workspace lock. The next statement sees their committed values.
      await tx.$queryRaw`SELECT id FROM "Task" WHERE "workspaceId" = ${workspaceId} AND "deletedAt" IS NULL ORDER BY id FOR UPDATE`;
      const changed = await tx.$queryRaw<Array<{ id: string }>>`
        WITH positions AS (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY position, "createdAt", id) * 1000 AS position
          FROM "Task" WHERE "workspaceId" = ${workspaceId} AND "deletedAt" IS NULL
        )
        UPDATE "Task" AS task SET position = positions.position,
          version = task.version + 1, "updatedBy" = ${userId}, "updatedAt" = CURRENT_TIMESTAMP
        FROM positions WHERE task.id = positions.id AND task.position IS DISTINCT FROM positions.position
        RETURNING task.id`;
      for (const task of changed) publishAfterCommit('TASK_UPDATED', { taskId: task.id, workspaceId, userId });
    });
  }

  async listTasks(workspaceId: string, filters: { projectId?: string; status?: string; limit?: number; cursor?: string }) {
    if (filters.limit !== undefined) return taskRepository.findPageByWorkspace(workspaceId, { ...filters, status: filters.status as TaskStatus | undefined, limit: filters.limit });
    return taskRepository.findManyByWorkspace(workspaceId, {
      ...filters,
      status: filters.status as TaskStatus,
    });
  }

  async getTask(id: string, workspaceId: string) {
    const task = await taskRepository.findById(id);
    if (!task || task.deletedAt || task.workspaceId !== workspaceId) {
      throw new Error('Task not found');
    }
    return task;
  }

  async createTask(data: any, userId: string) {
    return runInTransaction((tx, publishAfterCommit) => this.createTaskWithinTransaction(tx, publishAfterCommit, data, userId));
  }

  async createTaskWithinTransaction(tx: TxClient, publishAfterCommit: PostCommitPublisher, data: any, userId: string) {
      // A new task must choose its position after any in-flight rebalance.
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${data.workspaceId} FOR NO KEY UPDATE`;
      const maxPos = await taskRepository.findMaxPosition(data.workspaceId, tx);
      const position = maxPos + 1.0;


      await validateTaskLinks(tx, data.workspaceId, data);

      const task = await taskRepository.create({
        ...data,
        metadata: completionMetadata(data),
        position,
        createdBy: userId,
        updatedBy: userId,
      }, tx);

      await tx.activityLog.create({ data: { workspaceId: task.workspaceId, userId, action: 'TASK_CREATED', entityType: 'Task', entityId: task.id, metadata: { title: task.title } } });
      publishAfterCommit('TASK_CREATED', { taskId: task.id, workspaceId: task.workspaceId, userId, task });
      return task;
  }

  /**
   * Validate workspace links, then update with the observed version in the WHERE
   * condition. This also catches races occurring after the initial version check.
   * Publish task events after commit so related project/goal totals can refresh.
   */
  async updateTask(id: string, workspaceId: string, data: any, userId: string) {
    return runInTransaction((tx, publishAfterCommit) => this.updateTaskWithinTransaction(tx, publishAfterCommit, id, workspaceId, data, userId));
  }

  async updateTaskWithinTransaction(tx: TxClient, publishAfterCommit: PostCommitPublisher, id: string, workspaceId: string, data: any, userId: string) {
      // Review and explicit replanning must serialize before either updates a task.
      if (data.scheduledDate !== undefined || data.status !== undefined) {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      }
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw Object.assign(new Error('Task not found'), { statusCode: 404 });
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw Object.assign(new Error('Conflict: version mismatch'), { statusCode: 409 });
      }

      const { version: _version, workspaceId: _, ...updateData } = data;
      // A dated task is an intentional plan. Older clients may send only the
      // date, so enforce activation and Inbox removal at the service boundary.
      if (updateData.scheduledDate && !['BACKLOG', 'CANCELED', 'DONE'].includes(updateData.status ?? '')) {
        if (existing.status === 'BACKLOG' && updateData.status === undefined) updateData.status = TaskStatus.TODO;
        updateData.metadata = { ...(typeof updateData.metadata === 'object' && updateData.metadata ? updateData.metadata : {}), inbox: false };
      }
      await validateTaskLinks(tx, workspaceId, updateData, id);

      const task = await taskRepository.update(id, {
        ...updateData,
        metadata: completionMetadata(updateData, existing),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx, { id, workspaceId, deletedAt: null, version: existing.version }).catch(error => { if (error.code === 'P2025') throw Object.assign(new Error('Conflict: version mismatch'), { statusCode: 409 }); throw error; });

      const dateChanged = data.scheduledDate !== undefined &&
        (task.scheduledDate?.getTime() ?? null) !== (existing.scheduledDate?.getTime() ?? null);
      const madeReady = updateData.status !== undefined && task.status !== existing.status &&
        !['BACKLOG', 'CANCELED', 'DONE'].includes(task.status);
      if (dateChanged || madeReady) await clearTodayTaskReview(tx, workspaceId, userId, id);

      await tx.activityLog.create({ data: { workspaceId, userId, action: existing.status !== 'DONE' && task.status === 'DONE' ? 'TASK_COMPLETED' : 'TASK_UPDATED', entityType: 'Task', entityId: task.id, metadata: { title: task.title } } });
      publishAfterCommit('TASK_UPDATED', { previousProjectId: existing.projectId, taskId: task.id, workspaceId: task.workspaceId, userId, task });
      
      if (existing.status !== 'DONE' && updateData.status === 'DONE') {
        publishAfterCommit('TASK_COMPLETED', { taskId: task.id, workspaceId: task.workspaceId, userId, completionVersion: task.version });
      }
      return task;
  }

  async scheduleTaskWithinTransaction(tx: TxClient, publishAfterCommit: PostCommitPublisher, id: string, workspaceId: string, date: Date, userId: string) {
    // Reserving a block is an explicit plan, but must never reopen finished work.
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    const task = await tx.task.findFirst({ where: { id, workspaceId, deletedAt: null }, select: { status: true, scheduledDate: true, metadata: true } });
    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
    if (task.status === 'DONE' || task.status === 'CANCELED') return;
    const metadata = task.metadata && typeof task.metadata === 'object' && !Array.isArray(task.metadata) ? task.metadata : {};
    // Adding a reservation to work already planned for this day must not create
    // an artificial version conflict in an open task editor.
    if (task.status !== 'BACKLOG' && task.scheduledDate?.getTime() === date.getTime() && metadata.inbox !== true) return;
    await this.updateTaskWithinTransaction(tx, publishAfterCommit, id, workspaceId, { scheduledDate: date }, userId);
  }

  async deleteTask(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      const task = await taskRepository.update(id, {
        deletedAt: new Date(),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx, { id, workspaceId, deletedAt: null, version: existing.version }).catch(error => { if (error.code === 'P2025') throw new Error('Conflict: version mismatch'); throw error; });

      publishAfterCommit('TASK_DELETED', { taskId: task.id, workspaceId: task.workspaceId, userId, task });
      return task;
    });
  }

  async reorderTask(id: string, workspaceId: string, data: any, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      if (existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const task = await taskRepository.update(id, {
        position: data.position,
        version: { increment: 1 },
        updatedBy: userId,
      }, tx, { id, workspaceId, deletedAt: null, version: existing.version }).catch(error => { if (error.code === 'P2025') throw new Error('Conflict: version mismatch'); throw error; });

      publishAfterCommit('TASK_UPDATED', { taskId: task.id, workspaceId: task.workspaceId, userId, task });
      return task;
    });
  }

  async completeTask(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      const isNewlyCompleted = existing.status !== TaskStatus.DONE;

      const task = await taskRepository.update(id, {
        status: TaskStatus.DONE,
        metadata: completionMetadata({ status: TaskStatus.DONE }, existing),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx, { id, workspaceId, deletedAt: null, version: existing.version }).catch(error => { if (error.code === 'P2025') throw new Error('Conflict: version mismatch'); throw error; });

      if (isNewlyCompleted) await tx.activityLog.create({ data: { workspaceId, userId, action: 'TASK_COMPLETED', entityType: 'Task', entityId: id, metadata: { title: task.title } } });
      publishAfterCommit('TASK_UPDATED', { taskId: task.id, workspaceId: task.workspaceId, userId, task });
      if (isNewlyCompleted) {
        publishAfterCommit('TASK_COMPLETED', { taskId: task.id, workspaceId: task.workspaceId, userId, completionVersion: task.version });
      }
      return task;
    });
  }

  async restoreTask(id: string, workspaceId: string, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      let existing = await taskRepository.findById(id, tx);
      if (!existing || existing.workspaceId !== workspaceId) throw new Error('Task not found');
      if (!existing.deletedAt) throw new Error('Conflict: nothing to restore');

      if (existing.projectId) {
        // Project deletion/restoration writes this row before its task cascade.
        // Take the same lock order and re-read after waiting, so restoring a
        // task cannot commit a link based on an uncommitted project lifecycle.
        await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${existing.projectId} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
        existing = await taskRepository.findById(id, tx);
        if (!existing || existing.workspaceId !== workspaceId) throw new Error('Task not found');
        if (!existing.deletedAt) throw new Error('Conflict: nothing to restore');
      }
      const project = existing.projectId ? await tx.project.findFirst({
        where: { id: existing.projectId, workspaceId, deletedAt: null }, select: { id: true },
      }) : null;

      const task = await taskRepository.update(id, {
        deletedAt: null,
        // Individual recovery must remain usable without reviving its project.
        projectId: project?.id ?? null,
        version: { increment: 1 },
        updatedBy: userId
      }, tx, { id, workspaceId, deletedAt: existing.deletedAt, version: existing.version }).catch(error => { if (error.code === 'P2025') throw new Error('Conflict: version mismatch'); throw error; });

      await tx.activityLog.create({ data: { workspaceId: task.workspaceId, userId, action: 'TASK_RESTORED', entityType: 'Task', entityId: task.id, metadata: { title: task.title } } });
      publishAfterCommit('TASK_CREATED', { taskId: task.id, workspaceId: task.workspaceId, userId, task });
      publishAfterCommit('TASK_RESTORED', { taskId: task.id, workspaceId: task.workspaceId, userId });
      return task;
    });
  }
}

export const taskService = new TaskService();
