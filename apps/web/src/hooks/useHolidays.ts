import { useQuery } from '@tanstack/react-query';
import { plannerApi } from '../api/plannerApi';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function getCalendarGridRange(date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1));

  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (7 - endDate.getDay() === 7 ? 0 : 7 - endDate.getDay()));

  return { startDate, endDate };
}

export function useHolidays(countryCode: string, regionCode: string | null, date: Date) {
  const { startDate, endDate } = getCalendarGridRange(date);
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['planner-holidays', countryCode, regionCode, start, end],
    queryFn: () => plannerApi.getHolidays(countryCode, regionCode, start, end),
    staleTime: 5 * 60 * 1000,
  });
}
