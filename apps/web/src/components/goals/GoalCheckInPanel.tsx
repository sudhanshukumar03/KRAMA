import { CalendarCheck, Check } from 'lucide-react';
import { BaseButton } from '../ui/BaseButton';
import { cn } from '../../lib/utils';
import type { GoalDetailModel } from './useGoalDetailModel';

export function GoalCheckInPanel({ model }: { model: GoalDetailModel }) {
  const { markDraftDirty, note, setNote, progressInput, setProgressInput, current, metadata, isAuto, isMeasurable, measurableInput, setMeasurableInput, childGoals, checkInMutation, inlineEditMutation } = model;
  return (
    <div className="goal-check-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-normal text-secondary flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-accent stroke-[2]" />
                Check in
              </span>
            </div>

            {isMeasurable && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="drawer-checkin-current" className="text-secondary">
                    Update current value ({metadata.unit || 'units'}):
                  </label>
                  <span className="font-semibold text-accent font-mono tabular-nums">
                    Target: {metadata.targetValue}
                  </span>
                </div>
                <input
                  type="number"
                  id="drawer-checkin-current"
                  aria-label="Current value"
                  value={measurableInput}
                  onChange={(e) => { markDraftDirty('checkIn'); setMeasurableInput(e.target.value); }}
                  placeholder={`Current: ${metadata.currentValue ?? 0}`}
                  className="krama-input w-full h-9 px-3 text-xs font-mono tabular-nums text-primary focus:border-accent rounded-lg"
                />
              </div>
            )}

            {childGoals.length > 0 && (
              <div className="p-2.5 rounded-xl bg-surface-hover/50 border border-border/70 text-xs text-secondary flex items-center justify-between">
                <span className="font-sans font-medium">Progress rolled up from {childGoals.length} Key Results</span>
                <span className="font-bold font-mono text-primary tabular-nums">{current.progress}%</span>
              </div>
            )}

            {!isAuto && childGoals.length === 0 && !isMeasurable && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="drawer-progress-slider" className="text-xs font-medium text-secondary">
                    Adjust Progress:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          markDraftDirty('checkIn');
                          setProgressInput((prev) => Math.max(0, prev - 5));
                        }}
                        className="w-6 h-6 rounded-md bg-surface border border-border hover:bg-surface-hover text-secondary hover:text-primary flex items-center justify-center text-xs font-mono font-bold cursor-pointer transition-colors shadow-2xs"
                        title="Decrease 5%"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          markDraftDirty('checkIn');
                          setProgressInput((prev) => Math.min(100, prev + 5));
                        }}
                        className="w-6 h-6 rounded-md bg-surface border border-border hover:bg-surface-hover text-secondary hover:text-primary flex items-center justify-center text-xs font-mono font-bold cursor-pointer transition-colors shadow-2xs"
                        title="Increase 5%"
                      >
                        +5
                      </button>
                    </div>

                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-accent-subtle text-accent-fg border border-accent/25 tabular-nums">
                      {progressInput}%
                    </span>
                  </div>
                </div>

                {/* Tactile Custom Slider Track */}
                <div className="goal-progress-control relative flex items-center select-none">
                  <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden border border-border/80 p-[0.5px]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-colors duration-100 ease-out shadow-xs',
                        progressInput >= 100
                          ? 'bg-gradient-to-r from-success-fg to-accent'
                          : 'bg-gradient-to-r from-cat-tasks via-accent to-cat-routines'
                      )}
                      style={{ width: `${progressInput}%` }}
                    />
                  </div>

                  <input
                    id="drawer-progress-slider"
                    type="range"
                    min={0}
                    max={100}
                    aria-label="Check-in progress percentage"
                    value={progressInput}
                    onChange={(e) => {
                      markDraftDirty('checkIn');
                      setProgressInput(Number(e.target.value));
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-surface border-2 border-accent shadow-sm pointer-events-none transition-transform"
                    style={{ left: `${progressInput}%` }}
                  />
                </div>

                {/* Milestone Quick-Jump Buttons */}
                <div className="flex items-center justify-between gap-1.5">
                  {[0, 25, 50, 75, 100].map((preset) => {
                    const isActive = progressInput === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          markDraftDirty('checkIn');
                          setProgressInput(preset);
                        }}
                        className={cn(
                          'flex-1 py-1 rounded-md text-xs font-mono font-semibold transition-colors border cursor-pointer text-center',
                          isActive
                            ? 'bg-accent text-white border-accent shadow-2xs font-bold'
                            : 'bg-surface hover:bg-surface-hover border-border/70 text-secondary hover:text-primary'
                        )}
                      >
                        {preset}%
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <textarea
              aria-label="Check-in note"
              value={note}
              onChange={(e) => { markDraftDirty('checkIn'); setNote(e.target.value); }}
              placeholder="What changed? Add a note if it helps."
              rows={2}
              className="krama-input w-full resize-none p-2.5 text-xs text-primary placeholder:text-muted rounded-xl border border-border focus:border-accent"
            />

            <BaseButton
              variant="primary"
              size="sm"
              onClick={() => checkInMutation.mutate()}
              disabled={
                checkInMutation.isPending ||
                inlineEditMutation.isPending ||
                (isAuto && !note.trim()) ||
                (childGoals.length > 0 && !note.trim()) ||
                (isMeasurable && !note.trim() && measurableInput === '')
              }
              className="w-full text-xs font-semibold h-9.5 rounded-xl gap-2 shadow-sm transition-colors hover:shadow-md cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.25]" />
              {checkInMutation.isPending ? 'Saving Checkpoint…' : 'Save check-in'}
            </BaseButton>
          </div>
  );
}
