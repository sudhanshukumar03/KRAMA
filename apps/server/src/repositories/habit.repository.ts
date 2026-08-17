import type { BaseRepository } from './base.repository';
import { prisma } from '../prisma';
import type { Habit, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';

export class HabitRepository implements BaseRepository<Habit, Prisma.HabitUncheckedCreateInput, Prisma.HabitUncheckedUpdateInput> {
  async findById(id: string, tx?: TxClient): Promise<Habit | null> {
    return (tx || prisma).habit.findUnique({
      where: { id },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 30, // Last 30 completions
        }
      }
    });
  }

  async findAll(options?: Prisma.HabitFindManyArgs, tx?: TxClient): Promise<Habit[]> {
    return (tx || prisma).habit.findMany(options || {});
  }

  async findManyByWorkspace(workspaceId: string, tx?: TxClient): Promise<Habit[]> {
    return (tx || prisma).habit.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 30, // Limit to recent completions
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.HabitUncheckedCreateInput, tx?: TxClient): Promise<Habit> {
    return (tx || prisma).habit.create({ data });
  }

  async update(id: string, data: Prisma.HabitUncheckedUpdateInput, tx?: TxClient): Promise<Habit> {
    return (tx || prisma).habit.update({
      where: { id },
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

  async removeCompletionToday(habitId: string, todayStart: Date, todayEnd: Date, tx?: TxClient): Promise<void> {
    await (tx || prisma).habitCompletion.deleteMany({
      where: {
        habitId,
        completedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      }
    });
  }

  async getCompletionCountToday(habitId: string, todayStart: Date, todayEnd: Date, tx?: TxClient): Promise<number> {
    return (tx || prisma).habitCompletion.count({
      where: {
        habitId,
        completedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      }
    });
  }
}

export const habitRepository = new HabitRepository();
