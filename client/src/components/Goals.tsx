import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export function Goals() {
  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: habits = [], isLoading: habitsLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  if (goalsLoading || habitsLoading) return <div className="p-8 text-zinc-500">Loading goals...</div>;

  const quarterlyGoals = goals.filter(g => g.type === 'quarterly');

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Goals & Habits</h1>
          <p className="text-zinc-400">Track your high-level objectives and daily routines.</p>
        </div>
        <button className="bg-zinc-100 text-zinc-950 px-4 py-2 rounded-md text-sm font-medium hover:bg-white transition-colors">
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Goals List (Takes up 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              Quarterly Goals
            </h2>
            <div className="space-y-4">
              {quarterlyGoals.map(goal => (
                <div key={goal.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-100">{goal.title}</h3>
                      {goal.targetDate && (
                        <div className="flex items-center gap-1.5 text-sm text-zinc-500 mt-1">
                          <Calendar className="w-4 h-4" />
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-accent">{goal.progress}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-500" 
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
              {quarterlyGoals.length === 0 && (
                <div className="text-zinc-500 p-4 bg-zinc-900/20 rounded-lg border border-zinc-800/50 border-dashed text-center">
                  No quarterly goals set.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Habits List (Takes up 1/3) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Habit Tracker
            </h2>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
              {habits.map(habit => (
                <div key={habit.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                  <div>
                    <div className="font-medium text-zinc-200">{habit.name}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">{habit.cadence}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold flex items-center gap-1">
                      🔥 {habit.streak}
                    </div>
                    <button className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 hover:text-green-500 transition-colors">
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {habits.length === 0 && (
                <div className="p-6 text-zinc-500 text-center text-sm">
                  No active habits.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
