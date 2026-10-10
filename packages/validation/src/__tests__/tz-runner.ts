// TZ-invariance runner (spawned by dateKey.test.ts with a fixed process.env.TZ).
// Verifies that the canonical DateKey arithmetic — which is defined strictly in
// UTC — produces identical results regardless of the process's local timezone.
// Exits non-zero (via a thrown assertion) on any violation.

import assert from 'node:assert/strict';
import {
  asDateKey,
  dateKeyToUtcNoon,
  addDaysKey,
  weekKeys,
  normalizeToMondayKey,
} from '../dateKey';

// Walk 365 consecutive days from a fixed base that crosses both US and EU DST
// transitions, so any local-time leakage would surface as an off-by-one day.
let key = asDateKey('2026-01-01');

for (let i = 0; i < 365; i++) {
  // 1. Canonical noon anchor is exactly the key at 12:00:00.000Z, TZ-independent.
  assert.strictEqual(
    dateKeyToUtcNoon(key).toISOString(),
    `${key}T12:00:00.000Z`,
    `noon anchor drifted for ${key} under TZ=${process.env.TZ}`,
  );

  // 2. Bijective roundtrip: key -> UTC noon instant -> key.
  const roundtrip = asDateKey(dateKeyToUtcNoon(key).toISOString().substring(0, 10));
  assert.strictEqual(roundtrip, key, `roundtrip broke for ${key} under TZ=${process.env.TZ}`);

  // 3. Week derivation yields 7 unique, consecutive keys whose head is a Monday.
  const monday = normalizeToMondayKey(key);
  assert.strictEqual(
    dateKeyToUtcNoon(monday).getUTCDay(),
    1,
    `normalizeToMondayKey did not land on Monday for ${key} under TZ=${process.env.TZ}`,
  );
  const week = weekKeys(monday);
  assert.strictEqual(new Set(week).size, 7, `week not 7 unique days for ${key} under TZ=${process.env.TZ}`);
  for (let d = 1; d < 7; d++) {
    assert.strictEqual(
      week[d],
      addDaysKey(week[d - 1], 1),
      `week keys not consecutive for ${key} under TZ=${process.env.TZ}`,
    );
  }

  key = addDaysKey(key, 1);
}
