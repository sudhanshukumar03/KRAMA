import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, TrendingUp, Calendar, AlertCircle, ArrowUpCircle, XCircle, Plus, Sparkles, ArrowRight, Flame, Check, Trash2 } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import type { GoalWithRelations } from '../types/schema';
import { computeGoalPace } from '../lib/goalUtils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function GoalCard({ goal, depth = 0 }: { goal: GoalWithRelations, depth?: number }) {
  const queryClient = useQueryClient();
  const pace = computeGoalPace(goal);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [sliderVal, setSliderVal] = useState(goal.progress);

  const updateGoalMutation = useMutation({
    mutationFn: (newProgress: number) => api.goals.update(goal.id, { progress: newProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsEditingProgress(false);
    }
  });

  const handleDeleteGoal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.goals.delete(goal.id);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(`Deleted "${goal.title}"`, {
        action: res?.snapshot ? {
          label: 'Undo',
          onClick: async () => {
            await api.goals.restore(res.snapshot);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            toast.success(`Restored "${goal.title}"`);
          }
        } : undefined
      });
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  // Historical points for the mini trendline from live PostgreSQL snapshots
  const trendPoints = (goal.snapshots && goal.snapshots.length > 0)
    ? [...goal.snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(s => s.progress)
    : [0, goal.progress];

  return (
    <div className="flex flex-col mb-4 group/goal">
      <div 
        className={cn(
          "bg-white border border-[#E5E8EC] rounded-xl p-5 transition-all duration-150 hover:border-[#0D9488] shadow-sm",
          depth > 0 && "border-l-4 border-l-[#E5E8EC] rounded-l-none bg-[#F8F9FB]/60",
          depth === 0 && "border-l-2 border-l-[#0D9488]"
        )}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.02em] text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-2 py-0.5 rounded">
                {goal.type}
              </span>
              <h3 className="text-[18px] font-medium text-[#111827] group-hover/goal:text-[#0D9488] transition-colors">{goal.title}</h3>
            </div>
            {goal.targetDate && (
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280] font-mono">
                <Calendar className="w-3.5 h-3.5 stroke-[1.5]" />
                Target: {new Date(goal.targetDate).toLocaleDateString()}
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[10px]",
                  pace.daysRemaining > 0 ? "bg-[#F8F9FB] text-[#6B7280]" : "bg-red-50 text-[#DC2626] font-medium"
                )}>
                  {pace.daysRemaining > 0 ? `${pace.daysRemaining}d left` : "Past due"}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Interactive Progress Editor Toggle */}
            <button 
              onClick={() => setIsEditingProgress(!isEditingProgress)}
              className="px-2.5 py-1 rounded-md bg-[#F8F9FB] hover:bg-[#0D9488]/10 text-[#6B7280] hover:text-[#0D9488] border border-[#E5E8EC] text-xs font-medium transition-colors"
            >
              {isEditingProgress ? 'Done' : 'Update Pace'}
            </button>
            <span className="text-2xl font-medium text-[#111827] font-mono tracking-tight">{goal.progress}%</span>
            <button
              onClick={handleDeleteGoal}
              className="opacity-0 group-hover/goal:opacity-100 p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-red-50 rounded transition-all duration-150 ml-1"
              title="Delete goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Progress Bar or Slider */}
        {isEditingProgress ? (
          <div className="mb-4 p-3 bg-[#F8F9FB] rounded-lg border border-[#0D9488]/30 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono text-[#6B7280] mb-2">
              <span>Adjust current completion percentage:</span>
              <span className="font-bold text-[#0D9488] text-sm">{sliderVal}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sliderVal} 
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="w-full accent-[#0D9488] cursor-pointer" 
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setIsEditingProgress(false)} 
                className="px-2.5 py-1 text-xs text-[#6B7280] hover:text-[#111827]"
              >
                Cancel
              </button>
              <button 
                onClick={() => updateGoalMutation.mutate(sliderVal)} 
                className="px-3 py-1 bg-[#0D9488] text-white rounded text-xs font-medium hover:bg-[#0F766E] transition-colors"
              >
                Save Snapshot
              </button>
            </div>
          </div>
        ) : (
          <div className="h-2 w-full bg-[#E5E8EC] rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-[#0D9488] transition-all duration-400 ease-out" 
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        )}

        {/* Pace Panel with NEW Mini Trendline */}
        <div className="bg-[#F8F9FB] border border-[#E5E8EC] rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-[#DC2626] stroke-[1.75]" /> :
               pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-[#DC2626] stroke-[1.75]" /> :
               pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#0D9488] stroke-[1.75]" /> :
               <CheckCircle2 className="w-4 h-4 text-[#0D9488] stroke-[1.75]" />}
              <span className={cn(
                "text-xs font-mono font-bold uppercase tracking-[0.02em]",
                ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-[#DC2626]" : "text-[#111827]"
              )}>
                {pace.badge}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#6B7280] font-mono">
              <span>Req: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(1)}%/d</span>
              <span>Act: {pace.actualPace.toFixed(1)}%/d</span>
            </div>
          </div>

          {/* NEW: Mini Trendline Sparkline & Projection */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-[#E5E8EC]/60">
            <div className="flex items-end gap-1 h-5 px-2 bg-white border border-[#E5E8EC] rounded shadow-2xs" title="Recent 5-step snapshot trend">
              {trendPoints.map((val, i) => (
                <div key={i} className="w-1.5 bg-[#0D9488] rounded-t-2xs" style={{ height: `${Math.max(15, (val / 100) * 100)}%` }} />
              ))}
            </div>

            <div className="text-xs font-medium text-[#111827]">
              {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
                <span className="text-[#6B7280] font-normal">Stalled progress</span>
              ) : pace.projectedDate ? (
                <span className="font-mono">Est: <b className="font-bold text-[#0D9488]">{pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</b></span>
              ) : null}
            </div>
          </div>

        </div>
      </div>
      
      {/* Child Goals */}
      {goal.childGoals && goal.childGoals.length > 0 && (
        <div className="mt-3 pl-6 md:pl-10 space-y-3">
          {goal.childGoals.map((child: GoalWithRelations) => (
            <GoalCard key={child.id} goal={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Goals() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: habits = [], isLoading: habitsLoading, isError: habitsError } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  const queryClient = useQueryClient();
  const toggleHabitMutation = useMutation({
    mutationFn: (id: string) => api.habits.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const handleCreateGoal = async () => {
    try {
      const title = 'New Q3 Strategic Objective';
      await api.goals.create({
        title,
        progress: 0,
        targetDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        status: 'on_track'
      });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(`Created "${title}"`, {
        description: 'Click goal card to edit objectives and progress.'
      });
    } catch (err) {
      toast.error('Failed to create goal');
    }
  };

  if (goalsLoading || habitsLoading) {
    return <LoadingState variant="goals" title="Loading Goals & OKRs..." description="Calculating progress velocities and habit links..." />;
  }

  if (goalsError || habitsError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Goals & OKRs"
          message="Could not retrieve goals and habit data from the server. Please verify your connection."
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['habits'] });
          }}
        />
      </div>
    );
  }

  const rootGoals = goals.filter(g => !g.parentGoalId);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-20">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Goals & OKRs</h1>
            <span className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-[0.02em] flex items-center gap-1">
              <Sparkles className="w-3 h-3 stroke-[2]" /> Q3 Strategic Horizon
            </span>
          </div>
          <p className="text-[13px] text-[#6B7280]">Track high-level quarterly objectives, pacing metrics, and linked daily routines.</p>
        </div>
        <BaseButton onClick={handleCreateGoal}>
          <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> New Goal
        </BaseButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Goals List (Takes up 2/3) - Category Tile: Goals (#0D9488 Teal) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Target className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <h2 className="text-[18px] font-medium text-[#111827]">Active Goals Tree</h2>
                <p className="text-xs text-[#6B7280]">Interactive snapshots and automatic pacing projections</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#6B7280] bg-[#F8F9FB] border border-[#E5E8EC] px-2.5 py-1 rounded font-medium">
              {rootGoals.length} strategic OKRs
            </span>
          </div>
          
          <div className="space-y-4 pt-2">
            {rootGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
            {rootGoals.length === 0 && (
              <div className="border border-[#E5E8EC] rounded-xl bg-white h-64 flex items-center justify-center shadow-sm">
                <EmptyState 
                  icon={Target}
                  description="No goals set."
                  actionLabel="Set Goal"
                  onAction={handleCreateGoal}
                />
              </div>
            )}
          </div>
        </div>

        {/* Habits List Widget (Takes up 1/3) - Category Tile: Habits (#EA580C Orange) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-sm">
                <TrendingUp className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <h2 className="text-[18px] font-medium text-[#111827]">Habits Overview</h2>
                <p className="text-xs text-[#6B7280]">Daily consistency drivers</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/app/habits')}
              className="text-xs font-medium text-[#EA580C] hover:underline flex items-center gap-1"
            >
              Full tracker <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="bg-white border border-[#E5E8EC] rounded-xl overflow-hidden shadow-sm pt-1">
            <div className="divide-y divide-[#E5E8EC]">
              {habits.map(habit => {
                const todayStr = new Date().toISOString().split('T')[0] || '';
                const isCompletedToday = habit.completions?.some(c => c.date.toString().startsWith(todayStr) && c.completed) || 
                  (habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString());
                return (
                  <div key={habit.id} className="py-3 px-4 flex items-center justify-between hover:bg-[#F8F9FB] transition-colors duration-100 group">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleHabitMutation.mutate(habit.id); }}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center border transition-all duration-150 shrink-0 cursor-pointer",
                          isCompletedToday 
                            ? "bg-[#2563EB] border-[#2563EB] text-white" 
                            : "border-[#D1D5DB] bg-white group-hover:border-[#9CA3AF]"
                        )}
                      >
                        {isCompletedToday && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </button>
                      <div className="min-w-0" onClick={() => navigate('/app/habits')} style={{ cursor: 'pointer' }}>
                        <div className={cn(
                          "font-medium text-sm leading-tight truncate transition-colors",
                          isCompletedToday ? "line-through text-[#9CA3AF]" : "text-[#111827] group-hover:text-[#EA580C]"
                        )}>{habit.name}</div>
                        <div className="text-[10px] text-[#6B7280] font-mono uppercase tracking-[0.02em] mt-0.5">{habit.timeOfDay || 'Daily'} • {habit.duration || 15}m</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => navigate('/app/habits')}>
                      <div className="text-xs font-mono font-bold flex items-center gap-1 text-[#C2410C] bg-[#FFF7ED] px-2 py-0.5 rounded border border-[#FFEDD5]">
                        <Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[2]" /> {habit.streak}d
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
              {habits.length === 0 && (
                <div className="py-8">
                  <EmptyState 
                    icon={TrendingUp}
                    description="No active habits."
                  />
                </div>
              )}
            </div>
            <div className="p-3 bg-[#F8F9FB] border-t border-[#E5E8EC] text-center">
              <button onClick={() => navigate('/app/habits')} className="text-xs font-medium text-[#111827] hover:text-[#EA580C] transition-colors">
                View 30-Day Heatmap Tracker &rarr;
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
