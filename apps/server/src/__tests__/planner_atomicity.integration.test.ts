import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { plannerService } from '../services/planner.service';
import { taskService } from '../services/task.service';
import { domainEventBus } from '../events/eventBus';
import { TimeBlockSchema } from '@krama/validation';
import { createIntegrationFixture, cleanupIntegrationFixture } from '../testing/integrationFixture';

let fixture: Awaited<ReturnType<typeof createIntegrationFixture>>;
before(async () => { fixture = await createIntegrationFixture('planner-atomicity'); });
after(async () => {
  await cleanupIntegrationFixture(fixture);
  await prisma.$disconnect(); await (globalThis as any).pool?.end();
  const { connection } = await import('../lib/redis'); await connection.quit();
  const { redisService } = await import('../services/redis.service'); await redisService.client.quit();
});
const blockData = (taskId: string, hour: string) => TimeBlockSchema.parse({ title: 'Atomic reservation', taskId, type: 'WORK', date: new Date(), startTime: `${hour}:00`, endTime: `${hour}:25` });

test('failure after both writes rolls back the reservation, task and activity without publishing events', async () => {
  const { user, workspace } = fixture;
  const task = await taskService.createTask({ title: 'Rollback candidate', status: 'BACKLOG', workspaceId: workspace.id, metadata: { inbox: true } }, user.id);
  const original = taskService.scheduleTaskWithinTransaction;
  const events: unknown[] = [];
  const observe = (event: any) => { if (event.payload.taskId === task.id) events.push(event); };
  domainEventBus.on('TASK_UPDATED', observe);
  taskService.scheduleTaskWithinTransaction = async function (...args: Parameters<typeof original>) {
    await original.apply(this, args);
    throw new Error('Simulated failure after task and block writes');
  };
  try {
    await assert.rejects(plannerService.createTimeBlock({ userId: user.id, workspaceId: workspace.id }, blockData(task.id, '10')), /Simulated failure/);
    assert.equal(await prisma.timeBlock.count({ where: { workspaceId: workspace.id, taskId: task.id } }), 0);
    const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(saved.status, 'BACKLOG'); assert.equal(saved.scheduledDate, null); assert.equal(saved.version, task.version);
    assert.equal(await prisma.activityLog.count({ where: { workspaceId: workspace.id, entityId: task.id, action: 'TASK_UPDATED' } }), 0);
    assert.equal(events.length, 0);
  } finally {
    taskService.scheduleTaskWithinTransaction = original;
    domainEventBus.off('TASK_UPDATED', observe);
  }
});

test('concurrent overlapping reservations commit one task plan and publish one event', async () => {
  const { user, workspace } = fixture;
  const task = await taskService.createTask({ title: 'Concurrent reservation candidate', status: 'BACKLOG', workspaceId: workspace.id }, user.id);
  let events = 0;
  const observe = (event: any) => { if (event.payload.taskId === task.id) events++; };
  domainEventBus.on('TASK_UPDATED', observe);
  try {
    const outcomes = await Promise.allSettled(Array.from({ length: 4 }, () => plannerService.createTimeBlock({ userId: user.id, workspaceId: workspace.id }, blockData(task.id, '11'))));
    assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
    for (const outcome of outcomes) if (outcome.status === 'rejected') assert.equal(outcome.reason.statusCode, 409);
    assert.equal(await prisma.timeBlock.count({ where: { workspaceId: workspace.id, taskId: task.id } }), 1);
    const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(saved.status, 'TODO'); assert.equal(saved.version, task.version + 1); assert.equal(events, 1);
  } finally { domainEventBus.off('TASK_UPDATED', observe); }
});
