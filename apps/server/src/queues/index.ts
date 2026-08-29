import { Queue } from 'bullmq';
import { connection } from '../lib/redis';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  HABIT_STREAK: 'habit-streak',
  SPRINT_REPORT: 'sprint-report',
  ANALYTICS: 'analytics',
  EMBEDDING: 'embedding',
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
notificationsQueue.on('error', () => {});

export const habitStreakQueue = new Queue(QUEUE_NAMES.HABIT_STREAK, {
  connection,
  defaultJobOptions,
});
habitStreakQueue.on('error', () => {});

export const sprintReportQueue = new Queue(QUEUE_NAMES.SPRINT_REPORT, {
  connection,
  defaultJobOptions,
});
sprintReportQueue.on('error', () => {});

export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, {
  connection,
  defaultJobOptions,
});
analyticsQueue.on('error', () => {});

export const embeddingQueue = new Queue(QUEUE_NAMES.EMBEDDING, {
  connection,
  defaultJobOptions,
});
embeddingQueue.on('error', () => {});

