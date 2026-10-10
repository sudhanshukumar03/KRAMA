export function getUserLocalDateStr(date: Date, timeZone = 'Asia/Kolkata'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0]!;
  }
}

// Centralized timezone resolution shared by the log-time recompute
// (habit.service) and the nightly worker, so a streak computed when a habit is
// logged matches the value the next recompute produces. Prefers the user's
// explicit timezone, then a regional default (IN -> Asia/Kolkata), else UTC.
export function resolveUserTimeZone(
  user: { metadata?: any; countryCode?: string | null } | null | undefined
): string {
  const tz = (user?.metadata as any)?.timezone;
  if (typeof tz === 'string' && tz) return tz;
  if (user?.countryCode === 'IN') return 'Asia/Kolkata';
  return 'UTC';
}

export type StreakHabit = {
  scheduledDays: number[];
  completions: { id?: string; date: Date; offSchedule?: boolean }[];
  cadence?: string | null;
  metadata?: any;
};

const DEFAULT_WEEKLY_TARGET = 3;

// Day keys are 'YYYY-MM-DD' anchored at 12:00 UTC to match how completions are
// stored (the client persists each local day at noon UTC). Lexicographic order
// on these keys equals chronological order.
function keyToDate(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

function addDaysKey(key: string, days: number): string {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeekForKey(key: string): number {
  return keyToDate(key).getUTCDay();
}

// Sunday-start week; returns that week's Sunday as a day key.
function weekStartKey(key: string): string {
  return addDaysKey(key, -dayOfWeekForKey(key));
}

function scheduledDaysOf(habit: StreakHabit): number[] {
  return habit.scheduledDays && habit.scheduledDays.length > 0
    ? habit.scheduledDays
    : [0, 1, 2, 3, 4, 5, 6];
}

// Set of local day keys that have an on-schedule completion. offSchedule logs
// never count toward streaks (matches the original behavior).
function completedDayKeys(habit: StreakHabit): Set<string> {
  const set = new Set<string>();
  for (const c of habit.completions || []) {
    if (c.offSchedule) continue;
    set.add(new Date(c.date).toISOString().slice(0, 10));
  }
  return set;
}

function weeklyTargetOf(habit: StreakHabit): number {
  const t = (habit.metadata as any)?.weeklyTarget;
  return typeof t === 'number' && t >= 1 ? t : DEFAULT_WEEKLY_TARGET;
}

function weekCompletionCounts(dayKeys: Set<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of dayKeys) {
    const ws = weekStartKey(key);
    counts.set(ws, (counts.get(ws) ?? 0) + 1);
  }
  return counts;
}

function minKey(keys: Iterable<string>): string | null {
  let min: string | null = null;
  for (const k of keys) if (min === null || k < min) min = k;
  return min;
}

// --- Daily cadence -----------------------------------------------------------

function dailyCurrentStreak(dayKeys: Set<string>, scheduled: number[], todayKey: string): number {
  const earliest = minKey(dayKeys);
  if (!earliest) return 0;
  let streak = 0;

  // Today is a grace day: it only counts if completed, but never breaks the
  // streak (today is still in progress).
  if (dayKeys.has(todayKey)) streak++;

  let cursor = addDaysKey(todayKey, -1);
  while (cursor >= earliest) {
    if (scheduled.includes(dayOfWeekForKey(cursor))) {
      if (dayKeys.has(cursor)) streak++;
      else break; // a past scheduled day was missed
    }
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
}

function dailyBestStreak(dayKeys: Set<string>, scheduled: number[], todayKey: string): number {
  let cursor = minKey(dayKeys);
  if (!cursor) return 0;
  let best = 0;
  let run = 0;
  while (cursor <= todayKey) {
    if (scheduled.includes(dayOfWeekForKey(cursor))) {
      if (dayKeys.has(cursor)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    cursor = addDaysKey(cursor, 1);
  }
  return best;
}

// --- Weekly cadence ----------------------------------------------------------

function weeklyCurrentStreak(counts: Map<string, number>, target: number, todayKey: string): number {
  const earliestWeek = minKey(counts.keys());
  if (!earliestWeek) return 0;
  let streak = 0;
  let week = weekStartKey(todayKey);
  let isCurrent = true;
  while (week >= earliestWeek) {
    const met = (counts.get(week) ?? 0) >= target;
    if (met) {
      streak++;
    } else if (!isCurrent) {
      break; // a past week missed the target -> streak ends
    }
    isCurrent = false;
    week = addDaysKey(week, -7);
  }
  return streak;
}

function weeklyBestStreak(counts: Map<string, number>, target: number, todayKey: string): number {
  let week = minKey(counts.keys());
  if (!week) return 0;
  const currentWeek = weekStartKey(todayKey);
  let best = 0;
  let run = 0;
  while (week <= currentWeek) {
    if ((counts.get(week) ?? 0) >= target) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    week = addDaysKey(week, 7);
  }
  return best;
}

// --- Public API --------------------------------------------------------------

// Current streak. `cadence: 'weekly'` counts consecutive on-target weeks;
// anything else (incl. undefined) uses the original per-scheduled-day logic, so
// existing daily callers/tests are unaffected.
export function calculateHabitStreak(habit: StreakHabit, now: Date, timeZone: string): number {
  const dayKeys = completedDayKeys(habit);
  if (dayKeys.size === 0) return 0;
  const todayKey = getUserLocalDateStr(now, timeZone);

  if (habit.cadence === 'weekly') {
    return weeklyCurrentStreak(weekCompletionCounts(dayKeys), weeklyTargetOf(habit), todayKey);
  }
  return dailyCurrentStreak(dayKeys, scheduledDaysOf(habit), todayKey);
}

// Longest streak ever achieved over the full completion history.
export function calculateBestStreak(habit: StreakHabit, now: Date, timeZone: string): number {
  const dayKeys = completedDayKeys(habit);
  if (dayKeys.size === 0) return 0;
  const todayKey = getUserLocalDateStr(now, timeZone);

  if (habit.cadence === 'weekly') {
    return weeklyBestStreak(weekCompletionCounts(dayKeys), weeklyTargetOf(habit), todayKey);
  }
  return dailyBestStreak(dayKeys, scheduledDaysOf(habit), todayKey);
}

export function calculateHabitStats(
  habit: StreakHabit,
  now: Date,
  timeZone: string
): { current: number; best: number } {
  return {
    current: calculateHabitStreak(habit, now, timeZone),
    best: calculateBestStreak(habit, now, timeZone),
  };
}
