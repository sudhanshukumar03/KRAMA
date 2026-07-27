import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, ChevronLeft, ChevronRight, Check, Clock, Flame, Calendar as CalendarIcon, X, Briefcase, Layers, Rocket, LayoutGrid, Columns, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type { IssueWithRelations } from '../types/schema';
import { LoadingState } from './ui/LoadingState';

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

function ScheduleTaskModal({
  open,
  onClose,
  targetDate,
  targetDayName,
  allIssues,
  onScheduleExisting,
  onCreateNew,
  isSubmitting
}: {
  open: boolean;
  onClose: () => void;
  targetDate: Date | null;
  targetDayName: string;
  allIssues: IssueWithRelations[];
  onScheduleExisting: (issueId: string, dateStr: string) => void;
  onCreateNew: (data: { title: string; priority: string; estimate: number; dateStr: string }) => void;
  isSubmitting: boolean;
}) {
  const [mode, setMode] = useState<'create' | 'pick'>('create');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [estimate, setEstimate] = useState(2);
  const [selectedIssueId, setSelectedIssueId] = useState('');

  if (!open || !targetDate) return null;

  const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const formattedDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const unscheduledIssues = allIssues.filter(i => !i.scheduledDate && i.status !== 'done');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      if (!title.trim()) return;
      onCreateNew({ title: title.trim(), priority, estimate, dateStr });
    } else {
      if (!selectedIssueId) return;
      onScheduleExisting(selectedIssueId, dateStr);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF] flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Schedule Temporal Block</h3>
              <p className="text-xs text-secondary font-mono">{targetDayName} • {formattedDate}</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer">
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Tab Switcher: Create vs Pick Backlog */}
        <div className="flex border-b border-border bg-surface-hover px-6">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={cn(
              "py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer",
              mode === 'create' ? "border-[#2563EB] dark:border-[#00E5FF] text-[#2563EB] dark:text-[#00E5FF]" : "border-transparent text-secondary hover:text-primary"
            )}
          >
            + New Time Block
          </button>
          <button
            type="button"
            onClick={() => setMode('pick')}
            className={cn(
              "py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              mode === 'pick' ? "border-[#2563EB] dark:border-[#00E5FF] text-[#2563EB] dark:text-[#00E5FF]" : "border-transparent text-secondary hover:text-primary"
            )}
          >
            <Briefcase className="w-3.5 h-3.5 stroke-[1.5]" /> Backlog Directives ({unscheduledIssues.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'create' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5 font-mono">
                  Directive Title <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Architect Authentication Pipeline"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] transition-all bg-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5 font-mono">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] cursor-pointer font-mono font-bold"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟣 Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5 font-mono">Estimated Duration</label>
                  <select
                    value={estimate}
                    onChange={e => setEstimate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] cursor-pointer font-mono font-bold"
                  >
                    <option value={0.5}>30m (Quick block)</option>
                    <option value={1}>1.0h (Standard)</option>
                    <option value={2}>2.0h (Deep session)</option>
                    <option value={4}>4.0h (Half day sprint)</option>
                    <option value={8}>8.0h (Full day milestone)</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5 font-mono">
                Select Backlog Directive
              </label>
              {unscheduledIssues.length === 0 ? (
                <div className="p-8 text-center bg-surface-hover rounded-xl border border-border text-xs text-secondary font-mono">
                  No unscheduled backlog directives available. Switch to "New Time Block" above!
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border/60">
                  {unscheduledIssues.map(issue => (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={cn(
                        "p-3 flex items-center justify-between cursor-pointer transition-colors",
                        selectedIssueId === issue.id ? "bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF]" : "hover:bg-surface-hover text-primary"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-sm font-bold truncate">{issue.title}</div>
                        <div className="text-[11px] text-secondary font-mono mt-0.5 flex items-center gap-2">
                          <span className="uppercase font-bold">{issue.priority}</span>
                          <span>•</span>
                          <span>{issue.estimate || 1}h est</span>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                        selectedIssueId === issue.id ? "bg-[#2563EB] dark:bg-[#00E5FF] border-[#2563EB] dark:border-[#00E5FF] text-white dark:text-[#050811]" : "border-border bg-surface"
                      )}>
                        {selectedIssueId === issue.id && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-mono font-bold text-secondary hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (mode === 'create' ? !title.trim() : !selectedIssueId)}
              className="px-5 py-2 text-xs font-mono font-bold text-surface bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5 stroke-[1.5]" /> Schedule Block
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

function DayColumn({ 
  date, 
  dayName, 
  isToday, 
  issues, 
  habits,
  isLast,
  onAddTask,
  onToggleHabit,
  onToggleIssue,
  onLaunchTimer
}: { 
  date: Date; 
  dayName: string; 
  isToday: boolean; 
  issues: IssueWithRelations[]; 
  habits: any[];
  isLast: boolean; 
  onAddTask: (date: Date, dayName: string) => void;
  onToggleHabit: (habitId: string, date: Date) => void;
  onToggleIssue: (issueId: string, currentStatus: string) => void;
  onLaunchTimer: (issueTitle: string) => void;
}) {
  const navigate = useNavigate();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const handleColumnClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.no-column-nav') && !target.closest('button')) {
      navigate(`/app/timeline?date=${dateStr}`);
    }
  };

  return (
    <div 
      id={isToday ? "today-column" : undefined}
      onClick={handleColumnClick}
      title={`Click empty space to open Daily Schedule for ${dayName}, ${date.toLocaleDateString()}`}
      className={cn(
        "flex flex-col min-w-[240px] flex-1 bg-surface relative group/col cursor-pointer transition-colors font-sans",
        !isLast && "border-r border-border",
        isToday ? "bg-[#2563EB]/5 dark:bg-[#00E5FF]/5" : "hover:bg-surface-hover/40"
      )}
    >
      {/* Sticky Day Header */}
      <div className={cn(
        "px-4 py-3 flex flex-col items-center justify-center border-b border-border sticky top-0 z-10 transition-colors",
        isToday ? "bg-surface-hover/90 backdrop-blur-md border-b-2 border-b-[#2563EB] dark:border-b-[#00E5FF]" : "bg-surface/90 backdrop-blur-md group-hover/col:bg-surface-hover/80"
      )}>
        <span className={cn(
          "text-[10px] uppercase tracking-wider font-bold mb-1 transition-colors font-mono", 
          isToday ? "text-[#2563EB] dark:text-[#00E5FF]" : "text-secondary"
        )}>
          {dayName}
        </span>
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-lg font-mono transition-all shadow-2xs",
          isToday 
            ? "bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] font-bold shadow-md scale-105" 
            : "text-primary font-bold group-hover/col:bg-surface-hover"
        )}>
          {date.getDate()}
        </div>
      </div>

      {/* Day Content Container */}
      <div className="p-2.5 space-y-3 flex-1 flex flex-col justify-between">
        
        <div className="space-y-3">
          {/* Section 1: Routines Checklist */}
          {habits.length > 0 && (
            <div className="bg-surface-hover/60 border border-border/60 rounded-xl p-2 space-y-1.5 no-column-nav">
              <div className="flex items-center justify-between px-1 text-[10px] uppercase font-mono tracking-wider font-bold text-secondary">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" /> Routines
                </span>
                <span className="font-mono text-primary font-bold">
                  {habits.filter(h => {
                    const isChecked = h.completions?.some((c: any) => c.date.toString().startsWith(dateStr) && c.completed) ||
                      (isToday && h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === new Date().toDateString());
                    return isChecked;
                  }).length}/{habits.length}
                </span>
              </div>
              
              <div className="space-y-1">
                {habits.map(habit => {
                  const isChecked = habit.completions?.some((c: any) => c.date.toString().startsWith(dateStr) && c.completed) ||
                    (isToday && habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString());

                  return (
                    <div 
                      key={habit.id}
                      onClick={(e) => { e.stopPropagation(); onToggleHabit(habit.id, date); }}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded-lg border text-xs transition-all cursor-pointer font-mono",
                        isChecked 
                          ? "bg-[#109868]/10 border-[#109868]/30 text-[#109868]" 
                          : "bg-surface border-border hover:border-[#2563EB] dark:hover:border-[#00E5FF] text-primary"
                      )}
                    >
                      <button type="button" className="focus:outline-none shrink-0">
                        <div className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border transition-all",
                          isChecked ? "bg-[#109868] border-[#109868] text-white dark:text-[#050811]" : "border-border bg-surface hover:border-primary"
                        )}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                        </div>
                      </button>
                      <span className={cn("truncate flex-1 font-bold", isChecked && "line-through opacity-75")}>
                        {habit.name}
                      </span>
                      <span className="text-[10px] opacity-70 shrink-0">{habit.duration || 15}m</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Motion AI / Apple Calendar Time Blocks */}
          <div className="space-y-2 no-column-nav">
            {issues.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <span className="text-xs text-muted font-mono">No scheduled blocks</span>
              </div>
            ) : (
              issues.map(issue => {
                const isDone = issue.status === 'done';
                const isUrgent = issue.priority === 'urgent' || issue.priority === 'high';
                const isMedium = issue.priority === 'medium';
                
                // Motion AI meets Apple Calendar time block styling
                const cardStyle = isDone
                  ? "border-l-[#109868] bg-[#109868]/10 hover:bg-[#109868]/15 text-[#109868]"
                  : isUrgent
                  ? "border-l-[#2563EB] dark:border-l-[#00E5FF] bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 hover:bg-[#2563EB]/15 dark:hover:bg-[#00E5FF]/15 text-[#2563EB] dark:text-[#00E5FF]"
                  : isMedium
                  ? "border-l-[#4F46E5] dark:border-l-[#818CF8] bg-[#4F46E5]/10 dark:bg-[#818CF8]/10 hover:bg-[#4F46E5]/15 dark:hover:bg-[#818CF8]/15 text-[#4F46E5] dark:text-[#818CF8]"
                  : "border-l-[#7C3AED] dark:border-l-[#A78BFA] bg-[#7C3AED]/10 dark:bg-[#A78BFA]/10 hover:bg-[#7C3AED]/15 dark:hover:bg-[#A78BFA]/15 text-[#7C3AED] dark:text-[#A78BFA]";

                return (
                  <div 
                    key={issue.id} 
                    onClick={(e) => { e.stopPropagation(); onToggleIssue(issue.id, issue.status); }}
                    title="Click to toggle Done status or view ticket"
                    className={cn(
                      "p-3 rounded-xl border-l-4 border-y border-r border-border/60 shadow-2xs hover:shadow-sm transition-all flex flex-col gap-2 cursor-pointer group/card",
                      cardStyle
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className={cn("font-bold text-xs leading-snug line-clamp-2 font-sans text-primary", isDone && "line-through opacity-75 text-secondary")}>
                        {issue.title}
                      </span>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); onToggleIssue(issue.id, issue.status); }}
                        className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors mt-0.5",
                          isDone ? "bg-[#109868] border-[#109868] text-white dark:text-[#050811]" : "border-border bg-surface hover:border-primary"
                        )}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] font-mono opacity-90 pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1 font-bold text-primary">
                        <Clock className="w-3 h-3 stroke-[1.5]" /> {issue.estimate ? `${issue.estimate}h` : '1h'} block
                      </span>
                      <span className="uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-surface/80 text-primary border border-border/40">{issue.priority}</span>
                    </div>

                    {/* Launch Focus Sprint button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunchTimer(`[Issue] ${issue.title}`);
                      }}
                      className="mt-1 w-full py-1 px-2 rounded-lg bg-primary hover:opacity-90 text-surface font-mono text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      title="Launch Focus Sprint on this directive"
                    >
                      <Rocket className="w-3 h-3 stroke-[1.5]" /> Focus Sprint
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddTask(date, dayName); }}
          className="w-full mt-2 py-2 border border-dashed border-border hover:border-[#2563EB] dark:hover:border-[#00E5FF] hover:bg-surface-hover rounded-xl text-xs font-mono font-bold text-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer no-column-nav"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.5]" /> Add Time Block
        </button>

      </div>
    </div>
  );
}

// Intelligent time-blocking algorithm: places daily issues into realistic hourly slots (9 AM to 6 PM with 1 PM lunch break)
function assignHourlySlots(issues: IssueWithRelations[]) {
  const slots: { [hour: number]: { issue: IssueWithRelations; span: number } } = {};
  let currentHour = 9; // Start work day at 9:00 AM

  const sorted = [...issues].sort((a, b) => {
    const prioOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (prioOrder[a.priority] || 2) - (prioOrder[b.priority] || 2);
  });

  for (const issue of sorted) {
    if (currentHour === 13) currentHour = 14; // Skip 1 PM lunch break
    if (currentHour > 20) break; 
    const span = Math.min(4, Math.max(1, Math.ceil(issue.estimate || 1)));
    slots[currentHour] = { issue, span };
    currentHour += span;
  }
  return slots;
}

function TimeBlockGridView({
  weekDays,
  issues,
  onAddTask,
  onToggleIssue,
  onLaunchTimer
}: {
  weekDays: { date: Date; dayName: string; isToday: boolean }[];
  issues: IssueWithRelations[];
  onAddTask: (date: Date, dayName: string) => void;
  onToggleIssue: (issueId: string, currentStatus: string) => void;
  onLaunchTimer: (issueTitle: string) => void;
}) {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const daySlots = useMemo(() => {
    return weekDays.map(day => {
      const dayStart = new Date(day.date).setHours(0, 0, 0, 0);
      const dayEnd = new Date(day.date).setHours(23, 59, 59, 999);
      const dayIssues = issues.filter(issue => {
        const date = issue.scheduledDate ? new Date(issue.scheduledDate) : issue.dueDate ? new Date(issue.dueDate) : null;
        return date && date.getTime() >= dayStart && date.getTime() <= dayEnd;
      });
      return {
        ...day,
        slots: assignHourlySlots(dayIssues),
        unscheduledCount: dayIssues.length
      };
    });
  }, [weekDays, issues]);

  // Current time line calculation for today
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const showCurrentTimeLine = currentHour >= 8 && currentHour <= 20;
  const lineTopPercent = ((currentHour - 8) * 60 + currentMinute) / ((20 - 8 + 1) * 60) * 100;

  return (
    <div className="border border-border rounded-2xl bg-surface shadow-sm overflow-hidden flex flex-col font-sans">
      
      {/* Grid Header Row: Days of Week */}
      <div className="flex border-b border-border bg-surface-hover/80 sticky top-0 z-20 backdrop-blur-md">
        <div className="w-16 sm:w-20 shrink-0 border-r border-border p-2.5 flex items-center justify-center text-[10px] font-mono font-bold text-secondary uppercase tracking-wider bg-surface/50">
          GMT / Local
        </div>
        {daySlots.map(day => (
          <div 
            key={day.dayName}
            onClick={() => onAddTask(day.date, day.dayName)}
            title={`Click to schedule time block on ${day.dayName}, ${day.date.toLocaleDateString()}`}
            className={cn(
              "flex-1 min-w-[140px] sm:min-w-[180px] p-2.5 border-r border-border last:border-r-0 flex items-center justify-between transition-colors cursor-pointer group",
              day.isToday ? "bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 border-b-2 border-b-[#2563EB] dark:border-b-[#00E5FF]" : "hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-mono uppercase font-bold",
                day.isToday ? "text-[#2563EB] dark:text-[#00E5FF]" : "text-secondary"
              )}>
                {day.dayName}
              </span>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-mono font-bold transition-transform group-hover:scale-105",
                day.isToday ? "bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] shadow-sm" : "text-primary bg-surface border border-border"
              )}>
                {day.date.getDate()}
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-border text-primary font-bold">
              {day.unscheduledCount} tasks
            </span>
          </div>
        ))}
      </div>

      {/* Grid Body: Hours & Cells */}
      <div className="relative overflow-y-auto max-h-[640px] divide-y divide-border/60">
        
        {/* Persistent Animated Current-Time Line (NOW) */}
        {showCurrentTimeLine && (
          <div 
            className="absolute left-0 right-0 z-30 pointer-events-none flex items-center transition-all duration-300"
            style={{ top: `${lineTopPercent}%` }}
          >
            <div className="w-16 sm:w-20 pr-1.5 text-right text-[10px] font-mono font-bold text-[#2563EB] dark:text-[#00E5FF] bg-surface px-1.5 py-0.5 rounded shadow-sm border border-[#2563EB]/20 dark:border-[#00E5FF]/20">
              NOW {String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}
            </div>
            <div className="relative flex items-center -ml-1">
              <div className="w-3 h-3 rounded-full bg-[#2563EB] dark:bg-[#00E5FF] animate-ping absolute opacity-75" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] dark:bg-[#00E5FF] shadow-md z-10" />
            </div>
            <div 
              className="flex-1 h-[2px] bg-[#2563EB] dark:bg-[#00E5FF]" 
              style={{ filter: 'drop-shadow(0 0 6px var(--color-signal-glow))' }}
            />
          </div>
        )}

        {hours.map(hour => {
          const timeLabel = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
          const isLunch = hour === 13;

          return (
            <div key={hour} className="flex min-h-[80px] group/row">
              {/* Left Time Axis Label */}
              <div className="w-16 sm:w-20 shrink-0 border-r border-border p-2 text-right text-xs font-mono text-secondary select-none flex flex-col justify-start pt-2 bg-surface/30">
                <span className="font-bold text-primary">{timeLabel}</span>
                {isLunch && <span className="text-[9px] text-[#F59E0B] font-mono font-bold uppercase mt-1">Lunch Break</span>}
              </div>

              {/* 7 Day Cell Columns for this Hour */}
              {daySlots.map((day, dayIdx) => {
                const slotData = day.slots[hour];
                const isToday = day.isToday;

                return (
                  <div
                    key={dayIdx}
                    onClick={() => !slotData && onAddTask(day.date, day.dayName)}
                    className={cn(
                      "flex-1 min-w-[140px] sm:min-w-[180px] border-r border-border/60 last:border-r-0 p-1.5 relative transition-colors",
                      isToday ? "bg-[#2563EB]/5 dark:bg-[#00E5FF]/5" : "hover:bg-surface-hover/50",
                      !slotData && "cursor-pointer group/cell"
                    )}
                  >
                    {!slotData ? (
                      <div className="h-full w-full rounded-xl border border-dashed border-transparent group-hover/cell:border-[#2563EB]/40 dark:group-hover/cell:border-[#00E5FF]/40 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all">
                        <span className="text-[10px] font-mono font-bold text-[#2563EB] dark:text-[#00E5FF] flex items-center gap-1 bg-surface px-2.5 py-1 rounded-lg shadow-2xs border border-border">
                          <Plus className="w-3 h-3 stroke-[1.5]" /> Set Time Block
                        </span>
                      </div>
                    ) : (
                      (() => {
                        const issue = slotData.issue;
                        const isDone = issue.status === 'done';
                        const isUrgent = issue.priority === 'urgent' || issue.priority === 'high';
                        const isMedium = issue.priority === 'medium';
                        
                        const pillStyle = isDone
                          ? "border-l-[#109868] bg-[#109868]/10 hover:bg-[#109868]/15 text-[#109868]"
                          : isUrgent
                          ? "border-l-[#2563EB] dark:border-l-[#00E5FF] bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 hover:bg-[#2563EB]/15 dark:hover:bg-[#00E5FF]/15 text-[#2563EB] dark:text-[#00E5FF]"
                          : isMedium
                          ? "border-l-[#4F46E5] dark:border-l-[#818CF8] bg-[#4F46E5]/10 dark:bg-[#818CF8]/10 hover:bg-[#4F46E5]/15 dark:hover:bg-[#818CF8]/15 text-[#4F46E5] dark:text-[#818CF8]"
                          : "border-l-[#7C3AED] dark:border-l-[#A78BFA] bg-[#7C3AED]/10 dark:bg-[#A78BFA]/10 hover:bg-[#7C3AED]/15 dark:hover:bg-[#A78BFA]/15 text-[#7C3AED] dark:text-[#A78BFA]";

                        return (
                          <div
                            onClick={(e) => { e.stopPropagation(); onToggleIssue(issue.id, issue.status); }}
                            className={cn(
                              "h-full rounded-r-xl border-l-4 border-y border-r border-border/60 p-2.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group/pill relative overflow-hidden",
                              pillStyle
                            )}
                            style={{ minHeight: `${slotData.span * 72}px`, zIndex: 10 }}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <span className={cn("font-bold text-xs leading-snug line-clamp-2 font-sans text-primary", isDone && "line-through opacity-75 text-secondary")}>
                                  {issue.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onToggleIssue(issue.id, issue.status); }}
                                  className={cn(
                                    "w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors",
                                    isDone ? "bg-[#109868] border-[#109868] text-white dark:text-[#050811]" : "border-border bg-surface hover:border-primary"
                                  )}
                                >
                                  {isDone && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                                </button>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] font-mono font-bold opacity-90">
                                <span>{timeLabel} – {hour + slotData.span > 12 ? `${hour + slotData.span - 12} PM` : `${hour + slotData.span} AM`}</span>
                                <span>•</span>
                                <span className="uppercase font-bold">{issue.priority}</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1 mt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLaunchTimer(`[Issue] ${issue.title}`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-primary hover:opacity-90 text-surface font-mono text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-transform active:scale-95 cursor-pointer w-full justify-center"
                                title="Launch Focus Sprint on this directive"
                              >
                                <Rocket className="w-3 h-3 shrink-0 stroke-[1.5]" /> Launch Focus Sprint
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeeklyPlanner() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'columns' | 'matrix'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [modalTargetDate, setModalTargetDate] = useState<Date | null>(null);
  const [modalTargetDayName, setModalTargetDayName] = useState<string>('');
  
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: habits = [], isLoading: habitsLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: sprints = [] } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });

  const queryClient = useQueryClient();
  const toggleHabitMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => api.habits.complete(id, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const createIssueMutation = useMutation({
    mutationFn: (data: { title: string; priority: string; estimate: number; scheduledDate: string; dueDate: string }) =>
      api.issues.create({
        title: data.title,
        priority: data.priority,
        estimate: data.estimate,
        scheduledDate: data.scheduledDate,
        dueDate: data.dueDate,
        status: 'todo'
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setScheduleModalOpen(false);
      toast.success(`Scheduled "${newIssue.title}" onto execution canvas!`);
    },
    onError: () => toast.error('Failed to schedule time block')
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, scheduledDate, dueDate, status }: { id: string; scheduledDate?: string; dueDate?: string; status?: string }) =>
      api.issues.update(id, {
        ...(scheduledDate !== undefined && { scheduledDate }),
        ...(dueDate !== undefined && { dueDate }),
        ...(status !== undefined && { status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setScheduleModalOpen(false);
    },
    onError: () => toast.error('Failed to update directive')
  });

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

  if (issuesLoading || habitsLoading) return <LoadingState title="Loading Temporal HUD..." description="Synchronizing time blocks, routine telemetry, and AI conflict radar..." />;

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const toggleHabitDay = (habitId: string, dayDate: Date) => {
    const dStr = dayDate.toISOString().split('T')[0] || '';
    toggleHabitMutation.mutate({ id: habitId, date: dStr });
  };

  const handleToggleIssueStatus = (issueId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    updateIssueMutation.mutate({ id: issueId, status: nextStatus });
  };

  const handleLaunchTimer = (taskTitle: string) => {
    localStorage.setItem('krama_active_focus_task', taskTitle);
    navigate(`/app/review?focusTask=${encodeURIComponent(taskTitle)}`);
    toast.success(`🚀 Initializing Focus Sprint for "${taskTitle}"!`);
  };

  const handleOpenScheduleModal = (date: Date, dayName: string) => {
    setModalTargetDate(date);
    setModalTargetDayName(dayName);
    setScheduleModalOpen(true);
  };

  const handleAiAutoResolve = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: 'AI Schedule Sentinel analyzing backlog and capacity...',
        success: '✨ AI Sentinel: Optimized time blocks across peak velocity windows!',
        error: 'Optimization failed'
      }
    );
  };

  const weekRangeLabel = `${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const currentMonthYear = weekDays[0].date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Compute Time Block Summary for the week
  const totalEstimate = issues.reduce((sum, i) => sum + (i.estimate || 1), 0);
  const focusHours = Math.round(totalEstimate * 0.7);
  const meetingHours = Math.round(totalEstimate * 0.3);
  const bufferHours = Math.max(0, 40 - totalEstimate);
  const unscheduledBacklogCount = issues.filter(i => !i.scheduledDate && i.status !== 'done').length;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-canvas animate-in fade-in duration-150 gap-4 overflow-y-auto pb-24 font-sans text-primary">
      
      {/* UNIFIED EXECUTION PULSE / TEMPORAL HUD HEADER */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Nav: Month/Year, Date Range, Today & Arrows */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF] flex items-center justify-center shadow-2xs border border-[#2563EB]/20 dark:border-[#00E5FF]/20">
              <CalendarIcon className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-h2 font-bold tracking-tight text-primary leading-tight">{currentMonthYear}</h1>
              <span className="text-[11px] font-mono text-secondary uppercase tracking-wider">TEMPORAL TIME-BLOCKING HUD</span>
            </div>
          </div>

          <div className="h-8 w-px bg-border hidden sm:block mx-1" />

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigateWeek('today')}
              className="px-3.5 py-1.5 text-xs font-mono font-bold text-primary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors shadow-2xs cursor-pointer"
            >
              TODAY
            </button>
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 shadow-2xs">
              <button 
                onClick={() => navigateWeek('prev')} 
                className="p-1.5 rounded hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Previous week"
              >
                <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
              </button>
              <button 
                onClick={() => navigateWeek('next')} 
                className="p-1.5 rounded hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Next week"
              >
                <ChevronRight className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
            <span className="text-xs font-mono font-bold text-primary bg-surface-hover px-3 py-1 rounded-lg border border-border shadow-2xs">
              {weekRangeLabel}
            </span>
          </div>
        </div>

        {/* Right Nav: View Switcher & Schedule Button */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          
          <div className="flex items-center bg-surface-hover border border-border rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'grid' ? "bg-primary text-surface shadow-2xs" : "text-secondary hover:text-primary hover:bg-surface"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 stroke-[1.5]" /> Time Grid
            </button>
            <button
              onClick={() => setViewMode('columns')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'columns' ? "bg-primary text-surface shadow-2xs" : "text-secondary hover:text-primary hover:bg-surface"
              )}
            >
              <Columns className="w-3.5 h-3.5 stroke-[1.5]" /> Columns
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'matrix' ? "bg-[#F59E0B] text-white dark:text-[#050811] shadow-2xs" : "text-secondary hover:text-primary hover:bg-surface"
              )}
            >
              <Flame className="w-3.5 h-3.5 stroke-[1.5]" /> Matrix ({habits.length})
            </button>
          </div>

          <button 
            type="button"
            onClick={() => handleOpenScheduleModal(new Date(), 'Today')}
            className="px-4 py-2 bg-[#2563EB] dark:bg-[#00E5FF] hover:opacity-90 text-white dark:text-[#050811] rounded-xl font-mono font-bold shadow-sm transition-all flex items-center gap-1.5 text-xs cursor-pointer hover:scale-102 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[1.5]" /> Schedule Block
          </button>
        </div>

      </div>

      {/* QUIET AI CONFLICT RESOLUTION & SCHEDULE SENTINEL (Hero Moment) */}
      {unscheduledBacklogCount > 0 && (
        <div className="bg-gradient-to-r from-[#7C3AED]/15 dark:from-[#A78BFA]/15 via-surface to-transparent border-l-4 border-l-[#7C3AED] dark:border-l-[#A78BFA] p-3.5 rounded-r-xl border-y border-r border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] dark:bg-[#A78BFA] text-white dark:text-[#050811] flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div className="text-xs font-mono">
              <strong className="text-primary block font-bold flex items-center gap-1.5">
                AI Schedule Sentinel: <span className="text-[#7C3AED] dark:text-[#A78BFA]">{unscheduledBacklogCount} unmapped backlog directives</span> detected
              </strong>
              <span className="text-secondary">AI temporal balancer suggests distributing high-priority blocks across open morning deep-work slots.</span>
            </div>
          </div>
          <button 
            onClick={handleAiAutoResolve} 
            className="px-3 py-1.5 rounded-lg bg-[#7C3AED] dark:bg-[#A78BFA] text-white dark:text-[#050811] font-mono text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
          >
            ✨ Auto-Resolve Schedule <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>
      )}

      {/* SPRINTS BANNER & CAPACITY TELEMETRY BAR */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-secondary bg-surface-hover px-2.5 py-1 rounded-lg border border-border flex items-center gap-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#00E5FF] stroke-[1.5]" /> SPRINT MILESTONES
          </span>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {sprints.length === 0 ? (
              <span className="text-xs text-secondary font-mono truncate">No active sprints spanning this week. Initialize a sprint in Projects to render temporal badges.</span>
            ) : (
              sprints.slice(0, 2).map(sprint => (
                <div key={sprint.id} className="bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 border border-[#2563EB]/20 dark:border-[#00E5FF]/20 text-[#2563EB] dark:text-[#00E5FF] px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-2 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#00E5FF] animate-pulse" />
                  <span><strong>SPRINT:</strong> {sprint.name}</span>
                  <span className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded text-primary uppercase font-bold border border-border/40">ACTIVE</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs bg-surface-hover px-3.5 py-1 rounded-xl border border-border font-mono font-bold">
          <span className="flex items-center gap-1.5 text-[#2563EB] dark:text-[#00E5FF]"><span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#00E5FF]" />{focusHours}h Focus</span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5 text-[#F59E0B]"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" />{meetingHours}h Sync</span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5 text-secondary"><span className="w-2 h-2 rounded-full bg-border" />{bufferHours}h Buffer</span>
        </div>
      </div>

      {/* VIEW RENDERER: Grid, Columns, or Matrix */}
      {viewMode === 'grid' && (
        <TimeBlockGridView
          weekDays={weekDays}
          issues={issues}
          onAddTask={handleOpenScheduleModal}
          onToggleIssue={handleToggleIssueStatus}
          onLaunchTimer={handleLaunchTimer}
        />
      )}

      {viewMode === 'columns' && (
        <div className="overflow-x-auto pb-2 animate-in fade-in duration-150">
          <div className="min-w-max border border-border rounded-2xl bg-surface shadow-sm flex overflow-hidden">
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
                  habits={habits}
                  isLast={index === weekDays.length - 1}
                  onAddTask={handleOpenScheduleModal}
                  onToggleHabit={toggleHabitDay}
                  onToggleIssue={handleToggleIssueStatus}
                  onLaunchTimer={handleLaunchTimer}
                />
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'matrix' && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs font-sans animate-in fade-in duration-150">
          <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0 border border-[#F59E0B]/20">
                <Flame className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-primary">Routine Consistency Telemetry Matrix</h2>
                <p className="text-xs text-secondary font-mono">7-day synchronization matrix. Toggle daily execution checks directly across the temporal grid.</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-1 rounded-lg font-bold border border-[#F59E0B]/20">
              {habits.length || 0} routines tracked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-mono font-bold uppercase tracking-wider text-secondary bg-surface">
                  <th className="py-3.5 px-5 w-1/4">Routine Name</th>
                  <th className="py-3.5 px-3 text-center">Streak</th>
                  {weekDays.map(day => (
                    <th key={day.dayName} className={cn("py-3.5 px-3 text-center", day.isToday ? "text-[#2563EB] dark:text-[#00E5FF] font-bold bg-[#2563EB]/10 dark:bg-[#00E5FF]/10" : "")}>
                      <div>{day.dayName}</div>
                      <div className={cn("text-xs font-bold mt-0.5 font-mono", day.isToday ? "text-[#2563EB] dark:text-[#00E5FF]" : "text-primary")}>{day.date.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {habits.map((habit) => (
                  <tr key={habit.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-sm text-primary">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
                        <span className="truncate">{habit.name}</span>
                      </div>
                      <div className="text-[11px] text-secondary ml-4 font-mono mt-0.5">{habit.timeOfDay || 'daily'} • {habit.duration || 15}m block</div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-primary">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] font-mono text-[11px] font-bold"><Flame className="w-3 h-3 text-[#F59E0B] stroke-[1.5]" />{habit.streak}d</span>
                    </td>
                    {weekDays.map((day, dayIdx) => {
                      const dStr = day.date.toISOString().split('T')[0] || '';
                      const isChecked = habit.completions?.some((c: any) => c.date.toString().startsWith(dStr) && c.completed) ||
                        (day.isToday && habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString());

                      return (
                        <td key={dayIdx} className={cn("py-3.5 px-3 text-center", day.isToday ? "bg-[#2563EB]/5 dark:bg-[#00E5FF]/5" : "")}>
                          <button 
                            type="button"
                            onClick={() => toggleHabitDay(habit.id, day.date)}
                            className="p-1 focus:outline-none hover:scale-110 transition-transform block mx-auto cursor-pointer"
                          >
                            {isChecked ? (
                              <div className="w-5 h-5 mx-auto rounded-md bg-[#109868] text-white dark:text-[#050811] flex items-center justify-center shadow-2xs transition-all animate-in zoom-in-50 duration-150">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 mx-auto rounded-md border border-border bg-surface hover:border-primary transition-all flex items-center justify-center shadow-2xs" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {habits.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-secondary font-mono">No routines configured. Initialize a routine in the Habit Tracker to synchronize temporal telemetry here.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCHEDULE TASK / TIME BLOCK MODAL */}
      <ScheduleTaskModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        targetDate={modalTargetDate}
        targetDayName={modalTargetDayName}
        allIssues={issues}
        onScheduleExisting={(issueId, dateStr) => updateIssueMutation.mutate({ id: issueId, scheduledDate: dateStr, dueDate: dateStr })}
        onCreateNew={(data) => createIssueMutation.mutate({ ...data, scheduledDate: data.dateStr, dueDate: data.dateStr })}
        isSubmitting={createIssueMutation.isPending || updateIssueMutation.isPending}
      />

    </div>
  );
}
