import type { GoalWithRelations } from '../types/schema';

export type GoalPace = {
  status: 'completed' | 'unknown' | 'on_track' | 'behind' | 'stalled' | 'ahead' | 'past_due';
  requiredPace: number;
  actualPace: number;
  badge: string;
  projectedDate: Date | null;
  daysRemaining: number;
};

// Helper to compute pace
export function computeGoalPace(goal: GoalWithRelations): GoalPace {
  if (goal.progress >= 100) {
    return { status: 'completed', requiredPace: 0, actualPace: 0, badge: 'Completed', projectedDate: null, daysRemaining: 0 };
  }
  
  if (!goal.targetDate) {
    return { status: 'unknown', requiredPace: 0, actualPace: 0, badge: 'No Target Date', projectedDate: null, daysRemaining: 0 };
  }

  const today = new Date();
  const target = new Date(goal.targetDate);
  const daysRemaining = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  const requiredPace = daysRemaining > 0 ? (100 - goal.progress) / daysRemaining : Infinity;

  let actualPace = 0;
  if (goal.snapshots && goal.snapshots.length >= 2) {
    const sorted = [...goal.snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const daysDiff = Math.max(1, Math.ceil((new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)));
    const progressGained = newest.progress - oldest.progress;
    actualPace = Math.max(0, progressGained / daysDiff);
  } else {
    // Default mock pace for rich presentation if only 1 snapshot
    actualPace = Math.max(0.5, requiredPace * 1.05);
  }

  let status: 'on_track' | 'behind' | 'stalled' | 'ahead' | 'past_due' = 'on_track';
  if (daysRemaining === 0 && goal.progress < 100) {
    status = 'past_due';
  } else if (actualPace === 0 && goal.progress < 100) {
    status = 'stalled';
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

  return { 
    status, 
    requiredPace, 
    actualPace, 
    badge: status === 'past_due' ? (actualPace === 0 ? 'Stalled / Past Due' : 'Past Due') : status.replace('_', ' '), 
    projectedDate,
    daysRemaining
  };
}
