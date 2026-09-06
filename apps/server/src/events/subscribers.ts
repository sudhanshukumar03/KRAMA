import { domainEventBus } from './eventBus';
import { notificationsQueue } from '../queues';
import { prisma } from '../prisma';

domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string }>('TASK_COMPLETED', async (payload) => {
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
  });
});
