import express, { type Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

const projectInclude = {
  issues: true,
  sprints: true,
  roadmapItems: true,
  docs: true,
  goal: {
    include: {
      snapshots: {
        orderBy: { date: 'desc' as const },
        take: 20,
      },
    },
  },
  _count: {
    select: {
      issues: true,
      sprints: true,
      roadmapItems: true,
      docs: true,
    },
  },
};

router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      include: projectInclude,
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
      include: projectInclude,
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
      include: projectInclude,
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
      include: projectInclude,
    });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        issues: true,
        sprints: true,
        roadmapItems: true,
      },
    });
    await prisma.page.updateMany({
      where: { linkedProjectId: req.params.id },
      data: { linkedProjectId: null },
    });
    await prisma.project.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Project deleted successfully', snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, name, status, problemStatement, spaceId, goalId, issues = [], sprints = [], roadmapItems = [] } = req.body;
    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          ...(id && { id }),
          name,
          status: status || 'planned',
          problemStatement: problemStatement || null,
          spaceId: spaceId || null,
          goalId: goalId || null,
        },
      });
      for (const s of sprints) {
        await tx.sprint.create({
          data: {
            ...(s.id && { id: s.id }),
            name: s.name,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            projectId: p.id,
          },
        });
      }
      for (const r of roadmapItems) {
        await tx.roadmapItem.create({
          data: {
            ...(r.id && { id: r.id }),
            title: r.title,
            version: r.version || null,
            order: r.order || 0,
            status: r.status || 'planned',
            projectId: p.id,
          },
        });
      }
      for (const i of issues) {
        await tx.issue.create({
          data: {
            ...(i.id && { id: i.id }),
            title: i.title,
            description: i.description || null,
            status: i.status || 'todo',
            priority: i.priority || 'medium',
            projectId: p.id,
            sprintId: i.sprintId || null,
            assignee: i.assignee || null,
          },
        });
      }
      return await tx.project.findUnique({
        where: { id: p.id },
        include: projectInclude,
      });
    });
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
