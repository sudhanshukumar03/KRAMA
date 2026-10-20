import { prisma } from '../prisma';

/** Bounded, workspace-authorized projections for search and recent suggestions. */
export async function searchWorkspace(workspaceId: string, query: string, limit = 10) {
  const [tasks, documents, goals, projects] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId, deletedAt: null, ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' as const } }, { description: { contains: query, mode: 'insensitive' as const } }] } : { status: { not: 'CANCELED' as const } }) },
      take: limit, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, status: true, description: true, updatedAt: true },
    }),
    prisma.document.findMany({
      where: { space: { workspaceId, deletedAt: null }, deletedAt: null,
        ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' as const } }, { contentMarkdown: { contains: query, mode: 'insensitive' as const } }] } : {}) },
      take: limit, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, subtitle: true, documentType: true, contentMarkdown: true, updatedAt: true },
    }),
    prisma.goal.findMany({
      where: { workspaceId, deletedAt: null, ...(query ? { title: { contains: query, mode: 'insensitive' as const } } : {}) },
      take: limit, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, progress: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: { workspaceId, deletedAt: null,
        ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' as const } }, { problemStatement: { contains: query, mode: 'insensitive' as const } }] } : {}) },
      take: limit, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, status: true, problemStatement: true, updatedAt: true },
    }),
  ]);
  return [
    ...tasks.map(task => ({ id: task.id, title: task.title, type: 'issue' as const, badge: task.status,
      url: `/app/board?task=${encodeURIComponent(task.id)}`, snippet: (task.description || 'Task').slice(0, 160), updatedAt: task.updatedAt })),
    ...documents.map(doc => ({ id: doc.id, title: doc.title, type: 'page' as const, badge: doc.documentType,
      url: `/app/brain?doc=${encodeURIComponent(doc.id)}`, snippet: (doc.subtitle || doc.contentMarkdown || 'Document').slice(0, 160), updatedAt: doc.updatedAt })),
    ...goals.map(goal => ({ id: goal.id, title: goal.title, type: 'goal' as const, badge: `${goal.progress}%`,
      url: `/app/goals?goal=${encodeURIComponent(goal.id)}`, snippet: `${goal.progress}% complete`, updatedAt: goal.updatedAt })),
    ...projects.map(project => ({ id: project.id, title: project.name, type: 'project' as const, badge: project.status,
      url: `/app/projects/${encodeURIComponent(project.id)}`, snippet: (project.problemStatement || 'Project').slice(0, 160), updatedAt: project.updatedAt })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
