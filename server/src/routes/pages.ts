import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

export function extractTextFromBlocks(blocks: any): string {
  if (!blocks) return '';
  if (typeof blocks === 'string') {
    try {
      blocks = JSON.parse(blocks);
    } catch {
      return blocks;
    }
  }
  let text = '';
  function traverse(node: any) {
    if (!node) return;
    if (typeof node === 'string') {
      text += node + ' ';
      return;
    }
    if (node.text && typeof node.text === 'string') {
      text += node.text + ' ';
    }
    if (Array.isArray(node)) {
      node.forEach(traverse);
    } else if (typeof node === 'object') {
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    }
  }
  traverse(blocks);
  return text.trim();
}

const pageInclude = {
  childPages: true,
  linkedProject: {
    include: {
      issues: true,
      goal: true,
      sprints: true,
    },
  },
};

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pages = await prisma.page.findMany({
      include: pageInclude,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(pages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = await prisma.page.findUnique({
      where: { id: req.params.id },
      include: pageInclude,
    });
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json(page);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, spaceId, icon, blocks, parentPageId, tags, linkedProjectId } = req.body;
    if (!title || !spaceId) {
      res.status(400).json({ error: 'Title and spaceId are required' });
      return;
    }
    const page = await prisma.page.create({
      data: {
        title,
        spaceId,
        icon: icon || null,
        blocks: blocks || null,
        textContent: extractTextFromBlocks(blocks || null),
        parentPageId: parentPageId || null,
        tags: tags || [],
        linkedProjectId: linkedProjectId || null,
      },
      include: pageInclude,
    });
    res.status(201).json(page);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, title, spaceId, icon, blocks, textContent, parentPageId, tags, linkedProjectId } = req.body;
    const page = await prisma.page.create({
      data: {
        ...(id && { id }),
        title,
        spaceId,
        icon: icon || null,
        blocks: blocks || null,
        textContent: textContent || extractTextFromBlocks(blocks),
        parentPageId: parentPageId || null,
        tags: tags || [],
        linkedProjectId: linkedProjectId || null,
      },
      include: pageInclude,
    });
    res.status(201).json(page);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, icon, blocks, parentPageId, tags, linkedProjectId } = req.body;
    const page = await prisma.page.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(icon !== undefined && { icon }),
        ...(blocks !== undefined && { blocks, textContent: extractTextFromBlocks(blocks) }),
        ...(parentPageId !== undefined && { parentPageId }),
        ...(tags !== undefined && { tags }),
        ...(linkedProjectId !== undefined && { linkedProjectId }),
      },
      include: pageInclude,
    });
    res.json(page);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await prisma.page.findUnique({
      where: { id: req.params.id },
      include: pageInclude,
    });
    await prisma.page.updateMany({
      where: { parentPageId: req.params.id },
      data: { parentPageId: null },
    });
    await prisma.page.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Page deleted successfully', snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
