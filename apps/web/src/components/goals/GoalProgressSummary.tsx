import type { GoalMetadata } from '../../types/schema';
import type { computeGoalPace } from '../../lib/goalUtils';
import { cn } from '../../lib/utils';

interface Props {
  pace: ReturnType<typeof computeGoalPace>;
  progress: number;
  metadata: GoalMetadata;
  isCompleted: boolean;
  isMeasurable: boolean;
  targetDate?: string | null;
}

export function GoalProgressSummary({ pace, progress, metadata, isCompleted, isMeasurable, targetDate }: Props) {
  const hasDeadline = !!targetDate && Number.isFinite(new Date(targetDate).getTime());
  const paused = metadata.status === 'PAUSED';
  const canceled = metadata.status === 'CANCELED';
  const timingLabel = isCompleted ? 'Completed' : paused ? 'Paused' : canceled ? 'Canceled' : !hasDeadline ? 'No target date' : pace.isDueToday ? 'Due today' : pace.daysRemaining > 0 ? `${pace.daysRemaining} days left` : 'Overdue';
  const progressValue = Math.min(100, Math.max(0, progress));
  return (
    <section className="goal-progress-summary" aria-label="Goal progress">
      <div className="goal-progress-heading">
        <div><h3>Progress</h3><p className={cn('goal-progress-value',isCompleted && 'text-success-fg')}>{Math.round(progressValue)}<span>%</span></p></div>
        <span className="goal-progress-deadline">{timingLabel}</span>
      </div>
      <div role="progressbar" aria-label="Overall goal completion" aria-valuenow={progressValue} aria-valuemin={0} aria-valuemax={100} className="goal-progress-track"><span style={{width:`${progressValue}%`}} /></div>
      {isMeasurable && <p className="goal-progress-metric">{metadata.currentValue ?? 0} / {metadata.targetValue}{metadata.unit ? ` ${metadata.unit}` : ''}</p>}
      {hasDeadline && !isCompleted && !paused && !canceled && <details className="goal-progress-details">
        <summary>Progress details</summary>
        <dl>
          <div><dt>Required pace</dt><dd>{Number.isFinite(pace.requiredPace) ? `${pace.requiredPace.toFixed(1)}% per day` : 'Not available'}</dd></div>
          <div><dt>Current pace</dt><dd>{pace.actualPace.toFixed(1)}% per day</dd></div>
          {pace.projectedDate && <div><dt>Projected completion</dt><dd>{new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(pace.projectedDate)}</dd></div>}
        </dl>
      </details>}
    </section>
  );
}
