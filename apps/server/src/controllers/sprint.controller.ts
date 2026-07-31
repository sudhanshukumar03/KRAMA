import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateSprintSchema, UpdateSprintSchema } from '@krama/validation';

const prisma = new PrismaClient();

export const listSprints = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const sprints = await prisma.sprint.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        project: true,
      },
      orderBy: { startDate: 'desc' },
    });
    
    return res.status(200).json(sprints);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSprint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!sprint || sprint.deletedAt || sprint.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    return res.status(200).json(sprint);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createSprint = async (req: Request, res: Response) => {
  try {
    const data = CreateSprintSchema.parse(req.body);

    const sprint = await prisma.sprint.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        createdBy: req.user!.id,
      },
      include: { project: true },
    });

    return res.status(201).json(sprint);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSprint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateSprintSchema.parse(req.body);

    const existing = await prisma.sprint.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId, startDate, endDate, ...updateData } = data;

    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        ...updateData,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
      include: { project: true },
    });

    return res.status(200).json(sprint);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSprint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const existing = await prisma.sprint.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    await prisma.sprint.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json({ message: 'Sprint deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSprintTasks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const existing = await prisma.sprint.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    const tasks = await prisma.task.findMany({
      where: { sprintId: id, deletedAt: null, workspaceId },
      orderBy: { position: 'asc' },
    });

    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
