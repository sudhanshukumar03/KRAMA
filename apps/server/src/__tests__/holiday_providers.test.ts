import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INDIAN_STATES } from '@krama/types';
import { HolidayNormalizer } from '../services/holidays/HolidayNormalizer';
import { CalendarificHolidayProvider } from '../services/holidays/CalendarificHolidayProvider';
import { NagerDateHolidayProvider } from '../services/holidays/NagerDateHolidayProvider';

test('location catalogue contains all 28 states and 8 union territories without duplicates', () => {
  assert.equal(INDIAN_STATES.length, 36);
  assert.equal(new Set(INDIAN_STATES.map(state => state.code)).size, 36);
  assert.ok(INDIAN_STATES.some(state => state.code === 'DH'));
  assert.ok(INDIAN_STATES.some(state => state.code === 'LA'));
});

test('restricted classification takes precedence over broad national/public types', () => {
  assert.deepEqual(HolidayNormalizer.normalizeType('National holiday, Restricted Holiday'), { type: 'OPTIONAL', isPublicHoliday: false });
  assert.deepEqual(HolidayNormalizer.normalizeType('Gazetted Holiday'), { type: 'NATIONAL', isPublicHoliday: true });
  assert.equal(HolidayNormalizer.normalizeType('Observance').isPublicHoliday, false);
});

test('Calendarific partitions actual regions and honours restricted primary types', async t => {
  const holiday = (name: string, states: unknown, primary_type = 'Gazetted Holiday') => ({ name, states, primary_type, type: ['National holiday'], date: { iso: '2026-02-19' } });
  const calls: URL[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(new URL(url));
    return Response.json({ meta: { code: 200 }, response: { holidays: [
      holiday('National', 'All'), holiday('Optional', 'All', 'Restricted Holiday'),
      holiday('Shivaji Jayanti', [{ iso: 'in-mh', name: 'Maharashtra' }]),
      holiday('Karnataka only', [{ iso: 'in-ka', name: 'Karnataka' }]),
    ] } });
  });
  const provider = new CalendarificHolidayProvider('test-key');
  const national = await provider.getHolidays({ countryCode: 'IN', year: 2026 });
  assert.deepEqual(national.map(h => h.name), ['National', 'Optional']);
  assert.equal(national[1]?.isOptional, true);
  assert.equal(national[1]?.isPublicHoliday, false);
  const regional = await provider.getHolidays({ countryCode: 'IN', regionCode: 'MH', year: 2026 });
  assert.deepEqual(regional.map(h => h.name), ['Shivaji Jayanti']);
  assert.equal(calls[1]?.searchParams.get('location'), 'in-mh');
});

test('nationwide-only response never becomes fabricated regional coverage', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ meta: { code: 200 }, response: { holidays: [{ name: 'Republic Day', states: 'All', date: { iso: '2026-01-26' }, type: ['National holiday'] }] } }));
  assert.deepEqual(await new CalendarificHolidayProvider('test-key').getHolidays({ countryCode: 'IN', regionCode: 'KA', year: 2026 }), []);
});

test('Nager selects county matches and keeps national rows in the national cache', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json([
    { name: 'National', date: '2026-01-01', global: true, counties: null, types: ['Public'] },
    { name: 'California', date: '2026-02-01', global: false, counties: ['US-CA'], types: ['Public'] },
    { name: 'New York', date: '2026-03-01', global: false, counties: ['US-NY'], types: ['Public'] },
  ]));
  const provider = new NagerDateHolidayProvider();
  assert.deepEqual((await provider.getHolidays({ countryCode: 'US', year: 2026 })).map(h => h.name), ['National']);
  assert.deepEqual((await provider.getHolidays({ countryCode: 'US', regionCode: 'CA', year: 2026 })).map(h => h.name), ['California']);
});

test('provider error bodies fail safely without exposing credentials', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ meta: { code: 429 }, response: [] }));
  const messages: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => { messages.push(args); });
  assert.deepEqual(await new CalendarificHolidayProvider('private-test-credential').getHolidays({ countryCode: 'IN', year: 2026 }), []);
  assert.equal(JSON.stringify(messages).includes('private-test-credential'), false);
});
