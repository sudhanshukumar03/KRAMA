import React, { useMemo } from 'react';
import { Target, Flame, CheckCircle2, AlertCircle, Clock, ChevronRight, Sparkles } from 'lucide-react';
import type { GoalWithRelations } from '../../types/schema';
import { computeGoalPace } from '../../lib/goalUtils';
import { getPillar, LIFE_PILLARS } from './goalConstants';
import { cn } from '../../lib/utils';
import { resolveIcon } from '../../lib/iconResolver';

interface GoalKpiStripProps {
  goals: GoalWithRelations[];
  onOpenGoal: (goal: GoalWithRelations) => void;
}

export const GoalKpiStrip = React.memo(function GoalKpiStrip({
  goals,
  onOpenGoal,
}: GoalKpiStripProps) {
  const rootGoals = useMemo(() => goals.filter((g) => !g.parentGoalId), [goals]);
  const milestones = useMemo(() => goals.filter((g) => Boolean(g.parentGoalId)), [goals]);

  const activeRootGoals = useMemo(() => {
    return rootGoals.filter((g) => {
      const st = (g as any).metadata?.status || (g as any).status || 'ACTIVE';
      return st === 'ACTIVE' && g.progress < 100;
    });
  }, [rootGoals]);

  const completedRootGoals = useMemo(() => {
    return rootGoals.filter((g) => {
      const st = (g as any).metadata?.status || (g as any).status || 'ACTIVE';
      return g.progress >= 100 || st === 'COMPLETED';
    });
  }, [rootGoals]);

  const completedMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const st = (m as any).metadata?.status || (m as any).status || 'ACTIVE';
      return m.progress >= 100 || st === 'COMPLETED';
    });
  }, [milestones]);

  // Overall Velocity & Health Breakdown
  const { avgProgress, onTrackCount, atRiskCount } = useMemo(() => {
    if (activeRootGoals.length === 0) {
      return { avgProgress: 0, onTrackCount: 0, atRiskCount: 0 };
    }
    const sum = activeRootGoals.reduce((acc, g) => acc + g.progress, 0);
    const avg = Math.round(sum / activeRootGoals.length);

    let onTrack = 0;
    let atRisk = 0;
    for (const g of activeRootGoals) {
      const pace = computeGoalPace(g);
      if (['on_track', 'ahead', 'completed'].includes(pace.status)) {
        onTrack++;
      } else {
        atRisk++;
      }
    }
    return { avgProgress: avg, onTrackCount: onTrack, atRiskCount: atRisk };
  }, [activeRootGoals]);

  // Priority Focus Goal (Pinned goal or top active goal)
  const spotlightGoal = useMemo(() => {
    const pinned = activeRootGoals.find((g) => Boolean((g.metadata as any)?.isPinned));
    if (pinned) return pinned;
    // Default to the first active goal with upcoming deadline
    return activeRootGoals[0] || rootGoals[0] || null;
  }, [activeRootGoals, rootGoals]);

  // Active Pillars count
  const activePillarCount = useMemo(() => {
    const set = new Set<string>();
    for (const g of activeRootGoals) {
      const cat = (g.metadata as any)?.category;
      set.add(cat && cat !== 'all' ? cat : 'health');
    }
    return set.size;
  }, [activeRootGoals]);

  if (rootGoals.length === 0) {
    return null;
  }

  const spotlightPace = spotlightGoal ? computeGoalPace(spotlightGoal) : null;
  const SpotlightIcon = spotlightGoal ? resolveIcon(spotlightGoal.icon || 'Target') : Target;
  const spotlightCategory = (spotlightGoal?.metadata as any)?.category;
  const spotlightPillar = getPillar(spotlightCategory && spotlightCategory !== 'all' ? spotlightCategory : 'health');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* KPI 1: Strategic Velocity */}
      <div className="group relative krama-card p-4.5 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden">
        {/* Ambient Top Glow Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-accent/40 via-accent/60 to-transparent" />
        
        <div>
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest flex items-center gap-1.5 text-secondary">
              <span className="w-5 h-5 rounded-lg bg-accent-subtle text-accent-fg flex items-center justify-center border border-accent/20">
                <Sparkles className="w-3 h-3 stroke-[2]" />
              </span>
              Average Velocity
            </span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent-subtle text-accent-fg border border-accent/20">
              {activeRootGoals.length} Active
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-primary tracking-tight tabular-nums">
                {avgProgress}
              </span>
              <span className="text-sm font-bold font-mono text-secondary">%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="px-1.5 py-0.5 rounded-md bg-success-bg text-success-fg border border-success-border flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" /> {onTrackCount}
              </span>
              {atRiskCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-danger-bg text-danger-fg border border-danger-border flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" /> {atRiskCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dual-Tone Micro-Gradient Track */}
        <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-cat-tasks via-accent to-cat-routines rounded-full transition-all duration-700 ease-out shadow-xs"
            style={{ width: `${Math.min(100, Math.max(0, avgProgress))}%` }}
          />
        </div>
      </div>

      {/* KPI 2: Life Architecture Balance */}
      <div className="group relative krama-card p-4.5 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden">
        {/* Ambient Top Glow Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-success-fg/40 via-success-fg/60 to-transparent" />

        <div>
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest flex items-center gap-1.5 text-secondary">
              <span className="w-5 h-5 rounded-lg bg-success-bg text-success-fg flex items-center justify-center border border-success-border">
                <Target className="w-3 h-3 stroke-[2]" />
              </span>
              Life Architecture
            </span>
            <span className="text-[11px] font-mono font-semibold text-secondary">
              <b className="text-primary">{activePillarCount}</b> / 6 Pillars
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-primary tracking-tight tabular-nums">
                {activeRootGoals.length}
              </span>
              <span className="text-xs font-semibold text-secondary font-sans">Objectives</span>
            </div>
            <span className="text-xs font-mono text-secondary">
              <b className="text-primary">{completedRootGoals.length}</b> done
            </span>
          </div>
        </div>

        {/* Thematic Pillar Multi-Segment Matrix (Eliminated the black rectangle) */}
        <div className="flex items-center gap-1.5">
          {LIFE_PILLARS.filter((p) => p.id !== 'all').map((p) => {
            const hasGoal = activeRootGoals.some((g) => {
              const cat = (g.metadata as any)?.category;
              return (cat && cat !== 'all' ? cat : 'health') === p.id;
            });
            return (
              <div
                key={p.id}
                title={`${p.label}: ${hasGoal ? 'Active Aspiration' : 'No active goal'}`}
                className={cn(
                  'h-2 flex-1 rounded-full transition-all duration-300 relative group/pill',
                  hasGoal
                    ? 'bg-gradient-to-r from-success-fg to-accent shadow-2xs scale-y-105'
                    : 'bg-surface-hover/80 border border-border/40 hover:bg-surface-hover'
                )}
              />
            );
          })}
        </div>
      </div>

      {/* KPI 3: Key Results & Milestones */}
      <div className="group relative krama-card p-4.5 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden">
        {/* Ambient Top Glow Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cat-routines/40 via-accent/60 to-transparent" />

        <div>
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest flex items-center gap-1.5 text-secondary">
              <span className="w-5 h-5 rounded-lg bg-cat-routines-bg text-cat-routines flex items-center justify-center border border-cat-routines/20">
                <CheckCircle2 className="w-3 h-3 stroke-[2]" />
              </span>
              Key Results
            </span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent-subtle text-accent-fg border border-accent/20">
              {milestones.length > 0
                ? `${Math.round((completedMilestones.length / milestones.length) * 100)}%`
                : '0%'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-primary tracking-tight tabular-nums">
                {completedMilestones.length}
              </span>
              <span className="text-base font-bold font-mono text-secondary">/ {milestones.length}</span>
            </div>
            <span className="text-[11px] font-mono text-secondary font-medium">Milestones achieved</span>
          </div>
        </div>

        {/* Milestone Gradient Bar */}
        <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-accent to-cat-routines rounded-full transition-all duration-700 ease-out shadow-xs"
            style={{
              width: `${milestones.length > 0 ? (completedMilestones.length / milestones.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* KPI 4: Priority Focus Spotlight (Glassmorphic Hero Card) */}
      {spotlightGoal && (
        <div
          onClick={() => onOpenGoal(spotlightGoal)}
          className="group relative bg-card border border-warning-border hover:border-warning-fg/60 rounded-2xl p-4.5 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          {/* Ambient Top Amber Glow */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-warning-fg via-cat-projects to-transparent" />

          <div>
            <div className="flex items-center justify-between text-secondary mb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-warning-fg flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-warning-bg text-warning-fg flex items-center justify-center border border-warning-border group-hover:scale-105 transition-transform">
                  <Flame className="w-3 h-3 fill-warning-fg/40 stroke-[2]" />
                </span>
                Focus Spotlight
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg border border-warning-border flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {spotlightPace && spotlightPace.daysRemaining > 0
                  ? `${spotlightPace.daysRemaining}d left`
                  : 'Overdue'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 my-1.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-warning-bg border border-warning-border text-warning-fg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <SpotlightIcon className="w-4 h-4 stroke-[1.75]" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-primary group-hover:text-warning-fg transition-colors truncate">
                  {spotlightGoal.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-secondary mt-0.5">
                  <span className={cn('px-1.5 py-0.2 rounded-md border text-[9px] font-semibold', spotlightPillar.color)}>
                    {spotlightPillar.label.split(' ')[0]}
                  </span>
                  <span>·</span>
                  <span className="font-bold text-warning-fg tabular-nums">{spotlightGoal.progress}%</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-secondary group-hover:text-warning-fg group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>

          {/* Spotlight Gradient Progress */}
          <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-warning-fg to-cat-projects rounded-full transition-all duration-700 ease-out shadow-xs"
              style={{ width: `${Math.min(100, Math.max(0, spotlightGoal.progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});
