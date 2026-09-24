import type { Request, Response } from 'express';
import { CreateSprintSchema, UpdateSprintSchema } from '@krama/validation';

import { prisma } from '../prisma';

export const listSprints = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
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
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

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
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateSprintSchema.parse({ ...req.body, workspaceId });
    const { goals, ...cleanData } = data as any;
    const metadata = cleanData.metadata || (goals ? { goals } : undefined);

    const sprint = await prisma.sprint.create({
      data: {
        ...cleanData,
        metadata: metadata ? metadata : undefined,
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
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = UpdateSprintSchema.parse({ ...req.body, workspaceId });

    const existing = await prisma.sprint.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId: bodyWid, startDate, endDate, goals, ...updateData } = data as any;
    const metadata = updateData.metadata || (goals ? { goals } : undefined);

    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        ...updateData,
        ...(metadata && { metadata }),
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
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const existing = await prisma.sprint.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    await prisma.$transaction([
      prisma.sprint.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy: req.user!.id,
        },
      }),
      prisma.task.updateMany({
        where: { sprintId: id },
        data: { sprintId: null },
      }),
    ]);

    return res.status(200).json({ message: 'Sprint deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeSprint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const existing = await prisma.sprint.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    const [updatedSprint, releasedTasks] = await prisma.$transaction([
      prisma.sprint.update({
        where: { id },
        data: {
          status: 'completed',
          version: { increment: 1 },
          updatedBy: req.user!.id,
        },
      }),
      prisma.task.updateMany({
        where: {
          sprintId: id,
          status: { notIn: ['DONE', 'CANCELED'] },
        },
        data: { sprintId: null },
      }),
    ]);

    return res.status(200).json({
      success: true,
      sprint: updatedSprint,
      releasedCount: releasedTasks.count,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSprintTasks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

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

export const getSprintReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req as any).workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: { id: true, status: true, priority: true, estimateMinutes: true, metadata: true, updatedAt: true, createdAt: true }
        }
      }
    });

    if (!sprint || sprint.deletedAt || (workspaceId && sprint.workspaceId !== workspaceId)) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    // Check if pre-computed SprintReport exists
    const report = await prisma.sprintReport.findUnique({
      where: { sprintId: id }
    });

    const tasks = sprint.tasks || [];
    const tasksCompleted = tasks.filter(t => t.status === 'DONE').length;
    const tasksPlanned = tasks.length;
    const tasksInProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const tasksTodo = tasks.filter(t => t.status === 'TODO' || t.status === 'BACKLOG').length;
    const getTaskPoints = (t: any) => Number(t.metadata?.points || (t.estimateMinutes ? Math.round(t.estimateMinutes / 60) : 0) || t.points || 0);
    const totalPoints = tasks.reduce((sum, t) => sum + getTaskPoints(t), 0);
    const completedPoints = tasks.filter(t => t.status === 'DONE').reduce((sum, t) => sum + getTaskPoints(t), 0);
    const completionRate = tasksPlanned > 0 ? Math.round((tasksCompleted / tasksPlanned) * 100) : 0;

    const startDate = sprint.startDate ? new Date(sprint.startDate) : new Date(sprint.createdAt);
    const endDate = sprint.endDate ? new Date(sprint.endDate) : new Date(startDate.getTime() + 14 * 86400000);
    const daysTotal = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
    const now = new Date();
    const daysElapsed = Math.min(daysTotal, Math.max(0, Math.round((now.getTime() - startDate.getTime()) / 86400000)));

    const idealRemaining = Math.max(0, Math.round(tasksPlanned - (tasksPlanned / daysTotal) * daysElapsed));
    const actualRemaining = Math.max(0, tasksPlanned - tasksCompleted);

    const isBehind = actualRemaining > idealRemaining;
    const pace = daysElapsed > 0 ? Number((tasksCompleted / daysElapsed).toFixed(2)) : 0;

    const reportData = {
      id: report?.id || `computed-${sprint.id}`,
      sprintId: sprint.id,
      workspaceId: sprint.workspaceId,
      sprintName: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      status: sprint.status,
      generatedAt: report?.generatedAt || new Date(),
      tasksPlanned,
      tasksCompleted,
      tasksInProgress,
      tasksTodo,
      totalPoints,
      completedPoints,
      completionRate,
      daysTotal,
      daysElapsed,
      idealRemaining,
      actualRemaining,
      pace,
      metrics: {
        tasksPlanned,
        tasksCompleted,
        totalPoints,
        completedPoints,
        daysTotal,
        daysElapsed,
        idealRemaining,
        actualRemaining,
        pace,
      },
      burndown: {
        idealRemaining,
        actualRemaining,
        behindOrAhead: isBehind ? 'behind' : 'on-track',
      },
      metadata: report?.metadata || null
    };

    return res.status(200).json(reportData);
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
