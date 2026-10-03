import React from 'react';
import { Plus, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';
import type { GoalWithRelations } from '../../types/schema';
import { LIFE_PILLARS } from './goalConstants';
import { computeGoalPace } from '../../lib/goalUtils';
import { resolveIcon } from '../../lib/iconResolver';
import { cn } from '../../lib/utils';

interface GoalPillarBoardProps {
  goals: GoalWithRelations[];
  onOpenGoal: (goal: GoalWithRelations) => void;
  onAddGoalWithPillar: (pillarId: string) => void;
  selectedPillar?: string;
  activeTab?: string;
  searchQuery?: string;
}

const PILLAR_GRADIENTS: Record<string, string> = {
  health: 'from-success-fg to-transparent',
  career: 'from-cat-projects to-transparent',
  finance: 'from-warning-fg to-transparent',
  learning: 'from-cat-tasks to-transparent',
  creative: 'from-accent-fg to-transparent',
  lifestyle: 'from-cat-routines to-transparent',
};

export const GoalPillarBoard = React.memo(function GoalPillarBoard({
  goals,
  onOpenGoal,
  onAddGoalWithPillar,
  selectedPillar = 'all',
  activeTab = 'all',
  searchQuery = '',
}: GoalPillarBoardProps) {
  // Only display root goals in the pillar matrix
  const rootGoals = goals.filter((g) => !g.parentGoalId);
  const activePillars = LIFE_PILLARS.filter(
    (p) => p.id !== 'all' && (selectedPillar === 'all' || p.id === selectedPillar)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 pb-6 overflow-x-auto animate-in fade-in duration-300">
      {activePillars.map((pillar) => {
        const PillarIcon = pillar.icon;
        const pillarGoals = rootGoals.filter(
          (g) => ((g.metadata as any)?.category || 'health') === pillar.id
        );
        const topGlowGradient = PILLAR_GRADIENTS[pillar.id] || 'from-accent to-transparent';

        return (
          <div
            key={pillar.id}
            className="flex flex-col krama-card overflow-hidden min-w-[280px] transition-all duration-300 relative group/column"
          >
            {/* Signature Luminescent Pillar Top-Line */}
            <div className={cn('absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r', topGlowGradient)} />

            {/* Column Header */}
            <div className="px-4 py-3.5 border-b border-border/70 bg-surface/50 backdrop-blur-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover/column:scale-105',
                    pillar.color
                  )}
                >
                  <PillarIcon className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary truncate tracking-tight">
                    {pillar.label}
                  </h4>
                  <span className="text-[10px] font-mono text-secondary">
                    {pillarGoals.length} {pillarGoals.length === 1 ? 'aspiration' : 'aspirations'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAddGoalWithPillar(pillar.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-accent-fg hover:bg-surface-hover transition-all cursor-pointer border border-transparent hover:border-border hover:shadow-2xs active:scale-[0.98]"
                title={`Add goal to ${pillar.label}`}
              >
                <Plus className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Column Content */}
            <div className="p-3.5 space-y-3 flex-1 min-h-[180px] overflow-y-auto">
              {pillarGoals.map((goal) => {
                const GoalIcon = resolveIcon(goal.icon || 'Target');
                const pace = computeGoalPace(goal);
                const isDone = goal.progress >= 100;
                const childCount = goal.childGoals?.length || 0;

                return (
                  <div
                    key={goal.id}
                    onClick={() => onOpenGoal(goal)}
                    className="p-3.5 rounded-xl bg-surface/60 hover:bg-surface border border-border/70 hover:border-accent/40 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer group/tile hover:-translate-y-[1px]"
                  >
                    <div className="flex items-start justify-between gap-2.5 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-surface border border-border/80 text-secondary group-hover/tile:text-accent-fg group-hover/tile:border-accent/30 flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                          <GoalIcon className="w-3.5 h-3.5 stroke-[1.75]" />
                        </div>
                        <h5 className="text-xs font-semibold text-primary group-hover/tile:text-accent-fg transition-colors truncate">
                          {goal.title}
                        </h5>
                      </div>
                      <span className="text-xs font-mono font-bold text-accent-fg shrink-0 tabular-nums">
                        {goal.progress}%
                      </span>
                    </div>

                    {/* Dual-Tone Micro-Gradient Progress track */}
                    <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden mb-2.5 p-[0.5px]">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500 ease-out shadow-xs',
                          isDone
                            ? 'bg-gradient-to-r from-success-fg to-accent'
                            : 'bg-gradient-to-r from-cat-tasks via-accent to-cat-routines'
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                      />
                    </div>

                    {/* Bottom row: Pace + Key Results */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-secondary">
                      <div className="flex items-center gap-1.5">
                        {['stalled', 'past_due'].includes(pace.status) ? (
                          <XCircle className="w-3 h-3 text-danger-fg" />
                        ) : pace.status === 'behind' ? (
                          <AlertCircle className="w-3 h-3 text-warning-fg" />
                        ) : pace.status === 'unknown' ? (
                          <Clock className="w-3 h-3 text-secondary" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-success-fg" />
                        )}
                        <span className="font-semibold uppercase tracking-wider">{pace.badge}</span>
                      </div>

                      {childCount > 0 ? (
                        <span className="font-medium">{childCount} key results</span>
                      ) : pace.isDueToday ? (
                        <span className="text-warning-fg font-bold">Due today</span>
                      ) : pace.daysRemaining > 0 ? (
                        <span>{pace.daysRemaining}d left</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {/* Inspirational Empty State */}
              {pillarGoals.length === 0 && (
                <div
                  onClick={() => onAddGoalWithPillar(pillar.id)}
                  className="h-32 rounded-xl border border-dashed border-border/80 hover:border-accent/40 bg-gradient-to-b from-surface-hover/30 to-transparent flex flex-col items-center justify-center text-center p-4 cursor-pointer group/empty transition-all duration-200 hover:shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-hover/80 text-secondary group-hover/empty:text-accent-fg group-hover/empty:bg-accent-subtle/80 flex items-center justify-center mb-2 transition-all group-hover/empty:scale-110 shadow-2xs">
                    <Plus className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-xs font-semibold text-primary/80 group-hover/empty:text-primary transition-colors">
                    {activeTab !== 'all' ? `No ${activeTab} goals` : searchQuery ? 'No matching goals' : 'Define vision'}
                  </span>
                  <span className="text-[10px] text-secondary mt-0.5 font-sans">
                    {activeTab !== 'all' || searchQuery
                      ? `No ${activeTab !== 'all' ? activeTab : ''} aspirations found in ${pillar.label.split(' ')[0]}`
                      : `Set first aspiration for ${pillar.label.split(' ')[0]}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
