// =============================================================================
// PLANNER WEEK HOOK - KRAMA OS
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, getISOWeek } from 'date-fns';
import { parseLocalDate } from '../lib/utils';
import { plannerApi } from '../api/plannerApi';
import { api } from '../api/client';
import type { RoutineOccurrence, PlannerData, TimeBlockUpdate, MilestoneInput, MilestoneUpdate } from '../types/planner';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

function getWeekDays(referenceDate: Date): Date[] {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export function usePlannerWeek(currentDate: Date) {
  const queryClient = useQueryClient();

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

  // Lookup helper for routine occurrences
  const occurrenceFor = useCallback(
    (routineId: string, day: Date): RoutineOccurrence | undefined => {
      if (!data?.occurrences) return undefined;
      return data.occurrences.find(
        (occ: RoutineOccurrence) => occ.habitId === routineId && isSameDay(parseLocalDate(occ.date) ?? new Date(NaN), day)
      );
    },
    [data?.occurrences]
  );

  // Mutations
  //
  // Week/day queries hold full data; calendar queries hold only milestones.
  // Update only the arrays present in each cached response.
  const patchPlannerCaches = useCallback(
    (updater: (old: Partial<PlannerData>) => Partial<PlannerData>) => {
      queryClient.setQueriesData<Partial<PlannerData>>({ queryKey: ['planner'] }, old =>
        old ? updater(old) : old
      );
    },
    [queryClient]
  );

  const snapshotPlanner = useCallback(
    () => queryClient.getQueriesData<Partial<PlannerData>>({ queryKey: ['planner'] }),
    [queryClient]
  );

  const rollbackPlanner = useCallback(
    (previous?: [readonly unknown[], Partial<PlannerData> | undefined][]) => {
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
      const matches = (o: RoutineOccurrence) =>
        o.habitId === occ.habitId && (o.id === occ.id || o.date?.split('T')[0] === dayKey);
      patchPlannerCaches((old) => {
        if (!Array.isArray(old.occurrences)) return old;
        let hit = false;
        const mapped = old.occurrences.map(o => {
          if (matches(o)) { hit = true; return { ...o, ...toggled }; }
          return o;
        });
        return { ...old, occurrences: hit ? mapped : [...mapped, toggled] };
      });
      return { previous };
    },
    onError: (err, _occ, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to update routine: ' + (err?.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const createTimeBlockMutation = useMutation({
    mutationFn: plannerApi.createTimeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
    onError: err => {
      toast.error('Failed to create time block: ' + (err?.message || 'Unknown error'));
    }
  });

  const updateTimeBlockMutation = useMutation({
    mutationFn: (args: { id: string, data: TimeBlockUpdate }) => api.planner.updateTimeBlock(args.id, args.data),
    onMutate: async (args: { id: string, data: TimeBlockUpdate }) => {
      await queryClient.cancelQueries({ queryKey: ['planner'] });
      const previous = snapshotPlanner();
      // Optimistically apply the patch to the matching block (covers cross-day
      // drag `{date}` and task-link `{taskId}`). start/end wall-clock is
      // preserved server-side (A1), so the shown times stay correct until the
      // refetch swaps in the recomputed instants.
      patchPlannerCaches((old) => ({
        ...old,
        timeBlocks: Array.isArray(old.timeBlocks)
          ? old.timeBlocks.map(b => (b.id === args.id ? { ...b, ...args.data } : b))
          : old.timeBlocks,
      }));
      return { previous };
    },
    onError: (err, _args, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to update time block: ' + (err?.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
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
          ? old.timeBlocks.filter(b => b.id !== id)
          : old.timeBlocks,
      }));
      return { previous };
    },
    onError: (err, _id, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to delete time block: ' + (err?.message || 'Unknown error'));
    },
    onSuccess: () => {
      toast.success('Time block deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
  });

  // Milestones — project ↔ planner integration. Create/edit/delete/toggle wire
  // the existing (previously unused) server endpoints; toggle + delete are
  // optimistic for instant feedback, create round-trips through the modal.
  const createMilestoneMutation = useMutation({
    mutationFn: (data: MilestoneInput) => api.planner.createMilestone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success('Milestone added');
    },
    onError: err => {
      toast.error('Failed to add milestone: ' + (err?.message || 'Unknown error'));
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: (args: { id: string, data: MilestoneUpdate }) => api.planner.updateMilestone(args.id, args.data),
    onMutate: async (args: { id: string, data: MilestoneUpdate }) => {
      await queryClient.cancelQueries({ queryKey: ['planner'] });
      const previous = snapshotPlanner();
      patchPlannerCaches((old) => ({
        ...old,
        milestones: Array.isArray(old.milestones)
          ? old.milestones.map(m => (m.id === args.id ? { ...m, ...args.data } : m))
          : old.milestones,
      }));
      return { previous };
    },
    onError: (err, _args, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to update milestone: ' + (err?.message || 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
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
          ? old.milestones.filter(m => m.id !== id)
          : old.milestones,
      }));
      return { previous };
    },
    onError: (err, _id, context) => {
      rollbackPlanner(context?.previous);
      toast.error('Failed to delete milestone: ' + (err?.message || 'Unknown error'));
    },
    onSuccess: () => {
      toast.success('Milestone deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
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
