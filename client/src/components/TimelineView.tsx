import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Settings, Check, ChevronLeft, ChevronRight, Search, Clock, CalendarPlus, Flame, Sparkles, X, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { getIconForString } from '../lib/iconMap';
import { LoadingState } from './ui/LoadingState';
import { BaseButton } from './ui/BaseButton';

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function RoutineCreateModal({
  open,
  onClose,
  onSubmit,
  isSubmitting
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; cadence: string; category: string; timeOfDay: string; duration: number }) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [cadence] = useState('daily');
  const [category] = useState('Execution');
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [duration, setDuration] = useState(15);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), cadence, category, timeOfDay, duration });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center border border-[#F59E0B]/20">
              <Flame className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Initialize Routine Telemetry</h3>
              <p className="text-xs text-secondary font-mono">Synchronized with Daily Pulse & Matrix</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Routine Directive <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Architecture Standup & System Audit"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#F59E0B] transition-all bg-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Temporal Horizon
              </label>
              <select
                value={timeOfDay}
                onChange={e => setTimeOfDay(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#F59E0B] transition-all font-mono font-bold cursor-pointer"
              >
                <option value="morning">Morning Sprint</option>
                <option value="afternoon">Afternoon Block</option>
                <option value="evening">Evening Review</option>
                <option value="anytime">Flexible / Anytime</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Duration (mins)
              </label>
              <input
                type="number"
                min="1"
                max="480"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#F59E0B] transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Initializing...' : 'Add Routine Directive'}
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
  isSubmitting
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; priority: string; estimate: number; scheduledDate: string }) => void;
  defaultDate: string;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [estimate, setEstimate] = useState(1);
  const [scheduledDate, setScheduledDate] = useState(defaultDate);

  useEffect(() => {
    if (open) setScheduledDate(defaultDate);
  }, [open, defaultDate]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), priority, estimate: Number(estimate), scheduledDate });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF] flex items-center justify-center border border-[#2563EB]/20 dark:border-[#00E5FF]/20">
              <CalendarPlus className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Schedule Temporal Agenda Block</h3>
              <p className="text-xs text-secondary font-mono">Assigned to {scheduledDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Directive / Task Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Q3 System Architecture Review & Refactor"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] transition-all bg-surface font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Target Temporal Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] transition-all font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={estimate}
                onChange={e => setEstimate(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Execution Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] transition-all font-mono font-bold cursor-pointer"
            >
              <option value="normal">🟡 Normal / Medium</option>
              <option value="high">🟠 High Priority</option>
              <option value="urgent">🔴 Urgent / Blocker</option>
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Temporal Block'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TimelineView() {
  const { data: issues = [], isLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  const queryClient = useQueryClient();
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const createRoutineMutation = useMutation({
    mutationFn: (data: { name: string; cadence: string; category: string; timeOfDay: string; duration: number }) =>
      api.habits.create({
        name: data.name,
        cadence: data.cadence,
        category: data.category,
        timeOfDay: data.timeOfDay,
        duration: data.duration,
        streak: 0
      }),
    onSuccess: (newHabit) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setRoutineModalOpen(false);
      toast.success(`Added routine directive "${newHabit?.name || 'Routine'}"`);
    },
    onError: () => {
      toast.error('Failed to add routine directive');
    }
  });

  const scheduleTaskMutation = useMutation({
    mutationFn: (data: { title: string; priority: string; estimate: number; scheduledDate: string }) =>
      api.issues.create({
        title: data.title,
        priority: data.priority,
        estimate: data.estimate,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
        status: 'todo'
      }),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setScheduleModalOpen(false);
      toast.success(`Scheduled temporal block "${newTask?.title || 'Task'}"`);
    },
    onError: () => {
      toast.error('Failed to schedule temporal block');
    }
  });

  const toggleHabitMutation = useMutation({
    mutationFn: (id: string) => api.habits.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
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

  if (isLoading) return <LoadingState title="Loading Temporal Timeline..." description="Synchronizing time-blocked directives and routine telemetry..." />;

  const targetStart = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
  const targetEnd = new Date(new Date(targetDate).setHours(23, 59, 59, 999));
  const isViewingToday = targetDate.toDateString() === new Date().toDateString();

  const todayIssues = issues.filter(i => {
    const date = i.scheduledDate ? new Date(i.scheduledDate) : i.dueDate ? new Date(i.dueDate) : null;
    return date && date >= targetStart && date <= targetEnd;
  });

  const pinnedTasks = issues.filter(i => i.priority === 'urgent' || i.priority === 'high').slice(0, 3);
  const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className="p-4 md:p-6 h-full bg-canvas flex flex-col md:flex-row gap-6 overflow-y-auto overflow-x-hidden animate-in fade-in duration-150 font-sans text-primary pb-24">
      
      {/* LEFT COLUMN: Pinned Directives & Mini Calendar (25%) */}
      <div className="w-full md:w-[25%] flex flex-col gap-6">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 bg-surface border border-border p-3.5 rounded-2xl shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-primary text-surface flex items-center justify-center font-mono font-bold text-sm shadow-2xs">
            K
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-primary block leading-none">Krama OS</span>
            <span className="text-[10px] font-mono text-secondary uppercase">Temporal Engine</span>
          </div>
          <button 
            onClick={() => setScheduleModalOpen(true)} 
            className="ml-auto w-7 h-7 rounded-xl border border-border bg-surface-hover flex items-center justify-center hover:border-primary hover:text-primary transition-all shadow-2xs cursor-pointer" 
            title="New Time Block"
          >
            <Plus className="w-4 h-4 text-primary stroke-[1.5]" />
          </button>
        </div>

        {/* Weekly Pinned Directives */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[11px] font-mono font-bold text-secondary uppercase tracking-wider">Weekly Pinned Focus</h2>
            <button onClick={() => window.location.href = '/app/projects'} className="text-[11px] font-mono font-bold text-[#2563EB] dark:text-[#00E5FF] hover:underline transition-colors cursor-pointer">View All ({issues.length})</button>
          </div>
          <div className="space-y-2.5">
            {pinnedTasks.map(task => {
              const Icon = getIconForString(task.title);
              const isUrgent = task.priority === 'urgent';
              return (
                <div key={task.id} className="bg-surface rounded-xl p-3.5 border border-border shadow-2xs flex flex-col gap-2.5 hover:border-[#2563EB] dark:hover:border-[#00E5FF] transition-all group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center shrink-0 group-hover:bg-[#2563EB]/10 dark:group-hover:bg-[#00E5FF]/10 transition-colors">
                        <Icon className="w-4 h-4 text-primary group-hover:text-[#2563EB] dark:group-hover:text-[#00E5FF] transition-colors stroke-[1.5]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-primary text-xs truncate">{task.title}</div>
                        <div className="text-[10px] text-secondary font-mono">Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Unscheduled'}</div>
                      </div>
                    </div>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 border",
                      isUrgent ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                    )}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Quick-Slot Button */}
                  <button 
                    onClick={() => toast.success(`Slotted "${task.title}" into Today's Temporal Horizon`)}
                    className="w-full mt-0.5 py-1.5 px-2 bg-surface-hover hover:bg-[#2563EB] dark:hover:bg-[#00E5FF] text-secondary hover:text-white dark:hover:text-[#050811] rounded-lg text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 border border-border hover:border-transparent shadow-2xs group/btn cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 stroke-[1.5] group-hover/btn:scale-110 transition-transform" />
                    <span>Slot into Timeline &rarr;</span>
                  </button>
                </div>
              );
            })}
            
            {/* Ghost Add Card */}
            <button onClick={() => toast.info('Pin critical directives in Projects to lock them into your weekly focus radar')} className="w-full bg-transparent border border-dashed border-border hover:border-[#2563EB] dark:hover:border-[#00E5FF] hover:bg-surface-hover/50 transition-all rounded-xl p-3 flex items-center justify-center gap-2 group cursor-pointer">
              <Plus className="w-4 h-4 text-muted group-hover:text-[#2563EB] dark:group-hover:text-[#00E5FF] transition-colors stroke-[1.5]" />
              <span className="text-xs font-mono font-bold text-secondary group-hover:text-[#2563EB] dark:group-hover:text-[#00E5FF] transition-colors">Pin New Directive</span>
            </button>
          </div>
        </div>

        {/* Mini Calendar Widget */}
        <div className="bg-surface border border-border rounded-2xl p-4.5 shadow-2xs mt-auto font-sans">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 font-mono">
              <span>{targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </h3>
            <div className="flex gap-1">
              <button onClick={() => navigateDay(-30)} className="p-1 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4 text-secondary stroke-[1.5]" /></button>
              <button onClick={() => navigateDay(30)} className="p-1 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"><ChevronRight className="w-4 h-4 text-secondary stroke-[1.5]" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map(d => (
              <div key={d} className="text-center text-[10px] font-mono font-bold text-secondary uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 font-mono">
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
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer",
                      isSelectedDay ? "bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] shadow-sm scale-105" : isRealToday ? "border border-[#2563EB] dark:border-[#00E5FF] text-[#2563EB] dark:text-[#00E5FF] font-bold" : "text-primary hover:bg-surface-hover"
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

      {/* CENTER COLUMN: Main Temporal Agenda (45%) */}
      <div className="w-full md:w-[45%] bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-xs flex flex-col relative">
        
        {/* Header Row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigateDay(-1)} title="Previous Day" className="p-1.5 rounded-xl hover:bg-surface-hover transition-colors -ml-1 cursor-pointer"><ChevronLeft className="w-5 h-5 text-secondary stroke-[1.5]" /></button>
              <h1 className="text-h2 font-bold tracking-tight text-primary leading-tight">Daily Horizon</h1>
              <button onClick={() => navigateDay(1)} title="Next Day" className="p-1.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"><ChevronRight className="w-5 h-5 text-secondary stroke-[1.5]" /></button>
              {!isViewingToday && (
                <button 
                  onClick={() => setSearchParams({})} 
                  className="text-xs font-mono font-bold text-[#2563EB] dark:text-[#00E5FF] bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 px-3 py-1 rounded-lg hover:opacity-90 transition-colors ml-2 shadow-2xs cursor-pointer border border-[#2563EB]/20 dark:border-[#00E5FF]/20"
                >
                  Return to Today
                </button>
              )}
            </div>
            <p className="text-xs font-mono font-bold text-secondary uppercase tracking-wider pl-8 flex items-center gap-2">
              <span>{targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[#2563EB] dark:text-[#00E5FF]">{todayIssues.length} blocks mapped</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setScheduleModalOpen(true)} className="w-10 h-10 rounded-xl bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] flex items-center justify-center hover:opacity-90 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95" title="Add Time Block">
              <Plus className="w-5 h-5 stroke-[1.5]" />
            </button>
            <div className="flex items-center gap-2 p-1 pl-3 pr-1 bg-surface-hover border border-border rounded-xl cursor-pointer hover:border-primary transition-colors shadow-2xs" onClick={() => toast.info('Temporal telemetry preferences nominal')} title="Settings">
              <Settings className="w-4 h-4 text-secondary stroke-[1.5]" />
              <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-primary ml-1 font-mono">
                HUD
              </div>
            </div>
          </div>
        </div>

        {/* Live Pulsing Current Time Horizon Laser Bar */}
        <div className="mb-6 py-2.5 px-4 bg-gradient-to-r from-[#2563EB]/15 dark:from-[#00E5FF]/15 via-surface to-transparent border border-[#2563EB]/20 dark:border-[#00E5FF]/20 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] dark:bg-[#00E5FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2563EB] dark:bg-[#00E5FF]"></span>
            </span>
            <span className="text-xs font-mono font-bold text-[#2563EB] dark:text-[#00E5FF] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 fill-current" /> LIVE TEMPORAL HORIZON
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-primary bg-surface px-2.5 py-1 rounded-lg border border-border shadow-2xs">
            GMT / LOCAL: {timeString}
          </span>
        </div>

        {/* Vertical Motion AI Agenda */}
        <div className="relative flex-1">
          {todayIssues.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-surface-hover/30">
              <Clock className="w-8 h-8 text-secondary mb-3 stroke-[1.5]" />
              <p className="text-sm font-bold text-primary mb-1">No temporal blocks scheduled for today</p>
              <p className="text-xs text-secondary font-mono mb-5">Your execution horizon is completely open. Allocate deep work sessions below.</p>
              <button onClick={() => setScheduleModalOpen(true)} className="px-4 py-2 rounded-xl bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] hover:opacity-90 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5">
                <Plus className="w-4 h-4 stroke-[1.5]" /> Schedule Temporal Block
              </button>
            </div>
          ) : (
            <>
              {/* Vertical Laser Spine */}
              <div className="absolute top-4 bottom-0 left-[23px] w-0.5 bg-gradient-to-b from-[#2563EB] dark:from-[#00E5FF] via-border to-transparent" />

              <div className="space-y-4">
                {todayIssues.map((issue, idx) => {
                  const isDone = issue.status === 'done' || issue.status === 'released';
                  const Icon = getIconForString(issue.title);
                  const isCurrent = idx === 0 && !isDone;
                  
                  return (
                    <div key={issue.id} className="relative group pl-14">
                      {/* Timeline Dot Indicator */}
                      <div className="absolute left-[14px] top-[16px] z-10">
                        <div className={cn(
                          "w-5 h-5 rounded-full ring-4 ring-surface flex items-center justify-center transition-all shadow-xs",
                          isDone ? "bg-[#109868]" : isCurrent ? "bg-[#2563EB] dark:bg-[#00E5FF] ring-2 ring-[#2563EB]/40 dark:ring-[#00E5FF]/40 scale-110" : "bg-surface border-2 border-[#2563EB] dark:border-[#00E5FF]"
                        )}>
                          {isDone && <Check className="w-3 h-3 text-white dark:text-[#050811] stroke-[2.5]" />}
                          {isCurrent && <span className="w-2 h-2 rounded-full bg-white dark:bg-[#050811] animate-pulse" />}
                        </div>
                      </div>

                      {/* Motion AI Event Card */}
                      <div className={cn(
                        "rounded-xl p-4 transition-all flex items-center justify-between border cursor-pointer border-l-4 shadow-2xs hover:shadow-md group/card",
                        isDone 
                          ? "bg-surface-hover/60 border-l-[#109868] border-y-transparent border-r-transparent opacity-75" 
                          : isCurrent
                          ? "bg-surface border-l-[#2563EB] dark:border-l-[#00E5FF] border-y-border border-r-border ring-1 ring-[#2563EB]/20 dark:ring-[#00E5FF]/20 shadow-md"
                          : "bg-surface border-l-[#4F46E5] dark:border-l-[#818CF8] border-y-border border-r-border hover:border-primary"
                      )}>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors border",
                            isDone ? "bg-surface border-border" : isCurrent ? "bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] border-transparent shadow-xs" : "bg-surface-hover border-border text-[#2563EB] dark:text-[#00E5FF]"
                          )}>
                            <Icon className={cn("w-4 h-4 stroke-[1.5]", isDone ? "text-muted" : isCurrent ? "text-white dark:text-[#050811]" : "text-[#2563EB] dark:text-[#00E5FF]")} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={cn(
                                "font-bold text-sm truncate font-sans",
                                isDone ? "text-secondary line-through decoration-border" : "text-primary"
                              )}>
                                {issue.title}
                              </h3>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-md bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF] text-[9px] font-mono font-bold uppercase tracking-widest border border-[#2563EB]/20 dark:border-[#00E5FF]/20 shrink-0">
                                  IN PROGRESS
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-secondary font-mono flex items-center gap-2">
                              <span><Clock className="w-3 h-3 inline mr-1 stroke-[1.5]" />{issue.estimate ? `${issue.estimate}h Block` : 'Scheduled Session'}</span>
                              <span>•</span>
                              <span className="font-bold">{idx === 0 ? '09:00 – 11:00' : idx === 1 ? '11:30 – 12:30' : '14:00 – 16:00'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              localStorage.setItem('krama_active_focus_task', `[Issue] ${issue.title}`);
                              window.location.href = `/app/review?focusTask=${encodeURIComponent(`[Issue] ${issue.title}`)}`;
                            }}
                            className="opacity-0 group-hover/card:opacity-100 transition-all px-2.5 py-1 rounded-lg bg-primary hover:opacity-90 text-surface font-mono text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title="Launch Focus Sprint"
                          >
                            <Rocket className="w-3 h-3 stroke-[1.5]" /> Focus
                          </button>
                          <button className="p-2 rounded-lg hover:bg-surface-hover text-secondary hover:text-primary transition-colors">
                            <Search className="w-4 h-4 stroke-[1.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Telemetry Widgets (30%) */}
      <div className="w-full md:w-[30%] flex flex-col gap-6">
        
        {/* Local Time & HUD Telemetry */}
        <div className="px-5 py-4 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[10px] font-mono font-bold text-secondary uppercase tracking-wider">SYSTEM HUD TIME</div>
            <div className="text-xs text-primary font-bold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#109868] animate-pulse" /> Nominal Velocity
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-primary font-mono">
            {timeString}
          </div>
        </div>

        {/* Routines Consistency Widget (Amber #F59E0B identity) */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex-1 flex flex-col font-sans">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] border border-[#F59E0B]/20">
                <Flame className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-sm">Daily Routine Pulse</h3>
                <p className="text-[10px] text-secondary font-mono">Telemetry synchronization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setRoutineModalOpen(true)} className="text-[11px] font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2.5 py-1 rounded-lg hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer">
                <Plus className="w-3 h-3 stroke-[1.5]" /> Add Routine
              </button>
              <button onClick={() => window.location.href = '/app/habits'} className="text-[11px] font-mono font-bold text-secondary hover:text-primary transition-colors px-1 cursor-pointer">Manage</button>
            </div>
          </div>
          
          <div className="space-y-2.5 flex-1">
            {habits.map((habit) => {
              const todayStr = new Date().toISOString().split('T')[0] || '';
              const isHabitDone = habit.completions?.some((c: any) => c.date.toString().startsWith(todayStr) && c.completed) ||
                (habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString());
              const Icon = getIconForString(habit.name);
              return (
                <div 
                  key={habit.id} 
                  onClick={() => toggleHabitMutation.mutate(habit.id)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 group cursor-pointer",
                    isHabitDone ? "bg-[#109868]/10 border-[#109868]/30" : "bg-surface border-border hover:border-[#F59E0B]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors border",
                      isHabitDone ? "bg-[#109868] border-[#109868] text-white dark:text-[#050811] shadow-2xs" : "bg-surface-hover border-border text-[#F59E0B] group-hover:border-[#F59E0B]"
                    )}>
                      <Icon className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div className="min-w-0">
                      <div className={cn(
                        "font-bold text-xs truncate transition-colors",
                        isHabitDone ? "text-secondary line-through" : "text-primary group-hover:text-[#F59E0B]"
                      )}>{habit.name}</div>
                      <div className="text-[10px] text-secondary font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] font-mono text-[9px] font-bold"><Flame className="w-2.5 h-2.5 text-[#F59E0B] stroke-[1.5]" />{habit.streak}d</span> streak
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-secondary shrink-0 ml-2 bg-surface-hover px-2 py-1 rounded-lg border border-border">
                    {habit.duration || 15}m block
                  </div>
                </div>
              );
            })}
            {habits.length === 0 && (
              <div className="py-10 text-center border border-dashed border-border rounded-xl bg-surface-hover/30">
                <p className="text-xs text-secondary font-mono mb-3">No routine directives configured.</p>
                <button onClick={() => setRoutineModalOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-xs font-mono font-bold hover:opacity-90 transition-all inline-flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5 stroke-[1.5]" /> Add Routine
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
        defaultDate={targetDate.toISOString().split('T')[0] || ''}
        isSubmitting={scheduleTaskMutation.isPending}
      />
    </div>
  );
}
