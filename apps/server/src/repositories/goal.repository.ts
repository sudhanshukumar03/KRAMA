import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Goal, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

const defaultGoalInclude = {
  _count: { select: { projects: true, habits: true } },
  habits: { select: { id: true } },
  snapshots: { orderBy: { date: 'asc' as const } },
  childGoals: {
    include: {
      _count: { select: { projects: true, habits: true } },
      habits: { select: { id: true } },
      snapshots: { orderBy: { date: 'asc' as const } },
      childGoals: {
        include: {
          _count: { select: { projects: true, habits: true } },
          habits: { select: { id: true } },
          snapshots: { orderBy: { date: 'asc' as const } },
        }
      }
    }
  }
};

export class GoalRepository implements BaseRepository<Goal, Prisma.GoalUncheckedCreateInput, Prisma.GoalUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Goal | null> {
    return (tx || prisma).goal.findUnique({
      where: { id },
      include: defaultGoalInclude,
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
      include: defaultGoalInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.GoalUncheckedCreateInput, tx?: TxClient): Promise<Goal> {
    return (tx || prisma).goal.create({
      data,
      include: defaultGoalInclude,
    });
  }

  async update(id: string, data: Prisma.GoalUncheckedUpdateInput, tx?: TxClient): Promise<Goal> {
    return (tx || prisma).goal.update({
      where: { id },
      data,
      include: defaultGoalInclude,
    });
  }

  async delete(id: string, tx?: TxClient): Promise<Goal> {
    return (tx || prisma).goal.delete({ where: { id } });
  }
}

export const goalRepository = new GoalRepository();
