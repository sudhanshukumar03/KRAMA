import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Goal, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

export class GoalRepository implements BaseRepository<Goal, Prisma.GoalUncheckedCreateInput, Prisma.GoalUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Goal | null> {
    return (tx || prisma).goal.findUnique({
      where: { id },
      include: { projects: true },
    });
  }

  async findAll(options?: Prisma.GoalFindManyArgs, tx?: TxClient): Promise<Goal[]> {
    return (tx || prisma).goal.findMany(options || {});
  }

  async findManyByWorkspace(workspaceId: string, tx?: TxClient): Promise<Goal[]> {
    return (tx || prisma).goal.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: { projects: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.GoalUncheckedCreateInput, tx?: TxClient): Promise<Goal> {
    return (tx || prisma).goal.create({
      data,
      include: { projects: true },
    });
  }

  async update(id: string, data: Prisma.GoalUncheckedUpdateInput, tx?: TxClient): Promise<Goal> {
    return (tx || prisma).goal.update({
      where: { id },
      data,
      include: { projects: true },
    });
  }

  async delete(id: string, tx?: TxClient): Promise<Goal> {
    return (tx || prisma).goal.delete({ where: { id } });
  }
}

export const goalRepository = new GoalRepository();
