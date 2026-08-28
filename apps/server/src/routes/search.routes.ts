import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = Router();
router.use(requireAuth);

// GET /search?q=keyword
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || '';

    if (!q) {
      return res.json({ results: [] });
    }
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const [tasks, pages, goals, projects] = await Promise.all([
      prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, status: true, updatedAt: true },
      }),
      prisma.page.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.goal.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          title: { contains: q, mode: 'insensitive' },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, progress: true, updatedAt: true },
      }),
      prisma.project.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, status: true, updatedAt: true },
      }),
    ]);

    const results = [
      ...tasks.map(t => ({ id: t.id, title: t.title, type: 'task' as const, status: t.status, updatedAt: t.updatedAt })),
      ...pages.map(p => ({ id: p.id, title: p.title, type: 'page' as const, updatedAt: p.updatedAt })),
      ...goals.map(g => ({ id: g.id, title: g.title, type: 'goal' as const, updatedAt: g.updatedAt })),
      ...projects.map(p => ({ id: p.id, title: p.name, type: 'project' as const, status: p.status, updatedAt: p.updatedAt })),
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ message: 'Search failed' });
  }
});

export default router;
