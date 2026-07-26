import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const goals = await prisma.goal.findMany({
      include: { childGoals: true, linkedProjects: true, habits: true, snapshots: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: req.params.id },
      include: { childGoals: true, linkedProjects: true, habits: true, snapshots: true },
    });
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(goal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, type, targetDate, parentGoalId, progress } = req.body;
    if (!title || !type) {
      res.status(400).json({ error: 'Title and type are required' });
      return;
    }
    const goal = await prisma.goal.create({
      data: {
        title,
        type,
        targetDate: targetDate ? new Date(targetDate) : null,
        parentGoalId: parentGoalId || null,
        progress: progress !== undefined ? Number(progress) : 0,
      },
      include: { childGoals: true, linkedProjects: true, habits: true, snapshots: true },
    });
    res.status(201).json(goal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, type, targetDate, parentGoalId, progress } = req.body;
    const goal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(parentGoalId !== undefined && { parentGoalId }),
        ...(progress !== undefined && { progress: Number(progress) }),
      },
      include: { childGoals: true, linkedProjects: true, habits: true, snapshots: true },
    });
    res.json(goal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.goal.updateMany({
      where: { parentGoalId: req.params.id },
      data: { parentGoalId: null },
    });
    await prisma.project.updateMany({
      where: { goalId: req.params.id },
      data: { goalId: null },
    });
    await prisma.goal.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
