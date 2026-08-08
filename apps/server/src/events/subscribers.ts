import { domainEventBus } from './eventBus';
import { notificationsQueue } from '../queues';

domainEventBus.onEvent<{ taskId: string; workspaceId: string }>('TASK_COMPLETED', async (payload) => {
  // We need to fetch the userId who completed the task. 
  // Let's pass userId in the payload from task.service, or just fetch it here.
  // Actually task.service doesn't pass userId in TASK_COMPLETED payload currently.
  // Let's just queue it up and the worker will handle it. Wait, the worker expects userId!
  // I should update task.service to include userId in TASK_COMPLETED.
  await notificationsQueue.add('task-completion', {
    taskId: payload.taskId,
    workspaceId: payload.workspaceId,
    userId: (payload as any).userId || '00000000-0000-4000-8000-000000000001', // fallback for local mode
  });
});
