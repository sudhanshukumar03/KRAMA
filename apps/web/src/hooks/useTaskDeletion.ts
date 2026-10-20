import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../api/client';
import { errorMessage } from '../lib/utils';

export function useTaskDeletion() {
  const queryClient = useQueryClient();
  const refresh = () => {
    for (const key of ['issues', 'tasks', 'projects', 'project', 'goals', 'goal', 'planner', 'dashboard', 'focus-schedule', 'day-plan']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  return useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: (_, id) => {
      refresh();
      toast.success('Task deleted', {
        duration: 8000,
        action: { label: 'Undo', onClick: async () => {
          try { await api.tasks.restore(id); refresh(); toast.success('Task restored'); }
          catch (error) { toast.error(errorMessage(error, 'Unable to restore task')); }
        } },
      });
    },
    onError: error => toast.error(errorMessage(error, 'Failed to delete task')),
  });
}
