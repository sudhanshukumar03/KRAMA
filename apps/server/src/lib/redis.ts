import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://:krama_redis_secret@localhost:6379';

// Shared connection for BullMQ
// We pass maxRetriesPerRequest: null as required by BullMQ
export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});
