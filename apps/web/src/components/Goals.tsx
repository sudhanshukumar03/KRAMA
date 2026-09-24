import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, Calendar, AlertCircle, ArrowUpCircle, XCircle, Plus, X, Sparkles, Pencil, FolderKanban, ArrowRight, Activity } from 'lucide-react';
import { ConfirmDeleteButton } from './ui/ConfirmDeleteButton';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import type { GoalWithRelations } from '../types/schema';
import { computeGoalPace } from '../lib/goalUtils';
import { toast } from 'sonner';
import { IconPicker } from './ui/IconPicker';
import { resolveIcon } from '../lib/iconResolver';

type GoalStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED';

interface GoalCardProps {
  goal: GoalWithRelations;
  depth?: number;
  onAddChild?: (parentGoal: GoalWithRelations) => void;
  onEdit?: (goal: GoalWithRelations) => void;
  projects?: any[];
}

function GoalCard({ goal, depth = 0, onAddChild, onEdit, projects = [] }: GoalCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pace = computeGoalPace(goal);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [sliderVal, setSliderVal] = useState(goal.progress);

  const linkedProjects = (projects || []).filter((p: any) => p.goalId === goal.id);

  useEffect(() => {
    setSliderVal(goal.progress);
  }, [goal.progress]);

  const updateGoalMutation = useMutation({
    mutationFn: (newProgress: number) => api.goals.update(goal.id, { progress: newProgress, version: goal.version }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsEditingProgress(false);
    },
    onError: (err: any) => {
      toast.error('Failed to update goal progress: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  });

  const handleDeleteGoal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.goals.delete(goal.id);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(`Deleted "${goal.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.goals.restore(goal.id);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            toast.success(`Restored "${goal.title}"`);
          }
        }
      });
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  // Historical points for the mini trendline from live PostgreSQL snapshots
  const sortedSnapshots = (goal.snapshots && goal.snapshots.length > 0)
    ? [...goal.snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];
  const trendPoints = sortedSnapshots.length > 0
    ? sortedSnapshots.slice(-7).map(s => s.progress)
    : [0, goal.progress];

  const GoalIcon = resolveIcon(goal.icon || 'Target');
  const hasChildren = Boolean(goal.childGoals && goal.childGoals.length > 0);
  const krAverage = hasChildren
    ? Math.round(goal.childGoals!.reduce((acc, c) => acc + c.progress, 0) / goal.childGoals!.length)
    : 0;

  return (
    <div className="flex flex-col mb-4 group/goal">
      <div 
        className={cn("v4-card p-5 transition-all duration-200 hover:border-accent relative overflow-hidden",
          depth > 0 && "border-l-4 border-l-border-strong rounded-l-none bg-surface-hover/60",
          depth === 0 && "border-l-2 border-l-accent"
        )}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0">
              <GoalIcon className="w-5 h-5 stroke-[1.75]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.02em] text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-2 py-0.5 rounded">
                  {depth > 0 ? 'Key Result' : (goal.type === 'quarterly' || goal.type === 'yearly' ? `${goal.type} OKR` : goal.type)}
                </span>
                {/* Feature #2: Status badge chips for non-active states */}
                {((goal as any).metadata?.status === 'PAUSED' || (goal as any).status === 'PAUSED') && (
                  <span className="text-[10px] font-mono font-bold uppercase bg-warning-bg text-warning-fg border border-warning-border px-2 py-0.5 rounded">
                    Paused
                  </span>
                )}
                {((goal as any).metadata?.status === 'CANCELED' || (goal as any).status === 'CANCELED') && (
                  <span className="text-[10px] font-mono font-bold uppercase bg-danger-bg text-danger-fg border border-danger-border px-2 py-0.5 rounded">
                    Canceled
                  </span>
                )}
                <h3 className="text-base font-semibold text-primary group-hover/goal:text-[#0D9488] transition-colors">
                  {goal.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-caption text-secondary font-mono">
                {goal.targetDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 stroke-[1.5]" />
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                    <span className={cn("px-1.5 py-0.2 rounded text-[10px]",
                      pace.daysRemaining > 0 ? "bg-surface-hover text-secondary" : "bg-red-500/10 text-[#DC2626] font-medium"
                    )}>
                      {pace.daysRemaining > 0 ? `${pace.daysRemaining}d left` : "Past due"}
                    </span>
                  </div>
                )}

                {hasChildren && (
                  <span className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 px-1.5 py-0.5 rounded text-[10px]">
                    {goal.childGoals!.length} Key Result{goal.childGoals!.length > 1 ? 's' : ''} (Avg: {krAverage}%)
                  </span>
                )}

                {((goal._count?.projects ?? 0) > 0 || (goal._count?.habits ?? 0) > 0) && (
                  <div className="flex items-center gap-2">
                    {(goal._count?.projects ?? 0) > 0 && (
                      <span className="bg-surface-hover px-1.5 py-0.5 rounded text-[10px]">
                        {goal._count?.projects} project{(goal._count?.projects ?? 0) !== 1 ? 's' : ''}
                      </span>
                    )}
                    {(goal._count?.habits ?? 0) > 0 && (
                      <span className="bg-surface-hover px-1.5 py-0.5 rounded text-[10px]">
                        {goal._count?.habits} habit{(goal._count?.habits ?? 0) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
            {depth < 2 && (
              <button 
                type="button"
                onClick={() => onAddChild?.(goal)}
                className="px-2 py-1 rounded-md bg-surface-hover hover:bg-[#0D9488]/10 text-secondary hover:text-[#0D9488] border border-border text-caption font-medium transition-colors shadow-2xs flex items-center gap-1"
                title="Add Key Result under this Objective"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Key Result</span>
              </button>
            )}

            <button 
              type="button"
              onClick={() => onEdit?.(goal)}
              className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-surface-hover border border-transparent hover:border-border transition-colors"
              title="Edit Goal"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Interactive Progress Editor Toggle */}
            <button 
              type="button"
              onClick={() => setIsEditingProgress(!isEditingProgress)}
              className="px-2.5 py-1 rounded-md bg-surface-hover hover:bg-[#0D9488]/10 text-secondary hover:text-[#0D9488] border border-border text-caption font-medium transition-colors shadow-2xs"
            >
              {isEditingProgress ? 'Done' : 'Update Pace'}
            </button>
            <span className={cn("text-2xl font-bold font-mono tracking-tight",
              goal.progress >= 100 ? "text-[#0D9488]" : "text-primary"
            )}>
              {goal.progress}%
            </span>
            <ConfirmDeleteButton
              onConfirm={handleDeleteGoal}
              className="opacity-70 sm:opacity-0 sm:group-hover/goal:opacity-100 ml-1 transition-opacity"
              iconClassName="w-4 h-4"
            />
          </div>
        </div>
        
        {/* Progress Bar or Slider */}
        {isEditingProgress ? (
          <div className="mb-4 p-3.5 bg-surface-hover rounded-xl border border-[#0D9488]/30 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-caption font-mono text-secondary mb-2">
              <div className="flex items-center gap-3">
                <span>Adjust completion percentage:</span>
                {hasChildren && (
                  <span className="text-[11px] text-success-fg font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-synced from KRs ({krAverage}%)
                  </span>
                )}
              </div>
              <span className="font-bold text-[#0D9488] text-body">{sliderVal}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sliderVal} 
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="w-full accent-[#0D9488] cursor-pointer" 
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-secondary mr-1">Quick:</span>
                {[0, 25, 50, 75, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSliderVal(val)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono border transition-all",
                      sliderVal === val 
                        ? "bg-[#0D9488] text-white border-[#0D9488] font-bold" 
                        : "bg-surface hover:bg-surface-hover text-secondary border-border"
                    )}
                  >
                    {val}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setIsEditingProgress(false)} 
                  className="px-2.5 py-1 text-caption text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={updateGoalMutation.isPending}
                  onClick={() => updateGoalMutation.mutate(sliderVal)} 
                  className="px-3 py-1 bg-[#0D9488] text-white rounded-md text-caption font-medium hover:bg-[#0F766E] disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {updateGoalMutation.isPending ? 'Saving...' : 'Save Snapshot'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden mb-4">
            <div 
              className={cn("h-full transition-all duration-500 ease-out",
                goal.progress >= 100 ? "bg-success-fg" : "bg-accent"
              )} 
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        )}

        {/* Pace Panel with Mini Trendline */}
        <div className="bg-surface-hover border border-border rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-[#DC2626] stroke-[1.75]" /> :
              pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-[#DC2626] stroke-[1.75]" /> :
              pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#0D9488] stroke-[1.75]" /> :
              <CheckCircle2 className="w-4 h-4 text-[#0D9488] stroke-[1.75]" />}
              <span className={cn("text-caption font-mono font-bold uppercase tracking-[0.02em]",
                ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-[#DC2626]" : "text-primary"
              )}>
                {pace.badge}
              </span>
            </div>

            <div className="flex items-center gap-3 text-caption text-secondary font-mono">
              <span>Req: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(1)}%/d</span>
              <span>Act: {pace.actualPace.toFixed(1)}%/d</span>
            </div>
          </div>

          {/* Mini Trendline Sparkline & Projection */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-border/60">
            <div className="flex items-end gap-1 h-5 px-2 bg-card border border-border rounded shadow-2xs" title="Recent progress snapshot trend">
              {trendPoints.map((val, i) => (
                <div 
                  key={i} 
                  title={`Snapshot: ${val}%`}
                  className="w-1.5 bg-[#0D9488] rounded-t-2xs transition-all hover:opacity-80" 
                  style={{ height: `${Math.max(12, Math.round((val / 100) * 100))}%` }} 
                />
              ))}
            </div>

            <div className="text-caption font-medium text-primary">
              {pace.status === 'completed' ? (
                <span className="text-[#0D9488] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Goal Achieved!
                </span>
              ) : pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
                <span className="text-secondary font-normal">Stalled progress</span>
              ) : pace.projectedDate ? (
                <span className="font-mono">Est: <b className="font-bold text-[#0D9488]">{pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</b></span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Linked Initiatives (Projects) */}
        {linkedProjects.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/70 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary flex items-center gap-1 shrink-0">
              <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
              Linked Initiatives ({linkedProjects.length}):
            </span>
            {linkedProjects.map((proj: any) => {
              const taskCount = proj._count?.tasks ?? (proj.tasks?.length || 0);
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/projects/${proj.id}`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-hover hover:bg-accent-subtle hover:border-accent/30 border border-border text-primary hover:text-accent-fg text-caption font-sans font-medium transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="font-semibold">{proj.name}</span>
                  <span className="text-[10px] font-mono text-secondary">
                    {taskCount} {taskCount === 1 ? 'ticket' : 'tickets'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-accent-fg group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })}
          </div>
        )}

        {/* Feature #3: Linked Habits display */}
        {(goal._count?.habits ?? 0) > 0 && (
          <div className="mt-2 pt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary flex items-center gap-1 shrink-0">
              <Activity className="w-3.5 h-3.5 text-orange-500" />
              Linked Habits ({goal._count?.habits}):
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/app/habits?goalId=${goal.id}`); }}
              className="px-2.5 py-1 rounded-lg bg-warning-bg hover:bg-warning-bg/80 border border-warning-border text-warning-fg text-caption font-medium transition-all flex items-center gap-1.5"
            >
              View Habits <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      
      {/* Child Goals */}
      {goal.childGoals && goal.childGoals.length > 0 && (
        <div className="mt-3 pl-6 md:pl-10 space-y-3">
          {goal.childGoals.map((child: GoalWithRelations) => (
            <GoalCard 
              key={child.id} 
              goal={child} 
              depth={depth + 1} 
              onAddChild={onAddChild} 
              onEdit={onEdit} 
              projects={projects}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; type: string; progress?: number; targetDate: string; icon?: string; parentGoalId?: string | null; status?: GoalStatus }) => void;
  isSubmitting: boolean;
  initialData?: GoalWithRelations | null;
  parentGoal?: { id: string; title: string } | null;
}

function GoalFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  parentGoal
}: GoalFormModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string | null>('Target');
  const [type, setType] = useState('quarterly');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GoalStatus>('ACTIVE');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  });

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setIcon(initialData.icon || 'Target');
        setType(initialData.type || 'quarterly');
        setProgress(initialData.progress || 0);
        // Pre-fill status from metadata or status field; COMPLETED goals show as ACTIVE in the edit modal
        const rawStatus = ((initialData as any).metadata?.status || (initialData as any).status || 'ACTIVE') as string;
        setStatus((rawStatus === 'COMPLETED' ? 'ACTIVE' : rawStatus) as GoalStatus);
        if (initialData.targetDate) {
          setTargetDate(new Date(initialData.targetDate).toISOString().split('T')[0]);
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 90);
          setTargetDate(d.toISOString().split('T')[0]);
        }
      } else {
        setTitle('');
        setIcon('Target');
        setType(parentGoal ? 'quarterly' : 'quarterly');
        setProgress(0);
        setStatus('ACTIVE');
        const d = new Date();
        d.setDate(d.getDate() + (parentGoal ? 60 : 90));
        setTargetDate(d.toISOString().split('T')[0]);
      }
    }
  }, [open, initialData, parentGoal]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      icon: icon || undefined,
      type,
      progress,
      status,
      targetDate,
      parentGoalId: parentGoal?.id || initialData?.parentGoalId || null
    });
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    const d = new Date();
    if (newType === 'monthly') d.setDate(d.getDate() + 30);
    else if (newType === 'quarterly') d.setDate(d.getDate() + 90);
    else if (newType === 'yearly') d.setFullYear(d.getFullYear() + 1);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <Target className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">
                {isEditMode ? 'Edit Goal' : parentGoal ? `Add Key Result` : 'Create New Goal'}
              </h3>
              {parentGoal && (
                <p className="text-xs text-secondary truncate max-w-sm">
                  Objective: {parentGoal.title}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3">
            <div>
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                Icon
              </label>
              <IconPicker
                value={icon || 'Target'}
                onChange={setIcon}
                triggerClassName="w-10 h-10 px-0 py-0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                {parentGoal ? 'Key Result Title' : 'Objective Title'} <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={parentGoal ? 'e.g., Achieve 99.9% uptime across clusters' : 'e.g., Ship Krama OS v1.0 Public Beta'}
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488] transition-shadow"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                Strategic Horizon
              </label>
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition-all"
              >
                <option value="quarterly">Quarterly OKR (90 Days)</option>
                <option value="yearly">Annual OKR (1 Year)</option>
                <option value="monthly">Monthly Objective (30 Days)</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition-all"
              />
            </div>
          </div>

          {/* Feature #5: Progress editable in both create AND edit modes */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-caption font-mono font-medium text-secondary uppercase">
                {isEditMode ? 'Progress' : 'Initial Progress'}
              </label>
              <span className="text-caption font-mono font-bold text-[#0D9488]">{progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-[#0D9488] cursor-pointer"
            />
          </div>

          {/* Feature #2: Status selector */}
          <div>
            <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as GoalStatus)}
              className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition-all"
            >
              <option value="ACTIVE">🟢 Active</option>
              <option value="PAUSED">🟡 Paused</option>
              <option value="CANCELED">🔴 Canceled</option>
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : parentGoal ? 'Add Key Result' : 'Create Goal')}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Goals() {
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'canceled' | 'completed'>('all');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [parentGoalForModal, setParentGoalForModal] = useState<{ id: string; title: string } | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalWithRelations | null>(null);

  const createGoalMutation = useMutation({
    mutationFn: (data: {
      title: string;
      type: string;
      progress?: number;
      status?: string;
      targetDate: string;
      icon?: string;
      parentGoalId?: string | null;
    }) =>
      api.goals.create({
        title: data.title,
        type: data.type,
        status: data.status || 'ACTIVE',
        progress: data.progress ?? 0,
        icon: data.icon,
        parentGoalId: data.parentGoalId || null,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
      }),
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setFormModalOpen(false);
      setParentGoalForModal(null);
      toast.success(`Created "${newGoal?.title || 'Goal'}"`);
    },
    onError: () => {
      toast.error('Failed to create goal');
    }
  });

  const updateGoalDetailsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.goals.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setFormModalOpen(false);
      setEditingGoal(null);
      toast.success('Goal updated successfully');
    },
    onError: () => {
      toast.error('Failed to update goal');
    }
  });

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setParentGoalForModal(null);
    setFormModalOpen(true);
  };

  const handleAddChild = (parent: GoalWithRelations) => {
    setEditingGoal(null);
    setParentGoalForModal({ id: parent.id, title: parent.title });
    setFormModalOpen(true);
  };

  const handleEdit = (goal: GoalWithRelations) => {
    setParentGoalForModal(null);
    setEditingGoal(goal);
    setFormModalOpen(true);
  };

  const handleModalSubmit = (data: any) => {
    if (editingGoal) {
      updateGoalDetailsMutation.mutate({
        id: editingGoal.id,
        data: {
          title: data.title,
          type: data.type,
          icon: data.icon,
          progress: data.progress,
          status: data.status,
          version: editingGoal.version,
          targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        }
      });
    } else {
      createGoalMutation.mutate(data);
    }
  };

  const rootGoals = useMemo(() => goals.filter(g => !g.parentGoalId), [goals]);

  const getGoalStatus = (g: GoalWithRelations): GoalStatus =>
    (((g as any).metadata?.status || (g as any).status || 'ACTIVE') as GoalStatus);

  const activeCount = useMemo(() => rootGoals.filter(g => g.progress < 100 && getGoalStatus(g) === 'ACTIVE').length, [rootGoals]);
  const pausedCount = useMemo(() => rootGoals.filter(g => getGoalStatus(g) === 'PAUSED').length, [rootGoals]);
  const canceledCount = useMemo(() => rootGoals.filter(g => getGoalStatus(g) === 'CANCELED').length, [rootGoals]);
  const completedCount = useMemo(() => rootGoals.filter(g => g.progress >= 100).length, [rootGoals]);

  const filteredGoals = useMemo(() => {
    if (activeTab === 'active') return rootGoals.filter(g => g.progress < 100 && getGoalStatus(g) === 'ACTIVE');
    if (activeTab === 'paused') return rootGoals.filter(g => getGoalStatus(g) === 'PAUSED');
    if (activeTab === 'canceled') return rootGoals.filter(g => getGoalStatus(g) === 'CANCELED');
    if (activeTab === 'completed') return rootGoals.filter(g => g.progress >= 100);
    return rootGoals;
  }, [rootGoals, activeTab]);

  if (goalsLoading) {
    return <LoadingState variant="goals" title="Loading Goal..." description="Calculating OKR progress velocities and pacing..." />;
  }

  if (goalsError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Goal"
          message="Could not retrieve goals and OKR data from the server. Please verify your connection."
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-canvas overflow-y-auto min-w-0 animate-in fade-in duration-150">
      {/* Top Page Header with Logo, Title, Tabs and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 text-accent-fg flex items-center justify-center shrink-0 shadow-2xs">
            <Target className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">Goals</h1>
            <p className="text-xs text-secondary mt-0.5">
              Strategic quarterly objectives, key results, and OKR pacing metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Feature #2: Extended status filter tabs */}
          <div className="flex items-center bg-surface-hover p-1 rounded-lg border border-border text-caption font-mono flex-wrap">
            <button type="button" onClick={() => setActiveTab('all')}
              className={cn("px-2.5 py-1 rounded-md transition-all", activeTab === 'all' ? "bg-card text-primary font-bold shadow-2xs" : "text-secondary hover:text-primary")}>
              All ({rootGoals.length})
            </button>
            <button type="button" onClick={() => setActiveTab('active')}
              className={cn("px-2.5 py-1 rounded-md transition-all", activeTab === 'active' ? "bg-card text-primary font-bold shadow-2xs" : "text-secondary hover:text-primary")}>
              Active ({activeCount})
            </button>
            {pausedCount > 0 && (
              <button type="button" onClick={() => setActiveTab('paused')}
                className={cn("px-2.5 py-1 rounded-md transition-all", activeTab === 'paused' ? "bg-card text-amber-600 font-bold shadow-2xs" : "text-secondary hover:text-amber-600")}>
                Paused ({pausedCount})
              </button>
            )}
            {canceledCount > 0 && (
              <button type="button" onClick={() => setActiveTab('canceled')}
                className={cn("px-2.5 py-1 rounded-md transition-all", activeTab === 'canceled' ? "bg-card text-red-600 font-bold shadow-2xs" : "text-secondary hover:text-red-500")}>
                Canceled ({canceledCount})
              </button>
            )}
            <button type="button" onClick={() => setActiveTab('completed')}
              className={cn("px-2.5 py-1 rounded-md transition-all", activeTab === 'completed' ? "bg-card text-primary font-bold shadow-2xs" : "text-secondary hover:text-primary")}>
              Completed ({completedCount})
            </button>
          </div>

          {/* Fix: hide header CTA in zero-state — EmptyState provides the primary CTA */}
          {rootGoals.length > 0 && (
            <BaseButton onClick={handleCreateGoal} className="flex items-center gap-1.5 shadow-2xs">
              <Plus className="w-4 h-4 stroke-[2]" /> New Goal
            </BaseButton>
          )}
        </div>
      </div>

      {/* Goals List (Full Width) */}
      <div className="flex-1 min-h-0">
        <div className="space-y-4">
          {filteredGoals.map(goal => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              projects={projects}
            />
          ))}
          {filteredGoals.length === 0 && (
            <div className="border border-border rounded-xl bg-surface h-64 flex items-center justify-center shadow-sm">
              <EmptyState 
                icon={Target}
                description={activeTab === 'all' ? "No goals configured yet." : `No ${activeTab} goals found.`}
                actionLabel={activeTab === 'all' ? "Create Goal" : undefined}
                onAction={activeTab === 'all' ? handleCreateGoal : undefined}
              />
            </div>
          )}
        </div>
      </div>

      <GoalFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingGoal(null);
          setParentGoalForModal(null);
        }}
        onSubmit={handleModalSubmit}
        isSubmitting={createGoalMutation.isPending || updateGoalDetailsMutation.isPending}
        initialData={editingGoal}
        parentGoal={parentGoalForModal}
      />
    </div>
  );
}
