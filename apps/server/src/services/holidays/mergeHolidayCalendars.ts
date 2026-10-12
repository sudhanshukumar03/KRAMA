import { INDIAN_CALENDAR_SOURCE } from './IndianHolidayProvider';

/** Full regional calendars replace central-office dates, including date shifts. */
export function mergeHolidayCalendars<T extends { source?: string | null }>(national: T[], regional: T[]): T[] {
  if (regional.some(holiday => holiday.source === INDIAN_CALENDAR_SOURCE)) return regional;
  return [...national, ...regional];
}
