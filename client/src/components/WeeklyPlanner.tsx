import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, Settings, Check, ChevronLeft, ChevronRight, Play, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { getIconForString } from '../lib/iconMap';

// Helper for generating calendar grid (static mock for visual)
const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function WeeklyPlanner() {
  const { data: issues = [], isLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: dailyLogs = [] } = useQuery({ queryKey: ['dailyLogs'], queryFn: api.dailyLogs.list });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading planner...</div>;

  // Filters for schedule
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const todayIssues = issues.filter(i => {
    const date = i.scheduledDate ? new Date(i.scheduledDate) : i.dueDate ? new Date(i.dueDate) : null;
    return date && date >= todayStart && date <= todayEnd;
  });

  const pinnedTasks = issues.filter(i => i.priority === 'urgent').slice(0, 2);

  // Deep Work for today
  const todayLog = dailyLogs.find(l => new Date(l.date).toLocaleDateString() === today.toLocaleDateString());
  const deepWorkMins = todayLog?.deepWorkMinutes || 0;
  const hours = Math.floor(deepWorkMins / 60);
  const mins = deepWorkMins % 60;

  return (
    <div className="p-6 md:p-8 h-full bg-[#FAFAFA] flex flex-col md:flex-row gap-6 overflow-y-auto overflow-x-hidden animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: Sidebar (25%) */}
      <div className="w-full md:w-[25%] flex flex-col gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-sm">
            K
          </div>
          <span className="font-bold tracking-tight text-xl text-[#0A0A0A]">Krama</span>
          <button className="ml-auto w-6 h-6 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:border-[#0A0A0A] transition-colors">
            <Plus className="w-3.5 h-3.5 text-[#0A0A0A]" />
          </button>
        </div>

        {/* Weekly Pinned */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Weekly Pinned</h2>
            <button className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {pinnedTasks.map(task => {
              const Icon = getIconForString(task.title);
              return (
                <div key={task.id} className="bg-white rounded-[16px] p-4 border border-[#E5E7EB] shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#0A0A0A]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[#0A0A0A] text-sm truncate">{task.title}</div>
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">Due {new Date(task.dueDate || '').toLocaleDateString()}</div>
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-red-50 text-[9px] font-bold text-[#DC2626] uppercase tracking-wider border border-[#DC2626]/20 shrink-0">
                    Urgent
                  </div>
                </div>
              );
            })}
            
            {/* Ghost Add Card */}
            <button className="w-full bg-transparent border border-dashed border-[#D1D5DB] hover:border-[#0A0A0A] transition-colors rounded-[16px] p-4 flex items-center justify-center gap-2 group">
              <Plus className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0A0A0A] transition-colors" />
              <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider group-hover:text-[#0A0A0A] transition-colors">Add new weekly pin</span>
            </button>
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-5 shadow-sm mt-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-sm text-[#0A0A0A]">{currentTime.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <div className="flex gap-1">
              <button className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"><ChevronLeft className="w-4 h-4 text-[#0A0A0A]" /></button>
              <button className="p-1 rounded hover:bg-[#F3F4F6] transition-colors"><ChevronRight className="w-4 h-4 text-[#0A0A0A]" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-[#9CA3AF]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2 gap-x-1">
            {/* Offset for visual mock */}
            <div className="col-span-2"></div>
            {calendarDays.map(d => {
              const isToday = d === currentTime.getDate();
              return (
                <div key={d} className="flex items-center justify-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer",
                    isToday ? "bg-[#0A0A0A] text-white shadow-md" : "text-[#0A0A0A] hover:bg-[#FAFAFA]"
                  )}>
                    {d}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CENTER COLUMN: Main Schedule (45%) */}
      <div className="w-full md:w-[45%] bg-white border border-[#E5E7EB] rounded-[24px] p-6 md:p-8 shadow-sm flex flex-col relative">
        
        {/* Header Row */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button className="p-1 rounded-full hover:bg-[#F3F4F6] transition-colors -ml-1"><ChevronLeft className="w-5 h-5 text-[#9CA3AF]" /></button>
              <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Today's Schedule</h1>
              <button className="p-1 rounded-full hover:bg-[#F3F4F6] transition-colors"><ChevronRight className="w-5 h-5 text-[#9CA3AF]" /></button>
            </div>
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest pl-7">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-md">
              <Plus className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 p-1 pl-3 pr-1 bg-[#FAFAFA] border border-[#E5E7EB] rounded-full cursor-pointer hover:border-[#D1D5DB] transition-colors">
              <Settings className="w-4 h-4 text-[#6B7280]" />
              <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[10px] font-bold text-[#0A0A0A] ml-2">
                ME
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Agenda */}
        <div className="relative flex-1">
          {/* Connector Line */}
          <div className="absolute top-4 bottom-0 left-[23px] w-px bg-[#E5E7EB]" />

          <div className="space-y-6">
            {todayIssues.map((issue) => {
              const isDone = issue.status === 'done' || issue.status === 'released';
              const Icon = getIconForString(issue.title);
              
              return (
                <div key={issue.id} className="relative group pl-16">
                  {/* Timeline Dot */}
                  <div className="absolute left-[15px] top-[14px]">
                    <div className={cn(
                      "w-[17px] h-[17px] rounded-full ring-4 ring-white flex items-center justify-center transition-colors",
                      isDone ? "bg-[#0A0A0A]" : "bg-white border-2 border-[#E5E7EB]"
                    )}>
                      {isDone && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>

                  {/* Event Card */}
                  <div className={cn(
                    "rounded-[20px] p-4 transition-all flex items-center justify-between border cursor-pointer",
                    isDone 
                      ? "bg-[#FAFAFA] border-transparent" // filled card for completed
                      : "bg-white border-[#E5E7EB] hover:border-[#0A0A0A]" // outlined for upcoming
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        isDone ? "bg-white border border-[#E5E7EB]" : "bg-[#FAFAFA] border border-[#E5E7EB]"
                      )}>
                        <Icon className={cn("w-5 h-5", isDone ? "text-[#9CA3AF]" : "text-[#0A0A0A]")} />
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-bold text-base mb-0.5",
                          isDone ? "text-[#9CA3AF] line-through decoration-[#E5E7EB]" : "text-[#0A0A0A]"
                        )}>
                          {issue.title}
                        </h3>
                        <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                          {issue.estimate ? `${issue.estimate}h Block` : 'Scheduled Task'}
                        </div>
                      </div>
                    </div>
                    {/* Optional expanded details could go here, for now just a small action icon */}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-black/5 text-[#9CA3AF] hover:text-[#0A0A0A]">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {todayIssues.length === 0 && (
              <div className="pl-16 py-8 text-sm font-bold text-[#9CA3AF]">
                No events scheduled for today.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Widgets (30%) */}
      <div className="w-full md:w-[30%] flex flex-col gap-6">
        
        {/* Time / Focus Widget (replaces weather) */}
        <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FAFAFA] rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-2 z-10">Local Time</div>
          <div className="text-5xl font-black tracking-tighter text-[#0A0A0A] mb-1 z-10">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
          <div className="text-xs font-medium text-[#6B7280] z-10">Ready for deep work</div>
        </div>

        {/* Deep Work Media Player (adapted CTA/Promo structure) */}
        <div className="bg-[#0A0A0A] rounded-[24px] p-6 text-white shadow-lg shadow-black/10 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Focus Session</div>
              <h3 className="font-bold text-lg leading-tight">Deep Work Log</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
          
          {/* Progress bar mock */}
          <div className="mt-auto">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-2">
              <span>{String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}</span>
              <span>04:00</span>
            </div>
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (deepWorkMins / 240) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Today's Habits Snippet */}
        <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-6 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[#0A0A0A] text-sm">Habits</h3>
            <button className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider hover:text-[#0A0A0A]">Manage</button>
          </div>
          <div className="space-y-4">
            {habits.slice(0, 4).map((habit, idx) => {
              const isHabitDone = idx % 2 !== 0; // mock toggle for visual
              const Icon = getIconForString(habit.name);
              return (
                <div key={habit.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    isHabitDone ? "bg-[#0A0A0A] text-white" : "bg-[#FAFAFA] border border-[#E5E7EB] text-[#6B7280]"
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn(
                      "font-bold text-xs truncate",
                      isHabitDone ? "text-[#9CA3AF] line-through" : "text-[#0A0A0A]"
                    )}>{habit.name}</div>
                  </div>
                  <div className="text-[10px] font-bold text-[#9CA3AF]">
                    {habit.duration}m
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
