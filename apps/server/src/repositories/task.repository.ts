import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Task, Prisma, TaskStatus } from '@prisma/client';
import type { TxClient } from './user.repository';

function scopedTask(row: any): any {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(scopedTask);
  const belongs = (linked: any) => linked && linked.workspaceId === row.workspaceId && !linked.deletedAt;
  const result = { ...row };
  if ('project' in row) result.project = belongs(row.project) ? { ...row.project, goal: belongs(row.project.goal) ? row.project.goal : null } : null;
  if ('blockedBy' in row) { result.blockedBy = belongs(row.blockedBy) ? row.blockedBy : null; if (!result.blockedBy) result.blockedById = null; }
  if ('parentTask' in row) { result.parentTask = belongs(row.parentTask) ? row.parentTask : null; if (!result.parentTask) result.parentTaskId = null; }
  if (row.childTasks) result.childTasks = row.childTasks.filter(belongs);
  if (row.blocking) result.blocking = row.blocking.filter(belongs);
  return result;
}

class TaskRepository implements BaseRepository<Task, Prisma.TaskUncheckedCreateInput, Prisma.TaskUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Task | null> {
    return (tx || prisma).task.findUnique({
      where: { id },
      include: { project: { include: { goal: true } }, childTasks: true, parentTask: { select: { id: true, workspaceId: true, deletedAt: true } }, blockedBy: true, blocking: { select: { id: true, title: true, workspaceId: true, deletedAt: true } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    }).then(scopedTask);
  }

  async findAll(options?: Prisma.TaskFindManyArgs, tx?: TxClient): Promise<Task[]> {
    return (tx || prisma).task.findMany(options || {}).then(scopedTask);
  }

  async findManyByWorkspace(workspaceId: string, filters: { projectId?: string; status?: TaskStatus }, tx?: TxClient): Promise<Task[]> {
    const where: any = { workspaceId, deletedAt: null };
    if (filters.projectId) where.projectId = filters.projectId;
    
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { not: 'CANCELED' };
    }

    return (tx || prisma).task.findMany({
      where,
      // Comments are intentionally NOT included here: the board list is a hot path
      // and comment threads are only shown in the detail modal, which fetches the
      // single task (findById) on open. Keeping them out avoids loading every
      // task's full thread on every board render.
      include: { project: { include: { goal: true } }, blockedBy: true, blocking: { select: { id: true, title: true, workspaceId: true, deletedAt: true } }, parentTask: { select: { id: true, workspaceId: true, deletedAt: true } }, childTasks: true },
      orderBy: { position: 'asc' },
    }).then(scopedTask);
  }

  async findMaxPosition(workspaceId: string, tx?: TxClient): Promise<number> {
    const lastTask = await (tx || prisma).task.findFirst({
      where: { workspaceId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return lastTask?.position || 0;
  }

  async create(data: Prisma.TaskUncheckedCreateInput, tx?: TxClient): Promise<Task> {
    return (tx || prisma).task.create({
      data,
      include: { project: { include: { goal: true } }, childTasks: true, parentTask: { select: { id: true, workspaceId: true, deletedAt: true } }, blockedBy: true, blocking: { select: { id: true, title: true, workspaceId: true, deletedAt: true } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    }).then(scopedTask);
  }

  async update(id: string, data: Prisma.TaskUncheckedUpdateInput, tx?: TxClient, guard?: Prisma.TaskWhereUniqueInput): Promise<Task> {
    return (tx || prisma).task.update({
      where: guard || { id },
      data,
      include: { project: { include: { goal: true } }, childTasks: true, parentTask: { select: { id: true, workspaceId: true, deletedAt: true } }, blockedBy: true, blocking: { select: { id: true, title: true, workspaceId: true, deletedAt: true } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    }).then(scopedTask);
  }

  async delete(id: string, tx?: TxClient): Promise<Task> {
    return (tx || prisma).task.delete({ where: { id } });
  }
}

export const taskRepository = new TaskRepository();



