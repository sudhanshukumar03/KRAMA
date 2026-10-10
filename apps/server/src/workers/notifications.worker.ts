import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';

import { prisma } from '../prisma';
import { socketService } from '../services/socket.service';
import { awardTaskCompletion } from '../services/completionAward';

export const notificationsWorker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    const { taskId } = job.data;
    console.log(`[Worker:Notifications] Processing task completion for task ${taskId}`);

    const notification = await awardTaskCompletion(prisma, job.data, job.id);

    socketService.emitToUser(notification.userId, 'notification', notification);

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
