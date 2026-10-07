import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';

import { prisma } from '../prisma';

export const analyticsWorker = new Worker(
  QUEUE_NAMES.ANALYTICS,
  async (_job) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // AI Prompt Retention: Clear prompts older than 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await prisma.aiRequest.updateMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        prompt: { not: null }
      },
      data: {
        prompt: null
      }
    });

    return { clearedPrompts: result.count };
  },
  { connection }
);

analyticsWorker.on('completed', (_job, result) => {
  console.log(`[Worker:Analytics] Cleared ${result.clearedPrompts} expired AI prompts.`);
});

analyticsWorker.on('failed', (_job, err) => {
  console.error(`[Worker:Analytics] Failed:`, err);
});

analyticsWorker.on('error', () => {
  // Suppress uncaught redis connection error spam
});
