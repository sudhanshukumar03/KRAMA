import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { CheckCircle2, Clock, TrendingUp, Flame, Sparkles, Plus, Sun, Moon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import { getIconForString } from '../lib/iconMap';

// Helper to generate a 30-day contribution heatmap pattern for a habit from real completions
function generate30DayPattern(habit: any) {
  const days = [];
  const today = new Date();
  const createdAt = habit.createdAt ? new Date(habit.createdAt) : new Date(0);
  const createdAtStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).getTime();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    if (d.getTime() < createdAtStart) {
      days.push({ level: -1, offset: i, dateStr: d.toISOString().split('T')[0] });
      continue;
    }
    const dStr = d.toISOString().split('T')[0] || '';
    const completed = habit.completions?.some((c: any) => c.date.toString().startsWith(dStr) && c.completed) ||
      (i === 0 && habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === today.toDateString());
    
    days.push({ level: completed ? 3 : 0, offset: i, dateStr: dStr });
  }
  return days;
}

export function HabitTracker() {
  const queryClient = useQueryClient();
  const { data: habits = [], isLoading, isError } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.habits.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  if (isLoading) return <LoadingState variant="habit-tracker" title="Loading Habits..." description="Syncing streak logs and daily routines..." />;
  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Habits"
          message="Could not retrieve habit and streak logs from the server. Please check your connection."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['habits'] })}
        />
      </div>
    );
  }

  const categoriesMap = new Map<string, number>();
  habits.forEach(h => {
    const cat = h.category || 'Uncategorized';
    categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
  });
  const categories = Array.from(categoriesMap.entries()).sort((a, b) => b[1] - a[1]);

  const filteredHabits = activeCategory 
    ? habits.filter(h => (h.category || 'Uncategorized') === activeCategory)
    : habits;

  const morningHabits = habits.filter(h => h.timeOfDay === 'morning');
  const eveningHabits = habits.filter(h => h.timeOfDay === 'evening');

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const isHabitCompleted = (habit: any) => {
    const todayStr = new Date().toISOString().split('T')[0] || '';
    return habit.completions?.some((c: any) => c.date.toString().startsWith(todayStr) && c.completed) ||
      (habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString());
  };

  const toggleTodayCompletion = (id: string, name?: string, currentlyCompleted?: boolean) => {
    if (!currentlyCompleted) {
      toast.success(`Habit Completed!`, {
        description: `You checked off "${name || 'Routine'}". Keep the streak going!`
      });
    } else {
      toast.info(`Habit unchecked`, {
        description: `Removed today's completion for "${name || 'Routine'}".`
      });
    }
    completeMutation.mutate(id);
  };

  const completedCount = habits.filter(h => isHabitCompleted(h)).length;
  const totalHabits = habits.length || 1;
  const progressPct = Math.round((completedCount / totalHabits) * 100);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-canvas animate-in fade-in duration-150 overflow-y-auto lg:overflow-hidden">
      
      {/* LEFT COLUMN: Main Content */}
      <div className="flex-1 lg:h-full lg:overflow-y-auto p-4 sm:p-6 lg:p-12 relative border-b lg:border-b-0 lg:border-r border-[#E5E8EC]">
        
        {/* Header with Category Tile (#EA580C Orange) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-sm">
              <TrendingUp className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Habits</h1>
                <span className="bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20 px-2 py-0.2 rounded text-[10px] font-medium uppercase tracking-[0.02em] flex items-center gap-1 font-mono">
                  <Flame className="w-3 h-3 text-[#EA580C] stroke-[2]" /> {habits.length} routines
                </span>
              </div>
              <p className="text-[13px] text-[#6B7280]">Manage, track, and maintain consistency across your daily routines.</p>
            </div>
          </div>
          <BaseButton onClick={() => alert('Create New Habit')}>
            <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> New Habit
          </BaseButton>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium tracking-[0.02em] transition-all border shadow-2xs cursor-pointer",
              activeCategory === null ? "bg-[#111827] text-white border-[#111827]" : "bg-white text-[#6B7280] border-[#E5E8EC] hover:border-[#111827] hover:text-[#111827]"
            )}
          >
            All ({habits.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium tracking-[0.02em] transition-all border flex items-center gap-1.5 shadow-2xs cursor-pointer",
                activeCategory === cat ? "bg-[#111827] text-white border-[#111827]" : "bg-white text-[#6B7280] border-[#E5E8EC] hover:border-[#111827] hover:text-[#111827]"
              )}
            >
              {cat} <span className={cn("px-1.5 py-0.2 rounded-full text-[10px] font-mono", activeCategory === cat ? "bg-white/20" : "bg-[#F8F9FB] text-[#6B7280] border border-[#E5E8EC]")}>{count}</span>
            </button>
          ))}
        </div>

        {/* Habit Cards Grid with NEW 30-Day Activity Heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-10">
          {filteredHabits.map(habit => {
            const Icon = getIconForString(habit.name);
            const heatmap = generate30DayPattern(habit);

            return (
              <div key={habit.id} className="bg-white border border-[#E5E8EC] rounded-xl p-5 hover:border-[#111827] transition-all cursor-pointer group flex flex-col justify-between shadow-sm gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] flex items-center justify-center shrink-0 group-hover:border-[#111827] group-hover:bg-[#111827] transition-all shadow-2xs">
                    <Icon className="w-5 h-5 text-[#111827] group-hover:text-white transition-colors stroke-[1.75]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium text-[16px] text-[#111827] truncate group-hover:text-[#111827] transition-colors">{habit.name}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] font-mono text-[11px] font-bold tracking-tight shrink-0">
                        <Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[2]" /> {habit.streak}d
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6B7280] font-medium">{habit.category || 'Uncategorized'}</span>
                      <span className="text-[#E5E8EC] font-light">•</span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.02em] text-[#6B7280] border border-[#E5E8EC] bg-[#F8F9FB] px-1.5 py-0.2 rounded">
                        {habit.difficulty || 'Medium'}
                      </span>
                      <span className="text-[#E5E8EC] font-light">•</span>
                      <span className="text-[11px] text-[#6B7280] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 stroke-[1.5]" /> {habit.duration || 15}m
                      </span>
                    </div>
                  </div>
                </div>

                {/* NEW: 30-Day Activity Heatmap Grid */}
                <div className="pt-3 border-t border-[#E5E8EC]/60">
                  <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] uppercase font-mono mb-1.5">
                    <span>30-Day Activity Horizon</span>
                    <span>Last 30d</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {heatmap.map((item, i) => (
                      <div 
                        key={i} 
                        title={`Day ${item.dateStr}: ${item.level === -1 ? 'Not created yet' : item.level === 0 ? 'No activity' : 'Completed'}`}
                        className={cn(
                          "w-2 h-4 rounded-xs transition-colors",
                          item.level === 3 ? "bg-[#EA580C]" 
                          : item.level === -1 ? "bg-[#F3F4F6] border border-[#E5E8EC]/40 opacity-40" 
                          : "bg-[#F8F9FB] border border-[#E5E8EC]/60"
                        )} 
                      />
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
          {filteredHabits.length === 0 && (
            <div className="col-span-full py-12">
              <EmptyState icon={CheckCircle2} description="No habits found in this category" />
            </div>
          )}
        </div>

        {/* Routine Section */}
        <div>
          <h2 className="text-[18px] font-medium tracking-tight text-[#111827] mb-4">Daily Routines Breakdown</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Morning */}
            <div className="bg-white border border-[#E5E8EC] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.02em] mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#111827] font-semibold"><Sun className="w-3.5 h-3.5 text-[#EA580C]" />Morning Routine</span>
                <span className="font-mono text-[10px] text-[#9CA3AF]">{morningHabits.length} habits</span>
              </h3>
              <div className="space-y-2">
                {morningHabits.map(habit => (
                  <div key={habit.id} className="flex justify-between items-center bg-[#F8F9FB] border border-[#E5E8EC] p-3 rounded-lg hover:border-[#111827] transition-colors group">
                    <span className="text-sm font-medium text-[#111827] group-hover:text-[#111827] transition-colors">{habit.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#6B7280] font-mono">{habit.duration || 15}m</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] font-mono text-[10px] font-bold tracking-tight"><Flame className="w-3 h-3 text-[#EA580C] stroke-[2]" /> {habit.streak}d</span>
                    </div>
                  </div>
                ))}
                {morningHabits.length === 0 && <span className="text-xs text-[#9CA3AF]">No morning habits configured.</span>}
              </div>
            </div>

            {/* Evening */}
            <div className="bg-white border border-[#E5E8EC] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.02em] mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#111827] font-semibold"><Moon className="w-3.5 h-3.5 text-[#7C3AED]" />Evening Routine</span>
                <span className="font-mono text-[10px] text-[#9CA3AF]">{eveningHabits.length} habits</span>
              </h3>
              <div className="space-y-2">
                {eveningHabits.map(habit => (
                  <div key={habit.id} className="flex justify-between items-center bg-[#F8F9FB] border border-[#E5E8EC] p-3 rounded-lg hover:border-[#111827] transition-colors group">
                    <span className="text-sm font-medium text-[#111827] group-hover:text-[#111827] transition-colors">{habit.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#6B7280] font-mono">{habit.duration || 15}m</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] font-mono text-[10px] font-bold tracking-tight"><Flame className="w-3 h-3 text-[#EA580C] stroke-[2]" /> {habit.streak}d</span>
                    </div>
                  </div>
                ))}
                {eveningHabits.length === 0 && <span className="text-xs text-[#9CA3AF]">No evening habits configured.</span>}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Daily Checklist Widget (30% on desktop, 100% on mobile) */}
      <div className="w-full lg:w-[30%] bg-[#F8F9FB] lg:h-full lg:overflow-y-auto p-4 sm:p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-[#E5E8EC]">
        <div className="bg-white border border-[#E5E8EC] shadow-sm rounded-xl p-4 sm:p-6 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#EA580C]" />
          
          <div className="flex items-center justify-between mt-1 mb-1">
            <span className="text-[11px] font-medium text-[#EA580C] uppercase tracking-[0.02em] flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 fill-[#EA580C]" /> Today's Tracker
            </span>
            <span className="text-xs font-mono font-bold text-[#111827] bg-[#F8F9FB] px-2 py-0.5 rounded border border-[#E5E8EC]">
              {completedCount}/{totalHabits} Done
            </span>
          </div>
          <h2 className="text-[18px] font-medium text-[#111827] mb-6">{today}</h2>

          <div className="space-y-3">
            {habits.map((habit, index) => {
              const isCompleted = isHabitCompleted(habit);

              return (
                <div 
                  key={habit.id} 
                  onClick={() => toggleTodayCompletion(habit.id, habit.name, isCompleted)}
                  className={cn(
                    "flex items-center gap-3 group cursor-pointer p-2 rounded-lg transition-all border",
                    isCompleted ? "bg-[#F8F9FB] border-transparent" : "bg-white border-[#E5E8EC] hover:border-[#111827] shadow-2xs"
                  )}
                >
                  <div className="w-5 text-right text-[11px] font-mono text-[#9CA3AF]">
                    {(index + 1).toString().padStart(2, '0')}
                  </div>
                  <button className="focus:outline-none">
                    {isCompleted ? (
                      <div className="w-5 h-5 rounded-md bg-[#111827] text-white flex items-center justify-center shadow-2xs transition-all animate-in zoom-in-50 duration-150">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md border border-[#D1D5DB] bg-white group-hover:border-[#111827] transition-all flex items-center justify-center shadow-2xs" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm transition-colors min-w-0 truncate block",
                      isCompleted ? "text-[#9CA3AF] line-through decoration-[#D1D5DB]" : "text-[#111827] font-medium group-hover:text-[#111827]"
                    )}>
                      {habit.name}
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-mono">{habit.timeOfDay} • {habit.duration || 15}m</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-[#E5E8EC] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6B7280] font-medium">Daily Completion Rate</span>
              <span className="text-sm font-medium text-[#111827] font-mono">{progressPct}%</span>
            </div>
            <div className="h-2 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/40">
              <div className="h-full bg-[#EA580C] transition-all duration-400 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
