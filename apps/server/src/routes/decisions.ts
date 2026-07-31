import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

const decisionInclude = {
  linkedProject: {
    select: {
      id: true,
      name: true,
    },
  },
};

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const q = req.query.q as string | undefined;

    const where: any = {};
    if (projectId && projectId !== 'all') {
      where.linkedProjectId = projectId;
    }
    if (q && q.trim()) {
      const qStr = q.trim();
      where.OR = [
        { title: { contains: qStr, mode: 'insensitive' } },
        { context: { contains: qStr, mode: 'insensitive' } },
        { reasoning: { contains: qStr, mode: 'insensitive' } },
        { outcome: { contains: qStr, mode: 'insensitive' } },
      ];
    }

    const decisions = await prisma.decision.findMany({
      where,
      include: decisionInclude,
      orderBy: { date: 'desc' },
    });
    res.json(decisions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const decision = await prisma.decision.findUnique({
      where: { id: req.params.id },
      include: decisionInclude,
    });
    if (!decision) {
      res.status(404).json({ error: 'Decision not found' });
      return;
    }
    res.json(decision);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, context, reasoning, alternativesConsidered, outcome, date, linkedProjectId } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    const decision = await prisma.decision.create({
      data: {
        title,
        context: context || null,
        reasoning: reasoning || null,
        alternativesConsidered: alternativesConsidered || [],
        outcome: outcome || null,
        date: date ? new Date(date) : new Date(),
        linkedProjectId: linkedProjectId || null,
      },
      include: decisionInclude,
    });
    res.status(201).json(decision);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, title, context, reasoning, alternativesConsidered, outcome, date, linkedProjectId } = req.body;
    const decision = await prisma.decision.create({
      data: {
        ...(id && { id }),
        title,
        context: context || null,
        reasoning: reasoning || null,
        alternativesConsidered: alternativesConsidered || [],
        outcome: outcome || null,
        date: date ? new Date(date) : new Date(),
        linkedProjectId: linkedProjectId || null,
      },
      include: decisionInclude,
    });
    res.status(201).json(decision);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, context, reasoning, alternativesConsidered, outcome, date, linkedProjectId } = req.body;
    const decision = await prisma.decision.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(context !== undefined && { context }),
        ...(reasoning !== undefined && { reasoning }),
        ...(alternativesConsidered !== undefined && { alternativesConsidered }),
        ...(outcome !== undefined && { outcome }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(linkedProjectId !== undefined && { linkedProjectId }),
      },
      include: decisionInclude,
    });
    res.json(decision);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await prisma.decision.findUnique({
      where: { id: req.params.id },
      include: decisionInclude,
    });
    await prisma.decision.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Decision deleted successfully', snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
