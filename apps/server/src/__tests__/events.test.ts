import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, runInTransaction } from '../prisma';
import { domainEventBus } from '../events/eventBus';
import { goalService } from '../services/goal.service';
import { habitService } from '../services/habit.service';
import { taskService } from '../services/task.service';

describe('P1 Post-Commit Event Publishing Suite', () => {
  let workspace: any;
  let user: any;

  before(async () => {
    user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test-events-${Date.now()}@example.com`,
          passwordHash: 'dummyhash',
        },
      });
    }

    workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Test Events Workspace',
          createdBy: user.id,
        },
      });
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });

  describe('runInTransaction Post-Commit Guarantees', () => {
    it('does NOT publish events when a transaction rolls back', async () => {
      let eventFired = false;
      const testEventType = `TEST_ROLLBACK_${Date.now()}`;

      domainEventBus.onEvent(testEventType, () => {
        eventFired = true;
      });

      await assert.rejects(
        async () => {
          await runInTransaction(async (tx, publishAfterCommit) => {
            publishAfterCommit(testEventType, { reason: 'should not be published' });
            // Force transaction rollback
            throw new Error('Forced Rollback Error');
          });
        },
        { message: 'Forced Rollback Error' }
      );

      // Verify event never reached subscribers
      assert.strictEqual(eventFired, false, 'Event should not have fired on rolled-back transaction');
    });

    it('publishes events strictly after transaction commits', async () => {
      const eventsReceived: any[] = [];
      const testEventType = `TEST_COMMIT_${Date.now()}`;

      domainEventBus.onEvent(testEventType, (payload) => {
        eventsReceived.push(payload);
      });

      const result = await runInTransaction(async (tx, publishAfterCommit) => {
        publishAfterCommit(testEventType, { index: 1 });
        publishAfterCommit(testEventType, { index: 2 });
        return 'transaction_success';
      });

      assert.strictEqual(result, 'transaction_success');
      assert.strictEqual(eventsReceived.length, 2);
      assert.strictEqual(eventsReceived[0].index, 1);
      assert.strictEqual(eventsReceived[1].index, 2);
    });

    it('isolates subscriber errors so throwing subscribers do not block callers or other listeners', async () => {
      const testEventType = `TEST_THROW_${Date.now()}`;
      let healthyListenerRan = false;

      // Synchronous throwing listener
      domainEventBus.onEvent(testEventType, () => {
        throw new Error('Synchronous Subscriber Boom');
      });

      // Asynchronous throwing listener
      domainEventBus.onEvent(testEventType, async () => {
        throw new Error('Asynchronous Subscriber Boom');
      });

      // Healthy listener
      domainEventBus.onEvent(testEventType, () => {
        healthyListenerRan = true;
      });

      // Transaction execution should succeed without throwing
      const result = await runInTransaction(async (tx, publishAfterCommit) => {
        publishAfterCommit(testEventType, { test: 'isolation' });
        return 'success';
      });

      assert.strictEqual(result, 'success');
      assert.strictEqual(healthyListenerRan, true, 'Healthy subscriber should still execute despite prior errors');
    });
  });

  describe('Service Domain Event Publishing', () => {
    it('GoalService emits GOAL_CREATED via publishAfterCommit on successful create', async () => {
      let publishedEvent: any = null;
      domainEventBus.onEvent('GOAL_CREATED', (payload) => {
        publishedEvent = payload;
      });

      const goal = await goalService.createGoal(
        {
          title: 'Event Test Goal',
          type: 'OBJECTIVE',
          workspaceId: workspace.id,
        },
        user.id
      );

      assert.ok(goal.id);
      assert.ok(publishedEvent, 'GOAL_CREATED should be published');
      assert.strictEqual(publishedEvent.goalId, goal.id);
      assert.strictEqual(publishedEvent.workspaceId, workspace.id);

      // Cleanup
      await prisma.goal.delete({ where: { id: goal.id } });
    });

    it('TaskService emits TASK_CREATED and TASK_COMPLETED post-commit', async () => {
      let createdPayload: any = null;
      let completedPayload: any = null;

      domainEventBus.onEvent('TASK_CREATED', (p) => {
        createdPayload = p;
      });
      domainEventBus.onEvent('TASK_COMPLETED', (p) => {
        completedPayload = p;
      });

      const task = await taskService.createTask(
        {
          title: 'Event Test Task',
          workspaceId: workspace.id,
        },
        user.id
      );

      assert.ok(task.id);
      assert.ok(createdPayload);
      assert.strictEqual(createdPayload.taskId, task.id);

      // Complete the task
      await taskService.completeTask(task.id, workspace.id, user.id);
      assert.ok(completedPayload, 'TASK_COMPLETED should be emitted post-commit');
      assert.strictEqual(completedPayload.taskId, task.id);
      assert.strictEqual(completedPayload.userId, user.id);

      // Cleanup
      await prisma.task.delete({ where: { id: task.id } });
    });

    it('HabitService emits HABIT_CREATED and HABIT_DELETED post-commit', async () => {
      let createdPayload: any = null;
      let deletedPayload: any = null;

      domainEventBus.onEvent('HABIT_CREATED', (p) => {
        createdPayload = p;
      });
      domainEventBus.onEvent('HABIT_DELETED', (p) => {
        deletedPayload = p;
      });

      const habit = await habitService.createHabit(
        {
          name: 'Event Test Habit',
          cadence: 'DAILY',
          workspaceId: workspace.id,
        },
        user.id
      );

      assert.ok(habit.id);
      assert.ok(createdPayload);
      assert.strictEqual(createdPayload.habitId, habit.id);

      await habitService.deleteHabit(habit.id, workspace.id, user.id);
      assert.ok(deletedPayload, 'HABIT_DELETED should be emitted post-commit');
      assert.strictEqual(deletedPayload.habitId, habit.id);

      // Cleanup
      await prisma.habit.delete({ where: { id: habit.id } });
    });
  });
});
