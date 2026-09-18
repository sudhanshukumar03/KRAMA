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

export function calculateHabitStreak(
  habit: { scheduledDays: number[]; completions: { id?: string; date: Date; offSchedule?: boolean }[] },
  now: Date,
  timeZone: string
): number {
  let currentStreak = 0;
  const scheduled = habit.scheduledDays && habit.scheduledDays.length > 0 
    ? habit.scheduledDays 
    : [0, 1, 2, 3, 4, 5, 6];

  if (!habit.completions || habit.completions.length === 0) {
    return 0;
  }

  // Resolve the user's local today date key
  const localTodayKey = getUserLocalDateStr(now, timeZone);
  let iterDate = new Date(`${localTodayKey}T12:00:00.000Z`);

  // Track consumed completions to prevent double-counting across overlapping day windows
  const consumedCompletionIds = new Set<string>();

  const consumeCompletionForDay = (targetDate: Date) => {
    const targetTime = targetDate.getTime();
    
    const match = habit.completions.find((c: any) => {
       if (c.offSchedule) return false;
       const idKey = c.id || c.date.toISOString();
       if (consumedCompletionIds.has(idKey)) return false;
       const t = new Date(c.date).getTime();
       return t === targetTime;
    });

    if (match) {
      consumedCompletionIds.add(match.id || match.date.toISOString());
      return true;
    }
    return false;
  };

  // 1. Check user's local today (optional, since today is still in progress)
  if (consumeCompletionForDay(iterDate)) {
    currentStreak++;
  }

  // 2. Walk backwards through past days
  iterDate.setUTCDate(iterDate.getUTCDate() - 1);
  while (true) {
    if (scheduled.includes(iterDate.getUTCDay())) {
      if (consumeCompletionForDay(iterDate)) {
        currentStreak++;
      } else {
        break; // Streak broken on a past scheduled day
      }
    }
    iterDate.setUTCDate(iterDate.getUTCDate() - 1);
  }

  return currentStreak;
}
