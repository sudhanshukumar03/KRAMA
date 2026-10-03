import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { goalService } from '../services/goal.service';
import { habitService } from '../services/habit.service';
import { taskService } from '../services/task.service';

describe('P0 Concurrency & Version Increment Suite', () => {
  let workspace: any;
  let user: any;

  before(async () => {
    // Ensure we have a valid test workspace and user in the database
    user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test-concurrency-${Date.now()}@example.com`,
          passwordHash: 'dummyhash',
        },
      });
    }

    workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Test Concurrency Workspace',
          createdBy: user.id,
        },
      });
    }
  });

  after(async () => {
    await prisma.$disconnect().catch(() => {});
    await (globalThis as any).pool?.end?.().catch(() => {});
    try {
      const { redisService } = await import('../services/redis.service');
      await redisService.client.quit().catch(() => {});
    } catch {}
    try {
      const { connection } = await import('../lib/redis');
      await connection.quit().catch(() => {});
    } catch {}
  });

  describe('Goal Model Concurrency', () => {
    it('succeeds without version and increments version from 1 to 2; rejects stale version 1 with 409', async () => {
      // 1. Create initial goal
      const created = await prisma.goal.create({
        data: {
          title: 'Test Concurrency Goal',
          type: 'OBJECTIVE',
          workspaceId: workspace.id,
          version: 1,
          createdBy: user.id,
        },
      });
      assert.strictEqual(created.version, 1);

      // 2. Update without version (client omission) -> must succeed and increment version to 2
      const updatedNoVersion = await goalService.updateGoal(
        created.id,
        workspace.id,
        { progress: 25 },
        user.id
      );
      assert.strictEqual(updatedNoVersion.version, 2, 'Goal version must increment from 1 to 2 on write');
      assert.strictEqual(updatedNoVersion.progress, 25);

      // 3. Stale update with version 1 -> must reject with Conflict
      await assert.rejects(
        async () => {
          await goalService.updateGoal(
            created.id,
            workspace.id,
            { progress: 50, version: 1 },
            user.id
          );
        },
        (err: Error) => {
          assert(err.message.includes('Conflict'), `Expected Conflict error, got: ${err.message}`);
          return true;
        }
      );

      // 4. Update with matching version 2 -> must succeed and increment to 3
      const updatedMatching = await goalService.updateGoal(
        created.id,
        workspace.id,
        { progress: 75, version: 2 },
        user.id
      );
      assert.strictEqual(updatedMatching.version, 3, 'Goal version must increment from 2 to 3 on matching update');
      assert.strictEqual(updatedMatching.progress, 75);

      // Cleanup
      await prisma.goal.delete({ where: { id: created.id } });
    });
  });

  describe('Habit Model Concurrency', () => {
    it('succeeds without version and increments version from 1 to 2; rejects stale version with 409', async () => {
      const created = await prisma.habit.create({
        data: {
          name: 'Test Concurrency Habit',
          workspaceId: workspace.id,
          version: 1,
          createdBy: user.id,
        },
      });
      assert.strictEqual(created.version, 1);

      // Update without version
      const updatedNoVersion = await habitService.updateHabit(
        created.id,
        workspace.id,
        { name: 'Habit Updated Name' },
        user.id
      );
      assert.strictEqual(updatedNoVersion.version, 2, 'Habit version must increment from 1 to 2 on write');

      // Stale update with version 1
      await assert.rejects(
        async () => {
          await habitService.updateHabit(
            created.id,
            workspace.id,
            { name: 'Stale Habit', version: 1 },
            user.id
          );
        },
        (err: Error) => {
          assert(err.message.includes('Conflict'), `Expected Conflict error, got: ${err.message}`);
          return true;
        }
      );

      // Update with matching version 2
      const updatedMatching = await habitService.updateHabit(
        created.id,
        workspace.id,
        { name: 'Matching Habit', version: 2 },
        user.id
      );
      assert.strictEqual(updatedMatching.version, 3, 'Habit version must increment from 2 to 3');

      // Cleanup
      await prisma.habit.delete({ where: { id: created.id } });
    });
  });

  describe('Task Model Concurrency', () => {
    it('succeeds without version and increments version from 1 to 2; rejects stale version with 409', async () => {
      const created = await prisma.task.create({
        data: {
          title: 'Test Concurrency Task',
          workspaceId: workspace.id,
          version: 1,
          createdBy: user.id,
        },
      });
      assert.strictEqual(created.version, 1);

      // Update without version
      const updatedNoVersion = await taskService.updateTask(
        created.id,
        workspace.id,
        { title: 'Task Updated Title' },
        user.id
      );
      assert.strictEqual(updatedNoVersion.version, 2, 'Task version must increment from 1 to 2 on write');

      // Stale update with version 1
      await assert.rejects(
        async () => {
          await taskService.updateTask(
            created.id,
            workspace.id,
            { title: 'Stale Task', version: 1 },
            user.id
          );
        },
        (err: Error) => {
          assert(err.message.includes('Conflict'), `Expected Conflict error, got: ${err.message}`);
          return true;
        }
      );

      // Update with matching version 2
      const updatedMatching = await taskService.updateTask(
        created.id,
        workspace.id,
        { title: 'Matching Task', version: 2 },
        user.id
      );
      assert.strictEqual(updatedMatching.version, 3, 'Task version must increment from 2 to 3');

      // Cleanup
      await prisma.task.delete({ where: { id: created.id } });
    });
  });
});
