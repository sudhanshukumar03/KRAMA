import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INDIAN_STATES } from '@krama/types';
import { IndianHolidayProvider, INDIAN_CALENDAR_SOURCE } from '../services/holidays/IndianHolidayProvider';
import { DefaultHolidayProvider } from '../services/holidays/DefaultHolidayProvider';
import { mergeHolidayCalendars } from '../services/holidays/mergeHolidayCalendars';
import { parseOfficeHolidayCalendar } from '../services/holidays/officeHolidayCalendar';
import { isCapacityHoliday } from '../services/plannerTime';
import { calculateCapacity } from '../services/capacity.service';

const provider = new IndianHolidayProvider();
const regional = (code: string, year = 2026) => provider.getHolidays({ countryCode: 'IN', regionCode: code, year });

test('all 36 calendars have real dates, source references and distinct regional holidays', async () => {
  const signatures = new Set<string>();
  for (const state of INDIAN_STATES) {
    const holidays = await regional(state.code);
    assert.ok(holidays.length >= 16, state.code);
    assert.ok(holidays.every(h => h.regionCode === state.code && h.source === INDIAN_CALENDAR_SOURCE && h.sourceId?.startsWith('https://') && h.date.getUTCFullYear() === 2026), state.code);
    assert.ok(holidays.some(h => h.isPublicHoliday && !['2026-01-26', '2026-08-15', '2026-10-02'].includes(h.date.toISOString().slice(0, 10))), state.code);
    signatures.add(JSON.stringify(holidays.map(h => [h.name, h.date.toISOString(), h.isPublicHoliday])));
  }
  assert.equal(signatures.size, 36);
});

test('unsupported years, countries and region codes do not manufacture coverage', async () => {
  assert.deepEqual(await regional('MH', 2027), []);
  assert.deepEqual(await regional('UNKNOWN'), []);
  assert.deepEqual(await provider.getHolidays({ countryCode: 'US', year: 2026, regionCode: 'CA' }), []);
  assert.equal((await regional('IN-MH')).length, (await regional('MH')).length);
});

test('government dates retain public, optional, bank-only and district-only differences', async () => {
  const ld = await regional('LD');
  const goodFriday = ld.find(h => h.name === 'Good Friday')!;
  assert.equal(goodFriday.isOptional, true);
  assert.equal(isCapacityHoliday(goodFriday), false);
  assert.equal(isCapacityHoliday(ld.find(h => h.type === 'BANK')!), false);
  assert.equal((await regional('LA')).filter(h => /only\)/.test(h.name)).every(h => !h.isPublicHoliday), true);
  const an = await regional('AN');
  assert.equal(an.find(h => h.name.includes('Bakrid'))!.date.toISOString().slice(0, 10), '2026-05-28');
  assert.equal((await regional('MH')).find(h => /Bakrid/.test(h.name))!.date.toISOString().slice(0, 10), '2026-05-28');
});

test('full regional calendar replaces central dates and duplicate holidays consume one day', async () => {
  const mh = await regional('MH');
  const centralHoli = { ...mh[0]!, name: 'Holi', date: new Date('2026-03-04T00:00:00Z'), source: 'calendarific-v2' };
  const merged = mergeHolidayCalendars([centralHoli], mh);
  assert.ok(merged.some(h => /Holi/.test(h.name) && h.date.toISOString().startsWith('2026-03-03')));
  assert.equal(merged.some(h => h.date.toISOString().startsWith('2026-03-04')), false);
  const holidays = merged.filter(h => h.date.toISOString().startsWith('2026-05-01') && isCapacityHoliday(h));
  assert.equal(holidays.length, 2);
  const blocks = holidays.map(h => ({ startTime: new Date(`${h.date.toISOString().slice(0, 10)}T08:00:00Z`), endTime: new Date(`${h.date.toISOString().slice(0, 10)}T16:00:00Z`), type: 'OTHER' }));
  assert.equal(calculateCapacity(2400, blocks).occupiedMinutes, 480);
});

test('regional dataset needs no API key; other countries retain the external provider', async () => {
  let calls = 0;
  const defaultProvider = new DefaultHolidayProvider({ getHolidays: async () => { calls++; return []; } });
  assert.ok((await defaultProvider.getHolidays({ countryCode: 'IN', regionCode: 'KA', year: 2026 })).length > 0);
  assert.equal(calls, 0);
  assert.equal((await defaultProvider.getHolidays({ countryCode: 'IN', year: 2026 })).length, 3);
  await defaultProvider.getHolidays({ countryCode: 'US', year: 2026 });
  assert.equal(calls, 2);
});

test('feed parser unfolds fields and rejects wrong regions and impossible dates', () => {
  const make = (day: string, name: string) => `BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${day}\r\nSUMMARY:${name} (Regional Holiday)\r\nLOCATION:Maharashtra\r\nURL:https://www.officeholidays.com/holidays/india/maharashtra/example\r\nEND:VEVENT\r\n`;
  const feed = `BEGIN:VCALENDAR\r\nX-WR-CALNAME:Maharashtra Holidays\r\n${make('20260126', 'Republic Day')}${make('20260219', 'Shivaji Jayanti')}${make('20261002', 'Gandhi Jayanti')}END:VCALENDAR`;
  assert.equal(parseOfficeHolidayCalendar(feed, 'Maharashtra', 2026).length, 3);
  assert.throws(() => parseOfficeHolidayCalendar(feed, 'Karnataka', 2026), /location mismatch/);
  assert.throws(() => parseOfficeHolidayCalendar(feed.replace('20260219', '20260230'), 'Maharashtra', 2026), /Invalid holiday date/);
});
