import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import type { IssueWithRelations } from '../types/schema';
import { BaseButton } from './ui/BaseButton';

// Helper for dates of the current week (Monday to Sunday)
function getWeekDates(referenceDate: Date) {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const week = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    week.push({
      date: currentDay,
      dayName: dayNames[i],
      isToday: new Date().toDateString() === currentDay.toDateString()
    });
  }
  return week;
}

function DayColumn({ 
  date, 
  dayName, 
  isToday, 
  issues, 
  isLast,
  onAddTask
}: { 
  date: Date; 
  dayName: string; 
  isToday: boolean; 
  issues: IssueWithRelations[]; 
  isLast: boolean; 
  onAddTask: (dayName: string) => void;
}) {
  return (
    <div 
      id={isToday ? "today-column" : undefined}
      className={cn(
        "flex flex-col min-w-[230px] flex-1 bg-white relative group/col",
        !isLast && "border-r border-[#E5E8EC]",
        isToday && "border-t-2 border-t-[#2563EB] bg-[#EFF4FE]/5"
      )}
    >
      {/* Day Header */}
      <div className={cn(
        "px-4 py-3 flex items-center justify-between border-b border-[#E5E8EC]",
        isToday ? "bg-[#EFF4FE]/30" : "bg-[#F8F9FB]"
      )}>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium uppercase tracking-[0.02em]", isToday ? "text-[#2563EB] font-bold" : "text-[#6B7280]")}>
            {dayName}
          </span>
          <span className={cn(
            "text-sm font-medium font-mono",
            isToday ? "w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shadow-sm" : "text-[#111827]"
          )}>
            {date.getDate()}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#6B7280] bg-white px-1.5 py-0.2 rounded border border-[#E5E8EC]">
          {issues.length}
        </span>
      </div>

      {/* Day Content */}
      <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          {issues.length === 0 ? (
            <div className="py-6 text-center flex flex-col items-center justify-center">
              <span className="text-xs text-[#9CA3AF] font-normal">No scheduled tasks</span>
            </div>
          ) : (
            issues.map(issue => (
              <div 
                key={issue.id} 
                className="p-3 rounded-xl bg-white border border-[#E5E8EC] hover:border-[#2563EB] shadow-sm transition-all flex flex-col gap-1.5 cursor-pointer group/card"
              >
                <div className="font-medium text-xs text-[#111827] line-clamp-2 group-hover/card:text-[#2563EB] transition-colors">{issue.title}</div>
                <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1.5 border-t border-[#E5E8EC]/40">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Clock className="w-3 h-3 stroke-[1.5]" /> {issue.estimate ? `${issue.estimate}h` : '1h'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#F8F9FB] border border-[#E5E8EC]/60 text-[#6B7280] font-mono text-[9px] uppercase tracking-wider font-medium">{issue.priority}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Inline "+ Add Task" button at the bottom of each day column */}
        <button 
          onClick={() => onAddTask(dayName)}
          className="w-full mt-2 py-2 border border-dashed border-[#E5E8EC] hover:border-[#2563EB] hover:bg-[#EFF4FE]/20 rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-[#2563EB] transition-all flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" /> Add Task
        </button>
      </div>
    </div>
  );
}

export function WeeklyPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [habitChecks, setHabitChecks] = useState<Record<string, boolean>>({});
  
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: habits = [], isLoading: habitsLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  const weekDays = useMemo(() => getWeekDates(currentDate), [currentDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const todayElem = document.getElementById('today-column');
      if (todayElem) {
        todayElem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [weekDays, issues]);

  if (issuesLoading || habitsLoading) return <div className="p-8 text-[#6B7280]">Loading planner...</div>;

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const toggleHabitDay = (habitId: string, dayIndex: number) => {
    const key = `${habitId}-${dayIndex}`;
    setHabitChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const weekRangeLabel = `${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Compute Time Block Summary for the week
  const totalEstimate = issues.reduce((sum, i) => sum + (i.estimate || 1), 0);
  const focusHours = Math.round(totalEstimate * 0.7);
  const meetingHours = Math.round(totalEstimate * 0.3);
  const bufferHours = Math.max(0, 40 - totalEstimate);

  return (
    <div className="p-6 md:p-8 h-full flex flex-col bg-canvas animate-in fade-in duration-150 gap-6 overflow-y-auto pb-20">
      
      {/* Header Row with Time Block Summary */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Weekly Planner</h1>
            <span className="text-xs font-medium text-[#6B7280] bg-white px-3 py-1 rounded-full border border-[#E5E8EC] shadow-sm font-mono">
              {weekRangeLabel}
            </span>
          </div>
          <p className="text-[13px] text-[#6B7280]">7-Day Horizon · Single bounded grid view with integrated habit consistency tracking.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => navigateWeek('today')}
            className="px-3.5 py-1.5 text-xs font-medium text-[#111827] bg-white border border-[#E5E8EC] rounded-full hover:bg-[#F8F9FB] transition-colors shadow-sm"
          >
            Today
          </button>
          <div className="flex items-center bg-white border border-[#E5E8EC] rounded-full p-0.5 shadow-sm">
            <button 
              onClick={() => navigateWeek('prev')} 
              className="p-1 rounded-full hover:bg-[#F8F9FB] text-[#6B7280] hover:text-[#111827] transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4 stroke-[1.75]" />
            </button>
            <button 
              onClick={() => navigateWeek('next')} 
              className="p-1 rounded-full hover:bg-[#F8F9FB] text-[#6B7280] hover:text-[#111827] transition-colors"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>
          <BaseButton onClick={() => alert('New Task Block')}>
            <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> Schedule Task
          </BaseButton>
        </div>
      </div>

      {/* Time Block Summary Bar */}
      <div className="bg-white border border-[#E5E8EC] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#6B7280]">Weekly Time Allocation</div>
            <div className="text-sm font-medium text-[#111827] font-mono mt-0.5">
              {totalEstimate}h Planned <span className="text-[#6B7280] font-normal font-sans">/ 40h capacity</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span>Focus: <strong className="text-[#111827] font-mono">{focusHours}h</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <span>Meetings/Sync: <strong className="text-[#111827] font-mono">{meetingHours}h</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E5E8EC]" />
            <span>Free Buffer: <strong className="text-[#111827] font-mono">{bufferHours}h</strong></span>
          </div>
        </div>
      </div>

      {/* SINGLE BOUNDED GRID (Hairline column dividers, content-governed height, NEVER individually boxed columns) */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-max border border-[#E5E8EC] rounded-xl bg-white shadow-sm flex overflow-hidden">
          {weekDays.map((day, index) => {
            const dayStart = new Date(day.date).setHours(0, 0, 0, 0);
            const dayEnd = new Date(day.date).setHours(23, 59, 59, 999);
            
            const dayIssues = issues.filter(issue => {
              const date = issue.scheduledDate ? new Date(issue.scheduledDate) : issue.dueDate ? new Date(issue.dueDate) : null;
              return date && date.getTime() >= dayStart && date.getTime() <= dayEnd;
            });

            return (
              <DayColumn 
                key={day.dayName}
                date={day.date}
                dayName={day.dayName}
                isToday={day.isToday}
                issues={dayIssues}
                isLast={index === weekDays.length - 1}
                onAddTask={(dayName) => alert(`Schedule task for ${dayName}`)}
              />
            );
          })}
        </div>
      </div>

      {/* NEW: Inline 7-Day Habit Consistency Grid (Keeps Habit Tracker in Planner while keeping it distinct from Habits tab) */}
      <div className="bg-white border border-[#E5E8EC] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E5E8EC] bg-[#F8F9FB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-[16px] font-medium text-[#111827]">Weekly Habit Consistency</h2>
              <p className="text-xs text-[#6B7280]">Check off routines directly from your planner schedule.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#EA580C] bg-[#EA580C]/10 px-2 py-1 rounded font-medium">
            {habits.length || 3} routines tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#E5E8EC] text-[11px] font-medium uppercase tracking-[0.02em] text-[#6B7280]">
                <th className="py-3 px-5 w-1/4">Habit Name</th>
                <th className="py-3 px-3">Streak</th>
                {weekDays.map(day => (
                  <th key={day.dayName} className={cn("py-3 px-3 text-center", day.isToday ? "text-[#2563EB] font-bold bg-[#EFF4FE]/20" : "")}>
                    {day.dayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EC]">
              {habits.map((habit, index) => (
                <tr key={habit.id} className="hover:bg-[#F8F9FB] transition-colors">
                  <td className="py-3.5 px-5 font-medium text-sm text-[#111827]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                      {habit.name}
                    </div>
                    <div className="text-[11px] text-[#6B7280] ml-3.5">{habit.timeOfDay} • {habit.duration || 15}m</div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs font-medium text-[#111827]">
                    <span className="flex items-center gap-1 text-[#EA580C]"><Flame className="w-3.5 h-3.5 text-[#EA580C] fill-[#EA580C]" />{habit.streak + (habitChecks[`${habit.id}-0`] ? 1 : 0)}</span>
                  </td>
                  {weekDays.map((day, dayIdx) => {
                    // Mock check state: either locally checked, or default checked for past days if index % 2 === 0
                    const key = `${habit.id}-${dayIdx}`;
                    const isChecked = habitChecks[key] !== undefined ? habitChecks[key] : (dayIdx < 3 && (index + dayIdx) % 2 === 0);

                    return (
                      <td key={dayIdx} className={cn("py-3.5 px-3 text-center", day.isToday ? "bg-[#EFF4FE]/10" : "")}>
                        <button 
                          onClick={() => toggleHabitDay(habit.id, dayIdx)}
                          className="p-1 focus:outline-none hover:scale-110 transition-transform"
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-[#EA580C] stroke-[2]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#D1D5DB] hover:text-[#111827] stroke-[1.5] transition-colors" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {habits.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#9CA3AF]">No habits configured. Add habits in the Goals & Habits tab.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
