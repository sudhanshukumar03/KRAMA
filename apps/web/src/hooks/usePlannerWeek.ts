// =============================================================================
// PLANNER WEEK HOOK - KRAMA OS
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, getISOWeek } from 'date-fns';
import { plannerApi } from '../api/plannerApi';
import { api } from '../api/client';
import type { RoutineOccurrence } from '../types/planner';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

function getWeekDays(referenceDate: Date): Date[] {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export function usePlannerWeek() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekStart = format(days[0], 'yyyy-MM-dd');
  const weekEnd = format(days[6], 'yyyy-MM-dd');

  const weekRangeLabel = `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`;

  // Calculate week number
  const weekNumber = getISOWeek(days[0]);

  const { workspaceId, user, isLoading: authLoading } = useAuth();

  // Main data query
  const { data, isLoading: queryLoading, isError, refetch } = useQuery({
    queryKey: ['planner', 'week', weekStart, workspaceId],
    queryFn: () => plannerApi.getWeek(weekStart, weekEnd),
    enabled: !authLoading && !!user,
    staleTime: 30_000,
    retry: 2,
  });

  const isLoading = authLoading || (queryLoading && !data);

  // Navigation
  const navigateWeek = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
    } else {
      setCurrentDate(prev => {
        const next = new Date(prev);
        next.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
        return next;
      });
    }
  }, []);

  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // Lookup helper for routine occurrences
  const occurrenceFor = useCallback(
    (routineId: string, day: Date): RoutineOccurrence | undefined => {
      if (!data?.occurrences) return undefined;
      return data.occurrences.find(
        (occ: RoutineOccurrence) => occ.habitId === routineId && isSameDay(parseISO(occ.date), day)
      );
    },
    [data?.occurrences]
  );

  // Mutations
  //
  // Every planner query (`['planner','week',…]`, `['planner','day',…]`,
  // `['planner','range-milestones',…]`) is PlannerData-shaped, so a single
  // updater applied over the `['planner']` prefix keeps all of them optimistic.
  const patchPlannerCaches = useCallback(
    (updater: (old: any) => any) => {
      queryClient.setQueriesData({ queryKey: ['planner'] }, (old: any) =>
        old ? updater(old) : old
      );
    },
    [queryClient]
  );

  const snapshotPlanner = useCallback(
    () => queryClient.getQueriesData({ queryKey: ['planner'] }),
    [queryClient]
  );

  const rollbackPlanner = useCallback(
    (previous?: [readonly unknown[], unknown][]) => {
      previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    [queryClient]
  );

  const toggleRoutineMutation = useMutation({
    mutationFn: (occ: RoutineOccurrence) => {
      // Use the global habit log endpoints (same as daily schedule)
      const dateIso = occ.date;
      const dateStr = dateIso.split('T')[0];

      if (occ.completed) {
        return api.habits.uncomplete(occ.habitId, dateStr, dateIso);
      } else {
        return api.habits.complete(occ.habitId, dateStr, dateIso);
      }
    },
    onMutate: async (occ: RoutineOccurrence) => {
      await queryClient.cancelQueries({ queryKey: ['planner'] });
      const previous = snapshotPlanner();
      const dayKey = occ.date?.split('T')[0];
      const toggled = {
        ...occ,
        completed: !occ.completed,
        completedAt: !occ.completed ? new Date().toISOString() : null,
      };
      const matches = (o: any) =>
        o.habitId === occ.habitId && (o.id === occ.id || o.date?.split('T')[0] === dayKey);
      patchPlannerCaches((old) => {
        if (!Array.isArray(old.occurrences)) return old;
        let hit = false;
        const mapped = old.occurrences.map((o: any) => {
          if (matches(o)) { hit = true; return { ...o, ...toggled }; }
          return o;
        });
        return { ...old, occurrences: hit ? mapped : [...mapped, toggled] };
      });
      return { previous };
    },
    onError: (err: any, _occ, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to update routine: ' + (err?.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const createTimeBlockMutation = useMutation({
    mutationFn: plannerApi.createTimeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'day'] });
    },
    onError: (err: any) => {
      toast.error('Failed to create time block: ' + (err?.message || 'Unknown error'));
    }
  });

  const updateTimeBlockMutation = useMutation({
    mutationFn: (args: { id: string, data: any }) => api.planner.updateTimeBlock(args.id, args.data),
    onMutate: async (args: { id: string, data: any }) => {
      await queryClient.cancelQueries({ queryKey: ['planner'] });
      const previous = snapshotPlanner();
      // Optimistically apply the patch to the matching block (covers cross-day
      // drag `{date}` and task-link `{taskId}`). start/end wall-clock is
      // preserved server-side (A1), so the shown times stay correct until the
      // refetch swaps in the recomputed instants.
      patchPlannerCaches((old) => ({
        ...old,
        timeBlocks: Array.isArray(old.timeBlocks)
          ? old.timeBlocks.map((b: any) => (b.id === args.id ? { ...b, ...args.data } : b))
          : old.timeBlocks,
      }));
      return { previous };
    },
    onError: (err: any, _args, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to update time block: ' + (err?.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'day'] });
    },
  });

  const deleteTimeBlockMutation = useMutation({
    mutationFn: (id: string) => api.planner.deleteTimeBlock(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['planner'] });
      const previous = snapshotPlanner();
      patchPlannerCaches((old) => ({
        ...old,
        timeBlocks: Array.isArray(old.timeBlocks)
          ? old.timeBlocks.filter((b: any) => b.id !== id)
          : old.timeBlocks,
      }));
      return { previous };
    },
    onError: (err: any, _id, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to delete time block: ' + (err?.message || 'Unknown error'));
    },
    onSuccess: () => {
      toast.success('Time block deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'day'] });
    },
  });

  // Milestones — project ↔ planner integration. Create/edit/delete/toggle wire
  // the existing (previously unused) server endpoints; toggle + delete are
  // optimistic for instant feedback, create round-trips through the modal.
  const createMilestoneMutation = useMutation({
    mutationFn: (data: any) => api.planner.createMilestone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success('Milestone added');
    },
    onError: (err: any) => {
      toast.error('Failed to add milestone: ' + (err?.message || 'Unknown error'));
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: (args: { id: string, data: any }) => api.planner.updateMilestone(args.id, args.data),
    onMutate: async (args: { id: string, data: any }) => {
      await queryClient.cancelQueries({ queryKey: ['planner'] });
      const previous = snapshotPlanner();
      patchPlannerCaches((old) => ({
        ...old,
        milestones: Array.isArray(old.milestones)
          ? old.milestones.map((m: any) => (m.id === args.id ? { ...m, ...args.data } : m))
          : old.milestones,
      }));
      return { previous };
    },
    onError: (err: any, _args, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to update milestone: ' + (err?.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id: string) => api.planner.deleteMilestone(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['planner'] });
      const previous = snapshotPlanner();
      patchPlannerCaches((old) => ({
        ...old,
        milestones: Array.isArray(old.milestones)
          ? old.milestones.filter((m: any) => m.id !== id)
          : old.milestones,
      }));
      return { previous };
    },
    onError: (err: any, _id, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to delete milestone: ' + (err?.message || 'Unknown error'));
    },
    onSuccess: () => {
      toast.success('Milestone deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
  });

  return {
    data,
    isLoading,
    isError,
    refetch,
    days,
    weekRangeLabel,
    weekNumber,
    currentDate,
    navigateWeek,
    navigateToDate,
    occurrenceFor,
    toggleRoutineMutation,
    createTimeBlockMutation,
    updateTimeBlockMutation,
    deleteTimeBlockMutation,
    createMilestoneMutation,
    updateMilestoneMutation,
    deleteMilestoneMutation,
  };
}
