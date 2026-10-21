import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Habit, HabitCompletion, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

class HabitRepository implements BaseRepository<Habit, Prisma.HabitUncheckedCreateInput, Prisma.HabitUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient, userId?: string): Promise<Habit | null> {
    return (tx || prisma).habit.findUnique({
      where: { id },
      include: {
        completions: {
          ...(userId ? { where: { userId } } : {}),
          orderBy: { completedAt: 'desc' },
          ...(userId ? {} : { take: 120 }),
        }
      }
    });
  }

  async findAll(options?: Prisma.HabitFindManyArgs, tx?: TxClient): Promise<Habit[]> {
    return (tx || prisma).habit.findMany(options || {});
  }

  async findManyByWorkspace(workspaceId: string, tx?: TxClient, userId?: string) {
    return (tx || prisma).habit.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        completions: {
          ...(userId ? { where: { userId } } : {}),
          orderBy: { completedAt: 'desc' },
          ...(userId ? {} : { take: 120 }),
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.HabitUncheckedCreateInput, tx?: TxClient): Promise<Habit> {
    return (tx || prisma).habit.create({ data });
  }

  async findRecentCompletions(workspaceId: string, userId: string) {
    // Apply the per-habit limit in PostgreSQL using (habitId,userId,date).
    // Old backfills must not push recent days out of the visible history grid.
    return prisma.$queryRaw<HabitCompletion[]>`
      SELECT c.* FROM "Habit" h
      JOIN LATERAL (
        SELECT hc.* FROM "HabitCompletion" hc
        WHERE hc."habitId" = h.id AND hc."userId" = ${userId}
        ORDER BY hc.date DESC LIMIT 120
      ) c ON true
      WHERE h."workspaceId" = ${workspaceId} AND h."deletedAt" IS NULL`;
  }

  async update(id: string, data: Prisma.HabitUncheckedUpdateInput, tx?: TxClient, guard?: Prisma.HabitWhereUniqueInput): Promise<Habit> {
    return (tx || prisma).habit.update({
      where: guard || { id },
      data,
    });
  }

  async delete(id: string, tx?: TxClient): Promise<Habit> {
    return (tx || prisma).habit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addCompletion(data: Prisma.HabitCompletionUncheckedCreateInput, tx?: TxClient): Promise<any> {
    return (tx || prisma).habitCompletion.create({ data });
  }

  async removeCompletionToday(habitId: string, userId: string, targetDate: Date, tx?: TxClient): Promise<void> {
    await (tx || prisma).habitCompletion.deleteMany({
      where: {
        habitId,
        userId,
        date: targetDate,
      }
    });
  }

  async getCompletionCountToday(habitId: string, userId: string, targetDate: Date, tx?: TxClient): Promise<number> {
    return (tx || prisma).habitCompletion.count({
      where: {
        habitId,
        userId,
        date: targetDate,
      }
    });
  }
}

export const habitRepository = new HabitRepository();
