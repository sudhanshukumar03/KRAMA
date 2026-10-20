import { runInTransaction, prisma, type TxClient } from '../prisma';
import { reportingClock, shiftDay, validDayKey } from './reportingTime';

const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
function invalid(message: string, statusCode = 400): never { throw Object.assign(new Error(message), { statusCode }); }
const logKey = (workspaceId: string, userId: string, date: string) => ({ userId_workspaceId_date: { userId, workspaceId, date: new Date(`${date}T00:00:00.000Z`) } });

export function personalDay(log: { metadata?: unknown; version?: number } | null) {
  const plan = record(record(log?.metadata).personalDay);
  return { taskIds: Array.isArray(plan.taskIds) ? plan.taskIds.filter((id: unknown) => typeof id === 'string').slice(0, 3) as string[] : [], decisions: record(plan.decisions), reviewedAt: typeof plan.reviewedAt === 'string' ? plan.reviewedAt : null, revision: log?.version || 0 };
}

export async function getPersonalDay(workspaceId: string, userId: string, date: string) {
  if (!validDayKey(date)) invalid('Choose a valid date.');
  return personalDay(await prisma.dailyLog.findUnique({ where: logKey(workspaceId, userId, date) }));
}

/** Called under the workspace lock by an explicit task replan. Keep past reviews. */
export async function clearTodayTaskReview(tx: TxClient, workspaceId: string, userId: string, taskId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { metadata: true, countryCode: true } });
  const date = reportingClock(user).dateKey(new Date());
  const where = logKey(workspaceId, userId, date);
  const log = await tx.dailyLog.findUnique({ where });
  const { revision: _, ...plan } = personalDay(log);
  if (!plan.decisions[taskId]) return;
  delete plan.decisions[taskId];
  await tx.dailyLog.update({ where, data: { metadata: { ...record(log?.metadata), personalDay: plan }, version: { increment: 1 }, updatedBy: userId } });
}

export async function savePersonalDay(workspaceId: string, userId: string, date: string, input: { taskIds?: string[]; expectedRevision?: number; review?: { taskId: string; version: number; action: 'tomorrow' | 'backlog' | 'cancel' } }) {
  if (!validDayKey(date)) invalid('Choose a valid date.');
  return runInTransaction(async (tx, publish) => {
    // Serializes first-time log creation and priority edits from multiple tabs.
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    const where = logKey(workspaceId, userId, date);
    const existing = await tx.dailyLog.findUnique({ where });
    const { revision, ...plan } = personalDay(existing);
    if (input.expectedRevision !== undefined && input.expectedRevision !== revision) invalid('Your daily plan changed in another tab. Refresh and try again.', 409);
    if (input.taskIds) {
      if (input.taskIds.length > 3 || new Set(input.taskIds).size !== input.taskIds.length) invalid('Choose up to three different tasks.');
      const tasks = await tx.task.findMany({ where: { id: { in: input.taskIds }, workspaceId, deletedAt: null, status: { not: 'CANCELED' } }, select: { id: true, status: true, metadata: true, version: true, projectId: true } });
      if (tasks.length !== input.taskIds.length) invalid('Choose tasks from this workspace. Refresh if a task was removed.');
      for (const task of tasks) {
        delete plan.decisions[task.id];
        if (task.status === 'BACKLOG' || record(task.metadata).inbox === true) {
          const updated = await tx.task.update({ where: { id: task.id, workspaceId, version: task.version }, data: { status: task.status === 'BACKLOG' ? 'TODO' : task.status, metadata: { ...record(task.metadata), inbox: false }, version: { increment: 1 }, updatedBy: userId } }).catch(error => { if (error.code === 'P2025') invalid('This task changed. Refresh and try again.', 409); throw error; });
          await tx.activityLog.create({ data: { workspaceId, userId, action: 'TASK_UPDATED', entityType: 'Task', entityId: task.id, metadata: { reviewDate: date, title: updated.title } } });
          publish('TASK_UPDATED', { previousProjectId: task.projectId, taskId: task.id, workspaceId, userId, task: updated });
        }
      }
      plan.taskIds = input.taskIds;
    }
    if (input.review) {
      const { taskId, version, action } = input.review;
      const task = await tx.task.findFirst({ where: { id: taskId, workspaceId, deletedAt: null } });
      if (!task || ['DONE', 'CANCELED'].includes(task.status)) invalid('This task is no longer open. Refresh the review.', 409);
      if (task.version !== version) invalid('This task changed. Refresh and try again.', 409);
      const data = action === 'tomorrow'
        ? { scheduledDate: new Date(`${shiftDay(date, 1)}T12:00:00.000Z`), status: task.status === 'BACKLOG' ? 'TODO' as const : task.status }
        : { scheduledDate: null, status: action === 'backlog' ? 'BACKLOG' as const : 'CANCELED' as const };
      const updated = await tx.task.update({ where: { id: taskId, workspaceId, version }, data: { ...data, metadata: { ...record(task.metadata), inbox: false }, version: { increment: 1 }, updatedBy: userId } }).catch(error => { if (error.code === 'P2025') invalid('This task changed. Refresh and try again.', 409); throw error; });
      await tx.activityLog.create({ data: { workspaceId, userId, action: 'TASK_UPDATED', entityType: 'Task', entityId: taskId, metadata: { title: task.title, reviewAction: action, reviewDate: date } } });
      plan.taskIds = plan.taskIds.filter(id => id !== taskId);
      plan.decisions[taskId] = { action, at: new Date().toISOString() };
      publish('TASK_UPDATED', { previousProjectId: task.projectId, taskId, workspaceId, userId, task: updated });
    }
    const metadata = { ...record(existing?.metadata), personalDay: plan };
    const saved = await tx.dailyLog.upsert({ where, create: { ...where.userId_workspaceId_date, wins: [], blockers: [], metadata, createdBy: userId }, update: { metadata, version: { increment: 1 }, updatedBy: userId }, select: { version: true } });
    return { ...plan, revision: saved.version };
  });
}
