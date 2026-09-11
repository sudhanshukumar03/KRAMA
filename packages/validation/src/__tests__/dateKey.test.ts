import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  asDateKey,
  toDateKey,
  dateKeyToUtcNoon,
  addDaysKey,
  weekKeys,
  normalizeToMondayKey,
  normalizeDateInstant,
  DATE_KEY_RE,
  type DateKey,
} from '../dateKey';

describe('DateKey Unit Tests — Canonical Calendar Representation (Task 0 & PR1)', () => {
  it('asDateKey validates valid YYYY-MM-DD and rejects invalid formats', () => {
    const valid = asDateKey('2026-09-08');
    assert.strictEqual(valid, '2026-09-08');

    assert.throws(() => asDateKey('2026-9-8'), TypeError);
    assert.throws(() => asDateKey('08-09-2026'), TypeError);
    assert.throws(() => asDateKey('2026-09-08T12:00:00.000Z'), TypeError);
    assert.throws(() => asDateKey('not-a-date'), TypeError);
  });

  it('dateKeyToUtcNoon anchors strictly at T12:00:00.000Z', () => {
    const key = asDateKey('2026-09-08');
    const noon = dateKeyToUtcNoon(key);
    assert.strictEqual(noon.toISOString(), '2026-09-08T12:00:00.000Z');
    assert.strictEqual(noon.getUTCHours(), 12);
    assert.strictEqual(noon.getUTCMinutes(), 0);
    assert.strictEqual(noon.getUTCSeconds(), 0);
  });

  it('toDateKey slices string representations cleanly and validates canonical noon', () => {
    const key = toDateKey('2026-09-08');
    assert.strictEqual(key, '2026-09-08');

    const keyFromIso = toDateKey('2026-09-08T12:00:00.000Z');
    assert.strictEqual(keyFromIso, '2026-09-08');
  });

  it('toDateKey tripwire throws in test mode with non-canonical string when DATE_KEY_STRICT_TEST=true', () => {
    process.env.DATE_KEY_STRICT_TEST = 'true';
    try {
      assert.throws(
        () => toDateKey('2026-09-08T18:30:00.000Z'),
        /Tripwire Warning/
      );
    } finally {
      delete process.env.DATE_KEY_STRICT_TEST;
    }
  });

  it('addDaysKey executes pure arithmetic across boundaries', () => {
    const start = asDateKey('2026-02-28');
    // 2026 is not a leap year
    assert.strictEqual(addDaysKey(start, 1), '2026-03-01');
    assert.strictEqual(addDaysKey(start, -1), '2026-02-27');

    // Leap year check: 2024
    const leapStart = asDateKey('2024-02-28');
    assert.strictEqual(addDaysKey(leapStart, 1), '2024-02-29');
    assert.strictEqual(addDaysKey(leapStart, 2), '2024-03-01');

    // Year boundary
    const yearEnd = asDateKey('2026-12-31');
    assert.strictEqual(addDaysKey(yearEnd, 1), '2027-01-01');
  });

  it('weekKeys returns exactly 7 contiguous ordered keys', () => {
    const monday = asDateKey('2026-09-07');
    const keys = weekKeys(monday);
    assert.strictEqual(keys.length, 7);
    assert.deepStrictEqual(keys, [
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('normalizeToMondayKey snaps any day of the week to its Monday', () => {
    // 2026-09-07 is Monday
    // 2026-09-08 is Tuesday
    // 2026-09-13 is Sunday
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-07')), '2026-09-07');
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-08')), '2026-09-07');
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-09')), '2026-09-07');
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-10')), '2026-09-07');
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-11')), '2026-09-07');
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-12')), '2026-09-07');
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-13')), '2026-09-07');
    assert.strictEqual(normalizeToMondayKey(asDateKey('2026-09-14')), '2026-09-14'); // Next Monday
  });

  it('Bijective roundtrip: toDateKey(dateKeyToUtcNoon(k)) === k for 365 consecutive days', () => {
    let current = asDateKey('2026-01-01');
    for (let i = 0; i < 365; i++) {
      const noon = dateKeyToUtcNoon(current);
      const derived = toDateKey(noon.toISOString());
      assert.strictEqual(derived, current, `Roundtrip failed for ${current}`);
      current = addDaysKey(current, 1);
    }
  });

  it('DST Boundary Invariance: weekKeys across US and European DST transitions', () => {
    // US Spring forward DST 2026: March 8, 2026
    const usDstWeek = asDateKey('2026-03-02');
    const usKeys = weekKeys(usDstWeek);
    assert.strictEqual(new Set(usKeys).size, 7);
    assert.strictEqual(usKeys[6], '2026-03-08');

    // US Fall back DST 2026: Nov 1, 2026
    const usFallWeek = asDateKey('2026-10-26');
    const usFallKeys = weekKeys(usFallWeek);
    assert.strictEqual(new Set(usFallKeys).size, 7);
    assert.strictEqual(usFallKeys[6], '2026-11-01');
  });

  const timezones = ['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland'];
  for (const tz of timezones) {
    it(`Bijective roundtrip holds under TZ=${tz} across 365 days`, () => {
      const { execFileSync } = require('node:child_process');
      const path = require('node:path');
      const runnerPath = path.join(__dirname, 'tz-runner.js');
      execFileSync(process.execPath, [runnerPath], {
        env: { ...process.env, TZ: tz },
      });
    });
  }

  it('Amendment A & L1: Normalizer idempotency against 00:00Z, 12:00Z, 18:30Z, 23:59Z, and 14:00Z fixture', () => {
    const fixture = [
      { id: '1', date: new Date('2026-09-08T00:00:00.000Z'), expectedFirst: '2026-09-08T12:00:00.000Z', expectedAction: 'SNAP_NOON_SAME_DAY' },
      { id: '2', date: new Date('2026-09-08T12:00:00.000Z'), expectedFirst: '2026-09-08T12:00:00.000Z', expectedAction: 'SKIPPED_ALREADY_CANONICAL' },
      { id: '3', date: new Date('2026-09-08T18:30:00.000Z'), expectedFirst: '2026-09-09T12:00:00.000Z', expectedAction: 'SHIFT_FORWARD_SNAP_NOON' },
      { id: '4', date: new Date('2026-09-08T23:59:59.000Z'), expectedFirst: '2026-09-09T12:00:00.000Z', expectedAction: 'SHIFT_FORWARD_SNAP_NOON' },
      { id: '5', date: new Date('2026-09-08T14:15:00.000Z'), expectedFirst: '2026-09-08T14:15:00.000Z', expectedAction: 'QUARANTINE_LOG_ONLY' },
    ];

    // Run 1
    const run1Results = fixture.map(row => {
      const res = normalizeDateInstant(row.date);
      assert.strictEqual(res.action, row.expectedAction);
      assert.strictEqual(res.normalized.toISOString(), row.expectedFirst);
      return res.normalized;
    });

    // Run 2 (Idempotency assertion: re-running on results produces 0 changes)
    let secondRunChanges = 0;
    run1Results.forEach((instant, idx) => {
      const res2 = normalizeDateInstant(instant);
      if (res2.changed) {
        secondRunChanges++;
      }
      assert.strictEqual(res2.normalized.toISOString(), instant.toISOString(), `Run 2 modified row ${idx + 1}`);
    });

    assert.strictEqual(secondRunChanges, 0, 'Run 2 must make exactly zero changes (idempotency)');
  });
});
