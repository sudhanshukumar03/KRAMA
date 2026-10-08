import crypto from 'node:crypto';
import { prisma } from '../prisma';
import { redisService } from '../services/redis.service';
import { assertIntegrationEnvironment } from './testEnvironment';

export async function createIntegrationFixture(label: string) {
  assertIntegrationEnvironment();
  await redisService.ensureConnected();
  const marker = `integration-${process.env.KRAMA_TEST_RUN_ID}-${crypto.randomUUID()}`;
  const user = await prisma.user.create({ data: { email: `${marker}@example.invalid`, name: marker, passwordHash: 'test-only-invalid-hash' } });
  try {
    const workspace = await prisma.workspace.create({ data: {
      name: `${marker}-${label}`, createdBy: user.id,
      members: { create: { userId: user.id, role: 'OWNER' } },
    } });
    return { user, workspace, marker };
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
    throw error;
  }
}

export async function cleanupIntegrationFixture(fixture?: Awaited<ReturnType<typeof createIntegrationFixture>>) {
  if (!fixture) return;
  assertIntegrationEnvironment();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: fixture.workspace.id } });
  if (user.name !== fixture.marker || !workspace.name.startsWith(fixture.marker) || workspace.createdBy !== user.id) throw new Error('Fixture ownership check failed.');
  // Cascades include test logs, snapshots and notifications. User deletion follows
  // workspace deletion so personal references cannot retain fixture records.
  const documents = await prisma.document.findMany({ where: { space: { workspaceId: workspace.id } }, select: { id: true } });
  const documentIds = new Set(documents.map(doc => doc.id));
  await prisma.timeBlock.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.workspace.delete({ where: { id: workspace.id } });
  await prisma.user.delete({ where: { id: user.id } });
  const queues = await import('../queues/index.js');
  for (const queue of [queues.notificationsQueue, queues.habitStreakQueue, queues.analyticsQueue, queues.embeddingQueue, queues.documentVersionQueue]) {
    const jobs = await queue.getJobs(['waiting', 'delayed', 'completed', 'failed']);
    for (const job of jobs) if (job.data.workspaceId === workspace.id || job.data.userId === user.id || documentIds.has(job.data.documentId)) await job.remove();
    await queue.close();
  }
  const { socketService } = await import('../services/socket.service.js');
  await socketService.shutdown();
}
