import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalPace } from '../../../web/src/lib/goalUtils';
import type { GoalWithRelations } from '../../../web/src/types/schema';

function goal(overrides: Record<string, unknown> = {}) {
  return { progress: 0, targetDate: null, createdAt: new Date(2026, 9, 1), metadata: { status: 'ACTIVE' }, ...overrides } as GoalWithRelations;
}
const now = new Date(2026, 9, 8, 23, 59);

test('production pace helper resolves statuses with explicit comparisons', () => {
  assert.equal(computeGoalPace(goal(), now).status, 'unknown');
  for (const [status, badge] of [['PAUSED', 'Paused'], ['CANCELED', 'Canceled'], ['COMPLETED', 'Completed']]) {
    assert.equal(computeGoalPace(goal({ metadata: { status } }), now).badge, badge);
  }
  assert.equal(computeGoalPace(goal({ progress: 100 }), now).status, 'completed');
  assert.equal(computeGoalPace(goal({ metadata: null, status: 'PAUSED' }), now).badge, 'Paused');
  assert.equal(computeGoalPace(goal({ metadata: { status: 'ACTIVE' }, status: 'COMPLETED' }), now).status, 'unknown');
});

test('due today lasts the whole local day; missing, past and future deadlines stay distinct', () => {
  const today = computeGoalPace(goal({ targetDate: '2026-10-08T00:00:00.000Z' }), now);
  assert.equal(today.isDueToday, true);
  assert.notEqual(today.status, 'past_due');
  assert.equal(today.requiredPace, 100);
  const past = computeGoalPace(goal({ targetDate: '2026-10-07T12:00:00.000Z' }), now);
  assert.equal(past.status, 'past_due');
  assert.equal(past.isDueToday, false);
  const tomorrow = computeGoalPace(goal({ targetDate: new Date('2026-10-09T00:00:00.000Z') }), now);
  assert.equal(tomorrow.daysRemaining, 1);
  assert.equal(tomorrow.isDueToday, false);
  assert.equal(computeGoalPace(goal(), now).isDueToday, false);
});

test('calendar-day pace does not gain or lose a day across DST', () => {
  const beforeSpringChange = new Date(2026, 2, 7, 23, 59);
  assert.equal(computeGoalPace(goal({ targetDate: '2026-03-09T00:00:00.000Z' }), beforeSpringChange).daysRemaining, 2);
});

test('pace derives speed from production snapshot calculation', () => {
  const pace = computeGoalPace(goal({ progress: 20, targetDate: '2026-10-18', snapshots: [
    { progress: 0, date: new Date('2026-10-01T12:00:00Z') },
    { progress: 20, date: new Date('2026-10-05T12:00:00Z') },
  ] }), now);
  assert.equal(pace.actualPace, 5);
  assert.equal(pace.requiredPace, 8);
  assert.equal(pace.status, 'behind');
});
