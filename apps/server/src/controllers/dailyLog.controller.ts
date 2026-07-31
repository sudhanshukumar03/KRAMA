import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateDailyLogSchema, UpdateDailyLogSchema } from '@krama/validation';

const prisma = new PrismaClient();

export const listDailyLogs = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const { date, range } = req.query; // date=YYYY-MM-DD, range=7 for last 7 days

    let where: any = {
      workspaceId,
      userId: req.user!.id,
      deletedAt: null,
    };

    if (date) {
      // Find for specific date boundary
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      where.date = {
        gte: startOfDay,
        lt: endOfDay,
      };
    } else if (range) {
      const days = parseInt(range as string, 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.date = {
        gte: startDate,
      };
    }

    const logs = await prisma.dailyLog.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDailyLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const log = await prisma.dailyLog.findUnique({
      where: { id },
    });

    if (!log || log.deletedAt || log.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Daily Log not found' });
    }

    return res.status(200).json(log);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDailyLog = async (req: Request, res: Response) => {
  try {
    const data = CreateDailyLogSchema.parse(req.body);

    const logDate = new Date(data.date);
    logDate.setHours(0, 0, 0, 0);

    // Check if log already exists for this date and user
    const existing = await prisma.dailyLog.findFirst({
      where: {
        workspaceId: data.workspaceId,
        userId: req.user!.id,
        date: logDate,
        deletedAt: null,
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'Log already exists for this date. Use PATCH to update.' });
    }

    const log = await prisma.dailyLog.create({
      data: {
        ...data,
        date: logDate,
        userId: req.user!.id,
        createdBy: req.user!.id,
      },
    });

    return res.status(201).json(log);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDailyLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateDailyLogSchema.parse(req.body);

    const existing = await prisma.dailyLog.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Daily Log not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId, date, ...updateData } = data;

    const log = await prisma.dailyLog.update({
      where: { id },
      data: {
        ...updateData,
        ...(date && { date: new Date(date) }),
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json(log);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
