// =============================================================================
// DATE KEY UTILITIES — KRAMA OS
// =============================================================================
// Single canonical calendar-day representation across frontend and backend.
// DateKey is always 'YYYY-MM-DD', representing a wall-clock calendar day.
// Database instants representing calendar days are anchored strictly at UTC noon (T12:00:00.000Z).

import { format } from 'date-fns';

declare const DateKeyBrand: unique symbol;
export type DateKey = string & { readonly [DateKeyBrand]: true };

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates and brands a string as a DateKey.
 * Throws TypeError if the string does not strictly match YYYY-MM-DD.
 */
export function asDateKey(s: string): DateKey {
  if (typeof s !== 'string' || !DATE_KEY_RE.test(s)) {
    throw new TypeError(`Invalid DateKey format: "${s}". Expected YYYY-MM-DD.`);
  }
  return s as DateKey;
}

/**
 * Derives the canonical DateKey for an instant or string.
 * - For a Date instance: returns the user's local calendar day (wall-clock) via format(d, 'yyyy-MM-dd').
 * - For a string: slices the first 10 characters.
 *   Tripwire: in non-production environments, warns if an ISO string carries an un-anchored time component.
 */
export function toDateKey(value: Date | string): DateKey {
  if (value instanceof Date) {
    return asDateKey(format(value, 'yyyy-MM-dd'));
  }

  if (typeof value === 'string') {
    if (value.length > 10) {
      const timePart = value.substring(10);
      const isCanonicalUtcNoon =
        timePart === 'T12:00:00.000Z' ||
        timePart === 'T12:00:00Z' ||
        timePart.startsWith('T12:00:00');

      if (!isCanonicalUtcNoon && process.env.NODE_ENV !== 'production') {
        const msg = `[dateKey] Tripwire Warning: toDateKey() called with non-canonical timestamp string: "${value}". Expected YYYY-MM-DD or UTC noon anchor.`;
        if (process.env.DATE_KEY_STRICT_TEST === 'true') {
          throw new Error(msg);
        } else {
          console.warn(msg);
        }
      }
    }
    return asDateKey(value.substring(0, 10));
  }

  throw new TypeError(`toDateKey expected Date or string, got: ${typeof value}`);
}

/**
 * Canonical storage instant for a calendar day: `${key}T12:00:00.000Z`.
 * Survives any timezone offset within ±12h.
 */
export function dateKeyToUtcNoon(key: DateKey): Date {
  const validKey = asDateKey(key);
  return new Date(`${validKey}T12:00:00.000Z`);
}

/**
 * Pure key arithmetic (operates strictly through UTC noon, never local time).
 */
export function addDaysKey(key: DateKey, n: number): DateKey {
  const d = dateKeyToUtcNoon(key);
  d.setUTCDate(d.getUTCDate() + n);
  const isoStr = d.toISOString();
  return asDateKey(isoStr.substring(0, 10));
}

/**
 * Returns exactly 7 DateKeys (Monday through Sunday) starting from a week-start key.
 */
export function weekKeys(startKey: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDaysKey(startKey, i));
}

/**
 * Normalizes any DateKey to the Monday of its calendar week using pure UTC arithmetic.
 * Independent of local runtime clock or server timezone.
 */
export function normalizeToMondayKey(key: DateKey): DateKey {
  const noon = dateKeyToUtcNoon(key);
  const dayOfWeek = noon.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffDays = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addDaysKey(key, diffDays);
}

/**
 * Normalization actions for the 3-band safety rule.
 */
export type NormalizationAction =
  | 'SKIPPED_ALREADY_CANONICAL'
  | 'SHIFT_FORWARD_SNAP_NOON'
  | 'SNAP_NOON_SAME_DAY'
  | 'QUARANTINE_LOG_ONLY';

export interface NormalizationResult {
  action: NormalizationAction;
  original: Date;
  normalized: Date;
  changed: boolean;
}

/**
 * Idempotent date normalizer implementing the 3-band safety rule (Amendment A):
 * 1. Skip rows already at UTC 12:00:00.000Z.
 * 2. Band 1: >= 18:00Z -> shift +1 day and snap to 12:00:00.000Z.
 * 3. Band 2: < 12:00Z -> snap to 12:00:00.000Z on same day.
 * 4. Band 3: 12:00Z - 17:59Z -> quarantined, left unchanged.
 */
export function normalizeDateInstant(input: Date | string): NormalizationResult {
  const d = typeof input === 'string' ? new Date(input) : new Date(input.getTime());
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  // Canonical Skip Guard: exactly 12:00:00.000Z
  if (h === 12 && m === 0 && s === 0 && ms === 0) {
    return {
      action: 'SKIPPED_ALREADY_CANONICAL',
      original: d,
      normalized: d,
      changed: false,
    };
  }

  // Band 1: >= 18:00Z (e.g. 18:30Z IST midnight) -> shift forward 1 day, snap noon
  if (h >= 18) {
    const target = new Date(d.getTime());
    target.setUTCDate(target.getUTCDate() + 1);
    target.setUTCHours(12, 0, 0, 0);
    return {
      action: 'SHIFT_FORWARD_SNAP_NOON',
      original: d,
      normalized: target,
      changed: true,
    };
  }

  // Band 2: < 12:00Z (e.g. 00:00Z UTC midnight) -> snap to noon same day
  if (h < 12) {
    const target = new Date(d.getTime());
    target.setUTCHours(12, 0, 0, 0);
    return {
      action: 'SNAP_NOON_SAME_DAY',
      original: d,
      normalized: target,
      changed: true,
    };
  }

  // Band 3: 12:00:01Z to 17:59:59Z -> quarantine, leave alone
  return {
    action: 'QUARANTINE_LOG_ONLY',
    original: d,
    normalized: d,
    changed: false,
  };
}
