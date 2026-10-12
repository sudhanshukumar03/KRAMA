import React, { useState, useEffect, useRef } from 'react';
import { Target, X, Zap, Star, FolderKanban, Activity } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { BaseButton } from '../ui/BaseButton';
import { IconPicker } from '../ui/IconPicker';
import { cn } from '../../lib/utils';
import { LIFE_PILLARS, type GoalStatus } from './goalConstants';
import { goalMetadata } from '../../lib/goalUtils';
import type { GoalWithRelations, ProjectWithRelations, Habit } from '../../types/schema';

export interface GoalFormModalProps {
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
    metadata?: Record<string, unknown>;
    selectedProjectIds?: string[];
    selectedHabitIds?: string[];
  }) => void;
  isSubmitting: boolean;
  initialData?: GoalWithRelations | null;
  parentGoal?: { id: string; title: string } | null;
  defaultPillar?: string;
  projects?: ProjectWithRelations[];
  allHabits?: Habit[];
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
  const dismiss = () => { if (!isSubmitting) onClose(); };
  const dialogRef = useModalA11y(open, dismiss);
  const initialId = initialData?.id;
  const parentId = parentGoal?.id;
  const initialization = useRef({ initialData, parentGoal, defaultPillar, projects, allHabits });
  initialization.current = { initialData, parentGoal, defaultPillar, projects, allHabits };

  useEffect(() => {
    const { initialData, parentGoal, defaultPillar, projects, allHabits } = initialization.current;
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setIcon(initialData.icon || 'Target');
        setType(initialData.type || 'quarterly');
        setProgress(initialData.progress || 0);
        const rawStatus = (
          goalMetadata(initialData.metadata).status ||
          'ACTIVE'
        ) as string;
        setStatus(rawStatus as GoalStatus);
        const md = goalMetadata(initialData.metadata);
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
          projects.filter((p) => p.goalId === initialData.id).map((p) => p.id)
        );
        setSelectedHabitIds(
          allHabits.filter((h) => h.linkedGoalId === initialData.id).map((h) => h.id)
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
  }, [open, initialId, parentId]);

  if (!open) return null;

  const targetNum = Number(targetValue);
  const currentNum = Number(currentValue);
  const measurableProgress =
    measurable && Number.isFinite(targetNum) && targetNum > 0
      ? Math.max(0, Math.min(100, Math.round((currentNum / targetNum) * 100)))
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !title.trim()) return;

    const w = Number(weight);
    const existingMeta = goalMetadata(initialData?.metadata);
    const metadata: Record<string, unknown> = {
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


  const fieldClass = 'krama-input w-full min-w-0 h-11 px-3 text-base sm:text-sm';
  const labelClass = 'block text-sm font-medium text-primary mb-2';
  const choiceClass = 'h-4 w-4 shrink-0 accent-accent';
  const isKeyResult = Boolean(parentGoal || initialData?.parentGoalId);

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-form-heading"
        aria-describedby="goal-form-description"
        onClick={(e) => e.stopPropagation()}
        className="krama-dialog flex flex-col w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden text-left motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-subtle text-accent-fg">
              <Target aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="goal-form-heading" className="text-base font-semibold tracking-tight text-primary sm:text-lg">
                {isEditMode ? 'Edit Goal' : parentGoal ? 'Add Key Result / Milestone' : 'New Life Aspiration'}
              </h2>
              <p id="goal-form-description" className="mt-1 text-sm text-secondary break-words">
                {parentGoal ? 'Under: ' + parentGoal.title : 'Define your outcome and connect the work that supports it.'}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close goal form"
            type="button"
            disabled={isSubmitting}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 transition-colors cursor-pointer"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        {/* Keep one scrolling body between a stable heading and submit actions. */}
        <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="flex min-h-0 flex-1 flex-col">
          <div data-goal-form-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div>
                <label htmlFor="goal-title-input" className={labelClass}>
                  {isKeyResult ? 'Key Result Title' : 'Aspiration / Goal Title'} <span className="text-danger-fg">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <IconPicker
                    id="goal-form-icon"
                    value={icon || 'Target'}
                    onChange={setIcon}
                    triggerClassName="w-11 h-11 px-0 py-0"
                    popoverClassName="left-0 right-auto sm:left-0 sm:right-auto max-w-[calc(100vw-4rem)] max-h-60 motion-reduce:animate-none"
                  />
                  <input
                    type="text"
                    id="goal-title-input"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isKeyResult ? 'e.g. Complete 12 training sessions' : 'e.g. Build a consistent training routine'}
                    required
                    className={cn(fieldClass, 'flex-1')}
                  />
                </div>
              </div>

              {!isKeyResult && (
                <fieldset className="min-w-0">
                  <legend className={labelClass}>Life pillar</legend>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LIFE_PILLARS.filter((p) => p.id !== 'all').map((p) => {
                      const PillarIcon = p.icon;
                      const isSelected = category === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setCategory(p.id)}
                          className={cn(
                            'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors cursor-pointer',
                            isSelected ? cn('font-semibold', p.color) : 'bg-surface hover:bg-surface-hover border-border text-secondary hover:text-primary'
                          )}
                        >
                          <PillarIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span>{p.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div>
                <label htmlFor="goal-why-input" className={cn(labelClass, 'flex items-center justify-between gap-2')}>
                  <span>Why it matters</span>
                  <span className="text-xs font-normal text-secondary">Optional</span>
                </label>
                <input
                  type="text"
                  id="goal-why-input"
                  name="whyStatement"
                  aria-label="Why this matters"
                  value={whyStatement}
                  onChange={(e) => setWhyStatement(e.target.value)}
                  placeholder="What will achieving this change for you?"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="goal-horizon-select" className={labelClass}>Time horizon</label>
                  <select
                    id="goal-horizon-select"
                    name="type"
                    aria-label="Goal horizon"
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className={cn(fieldClass, 'cursor-pointer')}
                  >
                    <option value="quarterly">Quarterly Sprint (90d)</option>
                    <option value="monthly">Monthly Milestone (30d)</option>
                    <option value="yearly">Annual Vision (1yr)</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="goal-target-date-input" className={labelClass}>Target date</label>
                  <input
                    type="date"
                    id="goal-target-date-input"
                    name="targetDate"
                    aria-label="Target date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <section aria-labelledby="goal-progress-heading" className="mt-6 border-t border-border pt-5">
              <h3 id="goal-progress-heading" className="text-sm font-semibold text-primary">Progress &amp; focus</h3>
              <fieldset className="mt-4 min-w-0">
                <legend className="mb-2 text-sm text-secondary">How should progress update?</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(['manual', 'auto'] as const).map((mode) => (
                    <label
                      key={mode}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl border px-3 py-3 text-sm cursor-pointer transition-colors',
                        progressMode === mode ? 'border-accent/30 bg-accent-subtle text-accent-fg' : 'border-border text-secondary hover:bg-surface-hover'
                      )}
                    >
                      <input
                        type="radio"
                        name="progressMode"
                        value={mode}
                        checked={progressMode === mode}
                        onChange={() => setProgressMode(mode)}
                        className={choiceClass}
                      />
                      {mode === 'auto' && <Zap aria-hidden="true" className="h-4 w-4 shrink-0" />}
                      <span className="font-medium">{mode === 'manual' ? 'Manual' : 'Auto from Tasks'}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-secondary">
                  {progressMode === 'auto' ? 'Progress comes from completed tasks in connected projects.' : 'Update progress yourself, or track a numeric target below.'}
                </p>
              </fieldset>

              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3">
                  <label className="flex min-h-11 items-center gap-3 text-sm text-primary cursor-pointer">
                    <input type="checkbox" checked={measurable} onChange={(e) => setMeasurable(e.target.checked)} className={choiceClass} />
                    <span>Track Numeric Metric (Target &amp; Current)</span>
                  </label>
                  {measurableProgress !== null && (
                    <span className="text-xs font-mono font-semibold text-accent-fg">{measurableProgress}% Progress</span>
                  )}
                </div>
                {measurable && (
                  <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-border bg-canvas p-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <label htmlFor="goal-current-value" className={labelClass}>Current</label>
                      <input id="goal-current-value" type="number" aria-label="Current value" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0" className={fieldClass} />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="goal-target-value" className={labelClass}>Target</label>
                      <input id="goal-target-value" type="number" aria-label="Target value" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="100" className={fieldClass} />
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <label htmlFor="goal-metric-unit" className={labelClass}>Unit</label>
                      <input id="goal-metric-unit" type="text" aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="sessions, km, users" className={fieldClass} />
                    </div>
                  </div>
                )}
              </div>

              {isKeyResult ? (
                <div className="mt-4">
                  <label htmlFor="goal-weight" className={labelClass}>Key result weight</label>
                  <div className="flex items-center gap-3">
                    <input id="goal-weight" type="number" min="1" max="10" aria-label="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} className={cn(fieldClass, 'w-20 font-mono')} />
                    <span className="text-xs text-secondary">Contribution to the parent goal, from 1 to 10.</span>
                  </div>
                </div>
              ) : (
                <label className="mt-2 flex min-h-11 items-center gap-3 text-sm text-primary cursor-pointer">
                  <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className={choiceClass} />
                  <Star aria-hidden="true" className={cn('h-4 w-4 shrink-0', isPinned ? 'text-warning-fg fill-warning-fg' : 'text-secondary')} />
                  <span>Pin to Focus Spotlight</span>
                </label>
              )}

              {isEditMode && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="modal-status" className={labelClass}>Status</label>
                    <select id="modal-status" value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)} className={fieldClass}>
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELED">Canceled</option>
                    </select>
                  </div>
                  {!measurable && progressMode === 'manual' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label htmlFor="modal-slider-prog" className="text-sm font-medium text-primary">Progress</label>
                        <span className="text-xs font-mono font-semibold text-accent-fg">{progress}%</span>
                      </div>
                      <input type="range" id="modal-slider-prog" min="0" max="100" aria-label="Progress" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="h-11 w-full accent-accent cursor-pointer" />
                    </div>
                  )}
                </div>
              )}
            </section>

            {(projects.length > 0 || allHabits.length > 0) && (
              <section aria-labelledby="goal-connections-heading" className="mt-6 border-t border-border pt-5">
                <h3 id="goal-connections-heading" className="text-sm font-semibold text-primary">Connected work</h3>
                <p className="mt-1 text-xs text-secondary">Link the projects and daily habits that move this goal forward.</p>
                <div className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                  {projects.length > 0 && (
                    <fieldset className="min-w-0">
                      <legend className="mb-2 w-full">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium text-primary">
                            <FolderKanban aria-hidden="true" className="h-4 w-4 text-cat-projects" /> Projects
                          </span>
                          <span className="text-xs text-secondary">{selectedProjectIds.length} selected</span>
                        </span>
                      </legend>
                      <div className="rounded-xl border border-border p-1">
                        {projects.map((proj) => (
                          <label key={proj.id} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary hover:bg-surface-hover cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedProjectIds.includes(proj.id)}
                              onChange={(e) => setSelectedProjectIds((ids) => e.target.checked ? [...ids, proj.id] : ids.filter((id) => id !== proj.id))}
                              className={choiceClass}
                            />
                            <span className="min-w-0 break-words">{proj.name}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {allHabits.length > 0 && (
                    <fieldset className="min-w-0">
                      <legend className="mb-2 w-full">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Activity aria-hidden="true" className="h-4 w-4 text-cat-routines" /> Daily habits
                          </span>
                          <span className="text-xs text-secondary">{selectedHabitIds.length} selected</span>
                        </span>
                      </legend>
                      <div className="rounded-xl border border-border p-1">
                        {allHabits.map((habit) => (
                          <label key={habit.id} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary hover:bg-surface-hover cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedHabitIds.includes(habit.id)}
                              onChange={(e) => setSelectedHabitIds((ids) => e.target.checked ? [...ids, habit.id] : ids.filter((id) => id !== habit.id))}
                              className={choiceClass}
                            />
                            <span className="min-w-0 break-words">{habit.name}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </div>
              </section>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-surface px-4 py-4 sm:px-6">
            <BaseButton type="button" variant="secondary" onClick={dismiss} disabled={isSubmitting} className="max-sm:flex-1 max-sm:px-3">
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !title.trim()} isLoading={isSubmitting} className="max-sm:flex-1 max-sm:px-3">
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : parentGoal ? 'Add Key Result' : 'Create Aspiration'}
            </BaseButton>
          </footer>
        </form>
      </div>
    </div>
  );
}
