import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';
import { getIconForString } from '../lib/iconMap';

export function HabitTracker() {
  const { data: habits = [], isLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading habits...</div>;

  // Compute categories
  const categoriesMap = new Map<string, number>();
  habits.forEach(h => {
    const cat = h.category || 'Uncategorized';
    categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
  });
  const categories = Array.from(categoriesMap.entries()).sort((a, b) => b[1] - a[1]);

  const filteredHabits = activeCategory 
    ? habits.filter(h => (h.category || 'Uncategorized') === activeCategory)
    : habits;

  // Compute morning / evening routines
  const morningHabits = habits.filter(h => h.timeOfDay === 'morning');
  const eveningHabits = habits.filter(h => h.timeOfDay === 'evening');

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex h-full w-full bg-white animate-in fade-in duration-150">
      
      {/* LEFT COLUMN: Main Content */}
      <div className="flex-1 h-full overflow-y-auto p-8 lg:p-12 relative border-r border-[#E5E7EB]">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] mb-2">Habits</h1>
            <p className="text-[#6B7280]">Manage and track your routines.</p>
          </div>
          <BaseButton>New Habit</BaseButton>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-colors border",
              activeCategory === null ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[#FAFAFA] text-[#6B7280] border-[#E5E7EB] hover:border-[#D1D5DB]"
            )}
          >
            All ({habits.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-colors border flex items-center gap-1.5",
                activeCategory === cat ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[#FAFAFA] text-[#6B7280] border-[#E5E7EB] hover:border-[#D1D5DB]"
              )}
            >
              {cat} <span className={cn("px-1.5 py-0.5 rounded-full text-[9px]", activeCategory === cat ? "bg-white/20" : "bg-[#E5E7EB] text-[#6B7280]")}>{count}</span>
            </button>
          ))}
        </div>

        {/* Habit Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-12">
          {filteredHabits.map(habit => {
            const Icon = getIconForString(habit.name);
            return (
              <div key={habit.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 hover:border-[#0A0A0A] transition-colors cursor-pointer group flex items-start gap-4 shadow-sm hover:shadow-md">
                <div className="w-12 h-12 bg-[#FAFAFA] rounded-full border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0A0A0A] group-hover:border-[#0A0A0A] transition-colors">
                  <Icon className="w-5 h-5 text-[#0A0A0A] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#0A0A0A] mb-1">{habit.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-[#6B7280]">{habit.category || 'Uncategorized'}</span>
                    <span className="text-[#E5E7EB] font-light">•</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border border-[#E5E7EB] bg-[#FAFAFA] px-1.5 py-0.5 rounded">
                      {habit.difficulty || 'Medium'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {habit.duration || 15} min
                    </div>
                    <div className="flex items-center gap-1">
                      🔥 {habit.streak}
                    </div>
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
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight text-[#0A0A0A] mb-6">Daily Routines</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Morning */}
            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-6">
              <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 flex items-center gap-2">
                🌅 Morning Routine
              </h3>
              <div className="space-y-3">
                {morningHabits.map(habit => (
                  <div key={habit.id} className="flex justify-between items-center bg-white border border-[#E5E7EB] p-3 rounded-xl">
                    <span className="text-sm font-bold text-[#0A0A0A]">{habit.name}</span>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{habit.duration || 15}m</span>
                  </div>
                ))}
                {morningHabits.length === 0 && <span className="text-xs text-[#9CA3AF]">No morning habits configured.</span>}
              </div>
            </div>

            {/* Evening */}
            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-6">
              <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 flex items-center gap-2">
                🌙 Evening Routine
              </h3>
              <div className="space-y-3">
                {eveningHabits.map(habit => (
                  <div key={habit.id} className="flex justify-between items-center bg-white border border-[#E5E7EB] p-3 rounded-xl">
                    <span className="text-sm font-bold text-[#0A0A0A]">{habit.name}</span>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{habit.duration || 15}m</span>
                  </div>
                ))}
                {eveningHabits.length === 0 && <span className="text-xs text-[#9CA3AF]">No evening habits configured.</span>}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Daily Checklist Widget (30%) */}
      <div className="w-[30%] bg-[#FAFAFA] h-full overflow-y-auto p-8 border-l border-[#E5E7EB] hidden lg:block">
        <div className="bg-white border border-[#0A0A0A] shadow-md rounded-2xl p-6 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-[#0A0A0A]" />
          
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1 mt-2">Today's Tracker</div>
          <h2 className="text-xl font-bold text-[#0A0A0A] mb-6">{today}</h2>

          <div className="space-y-4">
            {habits.map((habit, index) => {
              // Mock completed state: randomly true for some, purely visual
              const isCompleted = index % 2 === 0;

              return (
                <div key={habit.id} className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-5 text-right text-[10px] font-bold text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors">
                    {(index + 1).toString().padStart(2, '0')}
                  </div>
                  <button className="focus:outline-none">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#0A0A0A]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#D1D5DB] group-hover:text-[#0A0A0A] transition-colors" />
                    )}
                  </button>
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted ? "text-[#9CA3AF] line-through decoration-[#E5E7EB]" : "text-[#0A0A0A]"
                  )}>
                    {habit.name}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-[#E5E7EB] border-dashed flex justify-between items-center">
            <span className="text-xs font-bold text-[#6B7280]">Progress</span>
            <span className="text-sm font-bold text-[#0A0A0A]">{Math.round((habits.length / 2) / habits.length * 100)}%</span>
          </div>

        </div>
      </div>

    </div>
  );
}
