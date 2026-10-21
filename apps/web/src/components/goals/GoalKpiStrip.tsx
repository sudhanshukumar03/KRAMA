import { memo, useMemo } from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import type { GoalWithRelations } from '../../types/schema';
import { computeGoalPace, goalMetadata } from '../../lib/goalUtils';

export const GoalKpiStrip = memo(function GoalKpiStrip({ goals, onOpenGoal }: {
  goals: GoalWithRelations[];
  onOpenGoal: (goal: GoalWithRelations) => void;
}) {
  const summary = useMemo(() => {
    const roots = goals.filter(goal => !goal.parentGoalId);
    const active = roots.filter(goal => (goalMetadata(goal.metadata).status || 'ACTIVE') === 'ACTIVE' && goal.progress < 100);
    const milestones = goals.filter(goal => goal.parentGoalId);
    return {
      roots, active,
      average: active.length ? Math.round(active.reduce((sum, goal) => sum + goal.progress, 0) / active.length) : 0,
      completed: roots.filter(goal => goal.progress >= 100 || goalMetadata(goal.metadata).status === 'COMPLETED').length,
      milestones,
      completedMilestones: milestones.filter(goal => goal.progress >= 100 || goalMetadata(goal.metadata).status === 'COMPLETED').length,
      onTrack: active.filter(goal => ['on_track', 'ahead', 'completed'].includes(computeGoalPace(goal).status)).length,
      pillars: new Set(active.map(goal => goalMetadata(goal.metadata).category || 'health')).size,
      spotlight: active.find(goal => goalMetadata(goal.metadata).isPinned) || active[0] || roots[0],
    };
  }, [goals]);
  if (!summary.roots.length) return null;
  return <section className="workspace-goal-summary" aria-label="Goal overview">
    <div className="workspace-summary-cell">
      <span className="workspace-summary-label">Average progress</span>
      <strong>{summary.average}<span>%</span></strong>
      <span className="workspace-summary-detail">{summary.onTrack} on track · {summary.active.length - summary.onTrack} need attention</span>
    </div>
    <div className="workspace-summary-cell">
      <span className="workspace-summary-label">Active goals</span>
      <strong>{summary.active.length}</strong>
      <span className="workspace-summary-detail">{summary.pillars} life pillars · {summary.completed} completed</span>
    </div>
    <div className="workspace-summary-cell">
      <span className="workspace-summary-label">Milestones</span>
      <strong>{summary.completedMilestones}<span> / {summary.milestones.length}</span></strong>
      <span className="workspace-summary-detail">{summary.milestones.length ? 'Completed milestones' : 'No milestones added yet'}</span>
    </div>
    {summary.spotlight && <button type="button" className="workspace-summary-cell workspace-goal-spotlight" onClick={event => { event.currentTarget.focus(); onOpenGoal(summary.spotlight!); }}>
      <span className="workspace-summary-label"><Star size={14} aria-hidden="true" /> In focus <ArrowUpRight size={16} aria-hidden="true" /></span>
      <span className="workspace-spotlight-title">{summary.spotlight.title}</span>
      <span className="workspace-summary-detail">{summary.spotlight.progress}% complete · Open goal</span>
    </button>}
  </section>;
});
