// @ts-nocheck
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateProjectSchema, UpdateProjectSchema, ReorderSchema } from '@krama/validation';

const prisma = new PrismaClient();

export const listProjects = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        goal: true,
        _count: {
          select: { tasks: true, pages: true, sprints: true },
        },
      },
      orderBy: { position: 'asc' },
    });
    
    return res.status(200).json(projects);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { goal: true },
    });

    if (!project || project.deletedAt || project.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const data = CreateProjectSchema.parse(req.body);
    
    // Auto-increment position to place at the bottom
    const lastProject = await prisma.project.findFirst({
      where: { workspaceId: data.workspaceId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastProject ? lastProject.position + 1.0 : 1.0;

    const project = await prisma.project.create({
      data: {
        ...data,
        position,
        createdBy: req.user!.id,
      },
      include: {
        goal: true,
        _count: {
          select: { tasks: true, pages: true, sprints: true },
        },
      },
    });

    return res.status(201).json(project);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateProjectSchema.parse(req.body);

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId, ...updateData } = data;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
      include: {
        goal: true,
        _count: {
          select: { tasks: true, pages: true, sprints: true },
        },
      },
    });

    return res.status(200).json(project);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // We expect workspaceId in query for auth middleware, or we can just look it up.
    // Auth middleware `requireWorkspaceRole` expects `workspaceId` in params or body.
    // Wait, if it's in body, DELETE requests usually don't have body. We should rely on req.query.workspaceId or header.
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: req.user!.id,
      },
    });

    return res.status(200).json({ message: 'Project deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const reorderProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    // TODO: Stage X - periodic position rebalance job if precision gets too high.

    return res.status(200).json(project);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
