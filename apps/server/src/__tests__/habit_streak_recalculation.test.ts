import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';

describe('Hourly habit streak snapshots', () => {
  let prisma: typeof import('../prisma').prisma;
  let recalculate: typeof import('../services/habitStreakRecalculation.service').recalculateHabitStreaks;
  let service: typeof import('../services/habit.service').habitService;
  let originalTransaction: unknown, originalFindMany: unknown;
  let habit: any, users: Record<string, any>, history: any[], writes: any[], sequence: string[];
  let locked: boolean;
  let beforeLock: (() => void) | undefined;
  const now = new Date('2026-10-22T04:00:00Z'); // Oct 21 in Los Angeles; Oct 22 in Tokyo.
  before(async () => {
    ({ prisma } = await import('../prisma'));
    ({ recalculateHabitStreaks: recalculate } = await import('../services/habitStreakRecalculation.service'));
    ({ habitService: service } = await import('../services/habit.service'));
    originalTransaction = prisma.$transaction; originalFindMany = prisma.habit.findMany;
    (prisma.habit as any).findMany = async () => [{ id: 'h' }];
    (prisma as any).$transaction = async (callback: any) => callback({
      $queryRaw: async () => { beforeLock?.(); sequence.push('lock'); return locked ? [{ id: 'h' }] : []; },
      habit: {
        findUnique: async () => { sequence.push('habit'); return habit; },
        update: async (args: any) => {
          writes.push(args);
          const version = habit.version + (args.data.version?.increment || 0);
          habit = { ...habit, ...args.data, version }; return habit;
        },
      },
      user: { findUnique: async ({ where }: any) => users[where.id] || null },
      habitCompletion: { findMany: async ({ where }: any) => {
        sequence.push('history'); assert.equal(where.habitId, 'h'); assert.ok(where.userId);
        return history.filter(row => row.userId === where.userId);
      } },
    });
  });
  beforeEach(() => {
    mock.timers.reset();
    writes = []; sequence = []; locked = true; beforeLock = undefined;
    habit = { id: 'h', workspaceId: 'ws', deletedAt: null, scheduledDays: [0,1,2,3,4,5,6], cadence: 'daily',
      metadata: { streakUserId: 'la' }, updatedBy: 'la', createdBy: 'tokyo', workspace: { createdBy: 'owner' }, streak: 0, bestStreak: 0, version: 1 };
    users = { la: { metadata: { timezone: 'America/Los_Angeles' } }, tokyo: { metadata: { timezone: 'Asia/Tokyo' } }, owner: { metadata: { timezone: 'UTC' } } };
    history = [{ userId: 'la', date: new Date('2026-10-20T12:00:00Z') }, { userId: 'tokyo', date: new Date('2026-10-19T12:00:00Z') }];
  });
  after(async () => {
    mock.timers.reset();
    (prisma as any).$transaction = originalTransaction; (prisma.habit as any).findMany = originalFindMany;
    await prisma.$disconnect(); await (globalThis as any).pool?.end();
  });
  it('uses the snapshot actor timezone and only that user history, excluding other members', async () => {
    assert.deepEqual(await recalculate(now), { processedHabits: 1 });
    assert.deepEqual(writes[0].data, { streak: 1, bestStreak: 1 });
    assert.deepEqual(sequence, ['lock', 'habit', 'history']);
  });
  it('reads the actor and history after a concurrent completion releases the lock', async () => {
    habit.updatedBy = 'tokyo';
    habit.metadata.streakUserId = 'tokyo';
    beforeLock = () => { habit.updatedBy = 'la'; habit.metadata.streakUserId = 'la'; history.push({ userId: 'la', date: new Date('2026-10-21T12:00:00Z') }); };
    await recalculate(now);
    assert.deepEqual(writes[0].data, { streak: 2, bestStreak: 2 });
  });
  it('uses explicit creator and workspace owner fallbacks for legacy snapshots', async () => {
    delete habit.metadata.streakUserId;
    habit.updatedBy = null; habit.createdBy = 'la'; await recalculate(now);
    assert.equal(writes[0].data.streak, 1);
    writes = []; habit.createdBy = null; habit.streak = 0; habit.bestStreak = 0;
    history = [{ userId: 'owner', date: new Date('2026-10-21T12:00:00Z') }];
    await recalculate(now); assert.deepEqual(writes[0].data, { streak: 1, bestStreak: 1 });
  });
  it('skips deleted habits and missing users without inventing another member history', async () => {
    locked = false; await recalculate(now);
    assert.deepEqual(sequence, ['lock']); assert.equal(writes.length, 0);
    locked = true; users = {}; await recalculate(now); assert.equal(writes.length, 0);
  });
  it('does not write when the derived snapshot is already current', async () => {
    habit.streak = 1; habit.bestStreak = 1;
    await recalculate(now); assert.equal(writes.length, 0);
  });
  it('a rename by another member cannot change or spoof snapshot ownership', async () => {
    await service.updateHabit('h', 'ws', { name: 'Renamed only', metadata: { streakUserId: 'tokyo', notes: 'Preserve this edit' }, version: 1 }, 'tokyo');
    assert.equal(habit.updatedBy, 'tokyo');
    assert.equal(habit.metadata.streakUserId, 'la');
    assert.equal(habit.metadata.notes, 'Preserve this edit');
    await recalculate(now);
    assert.equal(habit.streak, 1); assert.equal(habit.bestStreak, 1);
  });
  it('uses the current day after waiting across midnight for a completion lock', async () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T23:59:59Z') });
    users.la.metadata.timezone = 'UTC';
    habit.streak = 3; habit.bestStreak = 3;
    history = [20,21,22].map(day => ({ userId: 'la', date: new Date(`2026-10-${day}T12:00:00Z`) }));
    beforeLock = () => { mock.timers.tick(2000); };
    await recalculate();
    assert.equal(writes.length, 0);
    assert.equal(habit.streak, 3); assert.equal(habit.bestStreak, 3);
  });
});
