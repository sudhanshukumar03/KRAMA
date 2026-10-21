import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';
process.env.REDIS_URL = 'redis://127.0.0.1:1/15';

// Execute shipped service/transaction logic, replacing only database and cache IO.
describe('Workflow progress and Focus eligibility', () => {
  let prisma: typeof import('../prisma').prisma;
  let redis: typeof import('../services/redis.service').redisService;
  let goalService: typeof import('../services/goal.service').goalService;
  let buildSchedule: typeof import('../services/focusTimer.service').buildFocusSchedule;
  let goal: any;
  let children: Array<{ progress: number; metadata: unknown }>;
  let tasks: Array<{ status: string }>;
  let taskReads: number;
  let snapshots: unknown[];
  let blocks: any[];
  let transaction: any;
  const originals = new Map<string, unknown>();

  before(async () => {
    ({ prisma } = await import('../prisma'));
    ({ redisService: redis } = await import('../services/redis.service'));
    ({ goalService } = await import('../services/goal.service'));
    ({ buildFocusSchedule: buildSchedule } = await import('../services/focusTimer.service'));
    const { domainEventBus } = await import('../events/eventBus');
    domainEventBus.removeAllListeners();
    mock.method(redis, 'del', async () => 0);
    const tx = {
      $queryRaw: async () => [],
      user: { findUnique: async () => ({ countryCode: 'IN', metadata: {} }) },
      goal: {
        findUnique: async () => ({ ...goal }), findUniqueOrThrow: async () => ({ ...goal }),
        findMany: async ({ where }: any) => {
          assert.equal(where.workspaceId, 'ws1'); assert.equal(where.deletedAt, null);
          return children;
        },
        update: async ({ data }: any) => {
          goal = { ...goal, ...data, version: goal.version + 1 };
          return { ...goal };
        },
      },
      task: { findMany: async () => { taskReads++; return tasks; } },
      goalProgressSnapshot: {
        findFirst: async () => null,
        create: async ({ data }: any) => { snapshots.push(data); return data; },
      },
    };
    transaction = tx;
    originals.set('$transaction', prisma.$transaction);
    (prisma as any).$transaction = async (callback: any) => callback(tx);
    for (const key of ['goal', 'user', 'timeBlock', 'task', 'focusSession', 'project', 'dailyLog']) originals.set(key, (prisma as any)[key]);
    (prisma as any).dailyLog = { findUnique: async () => null };
    (prisma as any).goal = tx.goal;
    (prisma as any).user = { findUnique: async () => ({ weeklyCapacityMinutes: 2400, metadata: {}, countryCode: 'IN' }) };
    (prisma as any).timeBlock = { findMany: async () => blocks };
    (prisma as any).task = { findMany: async () => [{ id: 'open', title: 'Due task', status: 'TODO', estimateMinutes: 25, projectId: null }] };
    (prisma as any).focusSession = { findMany: async () => [] };
    (prisma as any).project = { findMany: async () => [] };
  });
  beforeEach(() => {
    goal = { id: 'parent', workspaceId: 'ws1', parentGoalId: null, progress: 50, deletedAt: null, version: 1, metadata: { progressMode: 'auto' } };
    children = [{ progress: 50, metadata: {} }]; tasks = []; taskReads = 0; snapshots = []; blocks = [];
  });
  after(async () => {
    mock.restoreAll();
    for (const [key, value] of originals) (prisma as any)[key] = value;
    redis.client.disconnect(); await prisma.$disconnect(); await (globalThis as any).pool?.end();
  });

  it('task events cannot overwrite a parent key-result rollup', async () => {
    await goalService.recomputeAutoProgress('parent', 'user');
    assert.equal(goal.progress, 50); assert.equal(taskReads, 0); assert.equal(snapshots.length, 0);
  });
  it('a manual-mode parent still derives weighted child progress', async () => {
    goal.metadata = { progressMode: 'manual' };
    children = [{ progress: 100, metadata: { weight: 3 } }, { progress: 0, metadata: { weight: 1 } }];
    await goalService.recomputeAutoProgress('parent', 'user');
    assert.equal(goal.progress, 75); assert.equal(taskReads, 0);
    assert.equal((snapshots[0] as any).progress, 75);
  });
  it('parent edits cannot replace derived progress with a manual value', async () => {
    const result = await goalService.updateGoal('parent', 'ws1', { progress: 90, version: 1 }, 'user');
    assert.equal(result.progress, 50); assert.equal(goal.progress, 50); assert.equal(taskReads, 0);
  });
  it('an automatic leaf still uses linked task completion', async () => {
    children = []; tasks = [{ status: 'DONE' }, { status: 'DONE' }, { status: 'TODO' }];
    await goalService.recomputeAutoProgress('parent', 'user');
    assert.equal(goal.progress, 67); assert.equal(taskReads, 1);
    assert.equal((snapshots[0] as any).progress, 67);
  });
  it('a manual leaf retains its entered progress', async () => {
    goal.metadata = { progressMode: 'manual' }; children = [];
    await goalService.recomputeAutoProgress('parent', 'user');
    assert.equal(goal.progress, 50); assert.equal(taskReads, 0);
  });
  it('removing the last key result restores automatic leaf progress', async () => {
    children = []; tasks = [{ status: 'DONE' }, { status: 'TODO' }, { status: 'TODO' }];
    await (goalService as any).recalculateParentRollup('parent', 'user', transaction);
    assert.equal(goal.progress, 33); assert.equal(taskReads, 1);
    await goalService.recomputeAutoProgress('parent', 'user');
    assert.equal(goal.progress, 33);
  });
  it('a completed task block cannot suppress another open task', async () => {
    blocks = [{ id: 'stale', taskId: 'done', type: 'WORK', title: 'Finished work', startTime: new Date('2026-10-15T09:00Z'), endTime: new Date('2026-10-15T09:25Z') }];
    const result = await buildSchedule('user', 'ws1');
    assert.equal(result.mode, 'planner'); assert.equal(result.plan[0]?.taskId, 'open');
    assert.equal(result.totalFocusMinutes, 25); assert.equal(result.remainingMinutes, 480);
  });
  it('valid work blocks retain priority over task-estimate fallback', async () => {
    blocks = [{ id: 'valid', taskId: 'open', type: 'WORK', title: 'Planned work', startTime: new Date('2026-10-15T09:00Z'), endTime: new Date('2026-10-15T09:10Z') }];
    const result = await buildSchedule('user', 'ws1');
    assert.equal(result.plan[0]?.timeBlockId, 'valid'); assert.equal(result.totalFocusMinutes, 10);
  });
});
