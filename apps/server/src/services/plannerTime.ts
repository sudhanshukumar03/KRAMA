// Pure date/time helpers for the planner, extracted so they can be unit-tested
// directly (mirrors habitStreak.service's exported pure functions). The planner
// stores each block's `date` at canonical UTC noon and its start/end as UTC
// wall-clock instants on that day. Keeping this logic here — not inline in the
// route — is what lets the move-block recompute and capacity-weekday rules be
// tested without a database.

/**
 * Normalize a date to canonical UTC noon — the per-day key shared with
 * DailyLog/HabitCompletion — so a stored day never shifts across the day
 * boundary when read back in a non-UTC timezone.
 */
export function canonicalDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(12, 0, 0, 0);
  return result;
}

/**
 * Build a UTC instant from a base day and an "HH:mm" wall-clock time. Uses UTC
 * hours so the time is not shifted into the previous/next day on a non-UTC
 * server.
 */
export function createDateTime(date: Date, time: string): Date {
  const parts = time.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(parts[0] || 0, parts[1] || 0, 0, 0);
  return result;
}

/**
 * Extract the UTC wall-clock "HH:mm" from a stored instant. Used when a PATCH
 * moves a block to another day without resending times: both instants are
 * rebuilt against the new day from the block's existing hours/minutes.
 */
export function toHHmm(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Capacity is a Mon–Fri work-week model, so only weekday holidays reduce it.
 * Returns true for Mon–Fri (UTC day-of-week) of the given date.
 */
export function isCapacityWeekday(date: Date): boolean {
  const dow = date.getUTCDay(); // 0 = Sun, 6 = Sat
  return dow >= 1 && dow <= 5;
}

/**
 * UTC day-bounds for a 'YYYY-MM-DD' key: [00:00:00.000Z, 23:59:59.999Z]. Used
 * to window a user's local calendar day against UTC-noon-keyed blocks/tasks.
 */
export function localDayBoundsUtc(dateKey: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateKey}T00:00:00.000Z`),
    end: new Date(`${dateKey}T23:59:59.999Z`),
  };
}
