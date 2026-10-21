import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { goalService } from '../services/goal.service';
import { habitService } from '../services/habit.service';
import { recalculateHabitStreaks } from '../services/habitStreakRecalculation.service';
import { taskService } from '../services/task.service';
import { domainEventBus } from '../events/eventBus';
import { createIntegrationFixture, cleanupIntegrationFixture } from '../testing/integrationFixture';

describe('P0 Concurrency & Version Increment Suite', () => {
  let workspace: any;
  let user: any;
  let fixture: Awaited<ReturnType<typeof createIntegrationFixture>>;

  before(async () => {
    fixture = await createIntegrationFixture('concurrency');
    ({ user, workspace } = fixture);
  });

  after(async () => {
    await cleanupIntegrationFixture(fixture);
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
    it('log and undo keep snapshot ownership when another member edits the habit', async () => {
      const editor = await prisma.user.create({ data: { email: `${fixture.marker}-editor@example.invalid`, passwordHash: 'test-only-invalid-hash', metadata: { timezone: 'Asia/Tokyo' } } });
      const habit = await habitService.createHabit({ name: 'Shared snapshot', workspaceId: workspace.id }, user.id);
      try {
        await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: editor.id, role: 'MEMBER' } });
        const day = new Date().toISOString().slice(0, 10);
        const logged = await habitService.logHabitCompletion({ id: habit.id, workspaceId: workspace.id, userId: user.id, dateStr: day, dateIso: `${day}T12:00:00Z`, timeZone: 'UTC' });
        assert.equal(logged.streak, 1);
        await habitService.updateHabit(habit.id, workspace.id, { name: 'Renamed by another member', metadata: { streakUserId: editor.id }, version: logged.version }, editor.id);
        await recalculateHabitStreaks();
        const saved = await prisma.habit.findUniqueOrThrow({ where: { id: habit.id } });
        assert.equal(saved.streak, 1); assert.equal(saved.bestStreak, 1);
        assert.equal((saved.metadata as any).streakUserId, user.id); assert.equal(saved.updatedBy, editor.id);
        assert.equal((await habitService.getHabit(habit.id, workspace.id, editor.id)).streak, 0);
        const undone = await habitService.unlogHabitCompletion({ id: habit.id, workspaceId: workspace.id, userId: user.id, dateStr: day, timeZone: 'UTC' });
        assert.equal(undone.streak, 0); assert.equal((undone.metadata as any).streakUserId, user.id);
      } finally {
        await prisma.habit.delete({ where: { id: habit.id } });
        await prisma.user.delete({ where: { id: editor.id } });
      }
    });

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
    it('rebalances without deadlocking an editor that must insert an activity log', async () => {
      const task = await prisma.task.create({ data: { title: 'Concurrent edit', workspaceId: workspace.id, status: 'TODO', position: 10 } });
      let locked!: () => void, release!: () => void;
      const ready = new Promise<void>(resolve => { locked = resolve; });
      const proceed = new Promise<void>(resolve => { release = resolve; });
      const edit = prisma.$transaction(async tx => {
        await tx.task.update({ where: { id: task.id }, data: { title: 'Edited title', version: { increment: 1 } } });
        locked(); await proceed;
        await tx.activityLog.create({ data: { workspaceId: workspace.id, userId: user.id, action: 'TASK_UPDATED', entityType: 'Task', entityId: task.id } });
      }, { timeout: 10000 });
      await ready;
      const rebalance = taskService.rebalanceTasks(workspace.id, user.id);
      // Observe the task-lock wait so the test exercises the former deadlock,
      // rather than passing because the two transactions ran sequentially.
      let waiting = false;
      try {
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'SELECT id FROM "Task"%'`;
          if (rows[0]!.count > 0) { waiting = true; break; }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      } finally { release(); }
      const outcomes = await Promise.allSettled([edit, rebalance]);
      try {
        assert.ok(waiting, 'Rebalance must have waited for the concurrent editor');
        for (const outcome of outcomes) assert.equal(outcome.status, 'fulfilled', outcome.status === 'rejected' ? String(outcome.reason) : undefined);
        const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
        assert.equal(saved.title, 'Edited title'); assert.equal(saved.position, 1000); assert.equal(saved.version, 3);
      } finally { await prisma.task.delete({ where: { id: task.id } }); }
    });

    it('rebalances active tasks atomically, versions changed rows and publishes after commit', async () => {
      const first = await prisma.task.create({ data: { title: 'First', workspaceId: workspace.id, status: 'TODO', position: 10 } });
      const deleted = await prisma.task.create({ data: { title: 'Deleted', workspaceId: workspace.id, status: 'TODO', position: 20, deletedAt: new Date() } });
      const second = await prisma.task.create({ data: { title: 'Second', workspaceId: workspace.id, status: 'TODO', position: 30 } });
      const done = await prisma.task.create({ data: { title: 'Done', workspaceId: workspace.id, status: 'DONE', position: 10 } });
      const ids = [first.id, deleted.id, second.id, done.id];
      const events: any[] = [];
      const observe = (event: any) => { if (ids.includes(event.payload.taskId)) events.push(event.payload); };
      domainEventBus.on('TASK_UPDATED', observe);
      try {
        await taskService.rebalanceTasks(workspace.id, user.id);
        const rows = await prisma.task.findMany({ where: { id: { in: ids } } });
        const saved = (id: string) => rows.find(task => task.id === id)!;
        assert.equal(saved(first.id).position, 1000); assert.equal(saved(second.id).position, 2000);
        assert.equal(saved(done.id).position, 1000);
        assert.equal(saved(deleted.id).position, 20); assert.equal(saved(deleted.id).version, deleted.version);
        for (const task of [first, second, done]) {
          assert.equal(saved(task.id).version, task.version + 1); assert.equal(saved(task.id).updatedBy, user.id);
        }
        assert.deepEqual(events.map(event => event.taskId).sort(), [first.id, second.id, done.id].sort());
        await assert.rejects(taskService.reorderTask(first.id, workspace.id, { position: 1500, version: first.version }, user.id), /Conflict/);
        events.length = 0;
        await taskService.rebalanceTasks(workspace.id, user.id);
        assert.equal(events.length, 0);
        assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: first.id } })).version, first.version + 1);
      } finally {
        domainEventBus.off('TASK_UPDATED', observe);
        await prisma.task.deleteMany({ where: { id: { in: ids } } });
      }
    });

    it('a rebalance failure rolls back every position and emits no updates', async () => {
      const task = await prisma.task.create({ data: { title: 'Rollback', workspaceId: workspace.id, status: 'TODO', position: 10 } });
      const transaction = prisma.$transaction;
      const events: any[] = [];
      const observe = (event: any) => { if (event.payload.taskId === task.id) events.push(event); };
      domainEventBus.on('TASK_UPDATED', observe);
      (prisma as any).$transaction = (callback: any) => transaction.call(prisma, async tx => {
        await callback(tx);
        throw new Error('Synthetic failure before commit');
      });
      try {
        await assert.rejects(taskService.rebalanceTasks(workspace.id, user.id), /Synthetic failure/);
        const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
        assert.equal(saved.position, task.position); assert.equal(saved.version, task.version); assert.equal(events.length, 0);
      } finally {
        (prisma as any).$transaction = transaction; domainEventBus.off('TASK_UPDATED', observe);
        await prisma.task.delete({ where: { id: task.id } });
      }
    });

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
