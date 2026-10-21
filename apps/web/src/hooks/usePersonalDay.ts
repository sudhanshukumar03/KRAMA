import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function usePersonalDay(date?: string) {
  const { user, workspaceId } = useAuth();
  return useQuery({ queryKey: ['day-plan', user?.id, workspaceId, date], queryFn: () => api.dashboard.dayPlan(date!), enabled: Boolean(date && user && workspaceId) });
}
