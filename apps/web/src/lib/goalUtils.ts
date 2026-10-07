import type { GoalWithRelations } from '../types/schema';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export type GoalPace = {
  status: 'completed' | 'unknown' | 'on_track' | 'behind' | 'stalled' | 'ahead' | 'past_due';
  requiredPace: number;
  actualPace: number;
  badge: string;
  projectedDate: Date | null;
  daysRemaining: number;
  isDueToday: boolean;
};

// Helper to compute pace strictly from real snapshot deltas or creation timestamps
export function computeGoalPace(goal: GoalWithRelations, today = new Date()): GoalPace {
  const metadata = goal.metadata && typeof goal.metadata === 'object' && !Array.isArray(goal.metadata)
    ? goal.metadata : {};
  const effectiveStatus = metadata.status ?? (goal as GoalWithRelations & { status?: string }).status;
  // Deadlines are calendar dates. Preserve their stored day rather than shifting
  // UTC midnight into the preceding day in western timezones.
  const targetDate = goal.targetDate;
  const target = targetDate ? parseISO((typeof targetDate === 'string' ? targetDate : targetDate.toISOString()).slice(0, 10)) : null;
  const dayDifference = target && Number.isFinite(target.getTime()) ? differenceInCalendarDays(target, today) : null;
  const isDueToday = dayDifference === 0;
  const daysRemaining = Math.max(0, dayDifference ?? 0);
  const deadline = { daysRemaining, isDueToday };

  if (effectiveStatus === 'COMPLETED') {
    return { status: 'completed', requiredPace: 0, actualPace: 0, badge: 'Completed', projectedDate: null, ...deadline };
  }
  if (effectiveStatus === 'PAUSED' || effectiveStatus === 'CANCELED') {
    return { status: 'stalled', requiredPace: 0, actualPace: 0, badge: effectiveStatus === 'PAUSED' ? 'Paused' : 'Canceled', projectedDate: null, ...deadline };
  }

  if (goal.progress >= 100) {
    return { status: 'completed', requiredPace: 0, actualPace: 0, badge: 'Completed', projectedDate: null, ...deadline };
  }
  
  if (dayDifference === null) {
    return { status: 'unknown', requiredPace: 0, actualPace: 0, badge: 'No Target Date', projectedDate: null, ...deadline };
  }

  const requiredPace = dayDifference >= 0 ? (100 - goal.progress) / Math.max(1, daysRemaining) : Infinity;

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
  if (dayDifference < 0 && goal.progress < 100) {
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
    ...deadline
  };
}
