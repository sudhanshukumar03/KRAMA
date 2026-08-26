import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Task, Prisma, TaskStatus } from '@prisma/client';
import type { TxClient } from './user.repository';

export class TaskRepository implements BaseRepository<Task, Prisma.TaskUncheckedCreateInput, Prisma.TaskUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Task | null> {
    return (tx || prisma).task.findUnique({
      where: { id },
      include: { project: { include: { goal: true } }, sprint: true, childTasks: true, blockedBy: true },
    });
  }

  async findAll(options?: Prisma.TaskFindManyArgs, tx?: TxClient): Promise<Task[]> {
    return (tx || prisma).task.findMany(options || {});
  }

  async findManyByWorkspace(workspaceId: string, filters: { projectId?: string; sprintId?: string; status?: TaskStatus }, tx?: TxClient): Promise<Task[]> {
    const where: any = { workspaceId, deletedAt: null };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.sprintId) where.sprintId = filters.sprintId;
    
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { not: 'CANCELED' };
    }

    return (tx || prisma).task.findMany({
      where,
      include: { project: { include: { goal: true } }, sprint: true, blockedBy: true, childTasks: true },
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
      include: { project: { include: { goal: true } }, sprint: true, childTasks: true, blockedBy: true },
    });
  }

  async update(id: string, data: Prisma.TaskUncheckedUpdateInput, tx?: TxClient): Promise<Task> {
    return (tx || prisma).task.update({
      where: { id },
      data,
      include: { project: { include: { goal: true } }, sprint: true, childTasks: true, blockedBy: true },
    });
  }

  async delete(id: string, tx?: TxClient): Promise<Task> {
    return (tx || prisma).task.delete({ where: { id } });
  }
}

export const taskRepository = new TaskRepository();



