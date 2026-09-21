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
    const [tasks, projects, goals, habits, documents] = await Promise.all([
      prisma.task.findMany({ where: baseWhere, select: { id: true, title: true, projectId: true, status: true } }),
      prisma.project.findMany({ where: baseWhere, select: { id: true, name: true, goalId: true, status: true } }),
      prisma.goal.findMany({ where: baseWhere, select: { id: true, title: true, type: true, progress: true } }),
      prisma.habit.findMany({ where: baseWhere, select: { id: true, name: true } }),
      prisma.document.findMany({ where: { space: { workspaceId }, deletedAt: null }, select: { id: true, title: true, projectId: true, parentId: true } }),
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

    // Map Documents
    documents.forEach(d => {
      nodes.push({ id: d.id, label: d.title, title: d.title, type: 'DOCUMENT' });
      if (d.projectId) {
        edges.push({ source: d.id, target: d.projectId, sourceId: d.id, targetId: d.projectId, type: 'references', linkType: 'REFERENCE' });
      }
      if (d.parentId) {
        edges.push({ source: d.id, target: d.parentId, sourceId: d.id, targetId: d.parentId, type: 'child_of', linkType: 'CHILD_OF' });
      }
    });

    // Fetch and map EntityLinks for documents
    const docIds = documents.map(d => d.id);
    if (docIds.length > 0) {
      const entityLinks = await prisma.entityLink.findMany({
        where: {
          sourceType: 'DOCUMENT',
          sourceId: { in: docIds }
        }
      });
      entityLinks.forEach(link => {
        edges.push({
          source: link.sourceId,
          target: link.targetId,
          sourceId: link.sourceId,
          targetId: link.targetId,
          type: link.linkType || 'references',
          linkType: link.linkType || 'REFERENCE'
        });
      });
    }

    // Map Habits
    habits.forEach(h => {
      nodes.push({ id: h.id, label: h.name, title: h.name, type: 'habit' });
    });

    const validNodeIds = new Set(nodes.map(n => n.id));
    const validEdges = edges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));
    const links = validEdges.map(e => ({
      sourceId: e.sourceId || e.source,
      targetId: e.targetId || e.target,
      linkType: e.linkType || e.type || 'REFERENCE'
    }));

    return res.status(200).json({ nodes, edges: validEdges, links });
  } catch (error: any) {
    console.error('[Knowledge Graph] Error fetching graph:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
