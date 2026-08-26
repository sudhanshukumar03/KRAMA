import type { GoalWithRelations } from '../types/schema';

export type GoalPace = {
  status: 'completed' | 'unknown' | 'on_track' | 'behind' | 'stalled' | 'ahead' | 'past_due';
  requiredPace: number;
  actualPace: number;
  badge: string;
  projectedDate: Date | null;
  daysRemaining: number;
};

// Helper to compute pace strictly from real snapshot deltas or creation timestamps
export function computeGoalPace(goal: GoalWithRelations): GoalPace {
  // @ts-ignore ((goal as any).metadata?.status || (goal as any).status might not be fully typed everywhere yet)
  if ((goal as any).metadata?.status || (goal as any).status === 'COMPLETED') {
    return { status: 'completed', requiredPace: 0, actualPace: 0, badge: 'Completed', projectedDate: null, daysRemaining: 0 };
  }
  // @ts-ignore
  if ((goal as any).metadata?.status || (goal as any).status === 'PAUSED' || (goal as any).metadata?.status || (goal as any).status === 'CANCELED') {
    return { status: 'stalled', requiredPace: 0, actualPace: 0, badge: (goal as any).metadata?.status || (goal as any).status === 'PAUSED' ? 'Paused' : 'Canceled', projectedDate: null, daysRemaining: 0 };
  }

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
  } else if (goal.progress > 0) {
    // If fewer than 2 snapshots exist, compute genuine actual pace from creation timestamp to current date
    const created = goal.createdAt ? new Date(goal.createdAt) : new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    actualPace = Math.max(0, goal.progress / daysSinceCreation);
  } else {
    actualPace = 0;
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
