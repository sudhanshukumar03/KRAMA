import type { IssueWithRelations } from '../types/schema';

export const taskMetadata = (task: { metadata?: unknown }): Record<string, any> => task.metadata && typeof task.metadata === 'object' && !Array.isArray(task.metadata) ? task.metadata as Record<string, any> : {};

export function taskBlocker(task: IssueWithRelations, tasks: IssueWithRelations[]) {
  const blocker = task.blockedBy || tasks.find(item => item.id === task.blockedById);
  if (blocker?.deletedAt || (blocker && ['DONE', 'CANCELED'].includes(blocker.status))) return null;
  return task.blockedById ? blocker || { id: task.blockedById, title: 'another task' } : null;
}

export function taskNeedsReview(task: IssueWithRelations, day: string) {
  return !['DONE', 'CANCELED'].includes(task.status) && [task.scheduledDate, task.dueDate].some(date => date && String(date).slice(0, 10) <= day);
}

export const personalButton = 'min-h-11 min-w-11 rounded-xl border border-border-default bg-surface-1 px-3.5 text-sm font-medium text-primary hover:bg-surface-hover hover:border-border-strong shadow-xs transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';
