import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';

export function isHabitCompletedToday(habit: any): boolean {
  if (!habit) return false;
  const today = new Date();
  return habit.completions?.some((c: any) => 
    c.completedAt && new Date(c.completedAt).toDateString() === today.toDateString()
  ) || false;
}

export function useHabitCompletion(habit: any) {
  const queryClient = useQueryClient();

  const isCompletedToday = isHabitCompletedToday(habit);

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.habits.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      if (!isCompletedToday) {
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
  
  // Get local date string YYYY-MM-DD
  const today = new Date();
  // Use local timezone formatting to avoid UTC date shift issues
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  return { 
    isCompletedToday, 
    todayStr,
    toggleHabit: () => toggleMutation.mutate(habit.id),
    isPending: toggleMutation.isPending
  };
}
