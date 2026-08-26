import { useQuery } from '@tanstack/react-query';
import { plannerApi } from '../api/plannerApi';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function useHolidays(countryCode: string, regionCode: string | null, date: Date) {
  const start = format(startOfMonth(date), 'yyyy-MM-dd');
  const end = format(endOfMonth(date), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['planner-holidays', countryCode, regionCode, start, end],
    queryFn: () => plannerApi.getHolidays(countryCode, regionCode, start, end),
    staleTime: 5 * 60 * 1000,
  });
}

