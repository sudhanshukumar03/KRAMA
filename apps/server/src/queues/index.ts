import { Queue } from 'bullmq';
import { connection } from '../lib/redis';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  HABIT_STREAK: 'habit-streak',
  // Preserve the existing Redis queue name for scheduled AI prompt retention jobs.
  AI_RETENTION: 'analytics',
  EMBEDDING: 'embedding',
  DOCUMENT_VERSION: 'document-version',
};

// Common queue options
/**
 * Keep bounded job history and retry transient failures with exponential backoff.
 * Workers must tolerate redelivery: attempts are not a guarantee of one execution.
 */
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

export const aiRetentionQueue = new Queue(QUEUE_NAMES.AI_RETENTION, {
  connection,
  defaultJobOptions,
});
aiRetentionQueue.on('error', () => {});

export const embeddingQueue = new Queue(QUEUE_NAMES.EMBEDDING, {
  connection,
  defaultJobOptions,
});
embeddingQueue.on('error', () => {});

export const documentVersionQueue = new Queue(QUEUE_NAMES.DOCUMENT_VERSION, {
  connection,
  defaultJobOptions,
});
documentVersionQueue.on('error', () => {});


