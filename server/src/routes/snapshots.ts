import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshots = await prisma.goalProgressSnapshot.findMany({
      include: { goal: true },
      orderBy: { date: 'desc' },
    });
    res.json(snapshots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await prisma.goalProgressSnapshot.findUnique({
      where: { id: req.params.id },
      include: { goal: true },
    });
    if (!snapshot) {
      res.status(404).json({ error: 'GoalProgressSnapshot not found' });
      return;
    }
    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { goalId, date, progress } = req.body;
    if (!goalId || !date || progress === undefined) {
      res.status(400).json({ error: 'goalId, date, and progress are required' });
      return;
    }
    const snapshot = await prisma.goalProgressSnapshot.create({
      data: {
        goalId,
        date: new Date(date),
        progress: Number(progress),
      },
      include: { goal: true },
    });
    res.status(201).json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { goalId, date, progress } = req.body;
    const snapshot = await prisma.goalProgressSnapshot.update({
      where: { id: req.params.id },
      data: {
        ...(goalId !== undefined && { goalId }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(progress !== undefined && { progress: Number(progress) }),
      },
      include: { goal: true },
    });
    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.goalProgressSnapshot.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
