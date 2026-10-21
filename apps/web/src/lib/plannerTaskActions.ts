import type { TaskUpdateInput } from '../types/schema';

type PlannableTask = { status?: string; version?: number; metadata?: unknown };
const metadataOf = (task: PlannableTask) => task.metadata && typeof task.metadata === 'object' && !Array.isArray(task.metadata) ? task.metadata : {};

export function scheduleTaskPatch(task: PlannableTask, date: string): TaskUpdateInput {
  return {
    scheduledDate: date,
    ...(task.status === 'BACKLOG' ? { status: 'TODO' as const } : {}),
    metadata: { ...metadataOf(task), inbox: false },
    version: task.version,
  };
}

export function deferTaskPatch(task: PlannableTask): TaskUpdateInput {
  return { scheduledDate: null, status: 'BACKLOG', metadata: { ...metadataOf(task), inbox: false }, version: task.version };
}
