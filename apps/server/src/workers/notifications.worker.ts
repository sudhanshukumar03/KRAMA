import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';

import { prisma } from '../prisma';

export const notificationsWorker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    const { taskId, workspaceId, userId } = job.data;
    console.log(`[Worker:Notifications] Processing task completion for task ${taskId}`);

    // Update productivity score (+10)
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { productivityScore: { increment: 10 } },
    });

    // Create Notification
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    await prisma.notification.create({
      data: {
        userId,
        workspaceId,
        title: 'Task Completed',
        message: `You earned 10 points for completing: ${task?.title || 'a task'}!`,
      },
    });

    return { success: true };
  },
  { connection }
);

notificationsWorker.on('completed', (job) => {
  console.log(`[Worker:Notifications] Job ${job.id} completed successfully`);
});

notificationsWorker.on('failed', (job, err) => {
  console.error(`[Worker:Notifications] Job ${job?.id} failed:`, err);
});

notificationsWorker.on('error', () => {
  // Suppress uncaught redis connection error spam
});
