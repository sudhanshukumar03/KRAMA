import { prisma } from '../prisma';
import { taskRepository } from '../repositories/task.repository';
import { TaskStatus } from '@prisma/client';
import { runInTransaction, type TxClient, type PostCommitPublisher } from '../prisma';

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
  
  async rebalanceTasks(workspaceId: string): Promise<void> {
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      orderBy: [
        { status: 'asc' },
        { position: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    
    let currentStatus = '';
    let currentOrder = 0;
    
    for (const task of tasks) {
      if (task.status !== currentStatus) {
        currentStatus = task.status;
        currentOrder = 1000;
      } else {
        currentOrder += 1000;
      }
      
      await prisma.task.update({
        where: { id: task.id },
        data: { position: currentOrder }
      });
    }
  }

  async listTasks(workspaceId: string, filters: { projectId?: string; status?: string }) {
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

  async updateTask(id: string, workspaceId: string, data: any, userId: string) {
    return runInTransaction(async (tx, publishAfterCommit) => {
      const existing = await taskRepository.findById(id, tx);
      if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
        throw new Error('Task not found');
      }

      if (data.version !== undefined && existing.version !== data.version) {
        throw new Error('Conflict: version mismatch');
      }

      const { version: _version, workspaceId: _, ...updateData } = data;


      await validateTaskLinks(tx, workspaceId, updateData, id);

      const task = await taskRepository.update(id, {
        ...updateData,
        metadata: completionMetadata(updateData, existing),
        version: { increment: 1 },
        updatedBy: userId,
      }, tx, { id, workspaceId, deletedAt: null, version: existing.version }).catch(error => { if (error.code === 'P2025') throw new Error('Conflict: version mismatch'); throw error; });

      await tx.activityLog.create({ data: { workspaceId, userId, action: existing.status !== 'DONE' && task.status === 'DONE' ? 'TASK_COMPLETED' : 'TASK_UPDATED', entityType: 'Task', entityId: task.id, metadata: { title: task.title } } });
      publishAfterCommit('TASK_UPDATED', { previousProjectId: existing.projectId, taskId: task.id, workspaceId: task.workspaceId, userId, task });
      
      if (existing.status !== 'DONE' && updateData.status === 'DONE') {
        publishAfterCommit('TASK_COMPLETED', { taskId: task.id, workspaceId: task.workspaceId, userId, completionVersion: task.version });
      }
      return task;
    });
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
      const existing = await taskRepository.findById(id, tx);
      if (!existing) throw new Error('Task not found');
      if (!existing.deletedAt || existing.workspaceId !== workspaceId) throw new Error('Conflict: nothing to restore');

      const task = await taskRepository.update(id, {
        deletedAt: null,
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
