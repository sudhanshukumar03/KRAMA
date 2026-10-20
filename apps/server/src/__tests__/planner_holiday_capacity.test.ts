import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCapacityHoliday } from '../services/plannerTime';

test('only required weekday public holidays consume work capacity', () => {
  const weekday = { date: new Date('2026-10-07T00:00:00.000Z'), isPublicHoliday: true, isOptional: false };
  assert.equal(isCapacityHoliday(weekday), true);
  assert.equal(isCapacityHoliday({ ...weekday, isPublicHoliday: false }), false);
  assert.equal(isCapacityHoliday({ ...weekday, isOptional: true }), false);
  assert.equal(isCapacityHoliday({ ...weekday, date: new Date('2026-10-10T00:00:00.000Z') }), false);
});
