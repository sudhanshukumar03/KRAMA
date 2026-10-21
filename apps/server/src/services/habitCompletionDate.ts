import { getUserLocalDateStr } from './habitStreak.service';

export type HabitCompletionUnavailableReason = 'before_creation' | 'future';

// Completion dates are calendar days in the same user timezone used for streaks.
// A valid older habit may be backfilled; a new habit cannot gain earlier history.
export function habitCompletionUnavailableReason(
  createdAt: Date | string | null | undefined,
  dateKey: string,
  now: Date,
  timeZone: string,
): HabitCompletionUnavailableReason | undefined {
  if (createdAt) {
    const created = new Date(createdAt);
    if (Number.isFinite(created.getTime()) && dateKey < getUserLocalDateStr(created, timeZone)) return 'before_creation';
  }
  if (dateKey > getUserLocalDateStr(now, timeZone)) return 'future';
  return undefined;
}
