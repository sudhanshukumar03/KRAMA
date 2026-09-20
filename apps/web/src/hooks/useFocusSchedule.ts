// =============================================================================
// FOCUS SCHEDULE HOOK - KRAMA OS
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { FocusScheduleData, TimerMode } from '../components/focus/types';
import { toast } from 'sonner';

export interface CompleteSessionParams {
  startTime: string;
  endTime: string;
  duration: number;
  type: TimerMode;
  taskId?: string;
  projectId?: string;
}

export function useFocusSchedule() {
  const queryClient = useQueryClient();
  const { workspaceId, user, status } = useAuth();

  // Query: Fetches the calculated focus schedule from backend PlannerTimerAlgo
  const scheduleQuery = useQuery<FocusScheduleData>({
    queryKey: ['focus-schedule', workspaceId],
    queryFn: () => api.focusSessions.getSchedule(),
    enabled: status === 'authed' && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
    retry: 2,
  });

  // Mutation: Log session completion and sync across the entire app
  const completeSessionMutation = useMutation({
    mutationFn: (sessionData: CompleteSessionParams) =>
      api.focusSessions.complete(sessionData),
    onSuccess: (_, variables) => {
      toast.success(
        variables.type === 'pomodoro'
          ? '🎉 Focus session saved! Great work.'
          : 'Break completed. Ready to focus again!'
      );
      // Invalidate relevant queries across KRAMA
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
    onError: (err: any) => {
      console.error('Error logging focus session:', err);
      toast.error('Failed to log session: ' + (err?.message || 'Server error'));
    },
    retry: 2, // Auto-retry on network blip so pomodoro logs aren't lost
  });

  return {
    schedule: scheduleQuery.data,
    isLoading: scheduleQuery.isLoading,
    isError: scheduleQuery.isError,
    refetchSchedule: scheduleQuery.refetch,
    completeSession: completeSessionMutation.mutateAsync,
    isCompleting: completeSessionMutation.isPending,
  };
}
