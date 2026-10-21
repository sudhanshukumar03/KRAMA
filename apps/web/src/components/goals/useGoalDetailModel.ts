import { useGoalConnections } from './useGoalConnections';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useAuth } from '../../contexts/AuthContext';
import { useGoalDraft } from './useGoalDraft';
import { api } from '../../api/client';
import { computeGoalPace, goalMetadata } from '../../lib/goalUtils';
import { errorMessage } from '../../lib/utils';
import { toast } from 'sonner';
import { getPillar, type GoalStatus } from './goalConstants';
import type { GoalWithRelations, GoalUpdateInput } from '../../types/schema';
import type { GoalDetailDrawerProps } from './goalDetail.types';

export function useGoalDetailModel({
  goal,
  projects,
  projectsAvailable = true,
  onClose,
  onAddChild,
  onSelectGoal,
}: GoalDetailDrawerProps) {
  const queryClient = useQueryClient();
  const goalId = goal.id;
  const { user, workspaceId } = useAuth();
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);
  const requestDiscard = (action: () => void) => {
    if (!draftDirty) { action(); return; }
    setDiscardAction(() => action);
  };
  const discardAndContinue = () => {
    const action = discardAction;
    setDiscardAction(null);
    setSettingsDirty(false); setCheckInDirty(false);
    try { sessionStorage.removeItem(draftKey); } catch { /* Best-effort discard. */ }
    action?.();
  };
  const handleClose = () => requestDiscard(onClose);
  const handleSelectGoal = (next: GoalWithRelations) => {
    if (next.id !== goalId) requestDiscard(() => onSelectGoal?.(next));
  };
  const dialogRef = useModalA11y(true, handleClose);
  const { data: detail, isLoading, isError: detailError, refetch: retryDetail } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => api.goals.get(goalId),
  });

  const { data: allGoals = [], isError: goalsError, refetch: retryGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: api.goals.list,
  });

  const { data: allHabits = [], isLoading: habitsLoading, isError: habitsError, refetch: retryHabits } = useQuery({
    queryKey: ['habits'],
    queryFn: api.habits.list,
  });

  const current = detail ?? goal;
  const metadata = goalMetadata(current.metadata);
  const isAuto = metadata.progressMode === 'auto' && !current.childGoals?.length;
  const isMeasurable = Boolean(metadata.measurable) && metadata.targetValue != null;
  const isPinned = Boolean(metadata.isPinned);
  const pillar = getPillar(metadata.category);

  const {
    draftKey,
    draftRevision,
    setSettingsDirty,
    setCheckInDirty,
    draftDirty,
    markDraftDirty,
    draftVersion,
    setDraftVersion,
    activeTab,
    setActiveTab,
    note,
    setNote,
    progressInput,
    setProgressInput,
    editTitle,
    setEditTitle,
    editIcon,
    setEditIcon,
    editWhy,
    setEditWhy,
    editCategory,
    setEditCategory,
    editTargetDate,
    setEditTargetDate,
    editProgressMode,
    setEditProgressMode,
    measurableInput,
    setMeasurableInput
  } = useGoalDraft(goal, current, user?.id, workspaceId);

  const pace = useMemo(() => computeGoalPace(current), [current]);

  const parentGoal = useMemo(() => {
    if (!current.parentGoalId) return null;
    return allGoals.find((g) => g.id === current.parentGoalId) || null;
  }, [allGoals, current.parentGoalId]);

  const childGoals = current.childGoals ?? [];

  const {
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
  } = useGoalConnections(goalId, projects, allHabits);

  const snapshots = useMemo(() => {
    const s = (current.snapshots ?? []) as Array<{
      date: string;
      progress: number;
      notes?: string | null;
    }>;
    return [...s].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [current]);

  // Mutations
  const checkInMutation = useMutation({
    onMutate: () => draftRevision.current.checkIn,
    mutationFn: async () => {
      const targetNum = Number(metadata.targetValue);
      const curNum = Number(measurableInput);
      const derivedProgress =
        isMeasurable && Number.isFinite(curNum) && Number.isFinite(targetNum) && targetNum > 0
          ? Math.max(0, Math.min(100, Math.round((curNum / targetNum) * 100)))
          : progressInput;

      const hasChildren = childGoals.length > 0;
      const payload: GoalUpdateInput = {
        progress: isAuto || hasChildren ? current.progress ?? 0 : derivedProgress,
        version: draftVersion,
        ...(note.trim() ? { note: note.trim() } : {}),
      };

      if (isMeasurable && measurableInput !== '') {
        payload.metadata = {
          ...metadata,
          currentValue: curNum,
        };
      }

      return api.goals.update(goalId, payload);
    },
    onSuccess: (updated, _variables, revision) => {
      queryClient.setQueryData(['goal', goalId], updated);
      setDraftVersion(updated.version);
      if (revision === draftRevision.current.checkIn) { setCheckInDirty(false); setNote(''); }
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Check-in and reflection saved');
    },
    onError: (err) =>
      toast.error('Failed to save check-in: ' + (errorMessage(err, 'Unknown error'))),
  });

  const inlineEditMutation = useMutation({
    onMutate: () => draftRevision.current.settings,
    mutationFn: async () => {
      return api.goals.update(goalId, {
        title: editTitle.trim(),
        icon: editIcon,
        targetDate: editTargetDate ? new Date(editTargetDate).toISOString() : null,
        version: draftVersion,
        metadata: {
          ...metadata,
          whyStatement: editWhy.trim() || null,
          category: editCategory,
          progressMode: editProgressMode,
        },
      });
    },
    onSuccess: (updated, _variables, revision) => {
      queryClient.setQueryData(['goal', goalId], updated);
      setDraftVersion(updated.version);
      if (revision === draftRevision.current.settings) { setSettingsDirty(false); setActiveTab('cockpit'); }
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Goal settings updated');
    },
    onError: (err) =>
      toast.error('Failed to update details: ' + (errorMessage(err, 'Unknown error'))),
  });

  const statusChangeMutation = useMutation({
    mutationFn: (newStatus: GoalStatus) =>
      api.goals.update(goalId, {
        status: newStatus,
        progress: newStatus === 'COMPLETED' ? 100 : current.progress,
        version: current.version,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Goal status updated');
    },
    onError: (err) =>
      toast.error('Failed to update status: ' + (errorMessage(err, 'Unknown error'))),
  });

  const togglePinMutation = useMutation({
    mutationFn: () => {
      return api.goals.update(goalId, {
        version: current.version,
        metadata: {
          ...metadata,
          isPinned: !isPinned,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success(isPinned ? 'Removed from Spotlight' : 'Pinned to Spotlight');
    },
  });

  const handleDeleteGoalFromDrawer = async () => {
    try {
      await api.goals.delete(goalId);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      onClose();
      toast.success(`Deleted "${current.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.goals.restore(goalId);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['habits'] });
            toast.success(`Restored "${current.title}"`);
          },
        },
      });
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  return {
    discardAction,
    cancelDiscard: () => setDiscardAction(null),
    discardAndContinue,
    projectsAvailable,
    onAddChild,
    goalId,
    draftDirty,
    markDraftDirty,
    handleClose,
    handleSelectGoal,
    dialogRef,
    draftVersion,
    activeTab,
    setActiveTab,
    note,
    setNote,
    progressInput,
    setProgressInput,
    selectedProjectIdToLink,
    setSelectedProjectIdToLink,
    selectedHabitIdToLink,
    setSelectedHabitIdToLink,
    editTitle,
    setEditTitle,
    editIcon,
    setEditIcon,
    editWhy,
    setEditWhy,
    editCategory,
    setEditCategory,
    editTargetDate,
    setEditTargetDate,
    editProgressMode,
    setEditProgressMode,
    isLoading,
    detailError,
    retryDetail,
    goalsError,
    retryGoals,
    habitsLoading,
    habitsError,
    retryHabits,
    current,
    metadata,
    isAuto,
    isMeasurable,
    isPinned,
    pillar,
    measurableInput,
    setMeasurableInput,
    pace,
    parentGoal,
    childGoals,
    linkedProjects,
    unlinkedProjects,
    linkedHabits,
    unlinkedHabits,
    snapshots,
    checkInMutation,
    inlineEditMutation,
    statusChangeMutation,
    togglePinMutation,
    linkProjectMutation,
    unlinkProjectMutation,
    linkHabitMutation,
    unlinkHabitMutation,
    logHabitMutation,
    handleDeleteGoalFromDrawer
  };
}

export type GoalDetailModel = ReturnType<typeof useGoalDetailModel>;
