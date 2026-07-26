import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pages = await prisma.page.findMany({
      include: { childPages: true, linkedProject: true },
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
      include: { childPages: true, linkedProject: true },
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
        parentPageId: parentPageId || null,
        tags: tags || [],
        linkedProjectId: linkedProjectId || null,
      },
      include: { childPages: true, linkedProject: true },
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
        ...(blocks !== undefined && { blocks }),
        ...(parentPageId !== undefined && { parentPageId }),
        ...(tags !== undefined && { tags }),
        ...(linkedProjectId !== undefined && { linkedProjectId }),
      },
      include: { childPages: true, linkedProject: true },
    });
    res.json(page);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.page.updateMany({
      where: { parentPageId: req.params.id },
      data: { parentPageId: null },
    });
    await prisma.page.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
