import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Habit, Prisma } from '@prisma/client';
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

  async findManyByWorkspace(workspaceId: string, tx?: TxClient, userId?: string): Promise<Habit[]> {
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
