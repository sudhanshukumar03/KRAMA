import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';
process.env.REDIS_URL = 'redis://127.0.0.1:1/15';

describe('Planner deadlines, unique totals, and routine eligibility', () => {
  let prisma: typeof import('../prisma').prisma;
  let redis: typeof import('../services/redis.service').redisService;
  let service: typeof import('../services/planner.service').plannerService;
  const originals = new Map<string, unknown>();
  let tasks: any[]; let habits: any[]; let completions: any[];
  const context = { userId: 'user', workspaceId: 'ws1' };
  const range = { start: '2026-10-12', end: '2026-10-18' };
  const date = (day: number) => new Date(`2026-10-${day}T12:00:00Z`);
  const task = { id: 'task', title: 'Due work', status: 'TODO', version: 1, dueDate: date(15), scheduledDate: date(20), projectId: null };
  const habit = { id: 'habit', name: 'Monday routine', cadence: 'daily', scheduledDays: [1], metadata: { pinnedToPlanner: true } };

  before(async () => {
    ({ prisma } = await import('../prisma'));
    ({ redisService: redis } = await import('../services/redis.service'));
    ({ plannerService: service } = await import('../services/planner.service'));
    const { HolidaySyncService } = await import('../services/holidays/HolidaySyncService');
    mock.method(HolidaySyncService.prototype, 'getCalendar', async () => ({ holidays: [], missingNationalYears: [], missingRegionalYears: [] }));
    const stub = (key: string, value: unknown) => { originals.set(key, (prisma as any)[key]); (prisma as any)[key] = value; };
    stub('workspaceMember', { findUnique: async () => ({ workspaceId: 'ws1' }) });
    stub('user', { findUnique: async () => ({ weeklyCapacityMinutes: 2400, countryCode: 'IN' }) });
    stub('task', { findMany: async () => tasks });
    stub('habit', { findMany: async () => habits });
    stub('habitCompletion', { findMany: async () => completions });
    for (const key of ['timeBlock', 'project', 'milestone', 'goal']) stub(key, { findMany: async () => [] });
  });
  beforeEach(() => { tasks = [{ ...task }]; habits = [{ ...habit }]; completions = []; });
  after(async () => {
    mock.restoreAll(); for (const [key, value] of originals) (prisma as any)[key] = value;
    redis.client.disconnect(); await prisma.$disconnect(); await (globalThis as any).pool?.end();
  });

  it('retains a deadline in range even when scheduled in a later week', async () => {
    const result = await service.getWeek(context, range);
    assert.equal(result.tasks.length, 1); assert.equal(result.capacity.scheduledTaskCount, 1);
    assert.equal(result.days.find(day => day.dateKey === '2026-10-15')?.tasks[0]?.id, 'task');
  });
  it('places work on both relevant dates but counts the task only once', async () => {
    tasks[0].scheduledDate = date(13);
    const result = await service.getWeek(context, range);
    assert.equal(result.days.flatMap(day => day.tasks).length, 2);
    assert.equal(result.tasks.length, 1); assert.equal(result.capacity.scheduledTaskCount, 1);
  });
  it('does not inflate completion percentage for a done task with two dates', async () => {
    tasks = [{ ...task, status: 'DONE', scheduledDate: date(13) }, { ...task, id: 'open' }];
    const result = await service.getWeek(context, range);
    assert.equal(result.capacity.completedTaskCount, 1); assert.equal(result.capacity.scheduledTaskCount, 2);
    assert.equal(result.capacity.taskCompletionPercent, 50);
  });
  it('emits one placement when the scheduled date and deadline coincide', async () => {
    tasks[0].scheduledDate = date(15);
    const result = await service.getWeek(context, range);
    assert.equal(result.days.flatMap(day => day.tasks).length, 1);
  });
  it('pinning preserves a daily routine rest day while retaining visibility', async () => {
    const result = await service.getWeek(context, range);
    assert.equal(result.routines[0]?.id, 'habit');
    assert.equal(result.days[0]?.occurrences[0]?.scheduled, true);
    assert.equal(result.days[3]?.occurrences[0]?.scheduled, false);
  });
  it('empty daily schedules match the all-days habit policy', async () => {
    habits[0].scheduledDays = [];
    const result = await service.getWeek(context, range);
    assert.equal(result.occurrences.filter(occ => occ.scheduled).length, 7);
  });
  it('weekly routines remain eligible any day and expose their target', async () => {
    habits = [{ ...habit, cadence: 'weekly', metadata: { pinnedToPlanner: true, weeklyTarget: 4 } }];
    const result = await service.getWeek(context, range);
    assert.equal(result.occurrences.filter(occ => occ.scheduled).length, 7);
    assert.equal(result.routines[0]?.weeklyTarget, 4); assert.equal(result.routines[0]?.cadence, 'weekly');
  });
  it('preserves old off-schedule logs so users can undo them', async () => {
    completions = [{ id: 'extra', habitId: 'habit', date: date(15), completedAt: date(15), offSchedule: true }];
    const result = await service.getWeek(context, range);
    assert.deepEqual(result.days[3]?.occurrences[0], { id: 'extra', habitId: 'habit', date: date(15).toISOString(), completed: true, completedAt: date(15).toISOString(), isVirtual: false, scheduled: false, offSchedule: true });
  });
  it('marks days before habit creation unavailable in the user timezone', async () => {
    habits = [{ ...habit, scheduledDays: [0, 1, 2, 3, 4, 5, 6], createdAt: new Date('2026-10-15T20:00:00Z') }];
    const result = await service.getWeek(context, range);
    assert.equal(result.days[3]?.occurrences[0]?.unavailableReason, 'before_creation');
    assert.equal(result.days[4]?.occurrences[0]?.unavailableReason, undefined);
  });
  it('marks future days unavailable without dropping the planned routine', async () => {
    const result = await service.getWeek(context, { start: '2099-10-12', end: '2099-10-18' });
    assert.equal(result.routines.length, 1);
    assert.ok(result.occurrences.every(occ => occ.unavailableReason === 'future'));
  });
  it('retains an invalid pre-creation completion for undo', async () => {
    habits = [{ ...habit, createdAt: date(16) }];
    completions = [{ id: 'legacy', habitId: 'habit', date: date(15), completedAt: date(15) }];
    const result = await service.getWeek(context, range);
    const occurrence = result.days[3]?.occurrences[0];
    assert.equal(occurrence?.unavailableReason, 'before_creation');
    assert.equal(occurrence?.completed, true);
  });
});
