import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  Calendar, CheckCircle2, Plus,
  X, Star, Pencil, FolderKanban, Activity, Sparkles,
  ArrowRight, Unlink, ChevronRight, Zap, Check
} from 'lucide-react';
import { ConfirmDeleteButton } from '../ui/ConfirmDeleteButton';
import { BaseButton } from '../ui/BaseButton';
import { IconPicker } from '../ui/IconPicker';
import { resolveIcon } from '../../lib/iconResolver';
import { computeGoalPace } from '../../lib/goalUtils';
import { cn, formatLocalDate } from '../../lib/utils';
import { toast } from 'sonner';
import { LIFE_PILLARS, getPillar, type GoalStatus } from './goalConstants';
import type { GoalWithRelations } from '../../types/schema';

interface GoalDetailDrawerProps {
  goal: GoalWithRelations;
  projects: any[];
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const goalId = goal.id;
  const [activeTab, setActiveTab] = useState<'cockpit' | 'edit'>('cockpit');
  const [note, setNote] = useState('');
  const [progressInput, setProgressInput] = useState<number>(goal.progress ?? 0);
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState('');
  const [selectedHabitIdToLink, setSelectedHabitIdToLink] = useState('');

  // Inline edit state
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editIcon, setEditIcon] = useState<string>((goal as any).icon || 'Target');
  const [editWhy, setEditWhy] = useState(
    (goal.metadata as any)?.whyStatement || (goal.metadata as any)?.description || ''
  );
  const [editCategory, setEditCategory] = useState((goal.metadata as any)?.category || 'health');
  const [editTargetDate, setEditTargetDate] = useState(() =>
    goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''
  );
  const [editProgressMode, setEditProgressMode] = useState<'manual' | 'auto'>('manual');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => api.goals.get(goalId),
  });

  const { data: allGoals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: api.goals.list,
  });

  const { data: allHabits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: api.habits.list,
  });

  const current = (detail ?? goal) as GoalWithRelations;
  const metadata = ((current as any)?.metadata || {}) as Record<string, any>;
  const isAuto = metadata.progressMode === 'auto';
  const isMeasurable = Boolean(metadata.measurable) && metadata.targetValue != null;
  const isPinned = Boolean(metadata.isPinned);
  const pillar = getPillar(metadata.category);

  const [measurableInput, setMeasurableInput] = useState(
    metadata.currentValue != null ? String(metadata.currentValue) : ''
  );

  useEffect(() => {
    setProgressInput(current.progress ?? 0);
    setMeasurableInput(metadata.currentValue != null ? String(metadata.currentValue) : '');
    setEditTitle(current.title);
    setEditIcon((current as any).icon || 'Target');
    setEditWhy(metadata.whyStatement || metadata.description || '');
    setEditCategory(metadata.category || 'health');
    setEditProgressMode(metadata.progressMode === 'auto' ? 'auto' : 'manual');
    if (current.targetDate) {
      setEditTargetDate(new Date(current.targetDate).toISOString().split('T')[0]);
    }
  }, [
    current.progress,
    metadata.currentValue,
    metadata.progressMode,
    current.title,
    (current as any).icon,
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

  const childGoals = ((current as any)?.childGoals ?? []) as GoalWithRelations[];

  const linkedProjects = useMemo(
    () => (projects || []).filter((p: any) => p.goalId === goalId),
    [projects, goalId]
  );

  const unlinkedProjects = useMemo(
    () => (projects || []).filter((p: any) => !p.goalId || p.goalId !== goalId),
    [projects, goalId]
  );

  const linkedHabits = useMemo(
    () => (allHabits as any[]).filter((h) => h.linkedGoalId === goalId),
    [allHabits, goalId]
  );

  const unlinkedHabits = useMemo(
    () => (allHabits as any[]).filter((h) => !h.linkedGoalId || h.linkedGoalId !== goalId),
    [allHabits, goalId]
  );

  const snapshots = useMemo(() => {
    const s = ((current as any)?.snapshots ?? []) as Array<{
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
      const payload: Record<string, any> = {
        progress: isAuto || hasChildren ? current.progress ?? 0 : derivedProgress,
        version: (current as any)?.version,
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
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setNote('');
      toast.success('Check-in and reflection saved');
    },
    onError: (err: any) =>
      toast.error('Failed to save check-in: ' + (err?.message || 'Unknown error')),
  });

  const inlineEditMutation = useMutation({
    mutationFn: async () => {
      return api.goals.update(goalId, {
        title: editTitle.trim(),
        icon: editIcon,
        targetDate: editTargetDate ? new Date(editTargetDate).toISOString() : null,
        version: (current as any)?.version,
        metadata: {
          ...metadata,
          whyStatement: editWhy.trim() || null,
          category: editCategory,
          progressMode: editProgressMode,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setActiveTab('cockpit');
      toast.success('Goal settings updated');
    },
    onError: (err: any) =>
      toast.error('Failed to update details: ' + (err?.message || 'Unknown error')),
  });

  const statusChangeMutation = useMutation({
    mutationFn: (newStatus: GoalStatus) =>
      api.goals.update(goalId, {
        status: newStatus,
        progress: newStatus === 'COMPLETED' ? 100 : current.progress,
        version: (current as any)?.version,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Goal status updated');
    },
    onError: (err: any) =>
      toast.error('Failed to update status: ' + (err?.message || 'Unknown error')),
  });

  const togglePinMutation = useMutation({
    mutationFn: () => {
      return api.goals.update(goalId, {
        version: (current as any)?.version,
        metadata: {
          ...metadata,
          isPinned: !isPinned,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success(isPinned ? 'Removed from Spotlight' : 'Pinned to Spotlight');
    },
  });

  // Link / Unlink Project
  const linkProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const proj = projects.find((p: any) => p.id === projectId);
      if (!proj) return;
      return api.projects.update(projectId, { goalId, version: proj.version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setSelectedProjectIdToLink('');
      toast.success('Project connected to goal');
    },
    onError: (err: any) =>
      toast.error('Failed to connect project: ' + (err?.message || 'Unknown error')),
  });

  const unlinkProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const proj = projects.find((p: any) => p.id === projectId);
      if (!proj) return;
      return api.projects.update(projectId, { goalId: null, version: proj.version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Project unlinked');
    },
    onError: (err: any) =>
      toast.error('Failed to unlink project: ' + (err?.message || 'Unknown error')),
  });

  // Link / Unlink Habit
  const linkHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      return api.habits.update(habitId, { linkedGoalId: goalId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setSelectedHabitIdToLink('');
      toast.success('Habit connected to goal');
    },
    onError: (err: any) =>
      toast.error('Failed to connect habit: ' + (err?.message || 'Unknown error')),
  });

  const unlinkHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      return api.habits.update(habitId, { linkedGoalId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      toast.success('Habit unlinked');
    },
    onError: (err: any) =>
      toast.error('Failed to unlink habit: ' + (err?.message || 'Unknown error')),
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
      toast.success('Habit logged for today! Momentum maintained 🔥');
    },
    onError: (err: any) =>
      toast.error('Failed to log habit: ' + (err?.message || 'Unknown error')),
  });

  const handleDeleteGoalFromDrawer = async () => {
    try {
      await api.goals.delete(goalId);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      onClose();
      toast.success(`Deleted "${current.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.goals.restore(goalId);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
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

  const DrawerIcon = resolveIcon((current as any)?.icon || 'Target');
  const rawStatus = (metadata.status || (current as any).status || 'ACTIVE') as GoalStatus;
  const isCompleted = rawStatus === 'COMPLETED' || current.progress >= 100;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
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
                  onChange={setEditIcon}
                  triggerClassName="w-10 h-10 px-0 py-0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
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
                value={editWhy}
                onChange={(e) => setEditWhy(e.target.value)}
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
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
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
                    onChange={() => setEditProgressMode('manual')}
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
                    onChange={() => setEditProgressMode('auto')}
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
                    const krMeta = ((kr as any)?.metadata || {}) as Record<string, any>;
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

            {/* Connected Initiatives (Projects) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-caption font-mono uppercase tracking-wide text-secondary flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-cat-projects" /> Connected Projects ({linkedProjects.length})
                </h4>
              </div>

              {unlinkedProjects.length > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <select
                    value={selectedProjectIdToLink}
                    onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                    className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface text-primary focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">+ Connect existing project...</option>
                    {unlinkedProjects.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p._count?.tasks ?? p.tasks?.length ?? 0} tasks)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedProjectIdToLink || linkProjectMutation.isPending}
                    onClick={() =>
                      selectedProjectIdToLink &&
                      linkProjectMutation.mutate(selectedProjectIdToLink)
                    }
                    className="px-2.5 py-1.5 text-xs bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    Connect
                  </button>
                </div>
              )}

              {linkedProjects.length === 0 ? (
                <p className="text-caption text-secondary italic">No projects connected yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkedProjects.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-surface hover:border-accent/40 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/app/projects/${proj.id}`)}
                        className="flex-1 text-left min-w-0 flex items-center gap-2 cursor-pointer group"
                      >
                        <span className="w-2 h-2 rounded-full bg-cat-projects shrink-0" />
                        <p className="text-xs font-medium text-primary group-hover:text-accent-fg transition-colors truncate">
                          {proj.name}
                        </p>
                        <ArrowRight className="w-3 h-3 text-secondary group-hover:text-accent-fg transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-secondary bg-surface-hover px-1.5 py-0.5 rounded">
                          {proj._count?.tasks ?? proj.tasks?.length ?? 0} tasks
                        </span>
                        <button
                          type="button"
                          onClick={() => unlinkProjectMutation.mutate(proj.id)}
                          className="text-secondary hover:text-danger-fg p-1 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                          title="Disconnect project"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Habit Synergy (With Direct Log Button!) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-caption font-mono uppercase tracking-wide text-secondary flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-warning-fg" /> Daily Habits ({linkedHabits.length})
                </h4>
              </div>

              {unlinkedHabits.length > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <select
                    value={selectedHabitIdToLink}
                    onChange={(e) => setSelectedHabitIdToLink(e.target.value)}
                    className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface text-primary focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">+ Connect daily habit...</option>
                    {unlinkedHabits.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.name} (streak: {h.streak ?? 0}d)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedHabitIdToLink || linkHabitMutation.isPending}
                    onClick={() =>
                      selectedHabitIdToLink && linkHabitMutation.mutate(selectedHabitIdToLink)
                    }
                    className="px-2.5 py-1.5 text-xs bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    Connect
                  </button>
                </div>
              )}

              {linkedHabits.length === 0 ? (
                <p className="text-caption text-secondary italic">No habits connected to this goal yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkedHabits.map((h: any) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-surface hover:border-accent/40 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/app/habits?goalId=${goalId}`)}
                        className="flex-1 text-left min-w-0 flex items-center gap-2 cursor-pointer group"
                      >
                        <p className="text-xs font-medium text-primary group-hover:text-accent-fg transition-colors truncate">
                          {h.name}
                        </p>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Direct Log Today Button */}
                        <button
                          type="button"
                          onClick={() => logHabitMutation.mutate(h.id)}
                          disabled={logHabitMutation.isPending}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-success-bg text-success-fg border border-success-border hover:bg-success-bg/80 transition-all flex items-center gap-1 cursor-pointer"
                          title="Log habit for today"
                        >
                          <Check className="w-3 h-3" /> Log Today
                        </button>

                        <span className="text-[10px] font-mono text-warning-fg bg-warning-bg border border-warning-border px-1.5 py-0.5 rounded font-semibold">
                          🔥 {h.streak ?? 0}d
                        </span>

                        <button
                          type="button"
                          onClick={() => unlinkHabitMutation.mutate(h.id)}
                          className="text-secondary hover:text-danger-fg p-1 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                          title="Disconnect habit"
                        >
                          <Unlink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                  value={measurableInput}
                  onChange={(e) => setMeasurableInput(e.target.value)}
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
                  value={progressInput}
                  onChange={(e) => setProgressInput(Number(e.target.value))}
                  className="flex-1 accent-accent cursor-pointer"
                />
                <span className="text-sm font-bold font-mono text-primary w-10 text-right">
                  {progressInput}%
                </span>
              </div>
            )}

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
