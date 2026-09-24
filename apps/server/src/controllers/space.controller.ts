import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export const listSpaces = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const spaces = await prisma.space.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(spaces);
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createSpace = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    
    const { name, icon, metadata } = req.body;
    const space = await prisma.space.create({
      data: {
        name,
        icon,
        metadata: metadata || {},
        workspaceId
      }
    });
    return res.status(201).json(space);
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSpace = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = (req as any).workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const space = await prisma.space.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const { name, icon, metadata } = req.body;
    const updated = await prisma.space.update({
      where: { id: space.id },
      data: { name, icon, metadata }
    });
    return res.status(200).json(updated);
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSpace = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = (req as any).workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const space = await prisma.space.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const now = new Date();
    const userId = (req as any).user?.id || 'system';

    await prisma.$transaction(async (tx) => {
      const projects = await tx.project.findMany({ where: { spaceId: space.id }, select: { id: true } });
      const projectIds = projects.map(p => p.id);
      let sprintIds: string[] = [];
      if (projectIds.length > 0) {
        const sprints = await tx.sprint.findMany({ where: { projectId: { in: projectIds } }, select: { id: true } });
        sprintIds = sprints.map(s => s.id);
      }

      await tx.space.update({ 
        where: { id: space.id },
        data: { deletedAt: now }
      });

      await tx.project.updateMany({
        where: { spaceId: space.id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      await tx.goal.updateMany({
        where: { spaceId: space.id, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId }
      });

      await tx.document.updateMany({
        where: { spaceId: space.id, deletedAt: null },
        data: { deletedAt: now, lastEditedById: userId }
      });

      if (projectIds.length > 0) {
        await tx.sprint.updateMany({
          where: { projectId: { in: projectIds }, deletedAt: null },
          data: { deletedAt: now, updatedBy: userId }
        });
        
        await tx.task.updateMany({
          where: {
            OR: [
              { projectId: { in: projectIds } },
              { sprintId: { in: sprintIds } }
            ],
            deletedAt: null
          },
          data: { deletedAt: now, updatedBy: userId }
        });
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
