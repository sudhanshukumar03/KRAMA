import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

// Core Snapshot Job Logic
export async function runSnapshotJob(forceNew: boolean = false): Promise<{ createdCount: number; updatedCount: number; checkedGoalsCount: number }> {
  const goals = await prisma.goal.findMany({
    include: {
      snapshots: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  });

  const todayStr = new Date().toISOString().split('T')[0];
  let createdCount = 0;
  let updatedCount = 0;

  for (const goal of goals) {
    const latestSnapshot = goal.snapshots[0];
    const latestDateStr = latestSnapshot ? new Date(latestSnapshot.date).toISOString().split('T')[0] : '';

    if (forceNew || latestDateStr !== todayStr) {
      // Create a new snapshot for today (or forced new snapshot for dev testing)
      await prisma.goalProgressSnapshot.create({
        data: {
          goalId: goal.id,
          date: new Date(),
          progress: goal.progress,
        },
      });
      createdCount++;
    } else if (latestSnapshot && latestSnapshot.progress !== goal.progress) {
      // If a snapshot already exists for today but goal progress has changed, keep today's snapshot in sync
      await prisma.goalProgressSnapshot.update({
        where: { id: latestSnapshot.id },
        data: { progress: goal.progress, date: new Date() },
      });
      updatedCount++;
    }
  }

  return { createdCount, updatedCount, checkedGoalsCount: goals.length };
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startSnapshotScheduler(): void {
  if (schedulerInterval) return;
  
  // Initial check after 5 seconds of server startup
  setTimeout(() => {
    runSnapshotJob(false).catch(err => console.error('[SnapshotScheduler] Initial startup check failed:', err));
  }, 5000);

  // Periodic check every 1 hour (3600000 ms)
  schedulerInterval = setInterval(() => {
    runSnapshotJob(false).catch(err => console.error('[SnapshotScheduler] Periodic check failed:', err));
  }, 3600000);
  
  console.log('[SnapshotScheduler] Hourly automated snapshot job initialized.');
}

// Manual Trigger Endpoint for testing & verification
router.post('/trigger-job', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const forceNew = req.body?.forceNew === true || req.query?.forceNew === 'true';
    const result = await runSnapshotJob(forceNew);
    res.json({
      success: true,
      message: `Snapshot job executed successfully.`,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
