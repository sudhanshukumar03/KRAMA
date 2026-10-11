import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { buildFocusSchedule, isValidTimerPreferences, normalizeTimerPreferences } from '../services/focusTimer.service';
import { getUserLocalDateStr, resolveUserTimeZone } from '../services/habitStreak.service';
import {
  canonicalDay,
  createDateTime,
  toHHmm,
  localDayBoundsUtc,
} from '../services/plannerTime';

// The focus schedule and the time-block move both depend on pure, exported
// helpers. These test those helpers directly (no DB), covering the focus-timer
// day-bounds fix (A4) and the move-block recompute (A1).

describe('Tier 1: Focus schedule local day-bounds (A4)', () => {
  it('windows the user LOCAL day, not the server-UTC day', () => {
    // 2026-09-18T20:00Z is still Sep 18 in UTC but already Sep 19 in Kolkata.
    // A server computing "today" in UTC would build the wrong day's schedule.
    const now = new Date('2026-09-18T20:00:00.000Z');
    const tz = resolveUserTimeZone({ countryCode: 'IN' });
    assert.equal(tz, 'Asia/Kolkata');

    const key = getUserLocalDateStr(now, tz);
    assert.equal(key, '2026-09-19', 'local day is Sep 19 for the Kolkata user');

    const { start, end } = localDayBoundsUtc(key);
    assert.equal(start.toISOString(), '2026-09-19T00:00:00.000Z');
    assert.equal(end.toISOString(), '2026-09-19T23:59:59.999Z');

    // A block created for that local day is stored at canonical UTC noon and
    // must fall inside the window.
    const blockDate = canonicalDay(new Date('2026-09-19T12:00:00.000Z'));
    assert.ok(blockDate >= start && blockDate <= end, 'noon-keyed block is inside the day window');
  });

  it('falls back to UTC bounds when no timezone is resolvable', () => {
    const tz = resolveUserTimeZone(null);
    assert.equal(tz, 'UTC');
    const { start, end } = localDayBoundsUtc(getUserLocalDateStr(new Date('2026-09-19T03:00:00.000Z'), tz));
    assert.equal(start.toISOString(), '2026-09-19T00:00:00.000Z');
    assert.equal(end.toISOString(), '2026-09-19T23:59:59.999Z');
  });
});

describe('Tier 1: Time-block move recompute (A1)', () => {
  it('carries existing start/end times to the new day on a date-only move', () => {
    // Existing block: 2026-09-21, 09:00–10:30 (stored UTC instants).
    const existingStart = new Date('2026-09-21T09:00:00.000Z');
    const existingEnd = new Date('2026-09-21T10:30:00.000Z');

    // PATCH body carries only a new date (drag to another day).
    const bodyDate = new Date('2026-09-23T12:00:00.000Z');

    const date = canonicalDay(bodyDate);
    const newStart = createDateTime(date, toHHmm(existingStart));
    const newEnd = createDateTime(date, toHHmm(existingEnd));

    assert.equal(newStart.toISOString(), '2026-09-23T09:00:00.000Z', 'start follows to the new day');
    assert.equal(newEnd.toISOString(), '2026-09-23T10:30:00.000Z', 'end follows to the new day');
    // Regression guard for the move-block bug: the instants must NOT stay on the old day.
    assert.notEqual(newStart.toISOString(), existingStart.toISOString());
  });

  it('rebuilds both instants on the new day when only startTime is resent', () => {
    const existingStart = new Date('2026-09-21T09:00:00.000Z');
    const existingEnd = new Date('2026-09-21T10:30:00.000Z');
    const bodyDate = new Date('2026-09-23T12:00:00.000Z');
    const bodyStartTime = '11:15';

    const date = canonicalDay(bodyDate);
    const newStart = createDateTime(date, bodyStartTime ?? toHHmm(existingStart));
    const newEnd = createDateTime(date, toHHmm(existingEnd));

    assert.equal(newStart.toISOString(), '2026-09-23T11:15:00.000Z', 'resent start time applies on new day');
    assert.equal(newEnd.toISOString(), '2026-09-23T10:30:00.000Z', 'omitted end keeps its wall-clock on new day');
  });

  it('canonicalDay anchors any instant to UTC noon; toHHmm round-trips UTC wall-clock', () => {
    assert.equal(canonicalDay(new Date('2026-09-21T23:45:12.000Z')).toISOString(), '2026-09-21T12:00:00.000Z');
    assert.equal(toHHmm(new Date('2026-09-21T09:05:00.000Z')), '09:05');
    assert.equal(toHHmm(new Date('2026-09-21T00:00:00.000Z')), '00:00');
  });
});

describe('Focus schedule resource bounds', () => {
  it('normalizes stored timer preferences and rejects malformed update values', () => {
    assert.deepEqual(normalizeTimerPreferences({ focusDuration: 0.000001, shortBreak: 2.5, longBreakAfter: 100 }), {
      focusDuration: 25, shortBreak: 5, longBreak: 15, longBreakAfter: 4,
    });
    assert.equal(isValidTimerPreferences({ focusDuration: 1, shortBreak: 1, longBreak: 1, longBreakAfter: 16 }), true);
    assert.equal(isValidTimerPreferences({ focusDuration: 0.000001 }), false);
    assert.equal(isValidTimerPreferences({ focusDuration: 25, unexpected: 1 }), false);
  });

  it('caps generated entries before expanding an extreme synthetic task estimate', async () => {
    const original = {
      user: (prisma as any).user,
      timeBlock: (prisma as any).timeBlock,
      task: (prisma as any).task,
      focusSession: (prisma as any).focusSession,
      project: (prisma as any).project,
    };
    (prisma as any).user = { findUnique: async () => ({ weeklyCapacityMinutes: 2400, metadata: null, countryCode: 'IN' }) };
    (prisma as any).timeBlock = { findMany: async () => [] };
    (prisma as any).task = { findMany: async () => [{ id: 'large', title: 'Large estimate', estimateMinutes: 1_000_000_000, projectId: null }] };
    (prisma as any).focusSession = { findMany: async () => [] };
    (prisma as any).project = { findMany: async () => [] };
    try {
      const result = await buildFocusSchedule('user', 'workspace', { focusDuration: 1, shortBreak: 1, longBreak: 1, longBreakAfter: 4 }, 'UTC');
      assert.ok(result.plan.length <= 200);
      assert.ok(result.plan.length >= 199);
      assert.ok(result.totalFocusMinutes <= result.remainingMinutes);
      assert.ok(result.plan.every(slot => Number.isFinite(slot.durationMin) && slot.durationMin > 0));
    } finally {
      Object.assign(prisma as any, original);
    }
  });
});
