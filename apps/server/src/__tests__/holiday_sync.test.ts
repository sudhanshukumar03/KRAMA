import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { HolidaySyncService } from '../services/holidays/HolidaySyncService';

function mockFindMany(t: TestContext, implementation: any) {
  const original = prisma.holiday.findMany;
  prisma.holiday.findMany = implementation;
  t.after(() => { prisma.holiday.findMany = original; });
}

test('missing coverage is throttled and concurrent lookups share a provider request', async t => {
  mockFindMany(t, async () => []);
  let calls = 0;
  const service = new HolidaySyncService({ getHolidays: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return []; } });
  const input = { countryCode: 'IN', regionCode: 'KA', year: 2026 };
  const results = await Promise.all([service.ensureHolidays(input), service.ensureHolidays(input)]);
  assert.deepEqual(results, [[], []]);
  await service.ensureHolidays(input);
  assert.equal(calls, 1);
  await service.ensureHolidays(input, { refresh: true });
  assert.equal(calls, 2);
});

test('legacy unpartitioned caches are excluded from normal reads', async t => {
  let where: any;
  mockFindMany(t, async (args: any) => { where = args.where; return []; });
  const service = new HolidaySyncService({ getHolidays: async () => [] });
  await service.getLocalHolidays({ countryCode: 'IN', regionCode: 'KA', year: 2026 });
  assert.equal(where.regionCode, 'KA');
  assert.deepEqual(where.OR, [{ source: null }, { source: { notIn: ['calendarific', 'nager.date'] } }]);
});

test('refresh failure retains the current verified cache', async t => {
  const cache = [{ name: 'Verified public holiday', updatedAt: new Date(), source: 'calendarific-v2' }];
  mockFindMany(t, async () => cache);
  const service = new HolidaySyncService({ getHolidays: async () => [] });
  assert.deepEqual(await service.ensureHolidays({ countryCode: 'IN', year: 2026 }, { refresh: true }), cache);
});
