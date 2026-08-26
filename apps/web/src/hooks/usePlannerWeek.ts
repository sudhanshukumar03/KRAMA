// =============================================================================
// PLANNER WEEK HOOK — KRAMA OS
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { plannerApi } from '../api/plannerApi';
import type { RoutineOccurrence } from '../types/planner';

function getWeekDays(referenceDate: Date): Date[] {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function usePlannerWeek() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<'plan' | 'calendar'>('plan');

  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekStart = format(days[0], 'yyyy-MM-dd');
  const weekEnd = format(days[6], 'yyyy-MM-dd');

  const weekRangeLabel = `${format(days[0], 'MMM d')} — ${format(days[6], 'MMM d, yyyy')}`;

  // Calculate week number
  const startOfYear = new Date(days[0].getFullYear(), 0, 1);
  const daysSinceStart = Math.floor((days[0].getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

  // Main data query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['planner', 'week', weekStart],
    queryFn: () => plannerApi.getWeek(weekStart, weekEnd),
    staleTime: 30_000,
  });

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
  const toggleRoutineMutation = useMutation({
    mutationFn: (occ: RoutineOccurrence) =>
      plannerApi.toggleRoutine({ ...occ, completed: !occ.completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'week', weekStart] });
    },
  });

  const createTimeBlockMutation = useMutation({
    mutationFn: plannerApi.createTimeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'week', weekStart] });
    },
  });

  const updateTimeBlockMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<any>) =>
      plannerApi.updateTimeBlock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'week', weekStart] });
    },
  });

  const deleteTimeBlockMutation = useMutation({
    mutationFn: plannerApi.deleteTimeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'week', weekStart] });
    },
  });

  return {
    // Data
    data,
    isLoading,
    isError,
    refetch,

    // Week
    days,
    weekStart,
    weekEnd,
    weekRangeLabel,
    weekNumber,
    currentDate,

    // Mode
    mode,
    setMode,

    // Navigation
    navigateWeek,
    navigateToDate,

    // Helpers
    occurrenceFor,

    // Mutations
    toggleRoutineMutation,
    createTimeBlockMutation,
    updateTimeBlockMutation,
    deleteTimeBlockMutation,
  };
}
