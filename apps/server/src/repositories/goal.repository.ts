import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Goal, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

// Filter the relation counts to non-deleted rows so the goal card's "N projects"
// / "N habits" match the linked lists the client actually renders (both exclude
// soft-deleted). An unfiltered `_count` silently inflated these once a linked
// project or habit was soft-deleted. Mirrors the filtered count in project.controller.
const goalCounts = { _count: { select: { projects: { where: { deletedAt: null } }, habits: { where: { deletedAt: null } } } } } satisfies Prisma.GoalInclude;

const defaultGoalInclude = {
  ...goalCounts,
  habits: { select: { id: true } },
  snapshots: { orderBy: { date: 'asc' as const } },
  childGoals: {
    where: { deletedAt: null },
    include: {
      ...goalCounts,
      habits: { select: { id: true } },
      snapshots: { orderBy: { date: 'asc' as const } },
      childGoals: {
        where: { deletedAt: null },
        include: {
          ...goalCounts,
          habits: { select: { id: true } },
          snapshots: { orderBy: { date: 'asc' as const } },
        }
      }
    }
  }
};

class GoalRepository implements BaseRepository<Goal, Prisma.GoalUncheckedCreateInput, Prisma.GoalUncheckedUpdateInput> {
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

  /**
   * Lightweight variant for consumers that only need scalar fields (link
   * dropdowns, sidebar counts, command palette). Deliberately omits the heavy
   * `defaultGoalInclude` (unbounded per-day snapshots + 3-level nested childGoals)
   * so those surfaces don't pay for data they never render.
   */
  async findManyLiteByWorkspace(workspaceId: string, tx?: TxClient): Promise<Goal[]> {
    return (tx || prisma).goal.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
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
