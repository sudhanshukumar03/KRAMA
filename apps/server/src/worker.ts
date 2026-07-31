import { notificationsWorker } from './workers/notifications.worker';
import { habitStreakWorker } from './workers/habitStreak.worker';
import { sprintReportWorker } from './workers/sprintReport.worker';
import { analyticsWorker } from './workers/analytics.worker';

import { habitStreakQueue, sprintReportQueue, analyticsQueue } from './queues';

// Schedule repeatable jobs
const scheduleJobs = async () => {
  console.log('Scheduling repeatable jobs...');
  
  // Nightly at midnight UTC
  await habitStreakQueue.add('recalculate-streaks', {}, {
    repeat: { pattern: '0 0 * * *' }
  });

  // Nightly at 1 AM UTC
  await analyticsQueue.add('aggregate-analytics', {}, {
    repeat: { pattern: '0 1 * * *' }
  });

  // Weekly on Sunday at 2 AM UTC
  await sprintReportQueue.add('generate-sprint-reports', {}, {
    repeat: { pattern: '0 2 * * 0' }
  });

  console.log('Jobs scheduled successfully.');
};

scheduleJobs().catch(console.error);

// Handle shutdown
const shutdown = async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    notificationsWorker.close(),
    habitStreakWorker.close(),
    sprintReportWorker.close(),
    analyticsWorker.close(),
  ]);
  console.log('Workers closed.');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('KRAMA OS Background Workers started.');
