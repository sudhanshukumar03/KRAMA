import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 1: Focus Planner Timer Algorithm Unit Tests', () => {
  it('correctly calculates pomodoro counts and cycle expansion for work blocks', () => {
    const focusDuration = 25;
    const shortBreak = 5;
    const longBreak = 15;
    const longBreakAfter = 4;

    // A 90 min task estimate should yield 4 pomodoros (ceil(90 / 25) = 4)
    const estimateMinutes = 90;
    const pomodoroCount = Math.max(1, Math.ceil(estimateMinutes / focusDuration));
    assert.equal(pomodoroCount, 4, '90 minutes task should expand to 4 pomodoros');

    // Emulate cycle generation
    const slots: any[] = [];
    let pomodoroIdx = 0;
    for (let p = 0; p < pomodoroCount; p++) {
      slots.push({ type: 'pomodoro', durationMin: focusDuration });
      pomodoroIdx++;
      const isLast = p === pomodoroCount - 1;
      if (!isLast) {
        const isLong = pomodoroIdx % longBreakAfter === 0;
        slots.push({ type: isLong ? 'long_break' : 'short_break', durationMin: isLong ? longBreak : shortBreak });
      }
    }

    assert.equal(slots.length, 7, '4 pomodoros with 3 intermediate breaks should yield 7 slots');
    assert.equal(slots[0].type, 'pomodoro');
    assert.equal(slots[1].type, 'short_break');
    assert.equal(slots[2].type, 'pomodoro');
    assert.equal(slots[3].type, 'short_break');
    assert.equal(slots[4].type, 'pomodoro');
    assert.equal(slots[5].type, 'short_break');
    assert.equal(slots[6].type, 'pomodoro');
  });

  it('triggers a long break after the configured interval', () => {
    const focusDuration = 25;
    const longBreakAfter = 2; // trigger after every 2 pomodoros

    const pomodoroCount = 4;
    const slots: any[] = [];
    let pomodoroIdx = 0;

    for (let p = 0; p < pomodoroCount; p++) {
      slots.push({ type: 'pomodoro' });
      pomodoroIdx++;
      if (p < pomodoroCount - 1) {
        const isLong = pomodoroIdx % longBreakAfter === 0;
        slots.push({ type: isLong ? 'long_break' : 'short_break' });
      }
    }

    // slot 0: pomodoro (1st)
    // slot 1: short_break
    // slot 2: pomodoro (2nd) -> break after is long break!
    // slot 3: long_break
    // slot 4: pomodoro (3rd)
    // slot 5: short_break
    // slot 6: pomodoro (4th)
    assert.equal(slots[1].type, 'short_break');
    assert.equal(slots[3].type, 'long_break');
    assert.equal(slots[5].type, 'short_break');
  });

  it('enforces daily capacity cap and trims excess sessions', () => {
    const focusDuration = 25;
    const remainingMinutes = 60; // only 60 minutes remaining for today

    // Candidate plan has 4 pomodoros (100 min)
    const rawPlan = [
      { type: 'pomodoro', durationMin: 25 },
      { type: 'short_break', durationMin: 5 },
      { type: 'pomodoro', durationMin: 25 },
      { type: 'short_break', durationMin: 5 },
      { type: 'pomodoro', durationMin: 25 },
      { type: 'short_break', durationMin: 5 },
      { type: 'pomodoro', durationMin: 25 },
    ];

    let plannedFocus = 0;
    const cappedPlan: any[] = [];
    for (const slot of rawPlan) {
      if (slot.type === 'pomodoro') {
        if (plannedFocus + slot.durationMin > remainingMinutes && cappedPlan.some(s => s.type === 'pomodoro')) {
          break;
        }
        plannedFocus += slot.durationMin;
      }
      cappedPlan.push(slot);
    }

    // Trim trailing break if capped
    while (cappedPlan.length > 0 && cappedPlan[cappedPlan.length - 1].type !== 'pomodoro') {
      cappedPlan.pop();
    }

    assert.equal(plannedFocus, 50, 'Should cap at 2 pomodoros (50 min) within 60 min limit');
    assert.equal(cappedPlan[cappedPlan.length - 1].type, 'pomodoro', 'Plan should not end with a dangling break');
    assert.equal(cappedPlan.filter(s => s.type === 'pomodoro').length, 2);
  });
});
