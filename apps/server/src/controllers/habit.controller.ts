import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateHabitSchema, UpdateHabitSchema, HabitLogSchema } from '@krama/validation';

const prisma = new PrismaClient();

export const listHabits = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const habits = await prisma.habit.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return res.status(200).json(habits);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getHabit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const habit = await prisma.habit.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { completedAt: 'desc' },
          take: 30, // Last 30 days
        },
      },
    });

    if (!habit || habit.deletedAt || habit.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    return res.status(200).json(habit);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createHabit = async (req: Request, res: Response) => {
  try {
    const data = CreateHabitSchema.parse(req.body);

    const habit = await prisma.habit.create({
      data: {
        ...data,
        createdBy: req.user!.id,
      },
    });

    return res.status(201).json(habit);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateHabit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateHabitSchema.parse(req.body);

    const existing = await prisma.habit.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId, ...updateData } = data;

    const habit = await prisma.habit.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json(habit);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteHabit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const existing = await prisma.habit.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    await prisma.habit.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json({ message: 'Habit deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logHabit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    
    // Fallback to today if date not provided
    const payload = req.body.date ? req.body : { date: new Date().toISOString() };
    const data = HabitLogSchema.parse(payload);

    const existing = await prisma.habit.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Check if already logged for this exact date (naive check)
    // In a real app we'd truncate to day boundary
    
    const log = await prisma.habitLog.create({
      data: {
        habitId: id,
        completedAt: new Date(data.date),
      },
    });

    return res.status(201).json(log);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStreak = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const existing = await prisma.habit.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    const logs = await prisma.habitLog.findMany({
      where: { habitId: id },
      orderBy: { completedAt: 'desc' },
    });

    // Simple derived streak calculation
    let currentStreak = 0;
    if (logs.length > 0) {
      let lastDate = new Date(); // Start from today
      lastDate.setHours(0,0,0,0);
      
      let iterDate = new Date(lastDate);

      for (let log of logs) {
        const logDate = new Date(log.completedAt);
        logDate.setHours(0,0,0,0);
        
        const diffDays = Math.round((iterDate.getTime() - logDate.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays === 0) {
          // Logged today, count it
          currentStreak++;
          iterDate.setDate(iterDate.getDate() - 1);
        } else if (diffDays === 1) {
          // Logged yesterday, count it
          currentStreak++;
          iterDate.setDate(iterDate.getDate() - 1);
        } else if (diffDays > 1) {
          // Gap found, streak broken
          break;
        }
      }
    }

    return res.status(200).json({ streak: currentStreak });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
