import type { Request, Response } from 'express';
import { CreateDailyLogSchema, UpdateDailyLogSchema } from '@krama/validation';

import { prisma } from '../prisma';

export const listDailyLogs = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const { date, range } = req.query; // date=YYYY-MM-DD, range=7 for last 7 days

    let where: any = {
      workspaceId,
      userId: req.user!.id,
      deletedAt: null,
    };

    if (date) {
      // Find for specific date boundary (UTC)
      const startOfDay = new Date(`${date as string}T00:00:00.000Z`);
      const endOfDay = new Date(`${date as string}T23:59:59.999Z`);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
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
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

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
    const workspaceId =
      (req.headers['x-workspace-id'] as string) ||
      (req.query.workspaceId as string) ||
      req.body.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateDailyLogSchema.parse({ ...req.body, workspaceId });
    const logDate = new Date(data.date);
    logDate.setUTCHours(12, 0, 0, 0); // canonical UTC noon prevents timezone-boundary shifts

    const existing = await prisma.dailyLog.findFirst({
      where: { workspaceId, userId: req.user!.id, date: logDate },
    });

    if (existing) {
      if (!existing.deletedAt) {
        return res.status(409).json({ message: 'Log already exists for this date. Use PATCH to update.' });
      }
      const resurrected = await prisma.dailyLog.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null, updatedBy: req.user!.id },
      });
      return res.status(200).json(resurrected);
    }

    const log = await prisma.dailyLog.create({
      data: { ...data, date: logDate, userId: req.user!.id, createdBy: req.user!.id },
    });
    return res.status(201).json(log);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDailyLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const data = UpdateDailyLogSchema.parse(req.body);

    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || data.workspaceId;
    const existing = await prisma.dailyLog.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || (workspaceId && existing.workspaceId !== workspaceId)) {
      return res.status(404).json({ message: 'Daily Log not found' });
    }

    if (data.version !== undefined && existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version: _version, workspaceId: _workspaceId, date, ...updateData } = data;

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

export const deleteDailyLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const existing = await prisma.dailyLog.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Daily Log not found' });
    }

    await prisma.dailyLog.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json({ message: 'Daily Log deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
