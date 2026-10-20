import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { habitCompletionUnavailableReason } from '../services/habitCompletionDate';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';

describe('Habit completion date boundaries', () => {
  const created = new Date('2026-10-17T20:00:00Z');
  const now = new Date('2026-10-18T06:00:00Z');
  it('uses the creation calendar day in the user timezone, not its UTC date', () => {
    assert.equal(habitCompletionUnavailableReason(created, '2026-10-17', now, 'Asia/Kolkata'), 'before_creation');
    assert.equal(habitCompletionUnavailableReason(created, '2026-10-18', now, 'Asia/Kolkata'), undefined);
    assert.equal(habitCompletionUnavailableReason(created, '2026-10-17', now, 'America/Los_Angeles'), undefined);
  });
  it('permits historical backfill after creation and rejects future completion', () => {
    assert.equal(habitCompletionUnavailableReason('2026-10-01T00:00:00Z', '2026-10-15', now, 'Asia/Kolkata'), undefined);
    assert.equal(habitCompletionUnavailableReason(created, '2026-10-19', now, 'Asia/Kolkata'), 'future');
  });
});

// Exercise the real service and transaction entry point, replacing database IO.
describe('Habit service enforces creation bounds before persisting completion', () => {
  let prisma: typeof import('../prisma').prisma;
  let service: typeof import('../services/habit.service').habitService;
  let originalTransaction: unknown;
  let habit: any;
  let completions: any[];
  let writes: number;
  let timezone: string;
  const now = new Date('2026-10-18T06:00:00Z');
  before(async () => {
    ({ prisma } = await import('../prisma'));
    ({ habitService: service } = await import('../services/habit.service'));
    const { domainEventBus } = await import('../events/eventBus');
    domainEventBus.removeAllListeners();
    const tx = {
      user: { findUnique: async () => ({ countryCode: 'IN', metadata: { timezone } }) },
      habit: {
        findUnique: async () => habit,
        update: async ({ data }: any) => ({ ...habit, ...data, version: habit.version + 1 }),
      },
      habitCompletion: {
        count: async ({ where }: any) => completions.filter(c => c.date.getTime() === where.date.getTime()).length,
        create: async ({ data }: any) => { writes++; completions.push({ id: 'new', ...data }); return data; },
        findMany: async () => completions,
        deleteMany: async ({ where }: any) => { completions = completions.filter(c => c.date.getTime() !== where.date.getTime()); return { count: 1 }; },
      },
    };
    originalTransaction = prisma.$transaction;
    (prisma as any).$transaction = async (callback: any) => callback(tx);
  });
  beforeEach(() => {
    mock.timers.reset();
    mock.timers.enable({ apis: ['Date'], now });
    timezone = 'Asia/Kolkata';
    writes = 0; completions = [];
    habit = { id: 'h', workspaceId: 'ws', createdAt: new Date('2026-10-17T20:00:00Z'), deletedAt: null,
      cadence: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6], metadata: {}, version: 1 };
  });
  after(async () => {
    mock.timers.reset();
    (prisma as any).$transaction = originalTransaction;
    await prisma.$disconnect(); await (globalThis as any).pool?.end();
  });
  const log = (date: string) => service.logHabitCompletion('h', 'ws', 'user', date, `${date}T12:00:00.000Z`);
  it('rejects a day before creation without inserting a completion', async () => {
    await assert.rejects(log('2026-10-17'), /had not been created/);
    assert.equal(writes, 0);
  });
  it('allows the creation day even when creation was on the preceding UTC date', async () => {
    await log('2026-10-18'); assert.equal(writes, 1);
  });
  it('keeps valid historical backfill for older habits', async () => {
    habit.createdAt = new Date('2026-10-01T00:00:00Z');
    await log('2026-10-15'); assert.equal(writes, 1);
  });
  it('rejects future days without inserting a completion', async () => {
    await assert.rejects(log('2026-10-19'), /future days/); assert.equal(writes, 0);
  });
  it('applies an explicit western timezone consistently', async () => {
    timezone = 'America/Los_Angeles';
    await log('2026-10-17'); assert.equal(writes, 1);
  });
  it('allows undoing an invalid legacy completion before creation', async () => {
    completions = [{ id: 'legacy', date: new Date('2026-10-17T12:00:00Z') }];
    await service.unlogHabitCompletion('h', 'ws', 'user', '2026-10-17', '2026-10-17T12:00:00Z');
    assert.equal(completions.length, 0);
  });
});
