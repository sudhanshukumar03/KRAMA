import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Settings, Check, ChevronLeft, ChevronRight, Search, Clock, CalendarPlus, Flame, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, parseLocalDate, formatLocalDate } from '../lib/utils';
import { getIconForString } from '../lib/iconMap';
import { LoadingState } from './ui/LoadingState';
import { BaseButton } from './ui/BaseButton';
import { useHabitCompletion } from '../hooks/useHabitCompletion';
import { isHabitScheduledToday } from '../lib/habitFilters';

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function TimelineHabitRow({ habit }: { habit: any }) {
  const { isCompletedToday, toggleHabit, isPending } = useHabitCompletion(habit);
  const Icon = getIconForString(habit.name);
  
  return (
   <div 
   onClick={() => {
     if (isPending) return;
     toggleHabit();
   }}
   className={cn("flex items-center justify-between py-2 border-b border-border/60 last:border-0 group cursor-pointer transition-all duration-150 -mx-2 px-2 rounded-lg",
     isCompletedToday ? "cursor-default opacity-80" : "hover:bg-surface-hover",
     isPending && "opacity-50 pointer-events-none"
   )}
   >
   <div className="flex items-center gap-3 min-w-0">
   <button 
     type="button"
     disabled={isPending}
     onClick={(e) => {
       e.stopPropagation();
       if (isPending) return;
       toggleHabit();
     }}
     className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors focus:outline-none",
       isCompletedToday ?"bg-[#EA580C] text-white border-transparent shadow-2xs" :"bg-surface border-2 border-border text-transparent hover:border-[#EA580C]"
     )}
   >
     <Check className="w-3.5 h-3.5 stroke-[3]" />
   </button>
   <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
   isCompletedToday ?"bg-[#FFF7ED] text-[#EA580C]" :"bg-surface-hover border border-border text-[#EA580C] group-hover:border-[#EA580C]"
   )}>
   <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
   </div>
   <div className="min-w-0">
   <div className={cn("font-medium text-caption truncate group-hover:text-[#EA580C] transition-colors",
   isCompletedToday ?"text-muted line-through" :"text-primary"
   )}>{habit.name}</div>
   <div className="text-[10px] text-secondary font-mono flex items-center gap-1.5"><span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] font-mono text-[9px] font-bold"><Flame className="w-2.5 h-2.5 text-[#EA580C] stroke-[2]" />{habit.streak}d</span> streak</div>
   </div>
   </div>
   <div className="text-badge font-mono text-secondary shrink-0 ml-2 bg-surface-hover px-1.5 py-0.5 rounded border border-border">
   {habit.expectedDurationMinutes || 15}m
   </div>
   </div>
  );
}

