import { GoalConnections } from './GoalConnections';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModalA11y } from '../../hooks/useModalA11y';
import { ErrorState } from '../ui/ErrorState';
import { api } from '../../api/client';
import { Calendar, CheckCircle2, Plus, X, Star, Pencil, Activity, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { ConfirmDeleteButton } from '../ui/ConfirmDeleteButton';
import { BaseButton } from '../ui/BaseButton';
import { IconPicker } from '../ui/IconPicker';
import { resolveIcon } from '../../lib/iconResolver';
import { computeGoalPace, goalMetadata } from '../../lib/goalUtils';
import { cn, formatLocalDate, errorMessage } from '../../lib/utils';
import { toast } from 'sonner';
import { LIFE_PILLARS, getPillar, type GoalStatus } from './goalConstants';
import type { GoalWithRelations, ProjectWithRelations, GoalUpdateInput } from '../../types/schema';

interface GoalDetailDrawerProps {
  goal: GoalWithRelations;
  projects: ProjectWithRelations[];
  onClose: () => void;
  onAddChild?: (parentGoal: GoalWithRelations) => void;
  onSelectGoal?: (goal: GoalWithRelations) => void;
}

export function GoalDetailDrawer({
  goal,
  projects,
  onClose,
  onAddChild,
  onSelectGoal,
}: GoalDetailDrawerProps) {
  const queryClient = useQueryClient();
  const goalId = goal.id;
  const dialogRef = useModalA11y(true, onClose);
  const [draftDirty, setDraftDirty] = useState(false);
  const [draftVersion, setDraftVersion] = useState(goal.version);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'edit'>('cockpit');
  const [note, setNote] = useState('');
  const [progressInput, setProgressInput] = useState<number>(goal.progress ?? 0);
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState('');
  const [selectedHabitIdToLink, setSelectedHabitIdToLink] = useState('');

  // Inline edit state
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editIcon, setEditIcon] = useState<string>(goal.icon || 'Target');
  const [editWhy, setEditWhy] = useState(
    goalMetadata(goal.metadata)?.whyStatement || goalMetadata(goal.metadata)?.description || ''
  );
  const [editCategory, setEditCategory] = useState(goalMetadata(goal.metadata)?.category || 'health');
  const [editTargetDate, setEditTargetDate] = useState(() =>
    goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''
  );
  const [editProgressMode, setEditProgressMode] = useState<'manual' | 'auto'>('manual');

  const { data: detail, isLoading, isError: detailError, refetch: retryDetail } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => api.goals.get(goalId),
  });

  const { data: allGoals = [], isError: goalsError, refetch: retryGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: api.goals.list,
  });

  const { data: allHabits = [], isError: habitsError, refetch: retryHabits } = useQuery({
    queryKey: ['habits'],
    queryFn: api.habits.list,
  });

  const current = (detail ?? goal) as GoalWithRelations;
  const metadata = goalMetadata(current.metadata);
  const isAuto = metadata.progressMode === 'auto';
  const isMeasurable = Boolean(metadata.measurable) && metadata.targetValue != null;
  const isPinned = Boolean(metadata.isPinned);
  const pillar = getPillar(metadata.category);

  const [measurableInput, setMeasurableInput] = useState(
    metadata.currentValue != null ? String(metadata.currentValue) : ''
  );

  useEffect(() => {
    if (draftDirty) return;
    setDraftVersion(current.version);
    setProgressInput(current.progress ?? 0);
    setMeasurableInput(metadata.currentValue != null ? String(metadata.currentValue) : '');
    setEditTitle(current.title);
    setEditIcon(current.icon || 'Target');
    setEditWhy(metadata.whyStatement || metadata.description || '');
    setEditCategory(metadata.category || 'health');
    setEditProgressMode(metadata.progressMode === 'auto' ? 'auto' : 'manual');
    setEditTargetDate(current.targetDate ? new Date(current.targetDate).toISOString().split('T')[0] : '');
  }, [
    draftDirty, current.version,
    current.progress,
    metadata.currentValue,
    metadata.progressMode,
    current.title,
    current.icon,
    current.targetDate,
    metadata.whyStatement,
    metadata.description,
    metadata.category,
  ]);

  const pace = useMemo(() => computeGoalPace(current), [current]);

  const parentGoal = useMemo(() => {
    if (!current.parentGoalId) return null;
    return allGoals.find((g) => g.id === current.parentGoalId) || null;
  }, [allGoals, current.parentGoalId]);

  const childGoals = current.childGoals ?? [];

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
    onSuccess: () => {
      setDraftDirty(false);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setNote('');
      toast.success('Check-in and reflection saved');
    },
    onError: (err) =>
      toast.error('Failed to save check-in: ' + (errorMessage(err, 'Unknown error'))),
  });

  const inlineEditMutation = useMutation({
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
    onSuccess: () => {
      setDraftDirty(false);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setActiveTab('cockpit');
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

  // Link / Unlink Project
  const linkProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
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
      if (!proj) return;
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
      return api.habits.update(habitId, { linkedGoalId: goalId, version: allHabits.find(h => h.id === habitId)?.version });
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
      return api.habits.update(habitId, { linkedGoalId: null, version: allHabits.find(h => h.id === habitId)?.version });
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

  const DrawerIcon = resolveIcon(current.icon || 'Target');
  const rawStatus = (metadata.status || 'ACTIVE') as GoalStatus;
  const isCompleted = rawStatus === 'COMPLETED' || current.progress >= 100;

  if (isLoading || detailError || goalsError || habitsError) return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Goal details" className="relative w-full max-w-lg h-full bg-card p-6 overflow-y-auto">
        <button onClick={onClose} aria-label="Close goal details">Close</button>
        {isLoading ? <p role="status">Loading goal details...</p> : <ErrorState title="Could not load goal details" onRetry={() => { void Promise.all([retryDetail(), retryGoals(), retryHabits()]); }} />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Goal details"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {(detailError || goalsError || habitsError) && <ErrorState title="Could not load goal details" onRetry={() => { void Promise.all([retryDetail(), retryGoals(), retryHabits()]); }} />}
        {draftDirty && current.version !== draftVersion && <p role="alert" className="p-3 text-warning-fg">This goal changed elsewhere. Your draft is retained. Close and reopen to load the latest values before saving.</p>}
        {/* Drawer Header */}
        <div className="relative flex items-start justify-between px-6 py-5 border-b border-border bg-gradient-to-b from-surface/80 to-surface/40 shrink-0 overflow-hidden">
          {/* Ambient Top Glow Line */}
          <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-accent via-accent-hover to-transparent" />

          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div
              className={cn(
                'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105',
                isCompleted
                  ? 'bg-success-bg text-success-fg border-success-border'
                  : 'bg-surface text-primary border-border shadow-xs'
              )}
            >
              <DrawerIcon className="w-5 h-5 stroke-[1.75]" />
            </div>

            <div className="min-w-0 flex-1">
              {parentGoal && (
                <button
                  type="button"
                  onClick={() => onSelectGoal?.(parentGoal)}
                  className="text-[11px] font-mono font-medium text-accent-fg hover:underline flex items-center gap-1 mb-1 truncate cursor-pointer"
                  title="Jump to parent aspiration"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" /> Aspiration: {parentGoal.title}
                </button>
              )}

              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {metadata.category && metadata.category !== 'all' && (
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1',
                      pillar.color
                    )}
                  >
                    {React.createElement(pillar.icon, { className: 'w-3 h-3 stroke-[1.75]' })}
                    <span>{pillar.label.split(' ')[0]}</span>
                  </span>
                )}

                {isAuto && (
                  <span className="text-[10px] font-mono font-bold uppercase text-accent-fg bg-accent-subtle border border-accent/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 stroke-[1.75]" /> Auto
                  </span>
                )}

                {/* Status Dropdown */}
                <select
                  value={rawStatus}
                  onChange={(e) => statusChangeMutation.mutate(e.target.value as GoalStatus)}
                  className="text-[10px] font-mono font-bold uppercase bg-surface border border-border rounded px-2 py-0.5 text-primary focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="ACTIVE">🟢 Active</option>
                  <option value="PAUSED">🟡 Paused</option>
                  <option value="COMPLETED">✅ Completed</option>
                  <option value="CANCELED">🔴 Canceled</option>
                </select>
              </div>

              <h3 className="text-base font-bold text-primary tracking-tight truncate">
                {current.title}
              </h3>

              {current.targetDate && (
                <p className="text-caption text-secondary font-mono flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span>
                    Target:{' '}
                    {new Date(current.targetDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>({pace.daysRemaining > 0 ? `${pace.daysRemaining}d left` : 'overdue'})</span>
                </p>
              )}
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => togglePinMutation.mutate()}
              type="button"
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border',
                isPinned
                  ? 'text-warning-fg bg-warning-bg border-warning-border'
                  : 'text-secondary hover:bg-surface-hover hover:text-primary border-transparent'
              )}
              title={isPinned ? 'Unpin from Spotlight' : 'Pin to Spotlight'}
            >
              <Star className={cn('w-4 h-4', isPinned && 'fill-warning-fg')} />
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'cockpit' ? 'edit' : 'cockpit')}
              type="button"
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border',
                activeTab === 'edit'
                  ? 'bg-accent-subtle text-accent-fg border-accent/40 shadow-2xs'
                  : 'text-secondary hover:bg-surface-hover hover:text-primary border-transparent'
              )}
              title={activeTab === 'edit' ? 'View Cockpit' : 'Edit Settings'}
            >
              <Pencil className="w-4 h-4 stroke-[1.75]" />
            </button>

            <ConfirmDeleteButton
              onConfirm={handleDeleteGoalFromDrawer}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-danger-fg transition-colors"
              iconClassName="w-4 h-4"
            />

            <button
              aria-label="Close goal details"
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>
        </div>

        {/* Tab switch bar */}
        <div className="flex border-b border-border bg-surface px-5">
          <button
            type="button"
            onClick={() => setActiveTab('cockpit')}
            className={cn(
              'px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'cockpit'
                ? 'border-accent text-accent-fg font-bold'
                : 'border-transparent text-secondary hover:text-primary'
            )}
          >
            Strategic Cockpit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={cn(
              'px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'edit'
                ? 'border-accent text-accent-fg font-bold'
                : 'border-transparent text-secondary hover:text-primary'
            )}
          >
            Edit Settings
          </button>
        </div>

        {/* Body content */}
        {activeTab === 'edit' ? (
          /* INLINE EDIT SETTINGS */
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="flex gap-3">
              <div>
                <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                  Icon
                </label>
                <IconPicker
                  value={editIcon}
                  onChange={(icon) => { setDraftDirty(true); setEditIcon(icon); }}
                  triggerClassName="w-10 h-10 px-0 py-0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  aria-label="Goal title"
                  value={editTitle}
                  onChange={(e) => { setDraftDirty(true); setEditTitle(e.target.value); }}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                Life Pillar
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LIFE_PILLARS.filter((p) => p.id !== 'all').map((p) => {
                  const PillarIcon = p.icon;
                  const isSelected = editCategory === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEditCategory(p.id)}
                      className={cn(
                        'px-2.5 py-2 rounded-lg border text-caption font-sans font-medium flex items-center gap-2 transition-all text-left cursor-pointer group/pill',
                        isSelected
                          ? 'bg-accent-subtle border-accent text-accent-fg font-semibold'
                          : 'bg-surface hover:bg-surface-hover border-border text-secondary'
                      )}
                    >
                      <PillarIcon
                        className={cn(
                          'w-4 h-4 shrink-0 stroke-[1.75]',
                          isSelected ? 'text-accent-fg' : 'text-secondary group-hover/pill:text-primary'
                        )}
                      />
                      <span className="truncate">{p.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                Why This Matters (Motivation)
              </label>
              <textarea
                aria-label="Why this matters"
                  value={editWhy}
                onChange={(e) => { setDraftDirty(true); setEditWhy(e.target.value); }}
                rows={3}
                placeholder="What will achieving this unlock for your life?..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                aria-label="Target date"
                  value={editTargetDate}
                onChange={(e) => { setDraftDirty(true); setEditTargetDate(e.target.value); }}
                className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="pt-2 border-t border-border/60">
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                Progress Mode
              </label>
              <div className="flex items-center gap-4 text-xs font-mono">
                <label className="flex items-center gap-1.5 cursor-pointer text-secondary hover:text-primary">
                  <input
                    type="radio"
                    name="editProgressMode"
                    value="manual"
                    checked={editProgressMode === 'manual'}
                    onChange={() => { setDraftDirty(true); setEditProgressMode('manual'); }}
                    className="accent-accent"
                  />
                  <span>Manual Progress</span>
                </label>
                <label
                  className="flex items-center gap-1.5 cursor-pointer text-secondary hover:text-primary"
                  title="Derives progress automatically from connected project tasks"
                >
                  <input
                    type="radio"
                    name="editProgressMode"
                    value="auto"
                    checked={editProgressMode === 'auto'}
                    onChange={() => { setDraftDirty(true); setEditProgressMode('auto'); }}
                    className="accent-accent"
                  />
                  <span className="flex items-center gap-1 text-accent-fg font-semibold">
                    <Zap className="w-3 h-3" /> Auto (from Project Tasks)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-2">
              <BaseButton variant="secondary" onClick={() => setActiveTab('cockpit')}>
                Cancel
              </BaseButton>
              <BaseButton
                onClick={() => inlineEditMutation.mutate()}
                disabled={inlineEditMutation.isPending || !editTitle.trim()}
              >
                {inlineEditMutation.isPending ? 'Saving...' : 'Save Settings'}
              </BaseButton>
            </div>
          </div>
        ) : (
          /* COCKPIT TAB */
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Motivation Quote Card */}
            {(metadata.whyStatement || metadata.description) && (
              <div className="p-3.5 bg-accent-subtle/30 rounded-xl border border-accent/20 text-sm text-secondary leading-relaxed">
                <p className="text-[10px] font-mono font-semibold uppercase text-accent-fg mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Core Motivation
                </p>
                <p className="text-primary italic font-serif">"{metadata.whyStatement || metadata.description}"</p>
              </div>
            )}

            {/* Executive Velocity Gauge Instrument Panel */}
            <div className="p-4.5 rounded-2xl border border-border/80 bg-surface/50 shadow-xs space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {['stalled', 'past_due'].includes(pace.status) ? (
                    <span className="w-2 h-2 rounded-full bg-danger-fg animate-pulse" />
                  ) : pace.status === 'behind' ? (
                    <span className="w-2 h-2 rounded-full bg-warning-fg" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-success-fg" />
                  )}
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                    {pace.badge}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-hover text-secondary border border-border/60">
                  {pace.isDueToday
                    ? 'Due today'
                    : pace.daysRemaining > 0
                      ? `${pace.daysRemaining} days remaining`
                      : pace.status === 'unknown'
                        ? 'No target date'
                        : 'Overdue'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-caption font-mono bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
                <div>
                  <span className="text-secondary/80 block text-[10px] font-semibold uppercase tracking-wider">Required Pace</span>
                  <span className="text-sm font-bold text-primary font-mono tabular-nums">
                    {pace.requiredPace === Infinity ? 'N/A' : `${pace.requiredPace.toFixed(1)}%/d`}
                  </span>
                </div>
                <div>
                  <span className="text-secondary/80 block text-[10px] font-semibold uppercase tracking-wider">Actual Velocity</span>
                  <span className="text-sm font-bold text-primary font-mono tabular-nums">{pace.actualPace.toFixed(1)}%/d</span>
                </div>
                {pace.projectedDate && (
                  <div className="col-span-2 pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-secondary/80 text-[10px] uppercase font-semibold">
                      Projected Completion
                    </span>
                    <span className="font-bold text-accent-fg font-mono text-xs">
                      {pace.projectedDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Progress Gauge */}
            <div className="p-4.5 rounded-2xl bg-card border border-border/80 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-secondary">
                  Overall Completion
                </span>
                <span
                  className={cn(
                    'text-3xl font-extrabold font-mono tracking-tight tabular-nums',
                    isCompleted ? 'text-success-fg' : 'text-primary'
                  )}
                >
                  {current.progress}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-hover overflow-hidden p-[0.5px]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out shadow-xs',
                    isCompleted
                      ? 'bg-gradient-to-r from-success-fg to-accent'
                      : 'bg-gradient-to-r from-cat-tasks via-accent to-cat-routines'
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, current.progress))}%` }}
                />
              </div>
              {isMeasurable && (
                <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-secondary">
                  <span>Target Metric:</span>
                  <span className="font-semibold text-primary">
                    {metadata.currentValue ?? 0} / {metadata.targetValue}
                    {metadata.unit ? ` ${metadata.unit}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Milestones / Key Results */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-caption font-mono uppercase tracking-wide text-secondary flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-fg" /> Key Results ({childGoals.length})
                </h4>
                <button
                  type="button"
                  onClick={() => onAddChild?.(current)}
                  className="text-xs font-mono text-accent-fg hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Key Result
                </button>
              </div>

              {childGoals.length === 0 ? (
                <p className="text-caption text-secondary italic">
                  No key results configured under this goal yet. Break it down into measurable milestones!
                </p>
              ) : (
                <div className="space-y-2">
                  {childGoals.map((kr) => {
                    const krMeta = goalMetadata(kr.metadata);
                    const krMeasurable = Boolean(krMeta.measurable) && krMeta.targetValue != null;
                    return (
                      <div
                        key={kr.id}
                        onClick={() => onSelectGoal?.(kr)}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary font-medium group-hover:text-accent-fg transition-colors truncate">
                            {kr.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-secondary mt-0.5">
                            {krMeasurable && (
                              <span>
                                {krMeta.currentValue ?? 0} / {krMeta.targetValue}
                                {krMeta.unit ? ` ${krMeta.unit}` : ''}
                              </span>
                            )}
                            {krMeta.weight && Number(krMeta.weight) > 1 && (
                              <span className="px-1 py-0.2 rounded bg-surface-hover border border-border text-[9px] text-accent-fg">
                                {krMeta.weight}x weight
                              </span>
                            )}
                            {kr.targetDate && (
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(kr.targetDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              'text-xs font-bold font-mono',
                              kr.progress >= 100 ? 'text-success-fg' : 'text-primary'
                            )}
                          >
                            {kr.progress}%
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-secondary group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <GoalConnections
              goalId={goalId}
              linkedProjects={linkedProjects}
              unlinkedProjects={unlinkedProjects}
              selectedProjectIdToLink={selectedProjectIdToLink}
              setSelectedProjectIdToLink={setSelectedProjectIdToLink}
              linkProjectMutation={linkProjectMutation}
              unlinkProjectMutation={unlinkProjectMutation}
              linkedHabits={linkedHabits}
              unlinkedHabits={unlinkedHabits}
              selectedHabitIdToLink={selectedHabitIdToLink}
              setSelectedHabitIdToLink={setSelectedHabitIdToLink}
              linkHabitMutation={linkHabitMutation}
              unlinkHabitMutation={unlinkHabitMutation}
              logHabitMutation={logHabitMutation}
            />

            {/* Reflection & Progress History */}
            {snapshots.length > 0 && (
              <div>
                <h4 className="text-caption font-mono uppercase tracking-wide text-secondary mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Progress & Reflection History
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {[...snapshots].reverse().map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 py-1.5 border-b border-border/60 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-caption font-mono text-secondary">
                          {new Date(s.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        {s.notes && (
                          <p className="text-xs text-primary mt-0.5 break-words font-sans">{s.notes}</p>
                        )}
                      </div>
                      <span className="text-caption font-mono font-bold text-primary shrink-0">
                        {Math.round(s.progress)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <p className="text-caption text-secondary text-center py-2">Loading details…</p>
            )}
          </div>
        )}

        {/* Footer: Quick Check-in & Weekly Reflection Log */}
        {activeTab === 'cockpit' && (
          <div className="shrink-0 border-t border-border bg-surface-hover/40 px-5 py-4 space-y-3">
            <label className="text-caption font-mono uppercase tracking-wide text-secondary block">
              Weekly Check-in & Momentum Log
            </label>

            {isMeasurable && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-caption font-mono">
                  <label htmlFor="drawer-checkin-current" className="text-secondary">
                    Update current value ({metadata.unit || 'units'}):
                  </label>
                  <span className="font-bold text-accent-fg">Target: {metadata.targetValue}</span>
                </div>
                <input
                  type="number"
                  id="drawer-checkin-current"
                  aria-label="Current value"
                  value={measurableInput}
                  onChange={(e) => { setDraftDirty(true); setMeasurableInput(e.target.value); }}
                  placeholder={`Current: ${metadata.currentValue ?? 0}`}
                  className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-primary focus:outline-none focus:border-accent"
                />
              </div>
            )}

            {childGoals.length > 0 && (
              <div className="p-2.5 rounded-lg bg-surface border border-border text-caption font-mono text-secondary flex items-center justify-between">
                <span>Progress rolled up from {childGoals.length} Key Results</span>
                <span className="font-bold text-primary">{current.progress}%</span>
              </div>
            )}

            {!isAuto && childGoals.length === 0 && !isMeasurable && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  aria-label="Check-in progress"
                  value={progressInput}
                  onChange={(e) => { setDraftDirty(true); setProgressInput(Number(e.target.value)); }}
                  className="flex-1 accent-accent cursor-pointer"
                />
                <span className="text-sm font-bold font-mono text-primary w-10 text-right">
                  {progressInput}%
                </span>
              </div>
            )}

            <textarea
              aria-label="Check-in note"
                  value={note}
              onChange={(e) => { setDraftDirty(true); setNote(e.target.value); }}
              placeholder="What moved this week? What gave you momentum? (recorded in history)"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-xs text-primary placeholder:text-secondary/60 focus:outline-none focus:border-accent"
            />

            <BaseButton
              onClick={() => checkInMutation.mutate()}
              disabled={
                checkInMutation.isPending ||
                (isAuto && !note.trim()) ||
                (childGoals.length > 0 && !note.trim()) ||
                (isMeasurable && !note.trim() && measurableInput === '')
              }
              className="w-full justify-center cursor-pointer text-xs py-2"
            >
              {checkInMutation.isPending ? 'Saving…' : 'Record Check-in & Save Snapshot'}
            </BaseButton>
          </div>
        )}
      </div>
    </div>
  );
}
