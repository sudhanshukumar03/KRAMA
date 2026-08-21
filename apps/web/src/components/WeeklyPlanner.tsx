import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, ChevronLeft, ChevronRight, Check, Clock, Flame, Calendar as CalendarIcon, X, Briefcase, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn, parseLocalDate } from '../lib/utils';
import type { IssueWithRelations } from '../types/schema';
import { LoadingState } from './ui/LoadingState';
import { EmptyState } from './ui/EmptyState';

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
 onCreateNew: (data: { title: string; priority: string; estimateMinutes: number; dateStr: string }) => void;
 isSubmitting: boolean;
}) {
 const [mode, setMode] = useState<'create' | 'pick'>('create');
 const [title, setTitle] = useState('');
 const [priority, setPriority] = useState("MEDIUM");
 const [estimateHours, setEstimateHours] = useState(2);
 const [selectedIssueId, setSelectedIssueId] = useState('');

 if (!open || !targetDate) return null;

 const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
 const formattedDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

 const unscheduledIssues = allIssues.filter(i => !i.scheduledDate && i.status !== "DONE");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (mode === 'create') {
 if (!title.trim()) return;
 onCreateNew({ title: title.trim(), priority, estimateMinutes: Math.round(Number(estimateHours) * 60), dateStr });
 } else {
 if (!selectedIssueId) return;
 onScheduleExisting(selectedIssueId, dateStr);
 }
 };

 return (
 <div onClick={onClose} className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
 <div onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left font-sans">
 
 {/* Google Calendar Style Modal Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-full bg-[#1A73E8]/10 text-[#1A73E8] flex items-center justify-center">
 <CalendarIcon className="w-4 h-4 stroke-[2]" />
 </div>
 <div>
 <h3 className="text-card text-primary mb-2 ">Schedule Event / Task</h3>
 <p className="text-caption text-secondary font-mono">{targetDayName} • {formattedDate}</p>
 </div>
 </div>
 <button onClick={onClose} type="button" className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer">
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* Tab Switcher: Create vs Pick Backlog */}
 <div className="flex border-b border-border bg-surface-hover px-6">
 <button
 type="button"
 onClick={() => setMode('create')}
 className={cn("py-2.5 px-4 text-caption font-medium border-b-2 transition-colors cursor-pointer",
 mode === 'create' ?"border-[#1A73E8] text-[#1A73E8]" :"border-transparent text-secondary hover:text-primary"
 )}
 >
 + Create New Time Block
 </button>
 <button
 type="button"
 onClick={() => setMode('pick')}
 className={cn("py-2.5 px-4 text-caption font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
 mode === 'pick' ?"border-[#1A73E8] text-[#1A73E8]" :"border-transparent text-secondary hover:text-primary"
 )}
 >
 <Briefcase className="w-3.5 h-3.5" /> Pick from Backlog ({unscheduledIssues.length})
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 {mode === 'create' ? (
 <>
 <div>
 <label className="block text-caption font-medium text-primary uppercase tracking-wider mb-1.5 font-mono">
 Task Title <span className="text-[#D93025]">*</span>
 </label>
 <input
 type="text"
 value={title}
 onChange={e => setTitle(e.target.value)}
 placeholder="e.g., Implement OAuth Google Sign-In"
 required
 autoFocus
 className="w-full px-3.5 py-2.5 border border-border rounded-lg text-body text-primary placeholder:text-muted focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all bg-surface"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-medium text-primary uppercase tracking-wider mb-1.5 font-mono">Priority</label>
 <select
 value={priority}
 onChange={e => setPriority(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#1A73E8] cursor-pointer font-sans"
 >
 <option value="URGENT">🔴 Urgent</option>
 <option value="HIGH">🟠 High</option>
 <option value="MEDIUM">🟡 Medium</option>
 <option value="LOW">🟣 Low</option>
 </select>
 </div>

 <div>
 <label className="block text-caption font-medium text-primary uppercase tracking-wider mb-1.5 font-mono">Estimated Hours</label>
 <input
 type="number"
 min="0.5"
 max="24"
 step="0.5"
 value={estimateHours}
 onChange={e => setEstimateHours(Number(e.target.value))}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#1A73E8] transition-all font-sans"
 />
 </div>
 </div>
 </>
 ) : (
 <div>
 <label className="block text-caption font-medium text-primary uppercase tracking-wider mb-1.5 font-mono">
 Select Backlog Issue to Schedule
 </label>
 {unscheduledIssues.length === 0 ? (
 <div className="p-8 text-center bg-surface-hover rounded-lg border border-border text-caption text-secondary">
 No unscheduled backlog issues available. Switch to"Create New Time Block" above!
 </div>
 ) : (
 <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
 {unscheduledIssues.map(issue => (
 <div
 key={issue.id}
 onClick={() => setSelectedIssueId(issue.id)}
 className={cn("p-3 flex items-center justify-between cursor-pointer transition-colors",
 selectedIssueId === issue.id ?"bg-[#E8F0FE] text-[#1A73E8]" :"hover:bg-surface-hover text-primary"
 )}
 >
 <div className="min-w-0 pr-2">
 <div className="text-body font-medium truncate">{issue.title}</div>
 <div className="text-badge text-secondary font-mono mt-0.5 flex items-center gap-2">
 <span className="uppercase">{issue.priority}</span>
 <span>•</span>
 <span>{(issue.estimateMinutes || 60) / 60}h</span>
 </div>
 </div>
 <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
 selectedIssueId === issue.id ?"bg-[#1A73E8] border-[#1A73E8] text-white" :"border-[#70757A] bg-surface"
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
 className="px-4 py-2 text-caption font-medium text-secondary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting || (mode === 'create' ? !title.trim() : !selectedIssueId)}
 className="px-5 py-2 text-caption font-medium text-white bg-[#1A73E8] hover:bg-[#1557B0] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
 >
 <CalendarIcon className="w-3.5 h-3.5" /> Schedule Block
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
 onToggleIssue
}: { 
 date: Date; 
 dayName: string; 
 isToday: boolean; 
 issues: IssueWithRelations[]; 
 habits: any[];
 isLast: boolean; 
 onAddTask: (date: Date, dayName: string) => void;
 onToggleHabit: (habitId: string, date: Date, isCurrentlyCompleted: boolean) => void;
 onToggleIssue: (issueId: string, currentStatus: string) => void;
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
 id={isToday ?"today-column" : undefined}
 onClick={handleColumnClick}
 title={`Click empty space to open Daily Schedule for ${dayName}, ${date.toLocaleDateString()}`}
 className={cn("flex flex-col min-w-[240px] flex-1 relative group/col cursor-pointer transition-colors font-sans bg-transparent",
 !isLast &&"border-r border-border",
 isToday &&"border-t-2 border-t-[color:var(--color-accent)] bg-[color:var(--color-surface)]/30"
 )}
 >
 {/* Sticky Google Calendar Day Header (Number Pill / Circle) */}
 <div className={cn("px-4 py-3 flex flex-col items-center justify-center border-b border-border sticky top-0 z-10 transition-colors bg-transparent",
 isToday ?"backdrop-blur-md" :"backdrop-blur-md"
 )}>
 <span className={cn("text-badge uppercase tracking-wider font-semibold mb-1 transition-colors font-mono", 
 isToday ?"text-[#1A73E8]" :"text-secondary"
 )}>
 {dayName}
 </span>
 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all shadow-2xs font-sans",
 isToday 
 ?"bg-[#1A73E8] text-white font-medium shadow-md scale-105" 
 :"text-primary font-normal group-hover/col:bg-surface-hover"
 )}>
 {date.getDate()}
 </div>
 </div>

 {/* Day Content Container */}
 <div className="p-2.5 space-y-3 flex-1 flex flex-col justify-between">
 
 <div className="space-y-3">
 {/* Section 1: Google Tasks (Daily Routines Checklist) */}
 {habits.length > 0 && (
 <div className="bg-surface-hover border border-border rounded-xl p-2 space-y-1.5 no-column-nav shadow-2xs">
 <div className="flex items-center justify-between px-1 text-[10px] uppercase font-mono tracking-wider font-semibold text-secondary">
 <span className="flex items-center gap-1">
 <Flame className="w-3 h-3 text-[#EA580C] fill-[#EA580C]" /> Routines
 </span>
 <span>
 {habits.filter(h => {
  const isChecked = h.completions?.some((c: any) => {
    if (!c.completedAt) return false;
    const completedLocalStr = new Date(c.completedAt).toLocaleDateString('en-CA');
    return completedLocalStr === dateStr;
  });
  return isChecked;
  }).length}/{habits.length}
 </span>
 </div>
 
 <div className="space-y-1">
 {habits.map(habit => {
   const isChecked = habit.completions?.some((c: any) => {
     if (!c.completedAt) return false;
     const completedLocalStr = new Date(c.completedAt).toLocaleDateString('en-CA');
     return completedLocalStr === dateStr;
   }) || false;

 return (
 <div 
 key={habit.id}
 onClick={(e) => { e.stopPropagation(); onToggleHabit(habit.id, date, isChecked); }}
 className={cn("flex items-center gap-2 p-1.5 rounded-lg border text-caption transition-all cursor-pointer",
 isChecked 
 ?"bg-[#E6F4EA]/60 border-[#CEEAD6] text-[#137333]" 
 :"bg-surface border-border hover:border-[#1A73E8] text-primary shadow-2xs hover:shadow-sm"
 )}
 >
 <button type="button" className="focus:outline-none shrink-0">
 <div className={cn("w-4 h-4 rounded flex items-center justify-center border transition-all",
 isChecked ?"bg-[#1E8E3E] border-[#1E8E3E] text-white" :"border-[#70757A] bg-surface hover:border-[#1A73E8]"
 )}>
 {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
 </div>
 </button>
 <span className={cn("truncate flex-1 font-medium", isChecked &&"line-through opacity-75")}>
 {habit.name}
 </span>
 <span className="text-[10px] font-mono opacity-70 shrink-0">{habit.expectedDurationMinutes || 15}m</span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Section 2: Scheduled Event Pills (Google Calendar Time Blocks) */}
 <div className="space-y-4 no-column-nav">
 {issues.length === 0 ? (
 <div className="py-6 text-center flex flex-col items-center justify-center">
 <span className="text-caption text-muted font-normal">No scheduled events</span>
 </div>
 ) : (
 Object.entries(
 issues.reduce((acc, issue) => {
 // Safe access for project and goal
 const project = (issue as any).project;
 const goalTitle = project?.goal?.title || 'Uncategorized';
 if (!acc[goalTitle]) acc[goalTitle] = [];
 acc[goalTitle].push(issue);
 return acc;
 }, {} as Record<string, typeof issues>)
 ).map(([goalTitle, goalIssues]) => (
 <div key={goalTitle} className="space-y-2">
 <div className="text-[10px] uppercase font-mono tracking-wider font-semibold text-secondary px-1 flex items-center gap-1.5 border-b border-border/40 pb-1">
 <Layers className="w-3 h-3" /> {goalTitle}
 </div>
 {goalIssues.map(issue => {
 const isDone = issue.status === "DONE";
 const isUrgent = issue.priority === "URGENT" || issue.priority === "HIGH";
 const isMedium = issue.priority === "MEDIUM";
 
 // Google Calendar event styling by priority / status
 const cardStyle = isDone
 ?"border-l-[#1E8E3E] bg-[#E6F4EA] hover:bg-[#CEEAD6] text-[#137333]"
 : isUrgent
 ?"border-l-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2]"
 : isMedium
 ?"border-l-[#E37400] bg-[#FEF7E0] hover:bg-[#FEEFC3] text-[#B06000]"
 :"border-l-[#9334E6] bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#7E22CE]";

 return (
 <div 
 key={issue.id} 
 onClick={(e) => { e.stopPropagation(); onToggleIssue(issue.id, issue.status); }}
 title="Click to toggle Done status or view ticket"
 className={cn("p-2.5 rounded-r-lg border-l-4 border-y border-r border-border/60 shadow-2xs hover:shadow-md transition-all flex flex-col gap-1.5 cursor-pointer group/card",
 cardStyle
 )}
 >
 <div className="flex items-start justify-between gap-1">
 <span className={cn("font-medium text-caption leading-snug line-clamp-2", isDone &&"line-through opacity-75")}>
 {issue.title}
 </span>
 <button 
 type="button" 
 onClick={(e) => { e.stopPropagation(); onToggleIssue(issue.id, issue.status); }}
 className={cn("w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors mt-0.5",
 isDone ?"bg-[#1E8E3E] border-[#1E8E3E] text-white" :"border-current/40 bg-surface/60 hover:bg-surface"
 )}
 >
 {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
 </button>
 </div>
 
 <div className="flex items-center justify-between text-[10px] font-mono opacity-85 pt-1 border-t border-current/15">
 <span className="flex items-center gap-1 font-semibold">
 <Clock className="w-3 h-3 stroke-[2]" /> {(issue.estimateMinutes || 60) / 60}h block
 </span>
 <span className="uppercase tracking-wider font-bold px-1 rounded bg-surface/50">{issue.priority}</span>
 </div>
 </div>
 );
 })}
 </div>
 ))
 )}
 </div>
 </div>

 {/* Section 3:"+ Add time block" Google hover button at bottom */}
 <button 
 type="button"
 onClick={(e) => { e.stopPropagation(); onAddTask(date, dayName); }}
 className="w-full mt-2 py-2 border border-dashed border-border hover:border-[#1A73E8] hover:bg-[#E8F0FE]/50 rounded-lg text-caption font-medium text-secondary hover:text-[#1A73E8] transition-all flex items-center justify-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer no-column-nav shadow-2xs"
 >
 <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add time block
 </button>

 </div>
 </div>
 );
}

export function WeeklyPlanner() {
 const [currentDate, setCurrentDate] = useState(new Date());
 const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
 const [modalTargetDate, setModalTargetDate] = useState<Date | null>(null);
 const [modalTargetDayName, setModalTargetDayName] = useState<string>('');
 
 const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
 const { data: habits = [], isLoading: habitsLoading } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
 const { data: sprints = [] } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });

 const queryClient = useQueryClient();
  const toggleHabitMutation = useMutation({
    mutationFn: (data: { id: string; date: string; dateIso: string; isCurrentlyCompleted: boolean }) => {
      if (data.isCurrentlyCompleted) {
        return api.habits.uncomplete(data.id, data.date, data.dateIso);
      }
      return api.habits.complete(data.id, data.date, data.dateIso);
    },
    onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['habits'] });
 queryClient.invalidateQueries({ queryKey: ['snapshots'] });
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 }
 });

 const createIssueMutation = useMutation({
  mutationFn: (data: { title: string; priority: string; estimateMinutes: number; dateStr: string }) =>
  api.tasks.create({
  title: data.title,
  priority: data.priority,
  estimateMinutes: data.estimateMinutes,
  scheduledDate: data.dateStr ? parseLocalDate(data.dateStr)?.toISOString() : undefined,
  dueDate: data.dateStr ? parseLocalDate(data.dateStr)?.toISOString() : undefined,
  status: "TODO"
  }),
 onSuccess: (newIssue) => {
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 setScheduleModalOpen(false);
 toast.success(`Scheduled"${newIssue.title}" onto calendar!`);
 },
 onError: () => toast.error('Failed to schedule time block')
 });

 const updateIssueMutation = useMutation({
 mutationFn: ({ id, scheduledDate, dueDate, status }: { id: string; scheduledDate?: string; dueDate?: string; status?: string }) =>
 api.tasks.update(id, {
 ...(scheduledDate !== undefined && { scheduledDate: `${scheduledDate}T00:00:00.000Z` }),
 ...(dueDate !== undefined && { dueDate: `${dueDate}T00:00:00.000Z` }),
 ...(status !== undefined && { status }),
 }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 setScheduleModalOpen(false);
 },
 onError: () => toast.error('Failed to update issue')
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

 if (issuesLoading || habitsLoading) return <LoadingState title="Loading Google Planner..." description="Mapping time blocks and daily routines..." />;

 if (issues.length === 0 && habits.length === 0) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-surface-hover relative overflow-hidden">
      <div className="absolute inset-0 flex flex-col pointer-events-none opacity-20">
        <div className="flex-1 border-b border-border"></div>
        <div className="flex-1 border-b border-border"></div>
        <div className="flex-1 border-b border-border"></div>
        <div className="flex-1"></div>
      </div>
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        <EmptyState 
          icon={CalendarIcon}
          title="Your Week is Wide Open"
          description="You have no tasks or routines scheduled. Plan your week to start making progress."
          actionLabel="Schedule Time Block"
          onAction={() => handleOpenScheduleModal(new Date(), 'Today')}
        />
        <ScheduleTaskModal
          open={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          targetDate={modalTargetDate}
          targetDayName={modalTargetDayName}
          allIssues={issues}
          onScheduleExisting={(issueId, dateStr) => updateIssueMutation.mutate({ id: issueId, scheduledDate: dateStr, dueDate: dateStr })}
          onCreateNew={(data) => createIssueMutation.mutate({ ...data, dateStr: data.dateStr })}
          isSubmitting={createIssueMutation.isPending || updateIssueMutation.isPending}
        />
      </div>
    </div>
  );
 }

 const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
 if (direction === 'today') {
 setCurrentDate(new Date());
 return;
 }
 const newDate = new Date(currentDate);
 newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
 setCurrentDate(newDate);
 };

  const toggleHabitDay = (habitId: string, dayDate: Date, isCurrentlyCompleted: boolean) => {
   const dStr = dayDate.toISOString().split('T')[0] || '';
   const dIso = parseLocalDate(dStr)?.toISOString() || '';
   toggleHabitMutation.mutate({ id: habitId, date: dStr, dateIso: dIso, isCurrentlyCompleted });
   };

 const handleToggleIssueStatus = (issueId: string, currentStatus: string) => {
 const nextStatus = currentStatus === "DONE" ? "TODO" : "DONE";
 updateIssueMutation.mutate({ id: issueId, status: nextStatus });
 };

 const handleOpenScheduleModal = (date: Date, dayName: string) => {
 setModalTargetDate(date);
 setModalTargetDayName(dayName);
 setScheduleModalOpen(true);
 };

 const weekRangeLabel = `${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
 const currentMonthYear = weekDays[0].date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

 // Compute Time Block Summary for the week
 const totalEstimate = issues.reduce((sum, i) => sum + (i.estimateMinutes || 60), 0);
 const focusHours = Math.round(totalEstimate * 0.7 / 60);
 const meetingHours = Math.round(totalEstimate * 0.3 / 60);
 const bufferHours = Math.max(0, 40 - (totalEstimate / 60));

 return (
 <div className="p-4 md:p-6 h-full flex flex-col bg-surface-hover animate-in fade-in duration-150 gap-4 overflow-y-auto pb-20 font-sans text-primary">
 
 {/* GOOGLE CALENDAR / PLANNER TOP NAVIGATION BAR */}
 <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 
 {/* Left Nav: Today pill, < > arrows, and Date Range Header */}
 <div className="flex flex-wrap items-center gap-3 sm:gap-4">
 <div className="flex items-center gap-2">
 <div className="w-9 h-9 rounded-full bg-[#1A73E8] text-white flex items-center justify-center shadow-sm">
 <CalendarIcon className="w-5 h-5 stroke-[2]" />
 </div>
 <h1 className="text-title text-primary mb-4 sm: font-normal">{currentMonthYear}</h1>
 </div>

 <div className="h-6 w-px bg-border hidden sm:block mx-1" />

 <div className="flex items-center gap-2">
 <button 
 onClick={() => navigateWeek('today')}
 className="px-4 py-1.5 text-caption font-medium text-primary bg-surface border border-border rounded-md hover:bg-surface-hover transition-colors shadow-2xs cursor-pointer"
 >
 Today
 </button>
 <div className="flex items-center bg-surface border border-border rounded-md p-0.5 shadow-2xs">
 <button 
 onClick={() => navigateWeek('prev')} 
 className="p-1.5 rounded hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
 title="Previous week"
 >
 <ChevronLeft className="w-4 h-4 stroke-[2]" />
 </button>
 <button 
 onClick={() => navigateWeek('next')} 
 className="p-1.5 rounded hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
 title="Next week"
 >
 <ChevronRight className="w-4 h-4 stroke-[2]" />
 </button>
 </div>
 <span className="text-caption font-mono font-medium text-secondary bg-surface-hover px-2.5 py-1 rounded-md border border-border">
 {weekRangeLabel}
 </span>
 </div>
 </div>

 {/* Right Nav: Time Allocation & Schedule Button */}
 <div className="flex flex-wrap items-center justify-end gap-3">
 <div className="flex items-center gap-3 text-caption bg-surface-hover px-3.5 py-1.5 rounded-full border border-border font-mono">
 <span className="flex items-center gap-1.5 text-[#1A73E8] font-bold"><span className="w-2 h-2 rounded-full bg-[#1A73E8]" />{focusHours}h Focus</span>
 <span className="text-border-muted">•</span>
 <span className="flex items-center gap-1.5 text-[#E37400] font-bold"><span className="w-2 h-2 rounded-full bg-[#E37400]" />{meetingHours}h Sync</span>
 <span className="text-border-muted">•</span>
 <span className="flex items-center gap-1.5 text-secondary font-bold"><span className="w-2 h-2 rounded-full bg-[#70757A]" />{Math.round(bufferHours)}h Free</span>
 </div>

 <button 
 type="button"
 onClick={() => handleOpenScheduleModal(new Date(), 'Today')}
 className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-full font-medium shadow-sm transition-all flex items-center gap-1.5 text-caption cursor-pointer"
 >
 <Plus className="w-4 h-4 stroke-[2.5]" /> Schedule Time Block
 </button>
 </div>

 </div>

 {/* GOOGLE CALENDAR ALL-DAY & SPRINTS BANNER BAR */}
 <div className="bg-surface border border-border rounded-xl p-3 shadow-2xs flex items-center justify-between gap-4 font-sans">
 <div className="flex items-center gap-3 min-w-0">
 <span className="text-caption font-mono font-bold uppercase tracking-wider text-secondary bg-surface-hover px-2.5 py-1 rounded-md border border-border flex items-center gap-1.5 shrink-0">
 <Layers className="w-3.5 h-3.5 text-[#1A73E8]" /> All-Day / Milestones
 </span>
 <div className="flex flex-wrap items-center gap-2 min-w-0">
 {sprints.length === 0 ? (
 <span className="text-caption text-secondary font-medium truncate">No active sprints spanning this week. Create a sprint in Projects to render horizontal timeline badges.</span>
 ) : (
 sprints.slice(0, 2).map(sprint => (
 <div key={sprint.id} className="bg-[#E8F0FE] border border-[#D2E3FC] text-[#1967D2] px-3 py-1 rounded-full text-caption font-medium flex items-center gap-2 shadow-2xs">
 <span className="w-2 h-2 rounded-full bg-[#1A73E8] animate-pulse" />
 <span><strong>Sprint:</strong> {sprint.name}</span>
 <span className="text-[10px] font-mono bg-surface/80 px-1.5 py-0.2 rounded text-[#1A73E8] uppercase font-bold">Active</span>
 </div>
 ))
 )}
 </div>
 </div>
 <div className="text-caption font-mono text-secondary hidden md:block shrink-0">
 Spans across 7-day grid horizon
 </div>
 </div>

 {/* 7-DAY GOOGLE CALENDAR GRID (7 columns with sticky number circles & integrated task pills) */}
 <div className="overflow-x-auto pb-2">
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
 />
 );
 })}
 </div>
 </div>

 {/* WEEKLY HABIT CONSISTENCY MATRIX (Google Material Styled Accordion Card) */}
 <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs font-sans">
 <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
 <Flame className="w-4 h-4 stroke-[2]" />
 </div>
 <div>
 <h2 className="text-section text-primary mb-3 ">Habit & Routine Consistency Matrix</h2>
 <p className="text-caption text-secondary">Google Tasks 7-day synchronization table. Toggle daily checkmarks directly across the week.</p>
 </div>
 </div>
 <span className="text-caption font-mono text-[#EA580C] bg-[#EA580C]/10 px-2.5 py-1 rounded-md font-medium border border-[#FFEDD5]">
 {habits.length || 0} routines tracked
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse min-w-[750px]">
 <thead>
 <tr className="border-b border-border text-badge font-semibold uppercase tracking-wider text-secondary font-mono bg-surface">
 <th className="py-3.5 px-5 w-1/4">Routine Name</th>
 <th className="py-3.5 px-3 text-center">Streak</th>
 {weekDays.map(day => (
 <th key={day.dayName} className={cn("py-3.5 px-3 text-center", day.isToday ?"text-[#1A73E8] font-bold bg-[#E8F0FE]/40" :"")}>
 <div>{day.dayName}</div>
 <div className={cn("text-caption font-normal mt-0.5 font-sans", day.isToday ?"text-[#1A73E8] font-bold" :"text-primary")}>{day.date.getDate()}</div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {habits.map((habit) => (
 <tr key={habit.id} className="hover:bg-surface-hover/50 transition-colors">
 <td className="py-3.5 px-5 font-medium text-body text-primary">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-[#EA580C] shrink-0" />
 <span className="truncate">{habit.name}</span>
 </div>
 <div className="text-badge text-secondary ml-4 font-mono mt-0.5">{habit.category || 'daily'} • {habit.expectedDurationMinutes || 15}m block</div>
 </td>
 <td className="py-3.5 px-3 text-center font-mono text-caption font-medium text-primary">
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] font-mono text-badge font-bold"><Flame className="w-3 h-3 text-[#EA580C] stroke-[2]" />{habit.streak}d</span>
 </td>
 {weekDays.map((day, dayIdx) => {
  const dStr = day.date.toISOString().split('T')[0] || '';
  const isChecked = habit.completions?.some((c: any) => {
    if (!c.completedAt) return false;
    const completedLocalStr = new Date(c.completedAt).toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
    return completedLocalStr === dStr;
  });

 return (
 <td key={dayIdx} className={cn("py-3.5 px-3 text-center", day.isToday ?"bg-[#E8F0FE]/20" :"")}>
 <button 
 type="button"
 onClick={() => toggleHabitDay(habit.id, day.date, isChecked || false)}
 className="p-1 focus:outline-none hover:scale-110 transition-transform block mx-auto cursor-pointer"
 >
 {isChecked ? (
 <div className="w-5 h-5 mx-auto rounded bg-[#1E8E3E] text-white flex items-center justify-center shadow-2xs transition-all animate-in zoom-in-50 duration-150">
 <Check className="w-3.5 h-3.5 stroke-[3]" />
 </div>
 ) : (
 <div className="w-5 h-5 mx-auto rounded border border-border bg-surface hover:border-[#1A73E8] transition-all flex items-center justify-center shadow-2xs" />
 )}
 </button>
 </td>
 );
 })}
 </tr>
 ))}
 {habits.length === 0 && (
 <tr>
 <td colSpan={9} className="py-8 text-center text-caption text-secondary font-mono">No routines configured. Create a routine in the Habit Tracker to synchronize here.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* SCHEDULE TASK / TIME BLOCK MODAL */}
 <ScheduleTaskModal
 open={scheduleModalOpen}
 onClose={() => setScheduleModalOpen(false)}
 targetDate={modalTargetDate}
 targetDayName={modalTargetDayName}
 allIssues={issues}
 onScheduleExisting={(issueId, dateStr) => updateIssueMutation.mutate({ id: issueId, scheduledDate: dateStr, dueDate: dateStr })}
 onCreateNew={(data) => createIssueMutation.mutate(data)}
 isSubmitting={createIssueMutation.isPending || updateIssueMutation.isPending}
 />

 </div>
 );
}
