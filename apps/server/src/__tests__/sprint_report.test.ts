import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { getSprintReport } from '../controllers/sprint.controller';

describe('Tier 4: SprintReport Reader & Metrics Telemetry', () => {
  let user: any;
  let workspace: any;
  let project: any;
  let activeSprint: any;
  let emptySprint: any;

  before(async () => {
    const timestamp = Date.now();
    user = await prisma.user.create({
      data: { email: `sprint-test-${timestamp}@example.com`, passwordHash: 'dummy' },
    });

    workspace = await prisma.workspace.create({
      data: {
        name: `Sprint Test Workspace ${timestamp}`,
        createdBy: user.id,
        members: {
          create: [{ userId: user.id, role: 'OWNER' }],
        },
      },
    });

    project = await prisma.project.create({
      data: {
        name: 'Sprint Test Project',
        workspaceId: workspace.id,
        createdBy: user.id,
      },
    });

    // Create active sprint spanning 14 days
    const now = new Date();
    const startDate = new Date(now.getTime() - 4 * 86400000); // 4 days ago
    const endDate = new Date(now.getTime() + 10 * 86400000); // 10 days ahead (14 days total)

    activeSprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1 - Execution',
        workspaceId: workspace.id,
        projectId: project.id,
        startDate,
        endDate,
        status: 'active',
      },
    });

    // Create 4 tasks in active sprint: 2 DONE (3pts each), 1 IN_PROGRESS (5pts), 1 TODO (2pts)
    await prisma.task.createMany({
      data: [
        {
          title: 'Task 1 - Done',
          workspaceId: workspace.id,
          projectId: project.id,
          sprintId: activeSprint.id,
          status: 'DONE',
          estimateMinutes: 180,
          metadata: { points: 3 },
        },
        {
          title: 'Task 2 - Done',
          workspaceId: workspace.id,
          projectId: project.id,
          sprintId: activeSprint.id,
          status: 'DONE',
          estimateMinutes: 180,
          metadata: { points: 3 },
        },
        {
          title: 'Task 3 - In Progress',
          workspaceId: workspace.id,
          projectId: project.id,
          sprintId: activeSprint.id,
          status: 'IN_PROGRESS',
          estimateMinutes: 300,
          metadata: { points: 5 },
        },
        {
          title: 'Task 4 - Todo',
          workspaceId: workspace.id,
          projectId: project.id,
          sprintId: activeSprint.id,
          status: 'TODO',
          estimateMinutes: 120,
          metadata: { points: 2 },
        },
      ],
    });

    emptySprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 2 - Empty Planning',
        workspaceId: workspace.id,
        projectId: project.id,
        startDate: now,
        endDate: new Date(now.getTime() + 14 * 86400000),
        status: 'planning',
      },
    });
  });

  after(async () => {
    if (workspace) {
      await prisma.task.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.sprint.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.project.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.workspace.delete({ where: { id: workspace.id } });
    }
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  function createMockContext(sprintId: string, workspaceId: string) {
    let statusCode = 200;
    let responseBody: any = null;

    const req: any = {
      params: { id: sprintId },
      workspaceId,
      user: { id: user.id },
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    return {
      req,
      res,
      getResult: () => ({ statusCode, responseBody }),
    };
  }

  it('returns 404 if sprint does not exist', async () => {
    const ctx = createMockContext('non-existent-sprint-id', workspace.id);
    await getSprintReport(ctx.req, ctx.res);

    const result = ctx.getResult();
    assert.equal(result.statusCode, 404);
    assert.deepEqual(result.responseBody, { message: 'Sprint not found' });
  });

  it('calculates planned, completed, points, and burndown metrics for active sprint', async () => {
    const ctx = createMockContext(activeSprint.id, workspace.id);
    await getSprintReport(ctx.req, ctx.res);

    const result = ctx.getResult();
    assert.equal(result.statusCode, 200);

    const data = result.responseBody;
    assert.equal(data.sprintId, activeSprint.id);
    assert.equal(data.tasksPlanned, 4, 'Should count 4 planned tasks');
    assert.equal(data.tasksCompleted, 2, 'Should count 2 completed tasks');
    assert.equal(data.tasksInProgress, 1, 'Should count 1 task in progress');
    assert.equal(data.tasksTodo, 1, 'Should count 1 task in todo');
    assert.equal(data.completionRate, 50, 'Completion rate should be 50%');
    assert.equal(data.totalPoints, 13, 'Total points should be 3 + 3 + 5 + 2 = 13');
    assert.equal(data.completedPoints, 6, 'Completed points should be 3 + 3 = 6');
    assert.equal(data.actualRemaining, 2, 'Actual remaining tasks should be 2');
    assert.equal(data.daysTotal, 14, 'Sprint duration should be 14 days');
    assert.equal(data.daysElapsed, 4, '4 days should have elapsed');
    assert(data.pace > 0, 'Pace should be positive based on completed tasks over elapsed days');
  });

  it('handles empty sprint with zero tasks and zero velocity gracefully', async () => {
    const ctx = createMockContext(emptySprint.id, workspace.id);
    await getSprintReport(ctx.req, ctx.res);

    const { statusCode, responseBody: data } = ctx.getResult();
    assert.equal(statusCode, 200);
    assert.equal(data.tasksPlanned, 0);
    assert.equal(data.tasksCompleted, 0);
    assert.equal(data.completionRate, 0);
    assert.equal(data.totalPoints, 0);
    assert.equal(data.completedPoints, 0);
    assert.equal(data.actualRemaining, 0);
    assert.equal(data.idealRemaining, 0);
  });
});