function RoutineCreateModal({
 open,
 onClose,
 onSubmit,
 isSubmitting
}: {
 open: boolean;
 onClose: () => void;
  onSubmit: (data: { name: string; cadence: string; category: string; difficulty: string; expectedDurationMinutes: number; timeOfDay: string }) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [cadence] = useState('daily');
  const [category, setCategory] = useState('PRODUCTIVITY');
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [expectedDurationMinutes, setDuration] = useState(15);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), cadence, category, difficulty: 'MEDIUM', expectedDurationMinutes, timeOfDay });
  };

  return (
  <div
  onClick={onClose}
  className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
  >
  <div
 onClick={e => e.stopPropagation()}
 className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
 <Flame className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">Add Daily Routine</h3>
 </div>
 <button
 onClick={onClose}
 type="button"
 className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Routine Name <span className="text-[#DC2626]">*</span>
 </label>
 <input
 type="text"
 value={name}
 onChange={e => setName(e.target.value)}
 placeholder="e.g., Morning Standup & Planning"
 required
 autoFocus
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary placeholder:text-muted focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Category
 </label>
 <select
 value={category}
 onChange={e => setCategory(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 >
 <option value="PRODUCTIVITY">Productivity</option>
 <option value="HEALTH">Health</option>
 <option value="LEARNING">Learning</option>
 <option value="MINDFULNESS">Mindfulness</option>
 <option value="FINANCE">Finance</option>
 <option value="OTHER">Other</option>
 </select>
 </div>

 <div>
  <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
  Time of Day
  </label>
  <select
  value={timeOfDay}
  onChange={e => setTimeOfDay(e.target.value)}
  className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
  >
  <option value="morning">Morning</option>
  <option value="afternoon">Afternoon</option>
  <option value="evening">Evening</option>
  <option value="anytime">Anytime</option>
  </select>
  </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Duration (mins)
 </label>
 <input
 type="number"
 min="1"
 max="480"
 value={expectedDurationMinutes}
 onChange={e => setDuration(Number(e.target.value))}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 />
 </div>
 </div>

 <div className="pt-4 border-t border-border flex justify-end gap-3">
 <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
 Cancel
 </BaseButton>
 <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
 {isSubmitting ? 'Adding...' : 'Add Routine'}
 </BaseButton>
 </div>
 </form>
 </div>
 </div>
 );
}

function ScheduleTaskModal({
  open,
  onClose,
  onSubmit,
  defaultDate,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; priority: string; estimateMinutes: number; dueDate: string }) => void;
  defaultDate: string;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [estimateHours, setEstimateHours] = useState(1);
  const [dueDate, setDueDate] = useState(defaultDate);

  useEffect(() => {
    if (open) setDueDate(defaultDate);
  }, [open, defaultDate]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), priority, estimateMinutes: Math.round(Number(estimateHours) * 60), dueDate });
  };

  return (
  <div
  onClick={onClose}
  className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
  >
  <div
 onClick={e => e.stopPropagation()}
 className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
 <CalendarPlus className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">Schedule Agenda Task</h3>
 </div>
 <button
 onClick={onClose}
 type="button"
 className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Task / Event Title <span className="text-[#DC2626]">*</span>
 </label>
 <input
 type="text"
 value={title}
 onChange={e => setTitle(e.target.value)}
 placeholder="e.g., Q3 System Architecture Review"
 required
 autoFocus
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary placeholder:text-muted focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-secondary">
              Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Estimated Hours
 </label>
 <input
 type="number"
 min="0.5"
 max="12"
 step="0.5"
 value={estimateHours}
 onChange={e => setEstimateHours(Number(e.target.value))}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
 />
 </div>
 </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Priority
 </label>
 <select
 value={priority}
 onChange={e => setPriority(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
 >
 <option value="normal">Normal</option>
 <option value="HIGH">High Priority</option>
 <option value="URGENT">Urgent / Blocker</option>
 </select>
 </div>

 <div className="pt-4 border-t border-border flex justify-end gap-3">
 <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
 Cancel
 </BaseButton>
 <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
 {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
 </BaseButton>
 </div>
 </form>
 </div>
 </div>
 );
}

export function TimelineView() {
 const { data: issues = [], isLoading } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
 const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

 const queryClient = useQueryClient();
 const [routineModalOpen, setRoutineModalOpen] = useState(false);
 const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const createRoutineMutation = useMutation({
  mutationFn: (data: { name: string; cadence: string; category: string; difficulty: string; expectedDurationMinutes: number }) =>
  api.habits.create({
  name: data.name,
  cadence: data.cadence,
  category: data.category,
  difficulty: data.difficulty,
  expectedDurationMinutes: data.expectedDurationMinutes,
  streak: 0
  }),
  onSuccess: (newHabit) => {
  queryClient.invalidateQueries({ queryKey: ['habits'] });
 setRoutineModalOpen(false);
 toast.success(`Added routine"${newHabit?.name || 'Routine'}"`);
 },
 onError: () => {
 toast.error('Failed to add routine');
 }
 });

  const scheduleTaskMutation = useMutation({
    mutationFn: (data: { title: string; priority: string; estimateMinutes: number; dueDate: string }) => 
      api.tasks.create({
        title: data.title,
        priority: data.priority,
        estimateMinutes: data.estimateMinutes,
        dueDate: data.dueDate ? parseLocalDate(data.dueDate)?.toISOString() : undefined,
        status: "TODO"
      }),
 onSuccess: (newTask) => {
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 setScheduleModalOpen(false);
 toast.success(`Scheduled"${newTask?.title || 'Task'}"`);
 },
 onError: () => {
 toast.error('Failed to schedule task');
 }
 });

 const [currentTime, setCurrentTime] = useState(new Date());
 const [searchParams, setSearchParams] = useSearchParams();
 const paramDate = searchParams.get('date');

 useEffect(() => {
 const timer = setInterval(() => setCurrentTime(new Date()), 1000);
 return () => clearInterval(timer);
 }, []);

 const targetDate = useMemo(() => {
 if (paramDate) {
 const parts = paramDate.split('-').map(Number);
 if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
 return new Date(parts[0], parts[1] - 1, parts[2]);
 }
 }
 return new Date();
 }, [paramDate]);

 const navigateDay = (offsetDays: number) => {
 const nextDate = new Date(targetDate);
 nextDate.setDate(targetDate.getDate() + offsetDays);
 const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
 setSearchParams({ date: dateStr });
 };

 if (isLoading) return <LoadingState title="Loading Daily Timeline..." description="Scheduling time-blocked blocks and habit routines..." />;

 const targetStart = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
 const targetEnd = new Date(new Date(targetDate).setHours(23, 59, 59, 999));
 const isViewingToday = targetDate.toDateString() === new Date().toDateString();

  const todayIssues = issues.filter(i => {
    const date = i.scheduledDate ? new Date(i.scheduledDate) : i.dueDate ? new Date(i.dueDate) : null;
    if (!date) return false;
    if (date.getTime() >= targetStart.getTime() && date.getTime() <= targetEnd.getTime()) return true;
    // Carry over incomplete tasks from the past
    if (date.getTime() < targetStart.getTime() && i.status !== "DONE") return true;
    return false;
  });

 const pinnedTasks = issues.filter(i => i.priority === "URGENT" || i.priority === "HIGH").slice(0, 3);

 const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

 return (
 <div className="p-6 md:p-8 h-full bg-canvas flex flex-col md:flex-row gap-6 overflow-y-auto overflow-x-hidden animate-in fade-in duration-150">
 
 {/* LEFT COLUMN: Sidebar (25%) */}
 <div className="w-full md:w-[25%] flex flex-col gap-6">
 
 {/* Brand */}
 <div className="flex items-center gap-2.5 mb-1">
 <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium text-body">
 K
 </div>
 <span className="font-medium tracking-tight text-xl text-primary">Krama</span>
 <button onClick={() => setScheduleModalOpen(true)} className="ml-auto w-6 h-6 rounded-full border border-border bg-surface flex items-center justify-center hover:border-primary transition-colors shadow-2xs" title="New Task">
 <Plus className="w-3.5 h-3.5 text-primary stroke-[2]" />
 </button>
 </div>

 {/* Weekly Pinned with Quick-Slot action */}
 <div>
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-section text-primary mb-3 uppercase tracking-[0.02em]">Weekly Pinned</h2>
 <button className="text-badge font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">View all ({issues.length})</button>
 </div>
 <div className="space-y-2.5">
 {pinnedTasks.map(task => {
 const Icon = getIconForString(task.title);
 const isUrgent = task.priority === "URGENT";
 return (
 <div key={task.id} className="bg-surface rounded-xl p-3.5 border border-border shadow-sm flex flex-col gap-2 hover:border-[#2563EB] transition-all group">
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center shrink-0 group-hover:bg-[#EFF4FE] group-hover:border-[#2563EB]/30 transition-colors">
 <Icon className="w-3.5 h-3.5 text-primary group-hover:text-[#2563EB] transition-colors stroke-[1.75]" />
 </div>
 <div className="min-w-0">
 <div className="font-medium text-primary text-caption truncate">{task.title}</div>
 <div className="text-[10px] text-secondary">Due {new Date(task.dueDate || '').toLocaleDateString()}</div>
 </div>
 </div>
 <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-widest shrink-0 border",
 isUrgent ?"bg-red-50 text-[#DC2626] border-[#DC2626]/20" :"bg-amber-50 text-amber-700 border-amber-200"
 )}>
 {task.priority}
 </span>
 </div>

 {/* Quick-Slot Button */}
 <button 
 onClick={() => toast.success(`Slotted"${task.title}" into Today's Schedule`)}
 className="w-full mt-1 py-1.5 px-2 bg-surface-hover hover:bg-[#2563EB] text-secondary hover:text-white rounded-md text-badge font-medium transition-all flex items-center justify-center gap-1.5 border border-border hover:border-[#2563EB] shadow-2xs group/btn"
 >
 <CalendarPlus className="w-3.5 h-3.5 stroke-[1.75] group-hover/btn:scale-110 transition-transform" />
 <span>Slot into Timeline &rarr;</span>
 </button>
 </div>
 );
 })}
 
 {/* Ghost Add Card */}
 <button onClick={() => toast.info('Pin high-priority tasks to lock them into your weekly focus')} className="w-full bg-transparent border border-dashed border-[#D1D5DB] hover:border-[#2563EB] hover:bg-[#EFF4FE]/10 transition-all rounded-xl p-3 flex items-center justify-center gap-2 group">
 <Plus className="w-4 h-4 text-muted group-hover:text-[#2563EB] transition-colors stroke-[2]" />
 <span className="text-caption font-medium text-muted group-hover:text-[#2563EB] transition-colors">Add new weekly pin</span>
 </button>
 </div>
 </div>

 {/* Calendar Widget */}
 <div className="bg-surface border border-border rounded-xl p-4.5 shadow-sm mt-auto">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-card text-primary mb-2 flex items-center gap-1.5">
 <span>{targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
 </h3>
 <div className="flex gap-1">
 <button onClick={() => navigateDay(-30)} className="p-1 rounded hover:bg-surface-hover transition-colors"><ChevronLeft className="w-4 h-4 text-secondary stroke-[1.75]" /></button>
 <button onClick={() => navigateDay(30)} className="p-1 rounded hover:bg-surface-hover transition-colors"><ChevronRight className="w-4 h-4 text-secondary stroke-[1.75]" /></button>
 </div>
 </div>
 <div className="grid grid-cols-7 gap-1 mb-2">
 {weekdays.map(d => (
 <div key={d} className="text-center text-badge font-medium text-muted">{d}</div>
 ))}
 </div>
 <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
 <div className="col-span-2"></div>
 {calendarDays.map(d => {
 const isSelectedDay = d === targetDate.getDate();
 const isRealToday = d === new Date().getDate() && targetDate.getMonth() === new Date().getMonth();
 return (
 <div key={d} className="flex items-center justify-center">
 <div 
 onClick={() => {
 const newDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), d);
 const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
 setSearchParams({ date: dateStr });
 }}
 className={cn("w-6 h-6 rounded-full flex items-center justify-center font-mono text-caption font-medium transition-colors cursor-pointer",
 isSelectedDay ?"bg-[#2563EB] text-white shadow-sm font-bold" : isRealToday ?"border border-[#2563EB] text-[#2563EB] font-bold" :"text-primary hover:bg-surface-hover"
 )}
 >
 {d}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 </div>

 {/* CENTER COLUMN: Main Schedule (45%) */}
 <div className="w-full md:w-[45%] bg-surface border border-border rounded-xl p-6 md:p-8 shadow-sm flex flex-col relative">
 
 {/* Header Row */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <button onClick={() => navigateDay(-1)} title="Previous Day" className="p-1 rounded-full hover:bg-surface-hover transition-colors -ml-1"><ChevronLeft className="w-5 h-5 text-secondary stroke-[1.75]" /></button>
 <h1 className="text-title text-primary mb-4 ">Daily Schedule</h1>
 <button onClick={() => navigateDay(1)} title="Next Day" className="p-1 rounded-full hover:bg-surface-hover transition-colors"><ChevronRight className="w-5 h-5 text-secondary stroke-[1.75]" /></button>
 {!isViewingToday && (
 <button 
 onClick={() => setSearchParams({})} 
 className="text-caption font-medium text-[#2563EB] bg-[#EFF4FE] px-2.5 py-1 rounded-full hover:bg-[#2563EB] hover:text-white transition-colors ml-2 shadow-2xs"
 >
 Back to Today
 </button>
 )}
 </div>
 <p className="text-badge font-medium text-secondary uppercase tracking-[0.02em] pl-7 flex items-center gap-2">
 <span>{targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
 <span className="w-1 h-1 rounded-full bg-[#9CA3AF]" />
 <span className="text-[#2563EB] font-mono">{todayIssues.length} blocks planned</span>
 </p>
 </div>
 <div className="flex items-center gap-2.5">
 <button onClick={() => setScheduleModalOpen(true)} className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center hover:bg-[#1D4ED8] transition-colors shadow-sm" title="Add Time Block">
 <Plus className="w-4 h-4 stroke-[2]" />
 </button>
 <div className="flex items-center gap-2 p-1 pl-3 pr-1 bg-surface-hover border border-border rounded-full cursor-pointer hover:border-[#D1D5DB] transition-colors shadow-2xs" onClick={() => toast.info('Timeline settings & calendar preferences')} title="Settings">
 <Settings className="w-4 h-4 text-secondary stroke-[1.75]" />
 <div className="w-7 h-7 rounded-full bg-[#E5E8EC] flex items-center justify-center text-[10px] font-medium text-primary ml-1 font-mono">
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
 <span className="text-caption font-medium text-[#2563EB] flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 fill-[#2563EB]" /> Live Agenda Horizon
 </span>
 </div>
 <span className="text-caption font-mono font-bold text-[#2563EB] bg-surface px-2 py-0.5 rounded border border-[#2563EB]/20 shadow-2xs">
 {timeString}
 </span>
 </div>

 {/* Vertical Agenda */}
 <div className="relative flex-1">
 {todayIssues.length === 0 ? (
 <div className="py-12 text-center flex flex-col items-center justify-center">
 <Clock className="w-6 h-6 text-muted mb-2 stroke-[1.5]" />
 <p className="text-body font-medium text-primary mb-1">No events scheduled for today</p>
 <p className="text-caption text-secondary mb-4">Your agenda is completely clear. Enjoy your focus time!</p>
 <button onClick={() => setScheduleModalOpen(true)} className="px-3.5 py-1.5 rounded-full bg-[#EFF4FE] text-[#2563EB] hover:bg-[#2563EB] hover:text-white text-caption font-medium transition-colors shadow-sm cursor-pointer">
 + Schedule a task
 </button>
 </div>
 ) : (
 <div className="space-y-4">
 {todayIssues.map((issue, idx) => {
 const isDone = issue.status === "DONE" || issue.status === "REVIEW";
 const Icon = getIconForString(issue.title);
 const isCurrent = idx === 0 && !isDone;
 
  const issueDate = issue.scheduledDate ? new Date(issue.scheduledDate) : issue.dueDate ? new Date(issue.dueDate) : null;
  const isCarriedOver = issueDate && issueDate.getTime() < targetStart.getTime();
 
 return (
  <div key={issue.id} className="relative group/timeline">
  <div className="absolute left-[39px] -top-2 -bottom-6 w-[2px] bg-border group-last/timeline:hidden" />
  
  <div className="flex items-start gap-4 relative">
  <div className="w-[80px] shrink-0 text-right pt-2.5">
  <div className="text-[11px] font-medium text-primary">
  {isCarriedOver ? 'Overdue' : 'Unscheduled'}
  </div>
  </div>
  
  {/* Timeline Dot */}
  <div className={cn("w-8 h-8 rounded-full ring-4 ring-white flex items-center justify-center transition-colors z-10",
  isDone ?"bg-primary" : isCurrent ?"bg-[#2563EB] ring-2 ring-[#EFF4FE]" :"bg-surface border-2 border-[#2563EB]"
  )}>
  {isDone && <Check className="w-2.5 h-2.5 text-white stroke-[2]" />}
  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />}
  </div>
 
 {/* Event Card */}
 <div className={cn("rounded-xl p-3.5 transition-all flex items-center justify-between border cursor-pointer",
 isDone 
 ?"bg-surface-hover border-transparent opacity-80" 
 : isCurrent
 ?"bg-surface border-[#2563EB] ring-1 ring-[#2563EB]/20 shadow-md"
 :"bg-surface border-border hover:border-[#2563EB] shadow-sm"
 )}>
 <div className="flex items-center gap-3.5">
 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
 isDone ?"bg-surface border border-border" : isCurrent ?"bg-[#2563EB] text-white shadow-xs" :"bg-[#EFF4FE] border border-[#2563EB]/20"
 )}>
 <Icon className={cn("w-4 h-4 stroke-[1.75]", isDone ?"text-muted" : isCurrent ?"text-white" :"text-[#2563EB]")} />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className={cn("font-medium text-body mb-0.5",
 isDone ?"text-muted line-through decoration-[#D1D5DB]" :"text-primary"
 )}>
 {issue.title}
 </h3>
 {isCurrent && (
 <span className="px-1.5 py-0.2 rounded bg-[#EFF4FE] text-[#2563EB] text-[9px] font-mono font-bold uppercase tracking-widest border border-[#2563EB]/20">
 In Progress Now
 </span>
 )}
 {isCarriedOver && (
 <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[9px] font-mono font-bold uppercase tracking-widest border border-amber-200">
 Carried Over
 </span>
 )}
 </div>
 <div className="text-badge text-secondary font-mono">
 {issue.estimateMinutes ? `${issue.estimateMinutes}h Block` : 'Scheduled Task'} • {idx === 0 ? '09:00 - 11:00' : idx === 1 ? '11:30 - 12:30' : '14:00 - 16:00'}
 </div>
 </div>
 </div>
 <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-primary">
 <Search className="w-4 h-4 stroke-[1.75]" />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
  )}
  </div>

 </div>

 {/* RIGHT COLUMN: Widgets (30%) */}
 <div className="w-full md:w-[30%] flex flex-col gap-6">
 
 {/* Local Time */}
 <div className="px-4 py-3 bg-surface-hover border border-border rounded-xl flex items-center justify-between shadow-2xs">
 <div>
 <div className="text-badge font-medium text-muted uppercase tracking-[0.02em]">Local Time</div>
 <div className="text-caption text-secondary">Ready for deep work</div>
 </div>
 <div className="text-2xl font-medium tracking-tight text-primary font-mono">
 {timeString}
 </div>
 </div>

 {/* Habits Widget with Orange Category Tint (#EA580C) */}
 <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-[#EA580C]/10 flex items-center justify-center text-[#EA580C]">
 <Flame className="w-4 h-4 stroke-[1.75]" />
 </div>
 <div>
 <h3 className="text-card text-primary mb-2 ">Daily Routines</h3>
 <p className="text-[10px] text-secondary">Quick pulse check</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button onClick={() => setRoutineModalOpen(true)} className="text-badge font-medium text-[#EA580C] bg-[#FFF7ED] border border-[#FFEDD5] px-2 py-0.5 rounded hover:bg-[#FFEDD5] transition-colors flex items-center gap-1 cursor-pointer">
 <Plus className="w-3 h-3 stroke-[2.5]" /> Add Routine
 </button>
 <button onClick={() => window.location.href = '/app/habits'} className="text-badge font-medium text-secondary hover:text-primary transition-colors">Manage</button>
 </div>
 </div>
   <div className="space-y-4 flex-1">
   
   {/* Morning */}
   {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "morning").length > 0 && (
     <div>
       <div className="text-[10px] font-mono font-bold text-secondary uppercase mb-2">Morning</div>
       <div className="space-y-1">
         {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "morning").map(habit => (
           <TimelineHabitRow key={habit.id} habit={habit} />
         ))}
       </div>
     </div>
   )}

   {/* Afternoon */}
   {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "afternoon").length > 0 && (
     <div>
       <div className="text-[10px] font-mono font-bold text-secondary uppercase mb-2">Afternoon</div>
       <div className="space-y-1">
         {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "afternoon").map(habit => (
           <TimelineHabitRow key={habit.id} habit={habit} />
         ))}
       </div>
     </div>
   )}

   {/* Evening */}
   {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "evening").length > 0 && (
     <div>
       <div className="text-[10px] font-mono font-bold text-secondary uppercase mb-2">Evening</div>
       <div className="space-y-1">
         {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "evening").map(habit => (
           <TimelineHabitRow key={habit.id} habit={habit} />
         ))}
       </div>
     </div>
   )}

   {/* Anytime */}
   {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "anytime").length > 0 && (
     <div>
       <div className="text-[10px] font-mono font-bold text-secondary uppercase mb-2">Anytime</div>
       <div className="space-y-1">
         {habits.filter(h => isHabitScheduledToday(h) && h.timeOfDay === "anytime").map(habit => (
           <TimelineHabitRow key={habit.id} habit={habit} />
         ))}
       </div>
     </div>
   )}

   {habits.filter(isHabitScheduledToday).length === 0 && (
   <div className="py-8 text-center border border-dashed border-border rounded-xl bg-surface-hover/50">
   <p className="text-caption text-secondary mb-3">No daily routines added yet.</p>
   <button onClick={() => setRoutineModalOpen(true)} className="px-3 py-1.5 rounded-lg bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] text-caption font-medium hover:bg-[#FFEDD5] transition-colors inline-flex items-center gap-1 cursor-pointer">
   <Plus className="w-3.5 h-3.5 stroke-[2]" /> Add Routine
   </button>
   </div>
   )}
   </div>
 </div>

 </div>

 <RoutineCreateModal
 open={routineModalOpen}
 onClose={() => setRoutineModalOpen(false)}
 onSubmit={(data) => createRoutineMutation.mutate(data)}
 isSubmitting={createRoutineMutation.isPending}
 />
 <ScheduleTaskModal
 open={scheduleModalOpen}
 onClose={() => setScheduleModalOpen(false)}
 onSubmit={(data) => scheduleTaskMutation.mutate(data)}
 defaultDate={formatLocalDate(targetDate) || ''}
 isSubmitting={scheduleTaskMutation.isPending}
 />
 </div>
 );
}
