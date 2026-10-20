import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportingClock, shiftDay, validDayKey } from '../services/reportingTime';
test('Indian calendar days differ from UTC instants at midnight', () => {
 const clock = reportingClock(null, 'Asia/Kolkata'); assert.equal(clock.dateKey(new Date('2026-10-06T18:30:00Z')), '2026-10-07'); assert.equal(clock.dayStart('2026-10-07').toISOString(), '2026-10-06T18:30:00.000Z'); assert.equal(clock.dateKey(new Date('2026-10-06T18:29:59Z')), '2026-10-06');
});
test('DST day boundaries use 23 and 25 hours', () => {
 const clock = reportingClock(null, 'America/New_York'); assert.equal(+clock.dayStart('2026-03-09') - +clock.dayStart('2026-03-08'), 23 * 3600000); assert.equal(+clock.dayStart('2026-11-02') - +clock.dayStart('2026-11-01'), 25 * 3600000);
});
test('canonical days validate and shift through leap days and year boundaries', () => {
 assert.equal(validDayKey('2026-02-30'), false); assert.equal(validDayKey('2028-02-29'), true); assert.equal(validDayKey('2026-2-01'), false); assert.equal(shiftDay('2028-02-28', 1), '2028-02-29'); assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
});
test('invalid zones and offsets fail while legacy fixed offsets retain compatibility', () => {
 assert.throws(() => reportingClock(null, 'invalid/zone'), /Invalid timezone/); assert.throws(() => reportingClock(null, undefined, '841'), /Invalid timezone offset/); assert.throws(() => reportingClock(null, undefined, '1.5'), /Invalid timezone offset/);
 assert.equal(reportingClock(null, undefined, '-840').dayStart('2026-10-07').toISOString(), '2026-10-06T10:00:00.000Z'); assert.equal(reportingClock(null, undefined, '720').dayStart('2026-10-07').toISOString(), '2026-10-07T12:00:00.000Z');
});
