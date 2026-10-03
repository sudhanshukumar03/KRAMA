import React, { useState, useEffect } from 'react';
import { Target, X, Zap, Star, FolderKanban, Activity } from 'lucide-react';
import { BaseButton } from '../ui/BaseButton';
import { IconPicker } from '../ui/IconPicker';
import { cn } from '../../lib/utils';
import { LIFE_PILLARS, type GoalStatus } from './goalConstants';
import type { GoalWithRelations } from '../../types/schema';

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    type: string;
    progress?: number;
    targetDate: string;
    icon?: string;
    parentGoalId?: string | null;
    status?: GoalStatus;
    metadata?: Record<string, any>;
    selectedProjectIds?: string[];
    selectedHabitIds?: string[];
  }) => void;
  isSubmitting: boolean;
  initialData?: GoalWithRelations | null;
  parentGoal?: { id: string; title: string } | null;
  defaultPillar?: string;
  projects?: any[];
  allHabits?: any[];
}

export function GoalFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  parentGoal,
  defaultPillar,
  projects = [],
  allHabits = [],
}: GoalFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [whyStatement, setWhyStatement] = useState('');
  const [category, setCategory] = useState<string>('health');
  const [icon, setIcon] = useState<string | null>('Target');
  const [type, setType] = useState('quarterly');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GoalStatus>('ACTIVE');
  const [progressMode, setProgressMode] = useState<'manual' | 'auto'>('manual');
  const [measurable, setMeasurable] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [unit, setUnit] = useState('');
  const [weight, setWeight] = useState('1');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
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
        const rawStatus = (
          (initialData as any).metadata?.status ||
          (initialData as any).status ||
          'ACTIVE'
        ) as string;
        setStatus(rawStatus as GoalStatus);
        const md = ((initialData as any).metadata || {}) as Record<string, any>;
        setDescription(md.description || '');
        setWhyStatement(md.whyStatement || '');
        setCategory(md.category || 'health');
        setIsPinned(Boolean(md.isPinned));
        setProgressMode(md.progressMode === 'auto' ? 'auto' : 'manual');
        setMeasurable(Boolean(md.measurable));
        setTargetValue(md.targetValue != null ? String(md.targetValue) : '');
        setCurrentValue(md.currentValue != null ? String(md.currentValue) : '');
        setUnit(md.unit || '');
        setWeight(md.weight != null ? String(md.weight) : '1');
        setSelectedProjectIds(
          projects.filter((p: any) => p.goalId === initialData.id).map((p: any) => p.id)
        );
        setSelectedHabitIds(
          allHabits.filter((h: any) => h.linkedGoalId === initialData.id).map((h: any) => h.id)
        );
        if (initialData.targetDate) {
          setTargetDate(new Date(initialData.targetDate).toISOString().split('T')[0]);
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 90);
          setTargetDate(d.toISOString().split('T')[0]);
        }
      } else {
        setTitle('');
        setDescription('');
        setWhyStatement('');
        setCategory(defaultPillar && defaultPillar !== 'all' ? defaultPillar : 'health');
        setIcon('Target');
        setType('quarterly');
        setProgress(0);
        setStatus('ACTIVE');
        setProgressMode('manual');
        setMeasurable(false);
        setTargetValue('');
        setCurrentValue('');
        setUnit('');
        setWeight('1');
        setIsPinned(false);
        setSelectedProjectIds([]);
        setSelectedHabitIds([]);
        const d = new Date();
        d.setDate(d.getDate() + (parentGoal ? 60 : 90));
        setTargetDate(d.toISOString().split('T')[0]);
      }
    }
  }, [open, initialData, parentGoal, defaultPillar, projects, allHabits]);

  if (!open) return null;

  const targetNum = Number(targetValue);
  const currentNum = Number(currentValue);
  const measurableProgress =
    measurable && Number.isFinite(targetNum) && targetNum > 0
      ? Math.max(0, Math.min(100, Math.round((currentNum / targetNum) * 100)))
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const w = Number(weight);
    const existingMeta = ((initialData as any)?.metadata || {}) as Record<string, any>;
    const metadata: Record<string, any> = {
      ...existingMeta,
      description: description.trim() || null,
      whyStatement: whyStatement.trim() || null,
      category,
      isPinned,
      progressMode,
      measurable,
      targetValue: measurable && targetValue !== '' ? targetNum : null,
      currentValue: measurable && currentValue !== '' ? currentNum : null,
      unit: measurable ? unit.trim() || null : null,
      weight: Number.isFinite(w) && w > 0 ? w : 1,
    };

    const finalProgress =
      status === 'COMPLETED'
        ? 100
        : progressMode === 'manual' && measurableProgress !== null
        ? measurableProgress
        : progress;

    onSubmit({
      title: title.trim(),
      icon: icon || undefined,
      type,
      progress: finalProgress,
      status,
      targetDate,
      metadata,
      parentGoalId: parentGoal?.id || initialData?.parentGoalId || null,
      selectedProjectIds,
      selectedHabitIds,
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
        onClick={(e) => e.stopPropagation()}
        className="krama-dialog w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-b from-surface/80 to-surface/40 overflow-hidden">
          {/* Ambient Top Glow Line */}
          <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-accent via-accent-hover to-transparent" />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-subtle text-accent-fg border border-accent/20 flex items-center justify-center shadow-2xs">
              <Target className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary tracking-tight">
                {isEditMode ? 'Edit Goal' : parentGoal ? 'Add Key Result / Milestone' : 'New Life Aspiration'}
              </h3>
              {parentGoal && (
                <p className="text-[11px] text-secondary truncate max-w-[280px] font-mono">
                  Under: {parentGoal.title}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title + Icon */}
          <div className="flex gap-2.5 items-end">
            <IconPicker
              id="goal-form-icon"
              value={icon || 'Target'}
              onChange={setIcon}
              triggerClassName="w-10 h-10 px-0 py-0"
            />
            <div className="flex-1">
              <label
                htmlFor="goal-title-input"
                className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1"
              >
                {parentGoal ? 'Key Result Title' : 'Aspiration / Goal Title'}{' '}
                <span className="text-danger-fg font-bold">*</span>
              </label>
              <input
                type="text"
                id="goal-title-input"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  parentGoal
                    ? 'e.g. Reach 5,000 active beta users'
                    : 'e.g. Scale Krama OS to 10,000 Users'
                }
                required
                autoFocus
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-shadow"
              />
            </div>
          </div>

          {/* Life Pillar (For root aspirations) */}
          {!parentGoal && (
            <div>
              <label className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1.5">
                Life Architecture Pillar
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {LIFE_PILLARS.filter((p) => p.id !== 'all').map((p) => {
                  const PillarIcon = p.icon;
                  const isSelected = category === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCategory(p.id)}
                      className={cn(
                        'px-2.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer text-left',
                        isSelected
                          ? cn('border-2 font-bold shadow-xs', p.color)
                          : 'bg-surface hover:bg-surface-hover border-border text-secondary hover:text-primary'
                      )}
                    >
                      <PillarIcon
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 stroke-[2]',
                          isSelected ? '' : 'text-secondary'
                        )}
                      />
                      <span className="truncate">{p.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Motivation / Purpose */}
          <div>
            <label
              htmlFor="goal-why-input"
              className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1 flex items-center justify-between"
            >
              <span>Why it matters (Core Purpose)</span>
              <span className="text-secondary/50 lowercase font-normal text-[10px]">optional</span>
            </label>
            <input
              type="text"
              id="goal-why-input"
              name="whyStatement"
              value={whyStatement}
              onChange={(e) => setWhyStatement(e.target.value)}
              placeholder="e.g. To achieve creative autonomy and financial freedom..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Timeline & Cadence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="goal-horizon-select"
                className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1"
              >
                Strategic Cadence
              </label>
              <select
                id="goal-horizon-select"
                name="type"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-xs text-primary bg-surface focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="quarterly">Quarterly Sprint (90d)</option>
                <option value="monthly">Monthly Milestone (30d)</option>
                <option value="yearly">Annual Vision (1yr)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="goal-target-date-input"
                className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1"
              >
                Target Date
              </label>
              <input
                type="date"
                id="goal-target-date-input"
                name="targetDate"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-xs text-primary bg-surface focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          {/* Measurable Target Metric Toggle */}
          <div className="pt-2 border-t border-border/70">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono font-medium text-secondary uppercase flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={measurable}
                  onChange={(e) => setMeasurable(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent accent-accent"
                />
                <span>Track Numeric Metric (Target & Current)</span>
              </label>
              {measurableProgress !== null && (
                <span className="text-[11px] font-mono font-bold text-accent-fg">
                  {measurableProgress}% Progress
                </span>
              )}
            </div>

            {measurable && (
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-surface-hover/50 border border-border animate-in fade-in duration-150">
                <div>
                  <span className="block text-[10px] font-mono text-secondary uppercase mb-1">
                    Current
                  </span>
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="0"
                    className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-secondary uppercase mb-1">
                    Target
                  </span>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                    className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-secondary uppercase mb-1">
                    Unit
                  </span>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="users, km, $"
                    className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Progress Mode & Strategic Weight / Pinning */}
          <div className="pt-2 border-t border-border/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-secondary uppercase">
                Progress Mode
              </span>
              <div className="flex items-center gap-3 text-xs font-mono">
                <label className="flex items-center gap-1.5 cursor-pointer text-secondary hover:text-primary">
                  <input
                    type="radio"
                    name="progressMode"
                    value="manual"
                    checked={progressMode === 'manual'}
                    onChange={() => setProgressMode('manual')}
                    className="accent-accent"
                  />
                  <span>Manual</span>
                </label>
                <label
                  className="flex items-center gap-1.5 cursor-pointer text-secondary hover:text-primary"
                  title="Derives progress automatically from tasks in connected projects"
                >
                  <input
                    type="radio"
                    name="progressMode"
                    value="auto"
                    checked={progressMode === 'auto'}
                    onChange={() => setProgressMode('auto')}
                    className="accent-accent"
                  />
                  <span className="flex items-center gap-1 text-accent-fg font-semibold">
                    <Zap className="w-3 h-3" /> Auto from Tasks
                  </span>
                </label>
              </div>
            </div>

            {/* Weight for Key Results */}
            {parentGoal || initialData?.parentGoalId ? (
              <div className="flex items-center justify-between pt-1">
                <label className="text-[11px] font-mono font-medium text-secondary uppercase">
                  OKR Rollup Weight
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-16 bg-surface border border-border rounded-md px-2 py-1 text-xs font-mono text-primary text-center focus:outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-secondary font-mono">weight (default: 1)</span>
                </div>
              </div>
            ) : (
              /* Pin to Spotlight for Root Goals */
              <label className="flex items-center gap-2 text-xs text-secondary hover:text-primary cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-border text-warning-fg accent-warning-fg"
                />
                <span className="flex items-center gap-1.5">
                  <Star className={cn('w-3.5 h-3.5', isPinned ? 'text-warning-fg fill-warning-fg' : 'text-secondary')} />
                  <span>Pin to Focus Spotlight</span>
                </span>
              </label>
            )}
          </div>

          {/* Connected Initiatives & Habits Selection */}
          {(projects.length > 0 || allHabits.length > 0) && (
            <div className="pt-2 border-t border-border/70 space-y-3">
              {projects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-cat-projects" /> Connected Projects
                    </span>
                    <span className="text-secondary/60 text-[10px]">
                      {selectedProjectIds.length} selected
                    </span>
                  </label>
                  <div className="max-h-24 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 space-y-1">
                    {projects.map((proj: any) => {
                      const checked = selectedProjectIds.includes(proj.id);
                      return (
                        <label
                          key={proj.id}
                          className="flex items-center gap-2 text-xs text-primary hover:bg-surface-hover px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedProjectIds([...selectedProjectIds, proj.id]);
                              else setSelectedProjectIds(selectedProjectIds.filter((id) => id !== proj.id));
                            }}
                            className="rounded border-border text-accent accent-accent"
                          />
                          <span className="truncate flex-1 font-medium">{proj.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {allHabits.length > 0 && (
                <div>
                  <label className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cat-routines" /> Connected Daily Habits
                    </span>
                    <span className="text-secondary/60 text-[10px]">
                      {selectedHabitIds.length} selected
                    </span>
                  </label>
                  <div className="max-h-24 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 space-y-1">
                    {allHabits.map((habit: any) => {
                      const checked = selectedHabitIds.includes(habit.id);
                      return (
                        <label
                          key={habit.id}
                          className="flex items-center gap-2 text-xs text-primary hover:bg-surface-hover px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedHabitIds([...selectedHabitIds, habit.id]);
                              else setSelectedHabitIds(selectedHabitIds.filter((id) => id !== habit.id));
                            }}
                            className="rounded border-border text-accent accent-accent"
                          />
                          <span className="truncate flex-1 font-medium">{habit.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit-only fields: Status & Manual Progress */}
          {isEditMode && (
            <div className="pt-3 border-t border-border/70 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="modal-status"
                    className="block text-[11px] font-mono font-medium text-secondary uppercase mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="modal-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GoalStatus)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs text-primary bg-surface focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="ACTIVE">🟢 Active</option>
                    <option value="PAUSED">🟡 Paused</option>
                    <option value="COMPLETED">✅ Completed</option>
                    <option value="CANCELED">🔴 Canceled</option>
                  </select>
                </div>

                {!measurable && progressMode === 'manual' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="modal-slider-prog"
                        className="text-[11px] font-mono font-medium text-secondary uppercase"
                      >
                        Progress
                      </label>
                      <span className="text-[11px] font-mono font-bold text-accent-fg">
                        {progress}%
                      </span>
                    </div>
                    <input
                      type="range"
                      id="modal-slider-prog"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-border flex justify-end gap-2.5">
            <BaseButton
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting
                ? 'Saving...'
                : isEditMode
                ? 'Save Changes'
                : parentGoal
                ? 'Add Key Result'
                : 'Create Aspiration'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}
