import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getKnowledgeGraph = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    // CRITICAL: Explicit cross-workspace check and soft-delete filter
    const baseWhere = { workspaceId, deletedAt: null };

    // Fetch all nodes
    const [tasks, projects, goals, habits, pages] = await Promise.all([
      prisma.task.findMany({ where: baseWhere, select: { id: true, title: true, projectId: true, status: true } }),
      prisma.project.findMany({ where: baseWhere, select: { id: true, name: true, goalId: true, status: true } }),
      prisma.goal.findMany({ where: baseWhere, select: { id: true, title: true, type: true, progress: true } }),
      prisma.habit.findMany({ where: baseWhere, select: { id: true, name: true } }),
      prisma.page.findMany({ where: baseWhere, select: { id: true, title: true, projectId: true, parentId: true } }),
    ]);

    const nodes: any[] = [];
    const edges: any[] = [];

    // Map Goals
    goals.forEach(g => {
      nodes.push({ id: g.id, label: g.title, type: 'goal', goalType: g.type, progress: g.progress });
    });

    // Map Projects
    projects.forEach(p => {
      nodes.push({ id: p.id, label: p.name, type: 'project', status: p.status });
      if (p.goalId) {
        edges.push({ source: p.id, target: p.goalId, type: 'belongs_to' });
      }
    });

    // Map Tasks
    tasks.forEach(t => {
      nodes.push({ id: t.id, label: t.title, type: 'task', status: t.status });
      if (t.projectId) {
        edges.push({ source: t.id, target: t.projectId, type: 'belongs_to' });
      }
    });

    // Map Pages
    pages.forEach(p => {
      nodes.push({ id: p.id, label: p.title, type: 'page' });
      if (p.projectId) {
        edges.push({ source: p.id, target: p.projectId, type: 'references' });
      }
      if (p.parentId) {
        edges.push({ source: p.id, target: p.parentId, type: 'child_of' });
      }
    });

    // Map Habits
    habits.forEach(h => {
      nodes.push({ id: h.id, label: h.name, type: 'habit' });
    });

    return res.status(200).json({ nodes, edges });
  } catch (error: any) {
    console.error('[Knowledge Graph] Error fetching graph:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
