import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCapacity } from '../services/capacity.service';
import { isCapacityWeekday } from '../services/plannerTime';

// These exercise the REAL shipped functions (not re-implemented arithmetic):
// calculateCapacity from capacity.service and isCapacityWeekday from
// plannerTime — the two pieces behind the planner's capacity summary.

const day = '2026-09-21'; // a Monday (see calendar in habit_streak_timezone.test)
const at = (hhmm: string) => new Date(`${day}T${hhmm}:00.000Z`);

describe('Tier 1: Planner Capacity (real calculateCapacity)', () => {
  it('splits occupied / meeting / other / free for non-overlapping blocks', () => {
    const blocks = [
      { startTime: at('09:00'), endTime: at('11:00'), type: 'MEETING' }, // 120
      { startTime: at('13:00'), endTime: at('14:00'), type: 'WORK' },    // 60
    ];
    const cap = calculateCapacity(2400, blocks);
    assert.equal(cap.occupiedMinutes, 180);
    assert.equal(cap.meetingMinutes, 120);
    assert.equal(cap.otherMinutes, 60);
    assert.equal(cap.freeMinutes, 2400 - 180);
    assert.equal(cap.completionPercent, Math.round((180 / 2400) * 100));
  });

  it('does not double-count overlapping MEETING blocks (A6)', () => {
    // Two meetings that overlap 10:00–11:00. Raw summing would report 240
    // meeting minutes and push meetingMinutes above occupiedMinutes; the merge
    // fix collapses them to the real 09:00–12:00 span (180).
    const blocks = [
      { startTime: at('09:00'), endTime: at('11:00'), type: 'MEETING' },
      { startTime: at('10:00'), endTime: at('12:00'), type: 'MEETING' },
    ];
    const cap = calculateCapacity(2400, blocks);
    assert.equal(cap.occupiedMinutes, 180, 'overlapping meetings occupy one merged 3h span');
    assert.equal(cap.meetingMinutes, 180, 'meeting minutes are merged, not summed to 240');
    assert.ok(cap.meetingMinutes <= cap.occupiedMinutes, 'meetings never exceed occupied');
    assert.equal(cap.otherMinutes, 0);
  });

  it('reports an empty week as fully free with 0% completion', () => {
    const cap = calculateCapacity(2400, []);
    assert.equal(cap.occupiedMinutes, 0);
    assert.equal(cap.meetingMinutes, 0);
    assert.equal(cap.freeMinutes, 2400);
    assert.equal(cap.completionPercent, 0);
  });

  it('caps completionPercent at 100 when over capacity', () => {
    const blocks = [{ startTime: at('00:00'), endTime: at('23:00'), type: 'WORK' }]; // 1380
    const cap = calculateCapacity(600, blocks);
    assert.equal(cap.completionPercent, 100);
    assert.equal(cap.freeMinutes, 0, 'free clamps at 0 when over capacity');
  });
});

describe('Tier 1: Capacity weekday-only holiday deduction (A7)', () => {
  it('counts Mon–Fri as capacity weekdays', () => {
    assert.equal(isCapacityWeekday(new Date('2026-09-21T12:00:00.000Z')), true, 'Monday');
    assert.equal(isCapacityWeekday(new Date('2026-09-18T12:00:00.000Z')), true, 'Friday');
  });

  it('excludes Saturday and Sunday (a weekend holiday deducts nothing)', () => {
    assert.equal(isCapacityWeekday(new Date('2026-09-19T12:00:00.000Z')), false, 'Saturday');
    assert.equal(isCapacityWeekday(new Date('2026-09-20T12:00:00.000Z')), false, 'Sunday');
  });
});
