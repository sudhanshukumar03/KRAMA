import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const habits = await prisma.habit.findMany({
      include: { linkedGoal: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(habits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const habit = await prisma.habit.findUnique({
      where: { id: req.params.id },
      include: { linkedGoal: true },
    });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    res.json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, cadence, linkedGoalId, category, timeOfDay, difficulty, duration, streak } = req.body;
    if (!name || !cadence) {
      res.status(400).json({ error: 'Name and cadence are required' });
      return;
    }
    const habit = await prisma.habit.create({
      data: {
        name,
        cadence,
        linkedGoalId: linkedGoalId || null,
        category: category || null,
        timeOfDay: timeOfDay || null,
        difficulty: difficulty || null,
        duration: duration !== undefined ? Number(duration) : null,
        streak: streak !== undefined ? Number(streak) : 0,
      },
      include: { linkedGoal: true },
    });
    res.status(201).json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, cadence, linkedGoalId, category, timeOfDay, difficulty, duration, streak, lastCompletedAt } = req.body;
    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(cadence !== undefined && { cadence }),
        ...(linkedGoalId !== undefined && { linkedGoalId }),
        ...(category !== undefined && { category }),
        ...(timeOfDay !== undefined && { timeOfDay }),
        ...(difficulty !== undefined && { difficulty }),
        ...(duration !== undefined && { duration: duration !== null ? Number(duration) : null }),
        ...(streak !== undefined && { streak: Number(streak) }),
        ...(lastCompletedAt !== undefined && { lastCompletedAt: lastCompletedAt ? new Date(lastCompletedAt) : null }),
      },
      include: { linkedGoal: true },
    });
    res.json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.habit.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: {
        streak: existing.streak + 1,
        lastCompletedAt: new Date(),
      },
      include: { linkedGoal: true },
    });
    res.json(habit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.habit.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
