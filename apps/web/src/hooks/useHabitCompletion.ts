import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { formatLocalDate } from '../lib/utils';

export function isHabitCompletedToday(habit: any): boolean {
  if (!habit) return false;
  
  const todayStr = formatLocalDate(new Date());
  
  return habit.completions?.some((c: any) => {
    // Compare the canonical calendar day the completion is keyed on (`date`,
    // stored at UTC-noon) against today's local date. `completedAt` is the raw
    // timestamp and can resolve to the wrong calendar day near midnight.
    const key = c.date ?? c.completedAt;
    if (!key) return false;
    const completedDateStr = c.date ? String(c.date).slice(0, 10) : formatLocalDate(new Date(key));
    return completedDateStr === todayStr;
  }) || false;
}

export function useHabitCompletion(habit: any) {
  const queryClient = useQueryClient();

  const isCompletedToday = isHabitCompletedToday(habit);

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string, localDate: string, localDateIso: string, isCurrentlyCompleted: boolean }) => {
      if (data.isCurrentlyCompleted) {
        return api.habits.uncomplete(data.id, data.localDate, data.localDateIso);
      }
      return api.habits.complete(data.id, data.localDate, data.localDateIso);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      if (!variables.isCurrentlyCompleted) {
        toast.success(`Habit Completed!`, {
          description: `You checked off "${habit?.name || "Routine"}". Keep the streak going!`,
        });
      } else {
        toast.info(`Habit unchecked`, {
          description: `Removed today's completion for "${habit?.name || "Routine"}".`,
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update habit');
    }
  });

  if (!habit) return { isCompletedToday: false, todayStr: '', toggleHabit: () => {}, isPending: false };
  
  // Use the shared date utility to format the local day, then encode it as the
  // canonical UTC-noon ISO the server (and the Planner) key completions on.
  // parseLocalDate(...).toISOString() would emit local-midnight-as-UTC, which in
  // e.g. IST resolves to the *previous* calendar day and desyncs the two views.
  const today = new Date();
  const todayStr = formatLocalDate(today) || '';
  const todayIso = todayStr ? `${todayStr}T12:00:00.000Z` : '';

  return { 
    isCompletedToday, 
    todayStr,
    toggleHabit: () => toggleMutation.mutate({ id: habit.id, localDate: todayStr, localDateIso: todayIso, isCurrentlyCompleted: isCompletedToday }),
    isPending: toggleMutation.isPending
  };
}
