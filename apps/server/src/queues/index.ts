import { Queue } from 'bullmq';
import { connection } from '../lib/redis';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  HABIT_STREAK: 'habit-streak',
  SPRINT_REPORT: 'sprint-report',
  ANALYTICS: 'analytics',
};

// Common queue options
const defaultJobOptions = {
  removeOnComplete: 100, // Keep last 100 successful jobs
  removeOnFail: 500,     // Keep last 500 failed jobs
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
};

export const notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection,
  defaultJobOptions,
});

export const habitStreakQueue = new Queue(QUEUE_NAMES.HABIT_STREAK, {
  connection,
  defaultJobOptions,
});

export const sprintReportQueue = new Queue(QUEUE_NAMES.SPRINT_REPORT, {
  connection,
  defaultJobOptions,
});

export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, {
  connection,
  defaultJobOptions,
});
