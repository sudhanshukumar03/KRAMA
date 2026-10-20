import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { taskService } from '../services/task.service';
import { taskRepository } from '../repositories/task.repository';
import { domainEventBus } from '../events/eventBus';
import { createIntegrationFixture, cleanupIntegrationFixture } from '../testing/integrationFixture';

let fixture: Awaited<ReturnType<typeof createIntegrationFixture>>;
before(async () => { fixture = await createIntegrationFixture('task-recovery'); });
after(async () => {
  await cleanupIntegrationFixture(fixture);
  await prisma.$disconnect(); await (globalThis as any).pool?.end();
  const { connection } = await import('../lib/redis'); await connection.quit();
  const { redisService } = await import('../services/redis.service'); await redisService.client.quit();
});

test('task recovery waits for an uncommitted project deletion and drops the inactive link', async () => {
  const { user, workspace } = fixture;
  const project = await prisma.project.create({ data: { name: 'Deleting project', workspaceId: workspace.id, createdBy: user.id } });
  const task = await taskService.createTask({ title: 'Controlled concurrent recovery', workspaceId: workspace.id, projectId: project.id }, user.id);
  await taskService.deleteTask(task.id, workspace.id, user.id);
  let release!: () => void; let announce!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { announce = resolve; });
  const deleting = prisma.$transaction(async tx => {
    const deletedAt = new Date();
    await tx.project.update({ where: { id: project.id }, data: { deletedAt } });
    await tx.task.updateMany({ where: { projectId: project.id, deletedAt: null }, data: { deletedAt } });
    announce(); await gate;
  });
  try {
    await ready;
    const recovering = taskService.restoreTask(task.id, workspace.id, user.id);
    // Leave deletion uncommitted while the independent restoration begins.
    // The final invariant also fails on the old code if startup is delayed.
    await new Promise(resolve => setTimeout(resolve, 75));
    release(); await deleting;
    const restored = await recovering;
    assert.equal(restored.projectId, null); assert.equal(restored.deletedAt, null);
    const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(saved.projectId, null); assert.equal(saved.deletedAt, null);
  } finally { release(); await deleting; }
});

test('failed restoration rolls back link cleanup, version, activity and events together', async () => {
  const { user, workspace } = fixture;
  const project = await prisma.project.create({ data: { name: 'Already deleted project', workspaceId: workspace.id, createdBy: user.id, deletedAt: new Date() } });
  const originalTask = await prisma.task.create({ data: { title: 'Rollback recovery', workspaceId: workspace.id, projectId: project.id, createdBy: user.id, deletedAt: new Date() } });
  const originalUpdate = taskRepository.update;
  const events: unknown[] = [];
  const observe = (event: any) => { if (event.payload.taskId === originalTask.id) events.push(event); };
  domainEventBus.on('TASK_RESTORED', observe); domainEventBus.on('TASK_CREATED', observe);
  taskRepository.update = async function (...args: Parameters<typeof originalUpdate>) {
    await originalUpdate.apply(this, args);
    throw new Error('Injected failure after recovery write');
  };
  try {
    await assert.rejects(taskService.restoreTask(originalTask.id, workspace.id, user.id), /Injected failure/);
    const saved = await prisma.task.findUniqueOrThrow({ where: { id: originalTask.id } });
    assert.equal(saved.projectId, project.id); assert.equal(saved.deletedAt?.getTime(), originalTask.deletedAt?.getTime());
    assert.equal(saved.version, originalTask.version);
    assert.equal(await prisma.activityLog.count({ where: { entityId: originalTask.id, action: 'TASK_RESTORED' } }), 0);
    assert.equal(events.length, 0);
  } finally {
    taskRepository.update = originalUpdate;
    domainEventBus.off('TASK_RESTORED', observe); domainEventBus.off('TASK_CREATED', observe);
  }
});
