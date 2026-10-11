import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      return api.dashboard.get();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}
