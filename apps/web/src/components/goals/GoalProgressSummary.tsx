import type { GoalMetadata } from '../../types/schema';
import type { computeGoalPace } from '../../lib/goalUtils';
import { cn } from '../../lib/utils';

interface Props {
  pace: ReturnType<typeof computeGoalPace>;
  progress: number;
  metadata: GoalMetadata;
  isCompleted: boolean;
  isMeasurable: boolean;
}

export function GoalProgressSummary({ pace, progress, metadata, isCompleted, isMeasurable }: Props) {
  return <>
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
                  {progress}%
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
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
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


  </>;
}
