import { domainEventBus } from './eventBus';
import { notificationsQueue } from '../queues';
import { prisma } from '../prisma';
import { socketService } from '../services/socket.service';
import { goalService } from '../services/goal.service';

domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string }>('TASK_CREATED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'task:created', payload);
});

domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string }>('TASK_UPDATED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'task:updated', payload);
});

domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string }>('TASK_DELETED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'task:deleted', payload);
});

domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string; completionVersion?: number }>('TASK_COMPLETED', async (payload) => {
  let recipientId = payload.userId;

  if (!recipientId) {
    const task = await prisma.task.findUnique({
      where: { id: payload.taskId },
      select: {
        assigneeId: true,
        createdBy: true,
      }
    });

    if (task?.assigneeId) {
      recipientId = task.assigneeId;
    } else if (task?.createdBy) {
      recipientId = task.createdBy;
    } else {
      const workspace = await prisma.workspace.findUnique({
        where: { id: payload.workspaceId },
        select: { createdBy: true }
      });
      recipientId = workspace?.createdBy ?? undefined;
    }
  }

  if (!recipientId) {
    throw new Error(`Cannot notify task completion: recipient could not be resolved for task ${payload.taskId} in workspace ${payload.workspaceId}`);
  }

  await notificationsQueue.add('task-completion', {
    taskId: payload.taskId,
    workspaceId: payload.workspaceId,
    userId: recipientId,
    completionVersion: payload.completionVersion,
  }, payload.completionVersion === undefined ? {} : { jobId: `task-completion-${payload.taskId}-${payload.completionVersion}` });
});

domainEventBus.onEvent<{ goalId: string; workspaceId: string }>('GOAL_CREATED', (payload) => {
  if (payload.workspaceId) {
    socketService.emitToWorkspace(payload.workspaceId, 'goal:created', payload);
    goalService.invalidateGoalCache(payload.workspaceId).catch(() => {});
  }
});

domainEventBus.onEvent<{ goalId: string; workspaceId: string }>('GOAL_UPDATED', (payload) => {
  if (payload.workspaceId) {
    socketService.emitToWorkspace(payload.workspaceId, 'goal:updated', payload);
    goalService.invalidateGoalCache(payload.workspaceId).catch(() => {});
  }
});

domainEventBus.onEvent<{ goalId: string; workspaceId: string }>('GOAL_DELETED', (payload) => {
  if (payload.workspaceId) {
    socketService.emitToWorkspace(payload.workspaceId, 'goal:deleted', payload);
    goalService.invalidateGoalCache(payload.workspaceId).catch(() => {});
  }
});

domainEventBus.onEvent<{ goalId: string; workspaceId: string }>('GOAL_RESTORED', (payload) => {
  if (payload.workspaceId) {
    socketService.emitToWorkspace(payload.workspaceId, 'goal:restored', payload);
    goalService.invalidateGoalCache(payload.workspaceId).catch(() => {});
  }
});

domainEventBus.onEvent<{ habitId: string; workspaceId: string }>('HABIT_CREATED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'habit:created', payload);
});

domainEventBus.onEvent<{ habitId: string; workspaceId: string }>('HABIT_UPDATED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'habit:updated', payload);
});

domainEventBus.onEvent<{ habitId: string; workspaceId: string }>('HABIT_DELETED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'habit:deleted', payload);
});

domainEventBus.onEvent<{ habitId: string; workspaceId: string; streak?: number }>('HABIT_LOGGED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'habit:logged', payload);
});

domainEventBus.onEvent<{ habitId: string; workspaceId: string; streak?: number }>('HABIT_UNLOGGED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'habit:unlogged', payload);
});

domainEventBus.onEvent<{ habitId: string; workspaceId: string }>('HABIT_RESTORED', (payload) => {
  if (payload.workspaceId) socketService.emitToWorkspace(payload.workspaceId, 'habit:restored', payload);
});
