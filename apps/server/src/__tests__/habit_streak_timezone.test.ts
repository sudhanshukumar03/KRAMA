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
