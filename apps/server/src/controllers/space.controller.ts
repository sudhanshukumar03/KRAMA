import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export const listSpaces = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
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
    const workspaceId = (req as any).workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    
    const { name, icon, metadata } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return res.status(400).json({ message: 'Space name is required' });
    }
    if (trimmedName.length > 100) {
      return res.status(400).json({ message: 'Space name must be 100 characters or fewer' });
    }
    const space = await prisma.space.create({
      data: {
        name: trimmedName,
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
    // Only validate/apply name when the caller actually sends one; an omitted
    // name leaves it unchanged, but an explicit empty/blank name is rejected
    // rather than silently wiping the space's title.
    let nameUpdate: string | undefined;
    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (!trimmedName) {
        return res.status(400).json({ message: 'Space name cannot be empty' });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({ message: 'Space name must be 100 characters or fewer' });
      }
      nameUpdate = trimmedName;
    }
    const updated = await prisma.space.update({
      where: { id: space.id },
      data: { name: nameUpdate, icon, metadata }
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

      const docs = await tx.document.findMany({ where: { spaceId: space.id }, select: { id: true } });
      const docIds = docs.map(d => d.id);

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

      // Purge embeddings for the space's documents. Soft-deleting the documents
      // doesn't fire the FK cascade (that's hard-delete only), so without this the
      // chunks linger and can still surface in grounded AI / RAG answers — the same
      // gap fixed in DocumentService.deepDelete.
      if (docIds.length > 0) {
        await tx.knowledgeChunk.deleteMany({ where: { documentId: { in: docIds } } });
      }

      if (projectIds.length > 0) {
        await tx.task.updateMany({
          where: {
            projectId: { in: projectIds },
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
