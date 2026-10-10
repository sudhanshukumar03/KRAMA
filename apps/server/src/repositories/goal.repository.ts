import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Goal, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

// Filter the relation counts to non-deleted rows so the goal card's "N projects"
// / "N habits" match the linked lists the client actually renders (both exclude
// soft-deleted). An unfiltered `_count` silently inflated these once a linked
// project or habit was soft-deleted. Mirrors the filtered count in project.controller.
const goalCounts = (workspaceId: string) => ({ _count: { select: { projects: { where: { deletedAt: null, workspaceId } }, habits: { where: { deletedAt: null, workspaceId } } } } } satisfies Prisma.GoalInclude);

const defaultGoalInclude = (workspaceId: string) => ({
  ...goalCounts(workspaceId),
  habits: { where: { workspaceId, deletedAt: null }, select: { id: true } },
  snapshots: { orderBy: { date: 'asc' as const } },
  childGoals: {
    where: { deletedAt: null, workspaceId },
    include: {
      ...goalCounts(workspaceId),
      habits: { where: { workspaceId, deletedAt: null }, select: { id: true } },
      snapshots: { orderBy: { date: 'asc' as const } },
      childGoals: {
        where: { deletedAt: null, workspaceId },
        include: {
          ...goalCounts(workspaceId),
          habits: { where: { workspaceId, deletedAt: null }, select: { id: true } },
          snapshots: { orderBy: { date: 'asc' as const } },
        }
      }
    }
  }
});

class GoalRepository implements BaseRepository<Goal, Prisma.GoalUncheckedCreateInput, Prisma.GoalUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Goal | null> {
    const scope = await (tx || prisma).goal.findUnique({ where: { id }, select: { workspaceId: true } });
    if (!scope) return null;
    return (tx || prisma).goal.findUnique({
      where: { id },
      include: defaultGoalInclude(scope.workspaceId),
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
      include: defaultGoalInclude(workspaceId),
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
      include: defaultGoalInclude(data.workspaceId),
    });
  }

  async update(id: string, data: Prisma.GoalUncheckedUpdateInput, tx?: TxClient, guard?: Prisma.GoalWhereUniqueInput): Promise<Goal> {
    const scope = await (tx || prisma).goal.findUniqueOrThrow({ where: { id }, select: { workspaceId: true } });
    return (tx || prisma).goal.update({
      where: guard || { id },
      data,
      include: defaultGoalInclude(scope.workspaceId),
    });
  }

  async delete(id: string, tx?: TxClient): Promise<Goal> {
    return (tx || prisma).goal.delete({ where: { id } });
  }
}

export const goalRepository = new GoalRepository();
