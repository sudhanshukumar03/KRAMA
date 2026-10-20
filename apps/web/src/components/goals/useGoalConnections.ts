import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { errorMessage, formatLocalDate } from '../../lib/utils';
import { toast } from 'sonner';
import type { Habit, ProjectWithRelations } from '../../types/schema';

/** Own related project/habit selection and mutations; preserve each domain's write version. */
export function useGoalConnections(goalId: string, projects: ProjectWithRelations[], allHabits: Habit[]) {
  const queryClient = useQueryClient();
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState('');
  const [selectedHabitIdToLink, setSelectedHabitIdToLink] = useState('');


  const linkedProjects = useMemo(
    () => (projects || []).filter((p) => p.goalId === goalId),
    [projects, goalId]
  );

  const unlinkedProjects = useMemo(
    () => (projects || []).filter((p) => !p.goalId || p.goalId !== goalId),
    [projects, goalId]
  );

  const linkedHabits = useMemo(
    () => allHabits.filter((h) => h.linkedGoalId === goalId),
    [allHabits, goalId]
  );

  const unlinkedHabits = useMemo(
    () => allHabits.filter((h) => !h.linkedGoalId || h.linkedGoalId !== goalId),
    [allHabits, goalId]
  );

  useEffect(() => {
    if (selectedProjectIdToLink && !unlinkedProjects.some(project => project.id === selectedProjectIdToLink)) setSelectedProjectIdToLink('');
  }, [selectedProjectIdToLink, unlinkedProjects]);
  useEffect(() => {
    if (selectedHabitIdToLink && !unlinkedHabits.some(habit => habit.id === selectedHabitIdToLink)) setSelectedHabitIdToLink('');
  }, [selectedHabitIdToLink, unlinkedHabits]);


  // Link / Unlink Project
  const linkProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) throw new Error('This project is no longer available. Refresh the connections and choose another project.');
      return api.projects.update(projectId, { goalId, version: proj.version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setSelectedProjectIdToLink('');
      toast.success('Project connected to goal');
    },
    onError: (err) =>
      toast.error('Failed to connect project: ' + (errorMessage(err, 'Unknown error'))),
  });

  const unlinkProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) throw new Error('This project is no longer available. Refresh the connections and try again.');
      return api.projects.update(projectId, { goalId: null, version: proj.version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Project unlinked');
    },
    onError: (err) =>
      toast.error('Failed to unlink project: ' + (errorMessage(err, 'Unknown error'))),
  });

  // Link / Unlink Habit
  const linkHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const habit = allHabits.find(item => item.id === habitId);
      if (!habit) throw new Error('This habit is no longer available. Refresh the connections and choose another habit.');
      return api.habits.update(habitId, { linkedGoalId: goalId, version: habit.version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setSelectedHabitIdToLink('');
      toast.success('Habit connected to goal');
    },
    onError: (err) =>
      toast.error('Failed to connect habit: ' + (errorMessage(err, 'Unknown error'))),
  });

  const unlinkHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const habit = allHabits.find(item => item.id === habitId);
      if (!habit) throw new Error('This habit is no longer available. Refresh the connections and try again.');
      return api.habits.update(habitId, { linkedGoalId: null, version: habit.version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Habit unlinked');
    },
    onError: (err) =>
      toast.error('Failed to unlink habit: ' + (errorMessage(err, 'Unknown error'))),
  });

  // One-Click Habit Completion directly inside drawer
  const logHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const today = new Date();
      const localDay = formatLocalDate(today) || '';
      const localDateIso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0)).toISOString();
      return api.habits.complete(habitId, localDay, localDateIso);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success('Habit logged for today! Momentum maintained 🔥');
    },
    onError: (err) =>
      toast.error('Failed to log habit: ' + (errorMessage(err, 'Unknown error'))),
  });

  return {
    selectedProjectIdToLink,
    setSelectedProjectIdToLink,
    selectedHabitIdToLink,
    setSelectedHabitIdToLink,
    linkedProjects,
    unlinkedProjects,
    linkedHabits,
    unlinkedHabits,
    linkProjectMutation,
    unlinkProjectMutation,
    linkHabitMutation,
    unlinkHabitMutation,
    logHabitMutation
  };
}
