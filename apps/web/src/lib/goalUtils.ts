import type { GoalWithRelations } from '../types/schema';

export type GoalPace = {
  status: 'completed' | 'unknown' | 'on_track' | 'behind' | 'stalled' | 'ahead' | 'past_due';
  requiredPace: number;
  actualPace: number;
  badge: string;
  projectedDate: Date | null;
  daysRemaining: number;
  isDueToday?: boolean;
};

// Helper to compute pace strictly from real snapshot deltas or creation timestamps
export function computeGoalPace(goal: GoalWithRelations): GoalPace {
  const rawStatus = (goal as any).metadata?.status || (goal as any).status;
  if (rawStatus === 'COMPLETED' || goal.progress >= 100) {
    return { status: 'completed', requiredPace: 0, actualPace: 0, badge: 'Completed', projectedDate: null, daysRemaining: 0, isDueToday: false };
  }
  if (rawStatus === 'PAUSED' || rawStatus === 'CANCELED') {
    return { status: 'stalled', requiredPace: 0, actualPace: 0, badge: rawStatus === 'PAUSED' ? 'Paused' : 'Canceled', projectedDate: null, daysRemaining: 0, isDueToday: false };
  }
  
  if (!goal.targetDate) {
    return { status: 'unknown', requiredPace: 0, actualPace: 0, badge: 'No Target Date', projectedDate: null, daysRemaining: 0, isDueToday: false };
  }

  const today = new Date();
  const target = new Date(goal.targetDate);

  // If target date is a midnight timestamp (e.g. from YYYY-MM-DD picker), extend to end-of-day 23:59:59.999
  const isMidnight = target.getUTCHours() === 0 && target.getUTCMinutes() === 0 && target.getUTCSeconds() === 0;
  const effectiveTarget = isMidnight
    ? new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999)
    : target;

  const msRemaining = effectiveTarget.getTime() - today.getTime();
  const isPastDue = msRemaining < 0;
  const isDueToday = !isPastDue && today.toDateString() === effectiveTarget.toDateString();
  const daysRemaining = isPastDue ? 0 : Math.max(isDueToday ? 0 : 1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  
  const requiredPace = !isPastDue ? (100 - goal.progress) / Math.max(1, daysRemaining) : Infinity;

  let actualPace = 0;

  if (goal.snapshots && goal.snapshots.length >= 2) {
    const sorted = [...goal.snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Bug #2 fix: deduplicate to one entry per calendar day (keep latest snapshot of each day)
    // This prevents same-day updates from producing an artificially tiny daysDiff (e.g. 0→max 1)
    // that inflates actualPace massively.
    const dedupedByDay = Object.values(
      sorted.reduce((acc, s) => {
        const dayKey = new Date(s.date).toISOString().split('T')[0];
        if (!acc[dayKey] || new Date(s.date).getTime() > new Date(acc[dayKey].date).getTime()) {
          acc[dayKey] = s;
        }
        return acc;
      }, {} as Record<string, typeof sorted[0]>)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (dedupedByDay.length >= 2) {
      const oldest = dedupedByDay[0];
      const newest = dedupedByDay[dedupedByDay.length - 1];
      const daysDiff = Math.max(1, Math.ceil((new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)));
      const progressGained = newest.progress - oldest.progress;
      actualPace = Math.max(0, progressGained / daysDiff);
    }
    // If all snapshots are from today (only 1 deduped day), fall through to creation-based calc below
  }

  if (actualPace === 0 && goal.progress > 0) {
    // Fallback: compute genuine pace from creation timestamp to current date
    const created = goal.createdAt ? new Date(goal.createdAt) : new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    if (daysSinceCreation >= 3) {
      actualPace = Math.max(0, goal.progress / daysSinceCreation);
    }
  }

  let status: 'on_track' | 'behind' | 'stalled' | 'ahead' | 'past_due' = 'on_track';
  if (isPastDue && goal.progress < 100) {
    status = 'past_due';
  } else if (actualPace === 0 && goal.progress < 100) {
    // If created recently (within 3 days), it is freshly in progress, not stalled
    const created = goal.createdAt ? new Date(goal.createdAt) : new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    status = daysSinceCreation <= 3 ? 'on_track' : 'stalled';
  } else if (actualPace < requiredPace) {
    status = 'behind';
  } else if (actualPace > requiredPace * 1.2) {
    status = 'ahead';
  }

  let projectedDate = null;
  if (actualPace > 0) {
    const daysToFinish = (100 - goal.progress) / actualPace;
    projectedDate = new Date(today.getTime() + daysToFinish * 86400000);
  }

  const badge = status === 'past_due'
    ? (actualPace === 0 ? 'Stalled / Past Due' : 'Past Due')
    : isDueToday
      ? 'Due Today'
      : status.replace('_', ' ');

  return { 
    status, 
    requiredPace, 
    actualPace, 
    badge, 
    projectedDate,
    daysRemaining,
    isDueToday
  };
}
