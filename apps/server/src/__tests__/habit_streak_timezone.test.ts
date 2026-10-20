import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getUserLocalDateStr, calculateHabitStreak } from '../services/habitStreak.service';

describe('Tier 1: Habit Streak Timezone Reset & Calculation', () => {
  it('correctly derives local date string across timezones on midnight boundaries', () => {
    // 2026-09-18 at 20:00:00 UTC
    // In UTC: 2026-09-18 (8 PM)
    // In Asia/Kolkata (+5:30): 2026-09-19 (1:30 AM next day)
    // In America/Los_Angeles (-7:00): 2026-09-18 (1:00 PM)
    const instant1 = new Date('2026-09-18T20:00:00.000Z');

    assert.equal(getUserLocalDateStr(instant1, 'UTC'), '2026-09-18');
    assert.equal(getUserLocalDateStr(instant1, 'Asia/Kolkata'), '2026-09-19');
    assert.equal(getUserLocalDateStr(instant1, 'America/Los_Angeles'), '2026-09-18');

    // 2026-09-19 at 03:00:00 UTC
    // In UTC: 2026-09-19 (3 AM)
    // In Asia/Kolkata (+5:30): 2026-09-19 (8:30 AM)
    // In America/Los_Angeles (-7:00): 2026-09-18 (8:00 PM prev day)
    const instant2 = new Date('2026-09-19T03:00:00.000Z');

    assert.equal(getUserLocalDateStr(instant2, 'UTC'), '2026-09-19');
    assert.equal(getUserLocalDateStr(instant2, 'Asia/Kolkata'), '2026-09-19');
    assert.equal(getUserLocalDateStr(instant2, 'America/Los_Angeles'), '2026-09-18');
  });

  it('calculates continuous daily streaks when completed today and yesterday', () => {
    const timeZone = 'Asia/Kolkata';
    const now = new Date('2026-09-18T10:00:00.000Z');
    // Local date for Kolkata: 2026-09-18
    const todayKey = '2026-09-18';
    const yesterdayKey = '2026-09-17';
    const dayBeforeKey = '2026-09-16';

    const habit = {
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      completions: [
        { id: 'c1', date: new Date(`${todayKey}T12:00:00.000Z`), offSchedule: false },
        { id: 'c2', date: new Date(`${yesterdayKey}T12:00:00.000Z`), offSchedule: false },
        { id: 'c3', date: new Date(`${dayBeforeKey}T12:00:00.000Z`), offSchedule: false },
      ],
    };

    const streak = calculateHabitStreak(habit, now, timeZone);
    assert.equal(streak, 3, 'Streak should be 3 days');
  });

  it('retains streak from yesterday if today is still in progress (not completed yet)', () => {
    const timeZone = 'Asia/Kolkata';
    const now = new Date('2026-09-18T06:00:00.000Z'); // Local today: 2026-09-18
    const yesterdayKey = '2026-09-17';
    const dayBeforeKey = '2026-09-16';

    const habit = {
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      completions: [
        { id: 'c1', date: new Date(`${yesterdayKey}T12:00:00.000Z`), offSchedule: false },
        { id: 'c2', date: new Date(`${dayBeforeKey}T12:00:00.000Z`), offSchedule: false },
      ],
    };

    const streak = calculateHabitStreak(habit, now, timeZone);
    assert.equal(streak, 2, 'Streak should be 2 days even if today is not yet done');
  });

  it('breaks streak when a past scheduled day is missed', () => {
    const timeZone = 'Asia/Kolkata';
    const now = new Date('2026-09-18T10:00:00.000Z'); // Local today: 2026-09-18
    const todayKey = '2026-09-18';
    // Missed yesterday 2026-09-17!
    const dayBeforeKey = '2026-09-16';

    const habit = {
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      completions: [
        { id: 'c1', date: new Date(`${todayKey}T12:00:00.000Z`), offSchedule: false },
        { id: 'c2', date: new Date(`${dayBeforeKey}T12:00:00.000Z`), offSchedule: false },
      ],
    };

    const streak = calculateHabitStreak(habit, now, timeZone);
    assert.equal(streak, 1, 'Streak breaks because yesterday was missed; only today counts');
  });

  it('ignores offSchedule completions when computing scheduled streaks', () => {
    const timeZone = 'Asia/Kolkata';
    const now = new Date('2026-09-18T10:00:00.000Z');
    const todayKey = '2026-09-18';
    const yesterdayKey = '2026-09-17';

    const habit = {
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      completions: [
        { id: 'c1', date: new Date(`${todayKey}T12:00:00.000Z`), offSchedule: true },
        { id: 'c2', date: new Date(`${yesterdayKey}T12:00:00.000Z`), offSchedule: false },
      ],
    };

    const streak = calculateHabitStreak(habit, now, timeZone);
    assert.equal(streak, 1, 'Off-schedule completion for today does not add to scheduled streak');
  });
});

describe('Tier 1: Weekly Cadence Streak', () => {
  // Week of Sun 2026-09-13..Sat 2026-09-19; prior week Sun 2026-09-06..Sat 2026-09-12.
  const timeZone = 'UTC';
  const now = new Date('2026-09-18T10:00:00.000Z'); // Fri, in week starting 2026-09-13

  it('counts weekly completions on any weekday regardless of scheduledDays', () => {
    // Regression guard: a daily habit switched to weekly keeps a restrictive
    // scheduledDays ([Mon]). Weekly logs on other days must still count toward
    // the target — the engine ignores scheduledDays for weekly cadence and the
    // service no longer flags off-day weekly logs as offSchedule.
    const habit = {
      scheduledDays: [1], // Monday only — deliberately restrictive
      cadence: 'weekly',
      metadata: { weeklyTarget: 3 },
      completions: [
        // current week, none on Monday
        { id: 'a1', date: new Date('2026-09-15T12:00:00.000Z'), offSchedule: false },
        { id: 'a2', date: new Date('2026-09-16T12:00:00.000Z'), offSchedule: false },
        { id: 'a3', date: new Date('2026-09-17T12:00:00.000Z'), offSchedule: false },
        // prior week
        { id: 'b1', date: new Date('2026-09-07T12:00:00.000Z'), offSchedule: false },
        { id: 'b2', date: new Date('2026-09-08T12:00:00.000Z'), offSchedule: false },
        { id: 'b3', date: new Date('2026-09-09T12:00:00.000Z'), offSchedule: false },
      ],
    };

    const streak = calculateHabitStreak(habit, now, timeZone);
    assert.equal(streak, 2, 'Two consecutive on-target weeks, off-day completions count');
  });

  it('does not break a weekly streak when the in-progress current week is below target', () => {
    const habit = {
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      cadence: 'weekly',
      metadata: { weeklyTarget: 3 },
      completions: [
        // current week: only 1 completion so far (< target) — still in progress
        { id: 'a1', date: new Date('2026-09-16T12:00:00.000Z'), offSchedule: false },
        // prior week met the target
        { id: 'b1', date: new Date('2026-09-07T12:00:00.000Z'), offSchedule: false },
        { id: 'b2', date: new Date('2026-09-08T12:00:00.000Z'), offSchedule: false },
        { id: 'b3', date: new Date('2026-09-09T12:00:00.000Z'), offSchedule: false },
      ],
    };

    const streak = calculateHabitStreak(habit, now, timeZone);
    assert.equal(streak, 1, 'Current week under target does not break; prior on-target week counts');
  });
});
