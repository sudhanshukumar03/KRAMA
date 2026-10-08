import { test as base } from '@playwright/test';

export { expect, request, type APIRequestContext } from '@playwright/test';

// Playwright reuses workers across files. Keep shared backend connections alive
// until the worker finishes; each file still removes its own records and jobs.
export const test = base.extend<{}, { backendResources: void }>({
  backendResources: [async ({}, use) => {
    await use();
    const [{ prisma }, queues, { connection }, { redisService }] = await Promise.all([
      import('../../apps/server/src/prisma'),
      import('../../apps/server/src/queues'),
      import('../../apps/server/src/lib/redis'),
      import('../../apps/server/src/services/redis.service'),
    ]);
    await Promise.all([
      queues.notificationsQueue.close(),
      queues.habitStreakQueue.close(),
      queues.analyticsQueue.close(),
      queues.embeddingQueue.close(),
      queues.documentVersionQueue.close(),
    ]);
    redisService.client.disconnect();
    connection.disconnect();
    await prisma.$disconnect();
    const pool = (globalThis as typeof globalThis & {
      pool?: { ended: boolean; end(): Promise<void> };
    }).pool;
    if (pool && !pool.ended) await pool.end();
  }, { scope: 'worker', auto: true }],
});
