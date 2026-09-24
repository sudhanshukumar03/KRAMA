import type { Request, Response } from 'express';
import { CreateProjectSchema, UpdateProjectSchema, ReorderSchema } from '@krama/validation';

import { prisma } from '../prisma';

export const listProjects = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        goal: true,
        _count: {
          select: { tasks: true, documents: true, sprints: true },
        },
      },
      orderBy: { position: 'asc' },
    });
    
    return res.status(200).json(projects);
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const project = await prisma.project.findUnique({
      where: { id },
      include: { goal: true },
    });

    if (!project || project.deletedAt || project.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.status(200).json(project);
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateProjectSchema.parse({ ...req.body, workspaceId });
    
    // Auto-increment position to place at the bottom
    const lastProject = await prisma.project.findFirst({
      where: { workspaceId: data.workspaceId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastProject ? lastProject.position + 1.0 : 1.0;



    const { targetDate, progress, ...cleanData } = data as any;
    const metadata = cleanData.metadata || (targetDate ? { targetDate } : undefined);

    const project = await prisma.project.create({
      data: {
        ...cleanData,
        metadata: metadata ? metadata : undefined,
        position,
        createdBy: req.user!.id,
      },
      include: {
        goal: true,
        _count: {
          select: { tasks: true, documents: true, sprints: true },
        },
      },
    });

    return res.status(201).json(project);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string; if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' }); const data = UpdateProjectSchema.parse(req.body);

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId: bodyWorkspaceId, targetDate, progress, ...updateData } = data as any;



    let metadata = updateData.metadata !== undefined ? updateData.metadata : (existing.metadata as any || {});
    if (targetDate !== undefined) {
      metadata = { ...metadata, targetDate: targetDate || null };
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...updateData,
        metadata,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
      include: {
        goal: true,
        _count: {
          select: { tasks: true, documents: true, sprints: true },
        },
      },
    });

    return res.status(200).json(project);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const sprints = await tx.sprint.findMany({ where: { projectId: id }, select: { id: true } });
      const sprintIds = sprints.map(s => s.id);

      await tx.project.update({
        where: { id },
        data: {
          deletedAt: now,
          updatedBy: req.user!.id,
        },
      });

      await tx.task.updateMany({
        where: {
          OR: [{ projectId: id }, { sprintId: { in: sprintIds } }],
          deletedAt: null
        },
        data: { deletedAt: now, updatedBy: req.user!.id },
      });

      await tx.sprint.updateMany({
        where: { projectId: id, deletedAt: null },
        data: { deletedAt: now, updatedBy: req.user!.id },
      });
    });

    return res.status(200).json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const reorderProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const data = ReorderSchema.parse(req.body);

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        position: data.position,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json(project);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const restoreProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const existing = await prisma.project.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!existing.deletedAt) {
      return res.status(409).json({ message: 'Conflict: nothing to restore' });
    }

    const project = await prisma.$transaction(async (tx) => {
      const sprints = await tx.sprint.findMany({ where: { projectId: id }, select: { id: true } });
      const sprintIds = sprints.map(s => s.id);

      const updatedProject = await tx.project.update({
        where: { id },
        data: {
          deletedAt: null,
          updatedBy: req.user!.id,
        },
        include: {
          goal: true,
          _count: {
            select: { tasks: true, documents: true, sprints: true },
          },
        },
      });

      await tx.task.updateMany({
        where: {
          OR: [{ projectId: id }, { sprintId: { in: sprintIds } }],
          deletedAt: existing.deletedAt
        },
        data: { deletedAt: null, updatedBy: req.user!.id },
      });

      await tx.sprint.updateMany({
        where: { projectId: id, deletedAt: existing.deletedAt },
        data: { deletedAt: null, updatedBy: req.user!.id },
      });

      return updatedProject;
    });

    return res.status(200).json(project);
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};




