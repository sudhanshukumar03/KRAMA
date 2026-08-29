import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://:krama_redis_secret@localhost:6379';

let hasWarned = false;

// Shared connection for BullMQ
export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (!hasWarned) {
      console.warn('[Redis/BullMQ] Redis server is not running on localhost:6379. Queues and workers are paused.');
      hasWarned = true;
    }
    // Reconnect every 15 seconds silently
    return 15000;
  },
  reconnectOnError() {
    return true;
  },
  lazyConnect: true,
});

connection.on('error', (err: any) => {
  if (!hasWarned) {
    console.warn('[Redis/BullMQ] Connection warning:', err.message);
    hasWarned = true;
  }
});

connection.on('connect', () => {
  console.log('[Redis/BullMQ] Connected to Redis successfully');
  hasWarned = false;
});
