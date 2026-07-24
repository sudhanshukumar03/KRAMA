import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';


export function Goals() {
  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: habits = [], isLoading: habitsLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  if (goalsLoading || habitsLoading) return <div className="p-8 text-[#6B7280]">Loading goals...</div>;

  const quarterlyGoals = goals.filter(g => g.type === 'quarterly');

  return (
    <div className="p-8 max-w-5xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150">
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
              Quarterly Goals
            </h2>
            <div className="space-y-4">
              {quarterlyGoals.map(goal => (
                <div key={goal.id} className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-white hover:shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#0A0A0A]">{goal.title}</h3>
                      {goal.targetDate && (
                        <div className="flex items-center gap-1.5 text-sm text-[#6B7280] mt-1 font-medium">
                          <Calendar className="w-4 h-4" />
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-[#0A0A0A]">{goal.progress}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0A0A0A] transition-all duration-400 ease-out" 
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
              {quarterlyGoals.length === 0 && (
                <div className="border border-[#E5E7EB] rounded-xl bg-[#FAFAFA] h-64">
                  <EmptyState 
                    icon={Target}
                    description="No quarterly goals set."
                    actionLabel="Set Goal"
                    onAction={() => alert('New Goal')}
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
                      <button className="w-8 h-8 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white hover:border-[#0A0A0A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-1">
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
