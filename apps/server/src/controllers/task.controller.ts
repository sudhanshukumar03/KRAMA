import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateTaskSchema, UpdateTaskSchema, ReorderSchema } from '@krama/validation';

const prisma = new PrismaClient();

export const listTasks = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const { projectId, sprintId, status } = req.query;

    const where: any = {
      workspaceId,
      deletedAt: null,
    };

    if (projectId) where.projectId = projectId as string;
    if (sprintId) where.sprintId = sprintId as string;
    if (status) where.status = status as string;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: true,
        sprint: true,
      },
      orderBy: { position: 'asc' },
    });
    
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        sprint: true,
      },
    });

    if (!task || task.deletedAt || task.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const data = CreateTaskSchema.parse(req.body);
    
    const lastTask = await prisma.task.findFirst({
      where: { workspaceId: data.workspaceId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastTask ? lastTask.position + 1.0 : 1.0;

    const task = await prisma.task.create({
      data: {
        ...data,
        position,
        createdBy: req.user!.id,
      },
      include: {
        project: true,
        sprint: true,
      },
    });

    return res.status(201).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateTaskSchema.parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId, ...updateData } = data;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
      include: {
        project: true,
        sprint: true,
      },
    });

    return res.status(200).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const reorderTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = ReorderSchema.parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        position: data.position,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
    });

    // TODO: Stage X - periodic position rebalance job

    return res.status(200).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'done',
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
    });

    // TODO: Stage 4 event emission
    // EventDispatcher.emit('TaskCompleted', task);

    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
