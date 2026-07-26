import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.dailyLog.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const log = await prisma.dailyLog.findUnique({
      where: { id: req.params.id },
    });
    if (!log) {
      res.status(404).json({ error: 'DailyLog not found' });
      return;
    }
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date, wins, blockers, mood, energy, deepWorkMinutes, notes } = req.body;
    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }
    const log = await prisma.dailyLog.create({
      data: {
        date: new Date(date),
        wins: wins || [],
        blockers: blockers || [],
        mood: mood || null,
        energy: energy || null,
        deepWorkMinutes: deepWorkMinutes !== undefined ? Number(deepWorkMinutes) : 0,
        notes: notes || null,
      },
    });
    res.status(201).json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date, wins, blockers, mood, energy, deepWorkMinutes, notes } = req.body;
    const log = await prisma.dailyLog.update({
      where: { id: req.params.id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(wins !== undefined && { wins }),
        ...(blockers !== undefined && { blockers }),
        ...(mood !== undefined && { mood }),
        ...(energy !== undefined && { energy }),
        ...(deepWorkMinutes !== undefined && { deepWorkMinutes: Number(deepWorkMinutes) }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.dailyLog.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
