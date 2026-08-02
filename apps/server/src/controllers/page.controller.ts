import type { Request, Response } from 'express';
import { CreatePageSchema, UpdatePageSchema } from '@krama/validation';

import { prisma } from '../prisma';
import { embeddingQueue } from '../queues';

function extractTextFromBlocks(blocksData: any): string {
  if (!blocksData || !Array.isArray(blocksData.blocks)) return '';
  return blocksData.blocks
    .map((b: any) => b?.data?.text || '')
    .filter(Boolean)
    .join('\n');
}

export const listPages = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    // The frontend typically wants a flat list or tree. Let's return flat and let frontend build the tree,
    // or return top-level pages and their children.
    const pages = await prisma.page.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        childPages: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    return res.status(200).json(pages);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        childPages: {
          where: { deletedAt: null },
        },
        linkedProject: true,
      },
    });

    if (!page || page.deletedAt || page.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Page not found' });
    }

    return res.status(200).json(page);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createPage = async (req: Request, res: Response) => {
  try {
    const data = CreatePageSchema.parse(req.body);

    const page = await prisma.page.create({
      data: {
        ...data,
        createdBy: req.user!.id,
      },
      include: {
        childPages: true,
        linkedProject: true,
      },
    });

    if (page.blocks) {
      const text = extractTextFromBlocks(page.blocks);
      if (text) {
        embeddingQueue.add('upsert', { pageId: page.id, content: text }).catch(console.error);
      }
    }

    return res.status(201).json(page);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = UpdatePageSchema.parse(req.body);

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
      return res.status(404).json({ message: 'Page not found' });
    }

    if (existing.version !== data.version) {
      return res.status(409).json({ message: 'Conflict: version mismatch' });
    }

    const { version, workspaceId, ...updateData } = data;

    const page = await prisma.page.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedBy: req.user!.id,
      },
      include: {
        childPages: true,
        linkedProject: true,
      },
    });

    if (page.blocks) {
      const text = extractTextFromBlocks(page.blocks);
      if (text) {
        embeddingQueue.add('upsert', { pageId: page.id, content: text }).catch(console.error);
      }
    }

    return res.status(200).json(page);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deletePage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const userId = req.user!.id;

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Page not found' });
    }

    // Recursive soft-delete using a raw SQL CTE
    await prisma.$executeRaw`
      WITH RECURSIVE PageHierarchy AS (
        SELECT id FROM "Page" WHERE id = ${id}
        UNION
        SELECT p.id FROM "Page" p
        INNER JOIN PageHierarchy ph ON p."parentPageId" = ph.id
      )
      UPDATE "Page"
      SET "deletedAt" = NOW(), "updatedBy" = ${userId}
      WHERE id IN (SELECT id FROM PageHierarchy)
    `;

    return res.status(200).json({ message: 'Page and children deleted' });
  } catch (error) {
    console.error('Failed to delete page:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const restorePage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId) as string;
    const userId = req.user!.id;

    const existing = await prisma.page.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ message: 'Page not found' });
    }
    if (!existing.deletedAt) {
      return res.status(409).json({ message: 'Conflict: nothing to restore' });
    }

    // Recursive restore using a raw SQL CTE (same as delete but reversed)
    await prisma.$executeRaw`
      WITH RECURSIVE PageHierarchy AS (
        SELECT id FROM "Page" WHERE id = ${id}
        UNION
        SELECT p.id FROM "Page" p
        INNER JOIN PageHierarchy ph ON p."parentPageId" = ph.id
      )
      UPDATE "Page"
      SET "deletedAt" = NULL, "updatedBy" = ${userId}
      WHERE id IN (SELECT id FROM PageHierarchy)
    `;

    return res.status(200).json({ message: 'Page and children restored' });
  } catch (error) {
    console.error('Failed to restore page:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
