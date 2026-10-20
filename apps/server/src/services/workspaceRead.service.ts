import { prisma } from '../prisma';

/** Small navigation projection; never load full tasks, notes or habit histories for badges. */
export async function workspaceSummary(workspaceId: string) {
  const activeTask = { workspaceId, deletedAt: null, status: { notIn: ['DONE', 'CANCELED'] as ('DONE' | 'CANCELED')[] } };
  const activeDocument = { deletedAt: null, space: { workspaceId, deletedAt: null } };
  const [openIssues, projects, goals, habits, documents, inboxTasks, inboxDocuments] = await Promise.all([
    prisma.task.count({ where: activeTask }),
    prisma.project.count({ where: { workspaceId, deletedAt: null, status: 'active' } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM "Goal" WHERE "workspaceId" = ${workspaceId}
      AND "deletedAt" IS NULL AND "parentGoalId" IS NULL AND progress < 100
      AND COALESCE(metadata->>'status', 'ACTIVE') NOT IN ('COMPLETED', 'CANCELED')`,
    prisma.habit.count({ where: { workspaceId, deletedAt: null } }),
    prisma.document.count({ where: activeDocument }),
    prisma.task.count({ where: { ...activeTask, metadata: { path: ['inbox'], equals: true } } }),
    prisma.document.count({ where: { ...activeDocument, statusBadges: { has: 'Inbox' } } }),
  ]);
  return { openIssues, projects, goals: Number(goals[0]?.count || 0), habits, documents, inbox: inboxTasks + inboxDocuments };
}
