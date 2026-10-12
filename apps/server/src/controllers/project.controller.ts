import type { Request, Response } from 'express';
import { CreateProjectSchema, UpdateProjectSchema, ReorderSchema } from '@krama/validation';
import type { Prisma } from '@prisma/client';

import { prisma } from '../prisma';
import { goalService } from '../services/goal.service';
import { socketService } from '../services/socket.service';

// Shared include for project responses. The task `_count` is filtered to
// countable tasks (non-deleted, CANCELED excluded) so the denominator matches
// what the board list returns and what goal auto-progress derives — otherwise
// soft-deleted/canceled tickets silently inflate the total and depress the
// progress % shown on the Projects card, the ProjectDetail page, and the Goal
// drawer's "linked tasks". Documents likewise exclude soft-deleted rows.
const projectInclude = {
  goal: true,
  _count: {
    select: {
      tasks: { where: { deletedAt: null, status: { not: 'CANCELED' } } },
      documents: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.ProjectInclude;

async function validGoal(goalId: string | null | undefined, workspaceId: string) {
  return !goalId || !!await prisma.goal.findFirst({ where: { id: goalId, workspaceId, deletedAt: null }, select: { id: true } });
}

// Older invalid links must not expose another workspace's goal in responses.
function safeProject<T extends { workspaceId: string; goal: any }>(project: T): T {
  return project.goal && (project.goal.workspaceId !== project.workspaceId || project.goal.deletedAt)
    ? { ...project, goal: null } : project;
}

export const listProjects = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: projectInclude,
      orderBy: { position: 'asc' },
    });
    
    return res.status(200).json(projects.map(safeProject));
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
      include: { ...projectInclude, milestones: { where: { userId: req.user!.id }, orderBy: { date: 'asc' } } },
    });

    if (!project || project.deletedAt || project.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.status(200).json(safeProject(project));
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || (req.body.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const data = CreateProjectSchema.parse({ ...req.body, workspaceId });
    if (!await validGoal(data.goalId, workspaceId)) return res.status(400).json({ message: 'Linked goal must be active in this workspace' });
    
    // Auto-increment position to place at the bottom
    const lastProject = await prisma.project.findFirst({
      where: { workspaceId: data.workspaceId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = lastProject ? lastProject.position + 1.0 : 1.0;



    const { targetDate, progress: _progress, skillIds: _skillIds, description, color, ...cleanData } = data as any;
    let metadata = cleanData.metadata || {};
    if (targetDate !== undefined) metadata.targetDate = targetDate;
    if (description !== undefined) metadata.description = description;
    if (color !== undefined) metadata.color = color;

    const project = await prisma.project.create({
      data: {
        ...cleanData,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        position,
        createdBy: req.user!.id,
      },
      include: projectInclude,
    });

    if (project.goalId) {
      await goalService.recomputeAutoProgress(project.goalId, req.user!.id).catch(() => {});
    }

    if (project.workspaceId) {
      socketService.emitToWorkspace(project.workspaceId, 'project:created', { projectId: project.id, workspaceId: project.workspaceId, goalId: project.goalId });
    }

    return res.status(201).json(safeProject(project));
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

    if (!await validGoal(data.goalId === undefined ? existing.goalId : data.goalId, workspaceId)) return res.status(400).json({ message: 'Linked goal must be active in this workspace' });

    const { version: _version, workspaceId: _bodyWorkspaceId, targetDate, progress: _progress, skillIds: _skillIds, description, color, ...updateData } = data as any;

    let metadata = { ...(existing.metadata as any), ...updateData.metadata };
    // This marker is server-owned. A deliberate goal choice cancels Undo recovery.
    delete metadata.goalUndo;
    if (data.goalId === undefined && (existing.metadata as any)?.goalUndo) metadata.goalUndo = (existing.metadata as any).goalUndo;
    if (targetDate !== undefined) {
      metadata = { ...metadata, targetDate: targetDate || null };
    }
    if (description !== undefined) {
      metadata = { ...metadata, description: description || null };
    }
    if (color !== undefined) {
      metadata = { ...metadata, color: color || null };
    }

    const project = await prisma.project.update({
      where: { id, workspaceId, deletedAt: null, version: data.version },
      data: {
        ...updateData,
        metadata,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
      include: projectInclude,
    });

    // A project's tasks feed a linked goal's auto-progress. If the goal link changed,
    // refresh both the old and new goal (recompute no-ops on manual goals).
    if (existing.goalId !== project.goalId) {
      for (const gid of [existing.goalId, project.goalId]) {
        if (gid && await validGoal(gid, workspaceId)) await goalService.recomputeAutoProgress(gid, req.user!.id).catch(() => {});
      }
    }

    if (project.workspaceId) {
      socketService.emitToWorkspace(project.workspaceId, 'project:updated', { projectId: project.id, workspaceId: project.workspaceId, goalId: project.goalId });
    }

    return res.status(200).json(safeProject(project));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(409).json({ message: 'Conflict: project changed; reload and try again' });
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
      await tx.project.update({
        where: { id },
        data: {
          deletedAt: now,
          version: { increment: 1 },
          updatedBy: req.user!.id,
        },
      });

      await tx.task.updateMany({
        where: {
          projectId: id,
          deletedAt: null
        },
        data: { deletedAt: now, updatedBy: req.user!.id },
      });

      // Milestones remain attached for Undo. Planner reads/mutations exclude
      // deleted projects; a permanent workspace deletion still cascades them.
    });

    // Its tasks were just soft-deleted; refresh the linked goal's auto-progress.
    if (existing.goalId && await validGoal(existing.goalId, workspaceId)) await goalService.recomputeAutoProgress(existing.goalId, req.user!.id).catch(() => {});

    if (workspaceId) {
      socketService.emitToWorkspace(workspaceId, 'project:deleted', { projectId: id, workspaceId, goalId: existing.goalId });
    }

    return res.status(200).json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const reorderProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const workspaceId = req.headers['x-workspace-id'] as string;
    const data = ReorderSchema.parse({ ...req.body, workspaceId });

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const project = await prisma.project.update({
      where: { id, workspaceId, deletedAt: null, version: data.version },
      data: {
        position: data.position,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
      include: projectInclude,
    });

    return res.status(200).json(safeProject(project));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(409).json({ message: 'Conflict: project changed; reload and try again' });
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
      const updatedProject = await tx.project.update({
        where: { id },
        data: {
          deletedAt: null,
          version: { increment: 1 },
          updatedBy: req.user!.id,
        },
        include: projectInclude,
      });

      await tx.task.updateMany({
        where: {
          projectId: id,
          deletedAt: existing.deletedAt
        },
        data: { deletedAt: null, updatedBy: req.user!.id },
      });

      return updatedProject;
    });

    // Its tasks were just restored; refresh the linked goal's auto-progress.
    if (existing.goalId && await validGoal(existing.goalId, workspaceId)) await goalService.recomputeAutoProgress(existing.goalId, req.user!.id).catch(() => {});

    if (project.workspaceId) {
      socketService.emitToWorkspace(project.workspaceId, 'project:restored', { projectId: project.id, workspaceId: project.workspaceId, goalId: project.goalId });
    }

    return res.status(200).json(safeProject(project));
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};




