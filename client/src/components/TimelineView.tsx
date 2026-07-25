import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, Settings, Check, ChevronLeft, ChevronRight, Play, Search, Clock, CalendarPlus, Flame, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { getIconForString } from '../lib/iconMap';

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function TimelineView() {
  const { data: issues = [], isLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: dailyLogs = [] } = useQuery({ queryKey: ['dailyLogs'], queryFn: api.dailyLogs.list });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading daily schedule...</div>;

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const todayIssues = issues.filter(i => {
    const date = i.scheduledDate ? new Date(i.scheduledDate) : i.dueDate ? new Date(i.dueDate) : null;
    return date && date >= todayStart && date <= todayEnd;
  });

  const pinnedTasks = issues.filter(i => i.priority === 'urgent' || i.priority === 'high').slice(0, 3);

  const todayLog = dailyLogs.find(l => new Date(l.date).toLocaleDateString() === today.toLocaleDateString());
  const deepWorkMins = todayLog?.deepWorkMinutes || 180;
  const hours = Math.floor(deepWorkMins / 60);
  const mins = deepWorkMins % 60;

  const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const shortTimeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="p-6 md:p-8 h-full bg-canvas flex flex-col md:flex-row gap-6 overflow-y-auto overflow-x-hidden animate-in fade-in duration-150">
      
      {/* LEFT COLUMN: Sidebar (25%) */}
      <div className="w-full md:w-[25%] flex flex-col gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-medium text-sm">
            K
          </div>
          <span className="font-medium tracking-tight text-xl text-[#111827]">Krama</span>
          <button onClick={() => alert('New Task')} className="ml-auto w-6 h-6 rounded-full border border-[#E5E8EC] bg-white flex items-center justify-center hover:border-[#111827] transition-colors shadow-2xs">
            <Plus className="w-3.5 h-3.5 text-[#111827] stroke-[2]" />
          </button>
        </div>

        {/* Weekly Pinned with Quick-Slot action */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-[0.02em]">Weekly Pinned</h2>
            <button className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">View all ({issues.length})</button>
          </div>
          <div className="space-y-2.5">
            {pinnedTasks.map(task => {
              const Icon = getIconForString(task.title);
              const isUrgent = task.priority === 'urgent';
              return (
                <div key={task.id} className="bg-white rounded-xl p-3.5 border border-[#E5E8EC] shadow-sm flex flex-col gap-2 hover:border-[#2563EB] transition-all group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#F8F9FB] border border-[#E5E8EC] flex items-center justify-center shrink-0 group-hover:bg-[#EFF4FE] group-hover:border-[#2563EB]/30 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-[#111827] group-hover:text-[#2563EB] transition-colors stroke-[1.75]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-[#111827] text-xs truncate">{task.title}</div>
                        <div className="text-[10px] text-[#6B7280]">Due {new Date(task.dueDate || '').toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-widest shrink-0 border",
                      isUrgent ? "bg-red-50 text-[#DC2626] border-[#DC2626]/20" : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Quick-Slot Button */}
                  <button 
                    onClick={() => alert(`Slotted "${task.title}" into Today's Schedule`)}
                    className="w-full mt-1 py-1.5 px-2 bg-[#F8F9FB] hover:bg-[#2563EB] text-[#6B7280] hover:text-white rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 border border-[#E5E8EC] hover:border-[#2563EB] shadow-2xs group/btn"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 stroke-[1.75] group-hover/btn:scale-110 transition-transform" />
                    <span>Slot into Timeline &rarr;</span>
                  </button>
                </div>
              );
            })}
            
            {/* Ghost Add Card */}
            <button onClick={() => alert('Add new weekly pin')} className="w-full bg-transparent border border-dashed border-[#D1D5DB] hover:border-[#2563EB] hover:bg-[#EFF4FE]/10 transition-all rounded-xl p-3 flex items-center justify-center gap-2 group">
              <Plus className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors stroke-[2]" />
              <span className="text-xs font-medium text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors">Add new weekly pin</span>
            </button>
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="bg-white border border-[#E5E8EC] rounded-xl p-4.5 shadow-sm mt-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-[#111827] flex items-center gap-1.5">
              <span>{currentTime.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </h3>
            <div className="flex gap-1">
              <button className="p-1 rounded hover:bg-[#F8F9FB] transition-colors"><ChevronLeft className="w-4 h-4 text-[#6B7280] stroke-[1.75]" /></button>
              <button className="p-1 rounded hover:bg-[#F8F9FB] transition-colors"><ChevronRight className="w-4 h-4 text-[#6B7280] stroke-[1.75]" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-[#9CA3AF]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
            <div className="col-span-2"></div>
            {calendarDays.map(d => {
              const isToday = d === currentTime.getDate();
              return (
                <div key={d} className="flex items-center justify-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-medium transition-colors cursor-pointer",
                    isToday ? "bg-[#2563EB] text-white shadow-sm font-bold" : "text-[#111827] hover:bg-[#F8F9FB]"
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
      <div className="w-full md:w-[45%] bg-white border border-[#E5E8EC] rounded-xl p-6 md:p-8 shadow-sm flex flex-col relative">
        
        {/* Header Row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button className="p-1 rounded-full hover:bg-[#F8F9FB] transition-colors -ml-1"><ChevronLeft className="w-5 h-5 text-[#6B7280] stroke-[1.75]" /></button>
              <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Daily Schedule</h1>
              <button className="p-1 rounded-full hover:bg-[#F8F9FB] transition-colors"><ChevronRight className="w-5 h-5 text-[#6B7280] stroke-[1.75]" /></button>
            </div>
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.02em] pl-7 flex items-center gap-2">
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="w-1 h-1 rounded-full bg-[#9CA3AF]" />
              <span className="text-[#2563EB] font-mono">{todayIssues.length} blocks planned</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => alert('Add Time Block')} className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center hover:bg-[#1D4ED8] transition-colors shadow-sm">
              <Plus className="w-4 h-4 stroke-[2]" />
            </button>
            <div className="flex items-center gap-2 p-1 pl-3 pr-1 bg-[#F8F9FB] border border-[#E5E8EC] rounded-full cursor-pointer hover:border-[#D1D5DB] transition-colors shadow-2xs">
              <Settings className="w-4 h-4 text-[#6B7280] stroke-[1.75]" />
              <div className="w-7 h-7 rounded-full bg-[#E5E8EC] flex items-center justify-center text-[10px] font-medium text-[#111827] ml-1 font-mono">
                ME
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Live Pulsing Current Time Indicator */}
        <div className="mb-6 py-2 px-3.5 bg-[#EFF4FE] border border-[#2563EB]/20 rounded-lg flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2563EB]"></span>
            </span>
            <span className="text-xs font-medium text-[#2563EB] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 fill-[#2563EB]" /> Live Agenda Horizon
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-[#2563EB] bg-white px-2 py-0.5 rounded border border-[#2563EB]/20 shadow-2xs">
            {timeString}
          </span>
        </div>

        {/* Vertical Agenda */}
        <div className="relative flex-1">
          {todayIssues.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <Clock className="w-6 h-6 text-[#9CA3AF] mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium text-[#111827] mb-1">No events scheduled for today</p>
              <p className="text-xs text-[#6B7280] mb-4">Your agenda is completely clear. Enjoy your focus time!</p>
              <button onClick={() => alert('Schedule task')} className="px-3.5 py-1.5 rounded-full bg-[#EFF4FE] text-[#2563EB] hover:bg-[#2563EB] hover:text-white text-xs font-medium transition-colors shadow-sm">
                + Schedule a task
              </button>
            </div>
          ) : (
            <>
              {/* Connector Line */}
              <div className="absolute top-4 bottom-0 left-[23px] w-px bg-[#E5E8EC]" />

              <div className="space-y-4">
                {todayIssues.map((issue, idx) => {
                  const isDone = issue.status === 'done' || issue.status === 'released';
                  const Icon = getIconForString(issue.title);
                  const isCurrent = idx === 0 && !isDone;
                  
                  return (
                    <div key={issue.id} className="relative group pl-14">
                      {/* Timeline Dot */}
                      <div className="absolute left-[15px] top-[14px]">
                        <div className={cn(
                          "w-4 h-4 rounded-full ring-4 ring-white flex items-center justify-center transition-colors",
                          isDone ? "bg-[#111827]" : isCurrent ? "bg-[#2563EB] ring-2 ring-[#EFF4FE]" : "bg-white border-2 border-[#2563EB]"
                        )}>
                          {isDone && <Check className="w-2.5 h-2.5 text-white stroke-[2]" />}
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </div>
                      </div>

                      {/* Event Card */}
                      <div className={cn(
                        "rounded-xl p-3.5 transition-all flex items-center justify-between border cursor-pointer",
                        isDone 
                          ? "bg-[#F8F9FB] border-transparent opacity-80" 
                          : isCurrent
                          ? "bg-white border-[#2563EB] ring-1 ring-[#2563EB]/20 shadow-md"
                          : "bg-white border-[#E5E8EC] hover:border-[#2563EB] shadow-sm"
                      )}>
                        <div className="flex items-center gap-3.5">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                            isDone ? "bg-white border border-[#E5E8EC]" : isCurrent ? "bg-[#2563EB] text-white shadow-xs" : "bg-[#EFF4FE] border border-[#2563EB]/20"
                          )}>
                            <Icon className={cn("w-4 h-4 stroke-[1.75]", isDone ? "text-[#9CA3AF]" : isCurrent ? "text-white" : "text-[#2563EB]")} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={cn(
                                "font-medium text-sm mb-0.5",
                                isDone ? "text-[#9CA3AF] line-through decoration-[#D1D5DB]" : "text-[#111827]"
                              )}>
                                {issue.title}
                              </h3>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-[#EFF4FE] text-[#2563EB] text-[9px] font-mono font-bold uppercase tracking-widest border border-[#2563EB]/20">
                                  In Progress Now
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6B7280] font-mono">
                              {issue.estimate ? `${issue.estimate}h Block` : 'Scheduled Task'} • {idx === 0 ? '09:00 - 11:00' : idx === 1 ? '11:30 - 12:30' : '14:00 - 16:00'}
                            </div>
                          </div>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-black/5 text-[#9CA3AF] hover:text-[#111827]">
                          <Search className="w-4 h-4 stroke-[1.75]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Widgets (30%) */}
      <div className="w-full md:w-[30%] flex flex-col gap-6">
        
        {/* Local Time */}
        <div className="px-4 py-3 bg-[#F8F9FB] border border-[#E5E8EC] rounded-xl flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-[0.02em]">Local Time</div>
            <div className="text-xs text-[#6B7280]">Ready for deep work</div>
          </div>
          <div className="text-2xl font-medium tracking-tight text-[#111827] font-mono">
            {shortTimeString}
          </div>
        </div>

        {/* Deep Work Hero Card */}
        <div className="bg-[#111827] rounded-xl p-6 text-white shadow-md flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] mb-1">Focus Session</div>
              <h3 className="font-medium text-[18px] leading-tight">Deep Work Log</h3>
            </div>
            <button onClick={() => alert('Start Focus Timer')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-sm">
              <Play className="w-4 h-4 text-white ml-0.5 fill-white" />
            </button>
          </div>
          
          <div className="mt-auto">
            <div className="flex justify-between text-[11px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] mb-2 font-mono">
              <span>{String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')} logged</span>
              <span>05:00 target</span>
            </div>
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#2563EB] rounded-full transition-all duration-400" style={{ width: `${Math.min(100, (deepWorkMins / 300) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Habits Widget with Orange Category Tint (#EA580C) */}
        <div className="bg-white border border-[#E5E8EC] rounded-xl p-5 shadow-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EA580C]/10 flex items-center justify-center text-[#EA580C]">
                <Flame className="w-4 h-4 stroke-[1.75]" />
              </div>
              <div>
                <h3 className="font-medium text-[#111827] text-sm">Daily Routines</h3>
                <p className="text-[10px] text-[#6B7280]">Quick pulse check</p>
              </div>
            </div>
            <button onClick={() => alert('Manage Habits')} className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">Manage</button>
          </div>
          <div className="space-y-3 flex-1">
            {habits.slice(0, 4).map((habit, idx) => {
              const isHabitDone = idx % 2 !== 0;
              const Icon = getIconForString(habit.name);
              return (
                <div key={habit.id} className="flex items-center justify-between py-2 border-b border-[#E5E8EC]/60 last:border-0 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isHabitDone ? "bg-[#EA580C] text-white shadow-2xs" : "bg-[#F8F9FB] border border-[#E5E8EC] text-[#EA580C] group-hover:border-[#EA580C]"
                    )}>
                      <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0">
                      <div className={cn(
                        "font-medium text-xs truncate group-hover:text-[#EA580C] transition-colors",
                        isHabitDone ? "text-[#9CA3AF] line-through" : "text-[#111827]"
                      )}>{habit.name}</div>
                      <div className="text-[10px] text-[#6B7280] font-mono">🔥 {habit.streak} day streak</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#6B7280] shrink-0 ml-2 bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-[#E5E8EC]">
                    {habit.duration || 15}m
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
