import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useLocalDay } from './useLocalDay';

export function useDashboard() {
  const day = useLocalDay();
  return useQuery({
    queryKey: ['dashboard', day],
    queryFn: async () => {
      return api.dashboard.get();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}
