export function getHabitScheduledDays(habit: any): number[] {
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
