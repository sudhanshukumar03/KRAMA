import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Task, Prisma, TaskStatus } from '@prisma/client';
import type { TxClient } from './user.repository';

class TaskRepository implements BaseRepository<Task, Prisma.TaskUncheckedCreateInput, Prisma.TaskUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Task | null> {
    return (tx || prisma).task.findUnique({
      where: { id },
      include: { project: { include: { goal: true } }, childTasks: true, blockedBy: true, blocking: { select: { id: true, title: true } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    });
  }

  async findAll(options?: Prisma.TaskFindManyArgs, tx?: TxClient): Promise<Task[]> {
    return (tx || prisma).task.findMany(options || {});
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
      include: { project: { include: { goal: true } }, blockedBy: true, blocking: { select: { id: true, title: true } }, childTasks: true },
      orderBy: { position: 'asc' },
    });
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
      include: { project: { include: { goal: true } }, childTasks: true, blockedBy: true, blocking: { select: { id: true, title: true } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    });
  }

  async update(id: string, data: Prisma.TaskUncheckedUpdateInput, tx?: TxClient): Promise<Task> {
    return (tx || prisma).task.update({
      where: { id },
      data,
      include: { project: { include: { goal: true } }, childTasks: true, blockedBy: true, blocking: { select: { id: true, title: true } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    });
  }

  async delete(id: string, tx?: TxClient): Promise<Task> {
    return (tx || prisma).task.delete({ where: { id } });
  }
}

export const taskRepository = new TaskRepository();



