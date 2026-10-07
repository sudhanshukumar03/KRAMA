import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  Calendar, AlertCircle, XCircle, CheckCircle2, ChevronRight,
  Plus, MoreHorizontal, Star, Pencil, Trash2, FolderKanban, Flame,
  Trophy, Maximize2, Check, Zap
} from 'lucide-react';
import { cn, formatLocalDate } from '../../lib/utils';
import type { GoalWithRelations } from '../../types/schema';
import { computeGoalPace } from '../../lib/goalUtils';
import { toast } from 'sonner';
import { resolveIcon } from '../../lib/iconResolver';
import { getPillar, type GoalStatus } from './goalConstants';

interface GoalCardProps {
  goal: GoalWithRelations;
  depth?: number;
  isLastChild?: boolean;
  onAddChild?: (parentGoal: GoalWithRelations) => void;
  onEdit?: (goal: GoalWithRelations) => void;
  onOpenDetail?: (goal: GoalWithRelations) => void;
  projects?: any[];
  allHabits?: any[];
}

export const GoalCard = React.memo(function GoalCard({
  goal,
  depth = 0,
  isLastChild = false,
  onAddChild,
  onEdit,
  onOpenDetail,
  projects = [],
  allHabits = [],
}: GoalCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pace = useMemo(() => computeGoalPace(goal), [goal]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Metadata-backed config
  const metadata = ((goal as any).metadata || {}) as Record<string, any>;
  const isAuto = metadata.progressMode === 'auto';
  const isMeasurable = Boolean(metadata.measurable) && metadata.targetValue != null;
  const isPinned = Boolean(metadata.isPinned);
  const pillar = getPillar(metadata.category);
  const whyStatement = metadata.whyStatement || metadata.description;
  const hasChildren = Array.isArray(goal.childGoals) && goal.childGoals.length > 0;

  const linkedProjects = useMemo(
    () => (projects || []).filter((p: any) => p.goalId === goal.id),
    [projects, goal.id]
  );

  const linkedHabits = useMemo(
    () => (allHabits || []).filter((h: any) => h.linkedGoalId === goal.id),
    [allHabits, goal.id]
  );

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Quick +1 increment for numeric measurable key results
  const quickIncrementMutation = useMutation({
    mutationFn: async () => {
      const cur = Number(metadata.currentValue ?? 0);
      const nextVal = cur + 1;
      const targetVal = Number(metadata.targetValue);
      const derivedProgress =
        Number.isFinite(targetVal) && targetVal > 0
          ? Math.max(0, Math.min(100, Math.round((nextVal / targetVal) * 100)))
          : goal.progress;
      return api.goals.update(goal.id, {
        progress: derivedProgress,
        version: goal.version,
        metadata: {
          ...metadata,
          currentValue: nextVal,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goal.id] });
      toast.success(`Incremented metric to ${(metadata.currentValue ?? 0) + 1}`);
    },
    onError: (err: any) => {
      toast.error('Failed to increment: ' + (err?.message || 'Unknown error'));
    },
  });

  // 1-Click Habit Completion directly on GoalCard
  const logHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const localDay = formatLocalDate(new Date()) || '';
      return api.habits.complete(habitId, localDay, `${localDay}T12:00:00.000Z`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      toast.success('Habit logged for today! Momentum maintained 🔥');
    },
    onError: (err: any) =>
      toast.error('Failed to log habit: ' + (err?.message || 'Unknown error')),
  });

  const togglePinMutation = useMutation({
    mutationFn: () => {
      return api.goals.update(goal.id, {
        version: goal.version,
        metadata: {
          ...metadata,
          isPinned: !isPinned,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      setMenuOpen(false);
      toast.success(isPinned ? 'Removed from Spotlight' : 'Pinned to Spotlight');
    },
    onError: () => toast.error('Failed to toggle spotlight pin'),
  });

  const handleDeleteGoal = async () => {
    setMenuOpen(false);
    try {
      await api.goals.delete(goal.id);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success(`Deleted "${goal.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.goals.restore(goal.id);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
            toast.success(`Restored "${goal.title}"`);
          },
        },
      });
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  // Recent snapshot trajectory sparkline
  const trendPoints = useMemo(() => {
    const sorted =
      goal.snapshots && goal.snapshots.length > 0
        ? [...goal.snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];
    return sorted.length > 0 ? sorted.slice(-7).map((s) => s.progress) : [0, goal.progress];
  }, [goal.snapshots, goal.progress]);

  const GoalIcon = resolveIcon(goal.icon || 'Target');
  const rawStatus = (metadata.status || (goal as any).status || 'ACTIVE') as GoalStatus;
  const isCompleted = rawStatus === 'COMPLETED' || goal.progress >= 100;

  return (
    <div className={cn('relative group/goal', depth > 0 && 'ml-4 sm:ml-8 mt-2.5')}>
      {/* Curved Tree Connector Lines for Child Milestones */}
      {depth > 0 && (
        <div
          aria-hidden="true"
          className="absolute -left-4 sm:-left-8 top-0 bottom-0 pointer-events-none"
        >
          {/* Continuous vertical trunk connecting siblings */}
          {!isLastChild && (
            <div className="w-[1.5px] bg-gradient-to-b from-border/90 via-border/60 to-transparent absolute left-2 sm:left-4 top-0 bottom-0" />
          )}
          {/* Curved branch hook into child card */}
          <div className="w-3.5 sm:w-5 h-6 border-b-[1.5px] border-l-[1.5px] border-border/80 rounded-bl-xl absolute left-2 sm:left-4 top-0" />
        </div>
      )}

      <div
        className={cn(
          'transition-all duration-300 relative overflow-hidden bg-card border group/card',
          depth === 0
            ? 'p-4 sm:p-5 rounded-2xl border-border/80 hover:border-accent/40 shadow-xs hover:shadow-md hover:-translate-y-[1px]'
            : 'p-3.5 sm:p-4 rounded-xl border-border/70 bg-surface/50 hover:bg-surface/80 hover:border-accent/30 shadow-2xs hover:shadow-xs',
          isPinned && depth === 0 && 'border-warning-border bg-warning-bg/40 shadow-xs',
          isCompleted && 'border-success-border bg-success-bg/20'
        )}
      >
        {/* Completed Ribbon for top objectives */}
        {isCompleted && depth === 0 && (
          <div className="mb-2 px-2.5 py-0.5 rounded-md bg-success-bg border border-success-border text-success-fg text-[11px] flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <Trophy className="w-3.5 h-3.5" /> Objective Accomplished
            </span>
            <span className="text-[10px] font-semibold">100% Complete</span>
          </div>
        )}

        {/* Primary Row: Icon + Title & Meta + Progress Pill + Menu */}
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon + Content */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpenDetail?.(goal)}
              className={cn(
                'rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer group-hover/goal:scale-105',
                depth === 0 ? 'w-9 h-9' : 'w-7 h-7',
                isCompleted
                  ? 'bg-success-bg text-success-fg border-success-border'
                  : 'bg-surface-hover text-secondary border-border group-hover/goal:text-accent-fg group-hover/goal:border-accent/40'
              )}
              title="Open Cockpit"
            >
              <GoalIcon className={cn(depth === 0 ? 'w-4 h-4' : 'w-3.5 h-3.5', 'stroke-[1.75]')} />
            </button>

            <div className="min-w-0 flex-1">
              {/* Title & Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(goal)}
                  className={cn(
                    'font-semibold text-primary group-hover/goal:text-accent-fg transition-colors cursor-pointer truncate',
                    depth === 0 ? 'text-sm' : 'text-xs'
                  )}
                  title={goal.title}
                >
                  {goal.title}
                </button>

                {/* Pillar Tag (only on parent or when defined) */}
                {metadata.category && metadata.category !== 'all' && (
                  <span
                    className={cn(
                      'text-[9px] font-mono font-semibold uppercase px-2 py-0.2 rounded-full border inline-flex items-center gap-1 shadow-2xs',
                      pillar.color
                    )}
                  >
                    {React.createElement(pillar.icon, { className: 'w-2.5 h-2.5 stroke-[2]' })}
                    <span>{pillar.label.split(' ')[0]}</span>
                  </span>
                )}

                {/* Pinned star badge */}
                {isPinned && depth === 0 && (
                  <span className="text-[10px] text-warning-fg inline-flex items-center gap-0.5" title="Pinned to Spotlight">
                    <Star className="w-3 h-3 fill-warning-fg stroke-[1.5]" />
                  </span>
                )}

                {/* Auto-progress badge */}
                {isAuto && (
                  <span
                    className="text-[9px] font-mono font-semibold uppercase text-accent-fg bg-accent-subtle border border-accent/20 px-2 py-0.2 rounded-full inline-flex items-center gap-1 shadow-2xs"
                    title="Progress calculated automatically from connected project tasks"
                  >
                    <Zap className="w-2.5 h-2.5 stroke-[2]" />
                    <span>Auto</span>
                  </span>
                )}

                {/* Status Badges with glowing dot */}
                {rawStatus === 'PAUSED' && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg border border-warning-border inline-flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning-fg" />
                    <span>Paused</span>
                  </span>
                )}
                {rawStatus === 'CANCELED' && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-danger-bg text-danger-fg border border-danger-border inline-flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger-fg" />
                    <span>Canceled</span>
                  </span>
                )}
                {!isCompleted && rawStatus === 'ACTIVE' && goal.targetDate && (
                  <>
                    {pace.status === 'past_due' ? (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-danger-bg text-danger-fg border border-danger-border inline-flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger-fg animate-pulse" />
                        <span>Past Due</span>
                      </span>
                    ) : pace.isDueToday ? (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg border border-warning-border inline-flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning-fg animate-ping" />
                        <span>Due Today</span>
                      </span>
                    ) : pace.status === 'behind' ? (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg border border-warning-border inline-flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning-fg" />
                        <span>Behind</span>
                      </span>
                    ) : pace.status === 'ahead' ? (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success-fg border border-success-border inline-flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-fg" />
                        <span>Ahead</span>
                      </span>
                    ) : null}
                  </>
                )}
              </div>

              {/* Motivation statement */}
              {whyStatement && depth === 0 && (
                <p className="text-xs text-secondary/80 line-clamp-1 mb-1 italic font-serif">
                  "{whyStatement}"
                </p>
              )}

              {/* Metadata row: Dates, Milestones toggle, Measurable metric */}
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-secondary font-mono">
                {goal.targetDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 stroke-[1.5] text-secondary" />
                    <span>
                      {new Date(goal.targetDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span
                      className={cn(
                        'text-[10px]',
                        pace.isDueToday
                          ? 'text-warning-fg font-bold'
                          : pace.daysRemaining > 0
                            ? 'text-secondary'
                            : 'text-danger-fg font-bold'
                      )}
                    >
                      ({pace.isDueToday ? 'due today' : pace.daysRemaining > 0 ? `${pace.daysRemaining}d` : 'overdue'})
                    </span>
                  </span>
                )}

                {/* Milestones count toggle */}
                {hasChildren && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="flex items-center gap-1 text-secondary hover:text-accent-fg font-medium transition-colors cursor-pointer"
                  >
                    <ChevronRight
                      className={cn(
                        'w-3 h-3 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )}
                    />
                    <span>
                      {goal.childGoals!.length} Key Result{goal.childGoals!.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                )}

                {/* Ergonomic Tactile Stepper Pill for Measurable Key Results */}
                {isMeasurable && (
                  <div className="inline-flex items-center gap-1.5 bg-surface-hover/80 border border-border/80 rounded-lg px-2 py-0.5 shadow-2xs">
                    <span className="text-xs font-mono font-bold text-primary tabular-nums">
                      {metadata.currentValue ?? 0}
                      <span className="text-secondary font-normal font-mono"> / {metadata.targetValue}</span>
                      {metadata.unit ? <span className="text-secondary font-sans text-[10px] ml-0.5">{metadata.unit}</span> : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        quickIncrementMutation.mutate();
                      }}
                      disabled={quickIncrementMutation.isPending}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-accent-subtle hover:bg-accent hover:text-white text-accent-fg border border-accent/30 shadow-2xs hover:scale-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-0.5"
                      title={`Quick increment by 1 ${metadata.unit || ''}`}
                    >
                      <span>+1</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Progress Badge + Dropdown Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Progress Trigger */}
            <button
              type="button"
              onClick={() => onOpenDetail?.(goal)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border',
                isCompleted
                  ? 'bg-success-bg text-success-fg border-success-border'
                  : 'bg-surface hover:bg-surface-hover text-primary border-border hover:border-accent/40 shadow-2xs'
              )}
              title="Click to open Cockpit & check in"
            >
              <span>{goal.progress}%</span>
            </button>

            {/* Clean Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label={`Options for ${goal.title}`}
                aria-expanded={menuOpen}
                title="Options"
              >
                <MoreHorizontal className="w-4 h-4 stroke-[1.75]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-card border border-border shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDetail?.(goal);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-sans text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Open Cockpit</span>
                  </button>

                  {depth < 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onAddChild?.(goal);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-sans text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-secondary" />
                      <span>Add Key Result</span>
                    </button>
                  )}

                  {depth === 0 && (
                    <button
                      type="button"
                      onClick={() => togglePinMutation.mutate()}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-sans text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Star className={cn('w-3.5 h-3.5', isPinned ? 'text-warning-fg fill-warning-fg' : 'text-secondary')} />
                      <span>{isPinned ? 'Unpin Spotlight' : 'Pin to Spotlight'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit?.(goal);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-sans text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-secondary" />
                    <span>Edit Goal</span>
                  </button>

                  <div className="h-px bg-border my-1" />

                  <button
                    type="button"
                    onClick={handleDeleteGoal}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-sans text-danger-fg hover:bg-danger-bg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-danger-fg" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dual-Tone Micro-Gradient Progress Bar */}
        <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden my-3 p-[0.5px]">
          <div
            className={cn(
              'h-full transition-all duration-700 ease-out rounded-full shadow-xs',
              isCompleted
                ? 'bg-success-fg'
                : 'bg-gradient-to-r from-cat-tasks via-accent to-cat-routines'
            )}
            style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
          />
        </div>

        {/* Condensed Strategic Pace & Trend Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-secondary">
          <div className="flex items-center gap-1.5">
            {['stalled', 'past_due'].includes(pace.status) ? (
              <XCircle className="w-3.5 h-3.5 text-danger-fg shrink-0" />
            ) : pace.status === 'behind' ? (
              <AlertCircle className="w-3.5 h-3.5 text-warning-fg shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-success-fg shrink-0" />
            )}
            <span
              className={cn(
                'font-bold uppercase tracking-wider',
                ['stalled', 'past_due'].includes(pace.status)
                  ? 'text-danger-fg'
                  : pace.status === 'behind'
                  ? 'text-warning-fg'
                  : 'text-primary'
              )}
            >
              {pace.badge}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sparkline Progress Trend */}
            <div className="flex items-end gap-0.5 h-3.5" title="Recent momentum">
              {trendPoints.map((val, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-t-sm transition-all',
                    isCompleted ? 'bg-success-fg' : 'bg-accent'
                  )}
                  style={{ height: `${Math.max(15, Math.round((val / 100) * 100))}%` }}
                />
              ))}
            </div>

            {pace.projectedDate && (
              <span className="text-[10px] hidden sm:inline text-secondary">
                Est: <b className="text-primary">{pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</b>
              </span>
            )}
          </div>
        </div>

        {/* Linked Initiatives & Daily Habits Chips */}
        {(linkedProjects.length > 0 || linkedHabits.length > 0) && (
          <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap items-center gap-1.5">
            {linkedProjects.map((proj: any) => (
              <button
                key={proj.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/projects/${proj.id}`);
                }}
                className="px-2 py-0.5 rounded-md bg-cat-projects-bg hover:bg-cat-projects-bg/80 border border-cat-projects/20 text-[10px] font-medium text-cat-projects transition-all flex items-center gap-1 cursor-pointer"
              >
                <FolderKanban className="w-2.5 h-2.5" />
                <span>{proj.name}</span>
              </button>
            ))}

            {linkedHabits.map((h: any) => (
              <div
                key={h.id}
                className="px-2 py-0.5 rounded-md bg-warning-bg/40 hover:bg-warning-bg border border-warning-border text-[10px] font-medium text-warning-fg transition-all flex items-center gap-1.5"
                title={`${h.name} · ${h.streak || 0}d streak`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/habits?goalId=${goal.id}`);
                  }}
                  className="flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Flame className="w-2.5 h-2.5" />
                  <span>{h.name}</span>
                  {h.streak > 0 && <span className="text-[9px] opacity-80">🔥{h.streak}d</span>}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    logHabitMutation.mutate(h.id);
                  }}
                  disabled={logHabitMutation.isPending}
                  className="px-1.5 py-0.5 rounded bg-success-bg text-success-fg hover:bg-success-bg/80 border border-success-border transition-all font-mono font-bold text-[9px] cursor-pointer"
                  title="Log habit complete for today"
                >
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recursive Child Milestones */}
      {hasChildren && isExpanded && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {goal.childGoals!.map((child: GoalWithRelations, index: number) => (
            <GoalCard
              key={child.id}
              goal={child}
              depth={depth + 1}
              isLastChild={index === goal.childGoals!.length - 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onOpenDetail={onOpenDetail}
              projects={projects}
              allHabits={allHabits}
            />
          ))}
        </div>
      )}
    </div>
  );
});
