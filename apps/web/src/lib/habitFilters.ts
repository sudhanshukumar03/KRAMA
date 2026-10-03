import { formatLocalDate } from './utils';

const DEFAULT_WEEKLY_TARGET = 3;

function getHabitScheduledDays(habit: any): number[] {
  return habit.scheduledDays && habit.scheduledDays.length > 0
    ? habit.scheduledDays
    : [0, 1, 2, 3, 4, 5, 6];
}

export function isHabitScheduledForDay(habit: any, dayOfWeek: number): boolean {
  const scheduled = getHabitScheduledDays(habit);
  return scheduled.includes(dayOfWeek);
}

export function isHabitScheduledToday(habit: any): boolean {
  return isHabitScheduledForDay(habit, new Date().getDay());
}

export function isWeeklyHabit(habit: any): boolean {
  return habit?.cadence === 'weekly';
}

export function getWeeklyTarget(habit: any): number {
  const t = habit?.weeklyTarget ?? habit?.metadata?.weeklyTarget;
  return typeof t === 'number' && t >= 1 ? t : DEFAULT_WEEKLY_TARGET;
}

// Sunday-start week key for a local date, computed via the same UTC-noon keying
// the server uses so client progress and server streak agree on week bounds.
function weekStartStr(localDateStr: string | null): string | null {
  if (!localDateStr) return null;
  const d = new Date(`${localDateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

// On-schedule completions falling in the current local week (Sunday-start).
export function weeklyCompletionCount(habit: any): number {
  const completions = habit?.completions || [];
  if (completions.length === 0) return 0;
  const todayWeek = weekStartStr(formatLocalDate(new Date()));
  if (!todayWeek) return 0;
  return completions.filter((c: any) => {
    if (c.offSchedule) return false;
    const key = c.date ?? c.completedAt;
    if (!key) return false;
    return weekStartStr(formatLocalDate(new Date(key))) === todayWeek;
  }).length;
}

// Whether a habit can be logged today. Weekly-cadence habits are loggable any
// day of the week (until the week's target is met); daily habits stay gated to
// their scheduledDays.
export function isHabitLoggableToday(habit: any): boolean {
  if (isWeeklyHabit(habit)) return true;
  return isHabitScheduledToday(habit);
}
