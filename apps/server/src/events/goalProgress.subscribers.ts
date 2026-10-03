import { domainEventBus } from './eventBus';
import { prisma } from '../prisma';
import { goalService } from '../services/goal.service';

type TaskEventPayload = {
  taskId: string;
  workspaceId?: string;
  userId?: string;
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
    if (!task?.projectId) return;

    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      select: { goalId: true },
    });
    if (!project?.goalId) return;

    await goalService.recomputeAutoProgress(project.goalId, payload.userId ?? 'system');
  } catch (err) {
    console.warn('[goalProgress] auto-progress recompute failed:', (err as any)?.message || err);
  }
}

for (const event of ['TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_DELETED'] as const) {
  domainEventBus.onEvent<TaskEventPayload>(event, refreshGoalForTask);
}
