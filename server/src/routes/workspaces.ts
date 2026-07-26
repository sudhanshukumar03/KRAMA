import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const workspaces = await prisma.workspace.findMany({
      include: { spaces: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(workspaces);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      workspaces,
      spaces,
      pages,
      goals,
      projects,
      issues,
      sprints,
      roadmapItems,
      habits,
      completions,
      dailyLogs,
      snapshots,
      decisions,
    ] = await Promise.all([
      prisma.workspace.findMany(),
      prisma.space.findMany(),
      prisma.page.findMany(),
      prisma.goal.findMany(),
      prisma.project.findMany(),
      prisma.issue.findMany(),
      prisma.sprint.findMany(),
      prisma.roadmapItem.findMany(),
      prisma.habit.findMany(),
      prisma.habitCompletion.findMany(),
      prisma.dailyLog.findMany(),
      prisma.goalProgressSnapshot.findMany(),
      prisma.decision.findMany(),
    ]);

    res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        workspaces,
        spaces,
        pages,
        goals,
        projects,
        issues,
        sprints,
        roadmapItems,
        habits,
        completions,
        dailyLogs,
        snapshots,
        decisions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: { spaces: true },
    });
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    res.json(workspace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const workspace = await prisma.workspace.create({
      data: { name },
      include: { spaces: true },
    });
    res.status(201).json(workspace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: { name },
      include: { spaces: true },
    });
    res.json(workspace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.workspace.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
