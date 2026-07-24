import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChevronLeft, ChevronRight, CheckSquare, Target } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';

// Helper to get days of the week starting from Monday
function getWeekDays(startDate: Date) {
  const days = [];
  const current = new Date(startDate);
  // Adjust to previous Monday
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
  current.setDate(diff);

  for (let i = 0; i < 7; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export function WeeklyPlanner() {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  const { data: issues = [], isLoading: iLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: habits = [], isLoading: hLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: logs = [], isLoading: lLoading } = useQuery({ queryKey: ['dailyLogs'], queryFn: api.dailyLogs.list });
  const { data: projects = [], isLoading: pLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  if (iLoading || hLoading || lLoading || pLoading) return <div className="p-8 text-[#6B7280]">Loading planner...</div>;

  const navigateWeek = (dir: 1 | -1) => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + (dir * 7));
    setCurrentWeekStart(next);
  };

  // Weekly Rollup Stats
  const thisWeekIssues = issues.filter(i => i.completedAt && new Date(i.completedAt) >= weekDays[0] && new Date(i.completedAt) <= weekDays[6]);
  const thisWeekDeepWork = logs.filter(l => new Date(l.date) >= weekDays[0] && new Date(l.date) <= weekDays[6]).reduce((acc, l) => acc + l.deepWorkMinutes, 0);

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-150">
      
      {/* Header & Weekly Rollup */}
      <div className="px-8 pt-8 pb-6 bg-[#FAFAFA]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">Weekly Planner</h1>
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1">
              <button onClick={() => navigateWeek(-1)} className="p-1 hover:bg-[#F3F4F6] transition-colors rounded"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold px-2">{weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <button onClick={() => navigateWeek(1)} className="p-1 hover:bg-[#F3F4F6] transition-colors rounded"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <BaseButton>Plan Week</BaseButton>
        </div>

        {/* Weekly Report Rollup */}
        <div className="flex gap-4">
          <div className="flex-1 bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-2 bg-[#F3F4F6] rounded-md"><CheckSquare className="w-4 h-4 text-[#0A0A0A]" /></div>
            <div>
              <div className="text-xl font-bold text-[#0A0A0A] leading-none mb-1">{thisWeekIssues.length}</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Issues Completed</div>
            </div>
          </div>
          <div className="flex-1 bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-2 bg-[#F3F4F6] rounded-md"><Target className="w-4 h-4 text-[#0A0A0A]" /></div>
            <div>
              <div className="text-xl font-bold text-[#0A0A0A] leading-none mb-1">{Math.floor(thisWeekDeepWork / 60)}h {thisWeekDeepWork % 60}m</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Deep Work Logged</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Column Grid (One continuous surface) */}
      <div className="flex-1 overflow-x-auto p-6 bg-white">
        <div className="min-w-max h-full border border-[#E5E7EB] rounded-xl bg-white shadow-sm flex flex-col overflow-hidden">
          
          {/* Continuous Header Band */}
          <div className="flex bg-[#FAFAFA] border-b border-[#E5E7EB]">
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={`header-${index}`} 
                  className={cn(
                    "w-[260px] flex-shrink-0 px-3 py-2",
                    index !== 6 && "border-r border-[#E5E7EB]",
                    isToday ? "border-t-2 border-t-[#0A0A0A]" : "border-t-2 border-t-transparent"
                  )}
                >
                  <div className={cn("text-[10px] font-bold uppercase tracking-wider", isToday ? "text-[#0A0A0A]" : "text-[#6B7280]")}>
                    {day.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  <div className={cn("text-sm font-bold mt-0.5", isToday ? "text-[#0A0A0A]" : "text-[#0A0A0A]")}>
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Body */}
          <div className="flex flex-1">
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              
              // Data for this day
              const dayIssues = issues.filter(i => i.dueDate && isSameDay(new Date(i.dueDate), day));
              const dayLog = logs.find(l => isSameDay(new Date(l.date), day));
              
              const isEmpty = !isToday && dayIssues.length === 0 && (!dayLog || dayLog.deepWorkMinutes === 0);

              return (
                <div 
                  key={`body-${index}`} 
                  className={cn(
                    "w-[260px] flex-shrink-0 p-2 flex flex-col gap-2",
                    index !== 6 && "border-r border-[#E5E7EB]",
                  )}
                >
                  {isEmpty && (
                    <div className="mt-4 text-center">
                      <div className="h-px bg-[#E5E7EB] w-8 mx-auto mb-2"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Nothing scheduled</span>
                    </div>
                  )}

                  {/* Habits */}
                  {isToday && habits.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {habits.map(h => (
                        <div key={h.id} className="flex items-center gap-2 py-1 px-1">
                          <input type="checkbox" className="rounded text-[#0A0A0A] focus:ring-[#0A0A0A] w-3 h-3" />
                          <span className="text-xs font-medium text-[#0A0A0A]">{h.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Issues */}
                  {dayIssues.length > 0 && (
                    <div className="space-y-1.5">
                      {dayIssues.map(issue => {
                        const proj = projects.find(p => p.id === issue.projectId);
                        return (
                          <div key={issue.id} className="p-2 rounded bg-white border border-[#E5E7EB] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]"></span>
                                {proj?.name.substring(0, 12) || 'No Project'}
                              </div>
                              {issue.priority === 'urgent' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                              )}
                            </div>
                            <div className="font-bold text-[#0A0A0A] text-xs leading-tight line-clamp-2">{issue.title}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Deep Work Log */}
                  {dayLog && dayLog.deepWorkMinutes > 0 && (
                    <div className="mt-1 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
                      🧠 {Math.floor(dayLog.deepWorkMinutes / 60)}h {dayLog.deepWorkMinutes % 60}m logged
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
