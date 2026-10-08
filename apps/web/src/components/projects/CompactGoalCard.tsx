import {
    AlertCircle,
    ArrowUpCircle,
    CheckCircle2,
    Clock,
    XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { computeGoalPace } from '../../lib/goalUtils';
import { cn } from '../../lib/utils';
import type { GoalWithRelations } from '../../types/schema';



// Strategic Goal Card Reused for Overview Tab
export function CompactGoalCard({ goal }: { goal: GoalWithRelations }) {
  const navigate = useNavigate();
  const pace = computeGoalPace(goal);

  return (
    <div
      onClick={() => navigate('/app/goals')}
      className="krama-card border-success-border p-6 hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden group font-sans"
    >
      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-success-fg" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 pl-2">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-badge font-mono font-bold uppercase tracking-widest text-on-accent bg-success-fg px-2.5 py-0.5 rounded-md shadow-2xs">
              {goal.type} • STRATEGIC OKR
            </span>
            <h3 className="text-title text-primary mb-2 font-bold">{goal.title}</h3>
          </div>
          {goal.targetDate && (
            <div className="flex items-center gap-1.5 text-caption font-mono text-secondary font-bold tabular-nums">
              <Clock className="w-3.5 h-3.5 text-success-fg stroke-[1.5]" />
              Target Horizon: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className="text-right font-mono">
          <span className="text-3xl font-bold text-success-fg tabular-nums">{goal.progress}%</span>
          <span className="block text-caption text-secondary font-bold uppercase tracking-wider">OKR Progress</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border mb-4">
        <div
          className="h-full bg-success-fg transition-all duration-700 ease-out"
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      {/* Pace Telemetry Panel */}
      <div className="bg-surface-hover/80 border border-border rounded-xl p-3.5 flex flex-wrap gap-x-6 gap-y-2 items-center font-mono text-caption">
        <div className="flex items-center gap-1.5 font-bold">
          {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-danger-fg stroke-[1.5]" /> :
            pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-warning-fg stroke-[1.5]" /> :
              pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-success-fg stroke-[1.5]" /> :
                <CheckCircle2 className="w-4 h-4 text-success-fg stroke-[1.5]" />}
          <span className={cn("uppercase tracking-widest text-badge font-bold",
            ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-danger-fg" : "text-success-fg"
          )}>
            {pace.badge}
          </span>
        </div>

        <div className="flex items-center gap-4 text-secondary tabular-nums">
          <span>Req Pace: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(2)}%/day</span>
          <span>Actual: <strong className="text-primary font-bold">{pace.actualPace.toFixed(2)}%/day</strong></span>
        </div>

        <div className="text-badge uppercase tracking-wider font-bold text-primary ml-auto tabular-nums">
          {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
            <span className="text-danger-fg">Stalled — Intervention Required</span>
          ) : pace.projectedDate ? (
            <span>Est. Completion: {pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
