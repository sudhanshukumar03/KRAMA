import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { formatLocalDate, parseLocalDate } from '../lib/utils';

export function isHabitCompletedToday(habit: any): boolean {
  if (!habit) return false;
  
  const todayStr = formatLocalDate(new Date());
  
  return habit.completions?.some((c: any) => {
    if (!c.completedAt) return false;
    // We must compare the local date of the completion with today's local date
    const completedDateStr = formatLocalDate(new Date(c.completedAt));
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
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
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
  
  // Use the shared date utility to format the date without UTC shift issues
  const today = new Date();
  const todayStr = formatLocalDate(today) || '';
  const todayIso = parseLocalDate(todayStr)?.toISOString() || '';

  return { 
    isCompletedToday, 
    todayStr,
    toggleHabit: () => toggleMutation.mutate({ id: habit.id, localDate: todayStr, localDateIso: todayIso, isCurrentlyCompleted: isCompletedToday }),
    isPending: toggleMutation.isPending
  };
}
