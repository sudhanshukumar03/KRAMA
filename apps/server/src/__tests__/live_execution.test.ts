import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { goalService } from '../services/goal.service';

describe('Live PostgreSQL Integration Verification', () => {
  let userId: string;
  let workspaceId: string;
  let goalId: string;
  let projectId: string;
  let taskId1: string;
  let taskId2: string;
  let milestoneId: string;
  let unlinkedProjectId: string;
  let unlinkedHabitId: string;

  before(async () => {
    let user = await prisma.user.findFirst({ where: { email: 'admin@krama.app' } });
    if (!user) user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');
    userId = user.id;

    let workspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId } } },
    });
    if (!workspace) workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error('No workspace found');
    workspaceId = workspace.id;
  });

  after(async () => {
    // Cleanup any records created during test
    if (taskId1 || taskId2) {
      await prisma.task.deleteMany({ where: { id: { in: [taskId1, taskId2].filter(Boolean) } } }).catch(() => {});
    }
    if (milestoneId) {
      await prisma.milestone.deleteMany({ where: { id: milestoneId } }).catch(() => {});
    }
    if (unlinkedHabitId) {
      await prisma.habit.deleteMany({ where: { id: unlinkedHabitId } }).catch(() => {});
    }
    if (projectId || unlinkedProjectId) {
      await prisma.project.deleteMany({ where: { id: { in: [projectId, unlinkedProjectId].filter(Boolean) } } }).catch(() => {});
    }
    if (goalId) {
      await prisma.goalProgressSnapshot.deleteMany({ where: { goalId } }).catch(() => {});
      await prisma.goal.deleteMany({ where: { id: goalId } }).catch(() => {});
    }
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

  it('GOL-03: calculates auto-progress accurately in live database on task creation', async () => {
    const goal = await prisma.goal.create({
      data: {
        title: 'TEST_LIVE_SUITE_GOAL_' + Date.now(),
        workspaceId,
        createdBy: userId,
        type: 'quarterly',
        metadata: { progressMode: 'auto' },
        progress: 0,
      },
    });
    goalId = goal.id;

    const project = await prisma.project.create({
      data: {
        name: 'TEST_LIVE_SUITE_PROJECT_' + Date.now(),
        workspaceId,
        createdBy: userId,
        goalId: goal.id,
      },
    });
    projectId = project.id;

    const t1 = await prisma.task.create({
      data: {
        title: 'Task 1 DONE',
        workspaceId,
        projectId: project.id,
        createdBy: userId,
        status: 'DONE',
      },
    });
    taskId1 = t1.id;

    const t2 = await prisma.task.create({
      data: {
        title: 'Task 2 TODO',
        workspaceId,
        projectId: project.id,
        createdBy: userId,
        status: 'TODO',
      },
    });
    taskId2 = t2.id;

    await goalService.recomputeAutoProgress(goal.id, userId);
    const updatedGoal = await prisma.goal.findUnique({ where: { id: goal.id } });
    assert.equal(updatedGoal?.progress, 50, 'Goal progress should be 50% for 1/2 tasks DONE');
  });

  it('PRJ-01: cascade deletes milestones and soft-deletes tasks when project is soft-deleted', async () => {
    const milestone = await prisma.milestone.create({
      data: {
        title: 'TEST_LIVE_MILESTONE_' + Date.now(),
        date: new Date(),
        projectId,
        userId,
      },
    });
    milestoneId = milestone.id;

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { deletedAt: now, updatedBy: userId },
      });

      await tx.task.updateMany({
        where: { projectId, deletedAt: null },
        data: { deletedAt: now, updatedBy: userId },
      });

      await tx.milestone.deleteMany({
        where: { projectId },
      });
    });

    // Milestone should be completely deleted from DB
    const fetchedMilestone = await prisma.milestone.findUnique({ where: { id: milestone.id } });
    assert.equal(fetchedMilestone, null, 'Milestone must be deleted from DB');

    // Tasks should be soft-deleted
    const tasks = await prisma.task.findMany({ where: { projectId } });
    assert.ok(tasks.length > 0 && tasks.every((t) => t.deletedAt !== null), 'All tasks must be soft-deleted');

    // Auto-progress should drop to 0% because tasks are soft-deleted
    await goalService.recomputeAutoProgress(goalId, userId);
    const goalAfterDelete = await prisma.goal.findUnique({ where: { id: goalId } });
    assert.equal(goalAfterDelete?.progress, 0, 'Auto-progress should be 0% when project tasks are soft-deleted');
  });

  it('GOL-01: unlinks Project.goalId and Habit.linkedGoalId on goal soft-delete', async () => {
    const unlinkedProj = await prisma.project.create({
      data: {
        name: 'TEST_UNLINK_PROJ_' + Date.now(),
        workspaceId,
        createdBy: userId,
        goalId,
      },
    });
    unlinkedProjectId = unlinkedProj.id;

    const unlinkedHab = await prisma.habit.create({
      data: {
        name: 'TEST_UNLINK_HABIT_' + Date.now(),
        workspaceId,
        createdBy: userId,
        linkedGoalId: goalId,
      },
    });
    unlinkedHabitId = unlinkedHab.id;

    await goalService.deleteGoal(goalId, workspaceId, userId);

    const checkedProj = await prisma.project.findUnique({ where: { id: unlinkedProjectId } });
    const checkedHab = await prisma.habit.findUnique({ where: { id: unlinkedHabitId } });

    assert.equal(checkedProj?.goalId, null, 'Project.goalId must be set to null on goal delete');
    assert.equal(checkedHab?.linkedGoalId, null, 'Habit.linkedGoalId must be set to null on goal delete');
  });
});
