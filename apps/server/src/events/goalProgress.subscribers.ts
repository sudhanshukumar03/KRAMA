import { domainEventBus } from './eventBus';
import { prisma } from '../prisma';
import { goalService } from '../services/goal.service';

type TaskEventPayload = {
  taskId: string;
  workspaceId?: string;
  userId?: string;
  previousProjectId?: string | null;
};

/**
 * Feature #1 — automatic goal progress. When a task changes in a way that affects
 * completion (create / update / complete / delete), recompute the auto-progress of the
 * goal linked to that task via its project. `recomputeAutoProgress` no-ops for goals not
 * in `metadata.progressMode === 'auto'`, so this is cheap for the common manual case.
 *
 * Runs post-commit (same pattern as ./subscribers) in its own transaction. Task deletes
 * here are soft, so the row — and its `projectId` — is still readable.
 */
async function refreshGoalForTask(payload: TaskEventPayload) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: payload.taskId },
      select: { projectId: true },
    });
    const projectIds = [...new Set([task?.projectId, payload.previousProjectId].filter((id): id is string => Boolean(id)))];
    for (const projectId of projectIds) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ...(payload.workspaceId ? { workspaceId: payload.workspaceId } : {}) }, select: { goalId: true, workspaceId: true } });
      if (!project?.goalId) continue;
      const goal = await prisma.goal.findFirst({ where: { id: project.goalId, workspaceId: project.workspaceId, deletedAt: null }, select: { id: true } });
      if (goal) await goalService.recomputeAutoProgress(goal.id, payload.userId ?? 'system');
    }

  } catch (err) {
    console.warn('[goalProgress] auto-progress recompute failed:', (err as any)?.message || err);
  }
}

for (const event of ['TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_DELETED', 'TASK_RESTORED'] as const) {
  domainEventBus.onEvent<TaskEventPayload>(event, refreshGoalForTask);
}
