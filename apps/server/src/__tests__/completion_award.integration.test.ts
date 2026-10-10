import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { createIntegrationFixture, cleanupIntegrationFixture } from '../testing/integrationFixture';
import { awardTaskCompletion } from '../services/completionAward';

let fixture: Awaited<ReturnType<typeof createIntegrationFixture>>;
let taskId: string;
before(async () => {
  fixture = await createIntegrationFixture('awards');
  const task = await prisma.task.create({ data: { title: 'Idempotent award test', workspaceId: fixture.workspace.id, createdBy: fixture.user.id, status: 'DONE' } });
  taskId = task.id;
});
after(async () => {
  await cleanupIntegrationFixture(fixture);
  await prisma.$disconnect();
  await (globalThis as any).pool?.end();
  const { connection } = await import('../lib/redis');
  await connection.quit();
  const { redisService } = await import('../services/redis.service');
  await redisService.client.quit();
});
const event = (completionVersion: number) => ({ taskId, userId: fixture.user.id, workspaceId: fixture.workspace.id, completionVersion });
const score = async () => (await prisma.workspace.findUniqueOrThrow({ where: { id: fixture.workspace.id } })).productivityScore;

test('parallel retries and a retry after commit award one completion once', async () => {
  const notifications = await Promise.all(Array.from({ length: 6 }, () => awardTaskCompletion(prisma, event(2), 'duplicate-job')));
  assert.equal(new Set(notifications.map(row => row.id)).size, 1);
  await awardTaskCompletion(prisma, event(2), 'another-delivery');
  assert.equal(await score(), 10);
  assert.equal(await prisma.notification.count({ where: { workspaceId: fixture.workspace.id } }), 1);
});
test('a failed award transaction rolls back its notification; retry can complete', async () => {
  const failingDb = { $transaction: (fn: any) => prisma.$transaction(tx => fn({
    task: tx.task, notification: tx.notification,
    workspace: { update: async () => { throw new Error('Simulated failure before commit'); } },
  })) } as any;
  await assert.rejects(awardTaskCompletion(failingDb, event(3)), /before commit/);
  assert.equal(await score(), 10);
  assert.equal(await prisma.notification.count({ where: { workspaceId: fixture.workspace.id } }), 1);
  await awardTaskCompletion(prisma, event(3));
  assert.equal(await score(), 20);
});
test('a distinct completion version earns its own award; legacy job retries stay safe', async () => {
  await awardTaskCompletion(prisma, event(4));
  const legacy = { taskId, userId: fixture.user.id, workspaceId: fixture.workspace.id };
  await awardTaskCompletion(prisma, legacy, 'legacy-job');
  await awardTaskCompletion(prisma, legacy, 'legacy-job');
  assert.equal(await score(), 40);
  await assert.rejects(awardTaskCompletion(prisma, legacy), /identity/);
});
