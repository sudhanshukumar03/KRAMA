import { test as base, expect, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import { validateIntegrationTargets } from '../../apps/server/src/testing/testEnvironment';

export { expect, request, type APIRequestContext } from '@playwright/test';

// Playwright reuses workers across files. Keep shared backend connections alive
// until the worker finishes; each file still removes its own records and jobs.
interface LiveAccount {
  userId: string;
  workspaceId: string;
  email: string;
  password: string;
  call(method: string, path: string, data?: unknown, status?: number, workspace?: string): Promise<any>;
  signIn(page: Page): Promise<void>;
}

export const test = base.extend<{ account: LiveAccount }, { backendResources: void }>({
  account: async ({ request }, use) => {
    validateIntegrationTargets({ ...process.env, DATABASE_URL: process.env.KRAMA_PRIMARY_DATABASE_URL, REDIS_URL: process.env.KRAMA_PRIMARY_REDIS_URL });
    const marker = `Live regression ${crypto.randomUUID()}`;
    const email = `${crypto.randomUUID()}@example.invalid`;
    const password = crypto.randomBytes(24).toString('hex');
    const target = process.env.KRAMA_API_TARGET || 'http://127.0.0.1:3000';
    const signup = await request.post(new URL('/api/v1/auth/signup', target).href, { data: { name: marker, email, password } });
    expect(signup.status()).toBe(201);
    const auth = await signup.json();
    const userId = auth.user.id;
    let workspaceId = '';
    const call = async (method: string, path: string, data?: unknown, status = 200, workspace = workspaceId) => {
      const response = await request.fetch(new URL(`/api/v1/${path}`, target).href, {
        method, data, headers: { Authorization: `Bearer ${auth.accessToken}`, 'x-workspace-id': workspace, 'x-timezone': 'Asia/Kolkata' },
      });
      expect(response.status(), `${method} ${path}`).toBe(status);
      return response.status() === 204 ? undefined : response.json();
    };
    try {
      workspaceId = (await call('GET', 'workspaces')).find((workspace: any) => workspace.createdBy === userId).id;
      await use({ userId, workspaceId, email, password, call, signIn: async page => {
        await page.goto('/login');
        await page.getByLabel('Email', { exact: true }).fill(email);
        await page.getByLabel('Password', { exact: true }).fill(password);
        await page.getByRole('button', { name: 'Sign In', exact: true }).click();
        await page.waitForURL(/\/app(?:\/|$)/);
      } });
    } finally {
      const { prisma } = await import('../../apps/server/src/prisma');
      const queues = await import('../../apps/server/src/queues');
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.email).toBe(email); expect(user.name).toBe(marker);
      const workspaces = await prisma.workspace.findMany({ where: { createdBy: userId }, select: { id: true } });
      const workspaceIds = new Set(workspaces.map(workspace => workspace.id));
      const documents = await prisma.document.findMany({ where: { space: { workspaceId: { in: [...workspaceIds] } } }, select: { id: true } });
      const documentIds = new Set(documents.map(document => document.id));
      for (const queue of [queues.notificationsQueue, queues.habitStreakQueue, queues.analyticsQueue, queues.embeddingQueue, queues.documentVersionQueue]) {
        for (const job of await queue.getJobs(['waiting', 'delayed', 'failed', 'completed'])) {
          if (job.data?.userId === userId || workspaceIds.has(job.data?.workspaceId) || documentIds.has(job.data?.documentId)) await job.remove();
        }
      }
      await prisma.timeBlock.deleteMany({ where: { userId } });
      await prisma.workspace.deleteMany({ where: { createdBy: userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  },
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
