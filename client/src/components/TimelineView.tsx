import { useState } from 'react';
import { CalendarCheck, Clock, MoreHorizontal, Play, Brain, Flame, Target } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';
import { mockHabits } from '../api/mockData';

// Generate some mock timeline events that span the day
const MOCK_EVENTS = [
  { id: 'ev-1', title: 'Deep Work: Feature Architecture', time: '09:00 AM', duration: '2h', type: 'deep_work', icon: Brain, status: 'completed', urgent: false },
  { id: 'ev-2', title: 'Daily Standup', time: '11:00 AM', duration: '30m', type: 'meeting', icon: Target, status: 'completed', urgent: false },
  { id: 'ev-3', title: 'Code Review: PR #42', time: '11:30 AM', duration: '45m', type: 'task', icon: Play, status: 'in_progress', urgent: true },
  { id: 'ev-4', title: 'Lunch Break', time: '12:30 PM', duration: '1h', type: 'break', icon: Clock, status: 'upcoming', urgent: false },
  { id: 'ev-5', title: 'Client Sync', time: '02:00 PM', duration: '45m', type: 'meeting', icon: Target, status: 'upcoming', urgent: false },
  { id: 'ev-6', title: 'Deep Work: Implementation', time: '03:00 PM', duration: '2.5h', type: 'deep_work', icon: Brain, status: 'upcoming', urgent: false },
];

export function TimelineView() {
  const [currentTime] = useState(new Date());

  return (
    <div className="flex h-full w-full animate-in fade-in duration-150">
      {/* Left Column: Timeline */}
      <div className="flex-1 h-full overflow-y-auto p-8 relative">
        <div className="max-w-2xl mx-auto w-full">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">Today</h1>
              <p className="text-[#6B7280] mt-1">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <BaseButton>Plan Day</BaseButton>
          </div>

          <div className="relative pl-8 mt-12 pb-24">
            {/* The vertical timeline axis */}
            <div className="absolute top-0 bottom-0 left-0 w-px bg-[#E5E7EB]" />

            {/* "Now" Indicator (Static placement for mock purposes, e.g., between 11:30 and 12:30) */}
            <div className="absolute left-0 w-full flex items-center top-[270px] z-10 -ml-1">
               <div className="w-2 h-2 rounded-full bg-[#0A0A0A] ring-4 ring-white" />
               <div className="flex-1 h-px bg-[#0A0A0A]" />
               <div className="ml-2 bg-[#0A0A0A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase">Now</div>
            </div>

            <div className="space-y-8 relative z-0">
              {MOCK_EVENTS.map((ev) => {
                const Icon = ev.icon;
                const isUrgent = ev.urgent;
                const isPast = ev.status === 'completed';

                return (
                  <div key={ev.id} className="relative group">
                    {/* The timeline dot */}
                    <div className={cn(
                      "absolute -left-[37px] w-2.5 h-2.5 rounded-full top-4 ring-4 ring-white transition-colors",
                      isPast ? "bg-[#D1D5DB]" : (isUrgent ? "bg-[#DC2626]" : "bg-[#0A0A0A]")
                    )} />
                    
                    {/* The Card */}
                    <div className={cn(
                      "bg-white border rounded-xl p-4 flex gap-4 items-start transition-all",
                      isPast ? "border-[#F3F4F6] opacity-60" : "border-[#E5E7EB]",
                      "hover:shadow-sm hover:border-[#D1D5DB]"
                    )}>
                      <div className="bg-[#FAFAFA] border border-[#E5E7EB] w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className={cn("w-4 h-4", isUrgent ? "text-[#DC2626]" : "text-[#0A0A0A]")} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={cn("font-bold text-base leading-tight mt-0.5", isUrgent ? "text-[#DC2626]" : "text-[#0A0A0A]")}>
                            {ev.title}
                          </h3>
                          <span className={cn(
                            "text-xs font-medium whitespace-nowrap ml-4 mt-0.5",
                            isUrgent ? "text-[#DC2626]" : "text-[#6B7280]"
                          )}>
                            {ev.time} <span className="text-[#D1D5DB] mx-1">•</span> {ev.duration}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 mt-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] bg-[#FAFAFA] border border-[#E5E7EB] px-1.5 py-0.5 rounded">
                            {ev.type.replace('_', ' ')}
                          </span>
                          {ev.status === 'in_progress' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A] bg-[#F3F4F6] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                              In Progress
                            </span>
                          )}
                        </div>
                      </div>

                      <button className="text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors p-1 rounded-md hover:bg-[#F3F4F6] opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Widgets */}
      <div className="w-80 border-l border-[#E5E7EB] bg-[#FAFAFA] h-full overflow-y-auto p-6 hidden lg:block">
        
        {/* Habit Widget */}
        <div className="mb-8">
          <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarCheck className="w-3.5 h-3.5" />
            Today's Habits
          </h4>
          <div className="space-y-2">
            {mockHabits.map(habit => (
              <div key={habit.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex justify-between items-center group cursor-pointer hover:border-[#D1D5DB] transition-colors">
                <span className="text-sm font-medium text-[#0A0A0A]">{habit.name}</span>
                <div className="flex items-center gap-1.5">
                  <Flame className={cn("w-3.5 h-3.5", habit.streak > 0 ? "text-[#0A0A0A]" : "text-[#D1D5DB]")} />
                  <span className="text-xs font-bold text-[#0A0A0A]">{habit.streak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Widget */}
        <div>
          <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-3.5 h-3.5" />
            Execution Stats
          </h4>
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
            <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Deep Work Logged</div>
            <div className="text-3xl font-bold text-[#0A0A0A]">2.5<span className="text-base font-medium text-[#6B7280]">h</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
