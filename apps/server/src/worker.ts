import { notificationsWorker } from './workers/notifications.worker';
import { habitStreakWorker } from './workers/habitStreak.worker';
import { sprintReportWorker } from './workers/sprintReport.worker';
import { analyticsWorker } from './workers/analytics.worker';
import { embeddingWorker } from './workers/embedding.worker';

import { habitStreakQueue, sprintReportQueue, analyticsQueue } from './queues';

// Schedule repeatable jobs safely
const scheduleJobs = async () => {
  try {
    // Nightly at midnight UTC
    await habitStreakQueue.upsertJobScheduler('recalculate-streaks-job', {
      pattern: '0 0 * * *'
    }, {
      name: 'recalculate-streaks'
    });

    // Nightly at 1 AM UTC
    await analyticsQueue.upsertJobScheduler('aggregate-analytics-job', {
      pattern: '0 1 * * *'
    }, {
      name: 'aggregate-analytics'
    });

    // Weekly on Sunday at 2 AM UTC
    await sprintReportQueue.upsertJobScheduler('generate-sprint-reports-job', {
      pattern: '0 2 * * 0'
    }, {
      name: 'generate-sprint-reports'
    });

    console.log('[Worker] Repeatable jobs scheduled.');
  } catch (err: any) {
    console.warn('[Worker] Could not register scheduler (Redis offline):', err?.message || err);
  }
};

scheduleJobs().catch(() => {});

// Handle shutdown
const shutdown = async () => {
  console.log('Shutting down workers...');
  await Promise.allSettled([
    notificationsWorker.close(),
    habitStreakWorker.close(),
    sprintReportWorker.close(),
    analyticsWorker.close(),
    embeddingWorker.close(),
  ]);
  console.log('Workers closed.');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('KRAMA OS Background Workers initialized.');

