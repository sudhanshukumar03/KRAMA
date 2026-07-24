import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, TrendingUp, Calendar, AlertCircle, ArrowUpCircle, XCircle } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';
import type { GoalWithRelations } from '../types/schema';

type GoalPace = {
  status: 'completed' | 'unknown' | 'on_track' | 'behind' | 'stalled' | 'ahead' | 'past_due';
  requiredPace: number;
  actualPace: number;
  badge: string;
  projectedDate: Date | null;
  daysRemaining: number;
};

// Helper to compute pace
function computeGoalPace(goal: GoalWithRelations): GoalPace {
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

  // Compute actual pace from last ~7 days window of snapshots
  let actualPace = 0;
  if (goal.snapshots && goal.snapshots.length >= 2) {
    const sorted = [...goal.snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const daysDiff = Math.max(1, Math.ceil((new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)));
    const progressGained = newest.progress - oldest.progress;
    actualPace = Math.max(0, progressGained / daysDiff);
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

function GoalCard({ goal, depth = 0 }: { goal: GoalWithRelations, depth?: number }) {
  const pace = computeGoalPace(goal);

  return (
    <div className="flex flex-col mb-4">
      <div 
        className={cn(
          "bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-5 transition-colors duration-150 hover:bg-white hover:shadow-sm",
          depth > 0 && "border-l-4 border-l-[#E5E7EB] rounded-l-none"
        )}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] bg-white border border-[#E5E7EB] px-1.5 py-0.5 rounded">
                {goal.type}
              </span>
              <h3 className="text-xl font-bold text-[#0A0A0A]">{goal.title}</h3>
            </div>
            {goal.targetDate && (
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280] font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Target: {new Date(goal.targetDate).toLocaleDateString()}
                {pace.daysRemaining > 0 ? ` (${pace.daysRemaining} days left)` : " (Past due)"}
              </div>
            )}
          </div>
          <span className="text-2xl font-bold text-[#0A0A0A]">{goal.progress}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-[#0A0A0A] transition-all duration-400 ease-out" 
            style={{ width: `${goal.progress}%` }}
          />
        </div>

        {/* Pace Panel */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap gap-x-6 gap-y-2 items-center">
          
          <div className="flex items-center gap-2">
            {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-[#DC2626]" /> :
             pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-[#DC2626]" /> :
             pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#0A0A0A]" /> :
             <CheckCircle2 className="w-4 h-4 text-[#0A0A0A]" />}
            <span className={cn(
              "text-xs font-bold uppercase tracking-widest",
              ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-[#DC2626]" : "text-[#0A0A0A]"
            )}>
              {pace.badge}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-[#6B7280]">
            <span>Required: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(2)}%/day</span>
            <span>Actual: {pace.actualPace.toFixed(2)}%/day</span>
          </div>

          <div className="text-xs font-medium text-[#0A0A0A] ml-auto">
            {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
              <span className="text-[#6B7280]">No recent progress — can't project a date yet.</span>
            ) : pace.projectedDate ? (
              <span>Projected finish: <b>{pace.projectedDate.toLocaleDateString()}</b></span>
            ) : null}
          </div>

        </div>
      </div>
      
      {/* Child Goals */}
      {goal.childGoals && goal.childGoals.length > 0 && (
        <div className="mt-4 pl-6 md:pl-12 space-y-4">
          {goal.childGoals.map(child => (
            <GoalCard key={child.id} goal={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Goals() {
  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: habits = [], isLoading: habitsLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  if (goalsLoading || habitsLoading) return <div className="p-8 text-[#6B7280]">Loading goals...</div>;

  // Find root goals (goals without a parent)
  const rootGoals = goals.filter(g => !g.parentGoalId);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#0A0A0A]">Goals & Habits</h1>
          <p className="text-[#6B7280]">Track your high-level objectives and daily routines.</p>
        </div>
        <BaseButton>New Goal</BaseButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Goals List (Takes up 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#0A0A0A]" />
              Active Goals Tree
            </h2>
            <div className="space-y-6">
              {rootGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
              {rootGoals.length === 0 && (
                <div className="border border-[#E5E7EB] rounded-xl bg-[#FAFAFA] h-64">
                  <EmptyState 
                    icon={Target}
                    description="No goals set."
                    actionLabel="Set Goal"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Habits List (Takes up 1/3) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0A0A0A]" />
              Habit Tracker
            </h2>
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
              <div className="divide-y divide-[#E5E7EB] flex-1">
                {habits.map(habit => (
                  <div key={habit.id} className="p-4 flex items-center justify-between hover:bg-[#F3F4F6] transition-colors duration-100 cursor-pointer">
                    <div>
                      <div className="font-bold text-[#0A0A0A]">{habit.name}</div>
                      <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mt-0.5">{habit.cadence}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold flex items-center gap-1 text-[#0A0A0A]">
                        🔥 {habit.streak}
                      </div>
                      <button className="w-8 h-8 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white hover:border-[#0A0A0A] transition-colors focus:outline-none">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {habits.length === 0 && (
                  <div className="h-48">
                    <EmptyState 
                      icon={TrendingUp}
                      description="No active habits."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
