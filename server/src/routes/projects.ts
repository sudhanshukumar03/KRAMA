import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      include: { issues: true, sprints: true, roadmapItems: true, docs: true, goal: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { issues: true, sprints: true, roadmapItems: true, docs: true, goal: true },
    });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, status, problemStatement, spaceId, goalId } = req.body;
    if (!name || !status) {
      res.status(400).json({ error: 'Name and status are required' });
      return;
    }
    const project = await prisma.project.create({
      data: {
        name,
        status,
        problemStatement: problemStatement || null,
        spaceId: spaceId || null,
        goalId: goalId || null,
      },
      include: { issues: true, sprints: true, roadmapItems: true, docs: true, goal: true },
    });
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, status, problemStatement, spaceId, goalId } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(problemStatement !== undefined && { problemStatement }),
        ...(spaceId !== undefined && { spaceId }),
        ...(goalId !== undefined && { goalId }),
      },
      include: { issues: true, sprints: true, roadmapItems: true, docs: true, goal: true },
    });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.page.updateMany({
      where: { linkedProjectId: req.params.id },
      data: { linkedProjectId: null },
    });
    await prisma.project.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
