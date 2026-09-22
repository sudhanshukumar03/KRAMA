import { useState, useEffect, useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Check, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Clock4, 
  CalendarPlus, 
  Sparkles, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  ArrowLeft, 
  Search,
  Briefcase,
  User,
  GraduationCap,
  HeartPulse,
  Shield,
  Grid,
  Calendar,
  Layers,
  Edit3,
  CalendarCheck,
  XCircle,
  FileText
} from "lucide-react";
import { api } from "../../api/client";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import type { TimeBlockType } from "../../types/planner";
import { DailyLogSection } from "./DailyLogSection";

const TYPE_CONFIG: Record<TimeBlockType, { label: string; icon: React.ReactNode; color: string; border: string; bg: string }> = {
  MEETING: { label: 'Meeting', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'text-cat-timeblocks', border: 'border-l-cat-timeblocks', bg: 'bg-cat-timeblocks-bg' },
  WORK: { label: 'Work', icon: <Grid className="w-3.5 h-3.5" />, color: 'text-cat-tasks', border: 'border-l-cat-tasks', bg: 'bg-cat-tasks-bg' },
  PERSONAL: { label: 'Personal', icon: <User className="w-3.5 h-3.5" />, color: 'text-cat-projects', border: 'border-l-cat-projects', bg: 'bg-cat-projects-bg' },
  STUDY: { label: 'Study', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'text-success-fg', border: 'border-l-success-fg', bg: 'bg-success-bg' },
  HEALTH: { label: 'Health', icon: <HeartPulse className="w-3.5 h-3.5" />, color: 'text-danger-fg', border: 'border-l-danger-fg', bg: 'bg-danger-bg' },
  ADMIN: { label: 'Admin', icon: <Shield className="w-3.5 h-3.5" />, color: 'text-secondary', border: 'border-l-border-strong', bg: 'bg-surface-2' },
  OTHER: { label: 'Other', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-muted', border: 'border-l-border-default', bg: 'bg-surface-2' },
};

interface Props {
  day: Date;
  data: any; // PlannerData
  dayData?: any; // The day object from data.days
  onToggleTask?: (task: any, e: React.MouseEvent) => void;
  onClickTask?: (task: any) => void;
  onClickTimeBlock?: (block: any) => void;
  onDeleteTask?: (task: any) => void;
  onDeleteTimeBlock?: (block: any) => void;
  onAddTask?: (day: Date) => void;
  onAddTimeBlock?: (day: Date, initialData?: any) => void;
  onBack?: () => void;
  backLabel?: string;
}

export function TodayView({
  day,
  data,
  onToggleTask,
  onClickTask,
  onClickTimeBlock,
  onDeleteTimeBlock,
  onAddTask,
  onAddTimeBlock,
  onBack,
  backLabel = 'Plan',
}: Props) {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTaskTab, setActiveTaskTab] = useState<'today' | 'backlog' | 'log'>('today');
  const [backlogSearch, setBacklogSearch] = useState('');
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');

  // Real-time ticking clock for Live Horizon
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isViewingToday = day.toDateString() === new Date().toDateString();
  const targetDateStr = format(day, 'yyyy-MM-dd');
  const targetDateIso = useMemo(() => new Date(`${targetDateStr}T12:00:00.000Z`).toISOString(), [targetDateStr]);
  const targetStart = useMemo(() => new Date(new Date(day).setHours(0, 0, 0, 0)), [day]);

  // Query all workspace tasks to guarantee full task and backlog visibility
  const { data: allIssues = [] } = useQuery({
    queryKey: ['issues'],
    queryFn: api.tasks.list,
    staleTime: 10_000,
  });

  // Query specific day planner week/blocks if day is navigated outside current cached week
  const { data: dayPlannerData } = useQuery({
    queryKey: ['plannerDay', targetDateStr],
    queryFn: () => api.planner.getWeek(targetDateStr, targetDateStr),
    staleTime: 15_000,
  });

  // Task Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update task: ' + (err?.message || 'Unknown error'));
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => api.tasks.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success('Task added for today');
      setInlineTaskTitle('');
    },
    onError: (err: any) => {
      toast.error('Failed to create task: ' + (err?.message || 'Unknown error'));
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success('Task deleted');
    },
    onError: (err: any) => {
      toast.error('Failed to delete task: ' + (err?.message || 'Unknown error'));
    }
  });

  const taskList = useMemo(() => {
    return allIssues.length > 0 ? allIssues : (data?.tasks || []);
  }, [allIssues, data?.tasks]);

  const rawBlocks = useMemo(() => {
    return dayPlannerData?.timeBlocks || data?.timeBlocks || [];
  }, [dayPlannerData?.timeBlocks, data?.timeBlocks]);

  // Filter and sort time blocks for this day
  const timeBlocks = useMemo(() => {
    return rawBlocks
      .filter((b: any) => {
        try {
          if (b.date) return isSameDay(parseISO(b.date), day);
          if (b.startTime) return isSameDay(parseISO(b.startTime), day);
          return false;
        } catch {
          return false;
        }
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [rawBlocks, day]);

  // Tasks categorized for Today View:
  // 1. Today's Tasks
  // 2. Carried-over (past overdue)
  // 3. Unscheduled Backlog (available to schedule)
  const { todayTasks, carriedOverTasks, backlogTasks } = useMemo(() => {
    const todayList: any[] = [];
    const carriedList: any[] = [];
    const backlogList: any[] = [];

    taskList.forEach((t: any) => {
      const isCompleted = t.status === 'DONE' || t.status === 'CANCELLED';
      const tDateStr = t.scheduledDate || t.dueDate;

      if (!tDateStr) {
        if (!isCompleted) backlogList.push(t);
        return;
      }

      try {
        const parsed = parseISO(tDateStr);
        const isToday = isSameDay(parsed, day);
        const isPast = parsed.getTime() < targetStart.getTime() && !isToday;

        if (isToday) {
          todayList.push(t);
        } else if (isPast && !isCompleted) {
          carriedList.push(t);
        } else if (!isCompleted) {
          backlogList.push(t);
        }
      } catch {
        if (!isCompleted) backlogList.push(t);
      }
    });

    return {
      todayTasks: todayList,
      carriedOverTasks: carriedList,
      backlogTasks: backlogList,
    };
  }, [taskList, day, targetStart]);

  // Filtered backlog tasks by search query
  const filteredBacklogTasks = useMemo(() => {
    if (!backlogSearch.trim()) return backlogTasks;
    const q = backlogSearch.toLowerCase();
    return backlogTasks.filter((t: any) => 
      t.title.toLowerCase().includes(q) || 
      (t.project?.name && t.project.name.toLowerCase().includes(q))
    );
  }, [backlogTasks, backlogSearch]);

  // Total Focus Minutes
  const totalFocusMinutes = useMemo(() => {
    return timeBlocks.reduce((acc: number, tb: any) => {
      const start = new Date(tb.startTime).getTime();
      const end = new Date(tb.endTime).getTime();
      const diffMins = Math.max(0, Math.round((end - start) / 60000));
      return acc + diffMins;
    }, 0);
  }, [timeBlocks]);

  const focusHours = Math.floor(totalFocusMinutes / 60);
  const focusMinutesRemainder = totalFocusMinutes % 60;
  const focusTimeString = focusHours > 0 
    ? `${focusHours}h ${focusMinutesRemainder > 0 ? `${focusMinutesRemainder}m` : ''}` 
    : `${focusMinutesRemainder}m`;

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formatTime = (iso: string) => {
    try {
      if (!iso) return '';
      if (typeof iso === 'string' && !iso.includes('T') && iso.includes(':')) {
        return iso.slice(0, 5);
      }
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const getHHMM = (isoOrTime: string) => {
    try {
      if (!isoOrTime) return '09:00';
      if (typeof isoOrTime === 'string' && !isoOrTime.includes('T') && isoOrTime.includes(':')) {
        const [h, m] = isoOrTime.split(':').map(Number);
        return `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
      }
      const d = new Date(isoOrTime);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '09:00';
    }
  };

  const getDurationString = (startIso: string, endIso: string) => {
    try {
      let sMin = 0;
      let eMin = 0;
      if (typeof startIso === 'string' && startIso.includes('T')) {
        const s = new Date(startIso);
        sMin = s.getHours() * 60 + s.getMinutes();
      } else if (typeof startIso === 'string' && startIso.includes(':')) {
        const [h, m] = startIso.split(':').map(Number);
        sMin = (h || 0) * 60 + (m || 0);
      }
      if (typeof endIso === 'string' && endIso.includes('T')) {
        const e = new Date(endIso);
        eMin = e.getHours() * 60 + e.getMinutes();
      } else if (typeof endIso === 'string' && endIso.includes(':')) {
        const [h, m] = endIso.split(':').map(Number);
        eMin = (h || 0) * 60 + (m || 0);
      }
      const mins = Math.max(0, eMin - sMin);
      if (mins < 60) return `${mins}m`;
      const h = Math.floor(mins / 60);
      const rem = mins % 60;
      return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    } catch {
      return '';
    }
  };

  const getNextAvailableSlot = (blocks: any[], forDay: Date) => {
    const intervals: { start: number; end: number }[] = [];
    for (const b of blocks) {
      try {
        let sMin = 0;
        let eMin = 0;
        if (typeof b.startTime === 'string' && b.startTime.includes('T')) {
          const sDate = new Date(b.startTime);
          sMin = sDate.getHours() * 60 + sDate.getMinutes();
        } else if (typeof b.startTime === 'string' && b.startTime.includes(':')) {
          const [h, m] = b.startTime.split(':').map(Number);
          sMin = (h || 0) * 60 + (m || 0);
        }
        if (typeof b.endTime === 'string' && b.endTime.includes('T')) {
          const eDate = new Date(b.endTime);
          eMin = eDate.getHours() * 60 + eDate.getMinutes();
        } else if (typeof b.endTime === 'string' && b.endTime.includes(':')) {
          const [h, m] = b.endTime.split(':').map(Number);
          eMin = (h || 0) * 60 + (m || 0);
        }
        if (eMin > sMin) {
          intervals.push({ start: sMin, end: eMin });
        }
      } catch {
        // ignore
      }
    }

    const isToday = isSameDay(forDay, new Date());
    let startHour = 9;
    if (isToday) {
      const currentHour = new Date().getHours();
      if (currentHour >= 8 && currentHour < 21) {
        startHour = currentHour + 1;
      }
    }

    const checkSlot = (sh: number) => {
      const slotStart = sh * 60;
      const slotEnd = slotStart + 60;
      return !intervals.some(inv => slotStart < inv.end && slotEnd > inv.start);
    };

    for (let h = startHour; h <= 21; h++) {
      if (checkSlot(h)) {
        return {
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String(h + 1).padStart(2, '0')}:00`,
        };
      }
    }

    for (let h = 9; h < startHour; h++) {
      if (checkSlot(h)) {
        return {
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String(h + 1).padStart(2, '0')}:00`,
        };
      }
    }

    return { startTime: '09:00', endTime: '10:00' };
  };

  // Actions
  const handleScheduleForToday = (task: any) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { scheduledDate: targetDateIso }
    }, {
      onSuccess: () => toast.success(`Scheduled "${task.title}" for ${isViewingToday ? 'today' : format(day, 'MMM d')}`)
    });
  };

  const handleUnschedule = (task: any) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { scheduledDate: null }
    }, {
      onSuccess: () => toast.success(`Moved "${task.title}" to backlog`)
    });
  };

  const handleRescheduleAllOverdue = () => {
    carriedOverTasks.forEach((t: any) => {
      updateTaskMutation.mutate({
        id: t.id,
        data: { scheduledDate: targetDateIso }
      });
    });
    toast.success(`Rescheduled ${carriedOverTasks.length} task(s) to ${isViewingToday ? 'today' : format(day, 'MMM d')}`);
  };

  const handleCreateInlineTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim()) return;
    createTaskMutation.mutate({
      title: inlineTaskTitle.trim(),
      scheduledDate: targetDateIso,
      status: 'TODO'
    });
  };

  const handleTimeBlockFromTask = (task: any) => {
    if (onAddTimeBlock) {
      const slot = getNextAvailableSlot(timeBlocks, day);
      onAddTimeBlock(day, {
        title: task.title,
        taskId: task.id,
        projectId: task.projectId || task.project?.id,
        date: targetDateStr,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: 'WORK',
      });
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-150 pb-12">
      {/* TOP BAR: Day Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover text-secondary hover:text-primary rounded-lg border border-border text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft size={14} className="text-muted" /> Back to {backLabel}
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-primary tracking-tight">
                {format(day, 'EEEE, MMMM d, yyyy')}
              </h2>
              {isViewingToday && (
                <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent-fg text-[10px] font-bold font-mono uppercase tracking-wider border border-accent/20">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Day schedule, chronological time blocks, and task execution.
            </p>
          </div>
        </div>

        {/* Live Horizon Clock & Primary Action */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="px-3 py-1.5 bg-surface border border-border/80 rounded-xl flex items-center gap-2.5 shadow-2xs">
            <div className="text-[11px] font-semibold text-accent flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <Sparkles className="w-3.5 h-3.5 fill-accent text-accent" /> Live Horizon
            </div>
            <div className="text-xs font-mono font-bold text-primary tracking-tight">
              {timeString}
            </div>
          </div>

          {onAddTimeBlock && (
            <button
              onClick={() => onAddTimeBlock(day, getNextAvailableSlot(timeBlocks, day))}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Add Time Block"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Time Block</span>
            </button>
          )}

          {onAddTask && (
            <button
              onClick={() => onAddTask(day)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Add Task Modal"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-secondary" />
              <span>Task</span>
            </button>
          )}
        </div>
      </div>

      {/* OVERDUE / CARRIED-OVER TASKS ALERT (if any) */}
      {carriedOverTasks.length > 0 && (
        <div className="bg-warning-bg border border-warning-border rounded-2xl p-3.5 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-warning-subtle text-warning-fg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-warning-fg">
                {carriedOverTasks.length} overdue task{carriedOverTasks.length > 1 ? 's' : ''} carried over from previous days
              </span>
              <p className="text-[11px] text-secondary mt-0.5">
                Keep your plan current by rescheduling incomplete tasks into today's agenda.
              </p>
            </div>
          </div>
          <button
            onClick={handleRescheduleAllOverdue}
            className="px-3 py-1.5 bg-warning-fg hover:opacity-90 text-surface rounded-xl text-xs font-semibold transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            Reschedule All to Today
          </button>
        </div>
      )}

      {/* TWO-COLUMN COMMAND CENTER: Schedule (Left 7 cols) & Tasks/Backlog (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN (7 cols): CHRONOLOGICAL SCHEDULE & TIME BLOCKS */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 md:p-6 shadow-sm flex flex-col">
            
            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Clock4 className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Day Schedule</h3>
                  <p className="text-[11px] text-secondary">
                    Sequential chronological schedule for {format(day, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border text-[11px] font-mono font-medium text-secondary">
                  {timeBlocks.length} Blocks • {focusTimeString}
                </span>
              </div>
            </div>

            {/* Schedule Items List */}
            {timeBlocks.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-surface-hover/30 p-6">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h4 className="text-sm font-bold text-primary mb-1">No time blocks scheduled for this day</h4>
                <p className="text-xs text-secondary max-w-sm mb-4 leading-relaxed">
                  Structure your day with focused time blocks. Schedule meetings, deep work sessions, or convert tasks from your backlog on the right.
                </p>
                <div className="flex items-center gap-2.5">
                  {onAddTimeBlock && (
                    <button
                      onClick={() => onAddTimeBlock(day, getNextAvailableSlot(timeBlocks, day))}
                      className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-semibold transition-all shadow-xs cursor-pointer"
                    >
                      + Add Time Block
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTaskTab('backlog')}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Browse Backlog Tasks →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 relative">
                {timeBlocks.map((tb: any, idx: number) => {
                  const typeCfg = TYPE_CONFIG[tb.type as TimeBlockType] || TYPE_CONFIG.OTHER;
                  const durationStr = getDurationString(tb.startTime, tb.endTime);
                  const linkedTask = tb.taskId ? taskList.find((t: any) => t.id === tb.taskId) : null;
                  const isTaskDone = linkedTask ? (linkedTask.status === "DONE" || linkedTask.status === "REVIEW") : false;

                  const now = currentTime.getTime();
                  const tbStart = new Date(tb.startTime).getTime();
                  const tbEnd = new Date(tb.endTime).getTime();
                  const isCurrent = isViewingToday && (now >= tbStart && now <= tbEnd);
                  const percentElapsed = isCurrent && tbEnd > tbStart 
                    ? Math.min(100, Math.max(0, Math.round(((now - tbStart) / (tbEnd - tbStart)) * 100))) 
                    : 0;
                  const minutesRemaining = isCurrent ? Math.max(0, Math.round((tbEnd - now) / 60000)) : 0;

                  const nextTb = timeBlocks[idx + 1];
                  let gapMinutes = 0;
                  if (nextTb) {
                    const nextStart = new Date(nextTb.startTime).getTime();
                    gapMinutes = Math.round((nextStart - tbEnd) / 60000);
                  }

                  return (
                    <div key={tb.id} className="flex flex-col gap-2">
                      <div 
                        onClick={() => onClickTimeBlock && onClickTimeBlock(tb)}
                        className={cn(
                          "relative flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer group bg-surface shadow-2xs hover:shadow-xs overflow-hidden",
                          typeCfg.border,
                          "border-l-4",
                          isCurrent ? "ring-2 ring-accent border-accent/40 bg-accent/5" : "border-border hover:border-accent/50"
                        )}
                      >
                        {/* Left: Time & Duration Column */}
                        <div className="w-[72px] shrink-0 text-right flex flex-col gap-0.5 pt-0.5">
                          <span className={cn(
                            "text-xs font-mono font-bold tracking-tight",
                            isCurrent ? "text-accent" : "text-primary"
                          )}>
                            {formatTime(tb.startTime)}
                          </span>
                          <span className="text-[10px] font-mono text-secondary">
                            {formatTime(tb.endTime)}
                          </span>
                          {durationStr && (
                            <span className="text-[9px] font-mono text-muted mt-0.5">
                              {durationStr}
                            </span>
                          )}
                        </div>

                        {/* Main Block Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider font-mono",
                              typeCfg.bg,
                              typeCfg.color
                            )}>
                              {typeCfg.icon}
                              {typeCfg.label}
                            </span>

                            {isCurrent && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-bg text-success-fg text-[9px] font-bold uppercase tracking-wider border border-success-border">
                                <span className="w-1.5 h-1.5 rounded-full bg-success-fg animate-ping" />
                                Active Now • {minutesRemaining}m remaining
                              </span>
                            )}
                          </div>

                          <h4 className={cn(
                            "font-bold text-xs text-primary truncate mb-1",
                            isTaskDone && "line-through text-muted"
                          )}>
                            {tb.title}
                          </h4>

                          {/* Linked Task badge if any */}
                          {linkedTask && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onClickTask) onClickTask(linkedTask);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover border border-border text-[11px] font-medium text-secondary hover:text-primary max-w-full truncate mt-1"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onToggleTask) onToggleTask(linkedTask, e);
                                }}
                                className="text-muted hover:text-emerald-500 shrink-0"
                                title={isTaskDone ? "Mark incomplete" : "Mark done"}
                              >
                                {isTaskDone ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Circle className="w-3 h-3" />
                                )}
                              </button>
                              <span className="truncate">Task: {linkedTask.title}</span>
                            </div>
                          )}

                          {tb.notes && (
                            <p className="text-[11px] text-muted line-clamp-1 mt-1 font-sans">
                              {tb.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions (Hover) */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onClickTimeBlock) onClickTimeBlock(tb);
                            }}
                            className="w-7 h-7 rounded-lg text-muted hover:text-primary hover:bg-surface-hover flex items-center justify-center transition-colors"
                            title="Edit time block"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteTimeBlock && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTimeBlock(tb);
                              }}
                              className="w-7 h-7 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                              title="Delete time block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Active Progress Line */}
                        {isCurrent && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/15 overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-1000" 
                              style={{ width: `${percentElapsed}%` }} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Gap Slot Filler */}
                      {gapMinutes >= 30 && nextTb && (
                        <div 
                          onClick={() => onAddTimeBlock && onAddTimeBlock(day, {
                            date: targetDateStr,
                            startTime: getHHMM(tb.endTime),
                            endTime: getHHMM(nextTb.startTime),
                            type: 'WORK'
                          })}
                          className="my-1 py-1.5 px-3 rounded-lg border border-dashed border-border/80 hover:border-accent/50 hover:bg-accent/5 text-[11px] font-medium text-secondary hover:text-accent flex items-center justify-between cursor-pointer transition-colors group/gap"
                        >
                          <span className="flex items-center gap-1.5">
                            <Plus className="w-3 h-3 text-muted group-hover/gap:text-accent" />
                            Free window: {formatTime(tb.endTime)} - {formatTime(nextTb.startTime)} ({gapMinutes >= 60 ? `${Math.floor(gapMinutes/60)}h ${gapMinutes%60 > 0 ? `${gapMinutes%60}m` : ''}` : `${gapMinutes}m`})
                          </span>
                          <span className="text-[10px] font-mono text-muted group-hover/gap:text-accent">
                            + Fill Slot
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): TASKS & SCHEDULING PANEL */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col min-h-[500px]">

            {/* Segmented Pill Switcher: Today's Tasks vs Backlog */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border">
              <div className="flex items-center p-1 rounded-xl bg-surface-hover/80 border border-border w-full">
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('today')}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTaskTab === 'today'
                      ? "bg-surface text-primary shadow-xs border border-border/80"
                      : "text-secondary hover:text-primary"
                  )}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-accent" />
                  <span>Today's Tasks</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    activeTaskTab === 'today' ? "bg-accent/10 text-accent font-bold" : "bg-surface text-muted"
                  )}>
                    {todayTasks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTaskTab('backlog')}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTaskTab === 'backlog'
                      ? "bg-surface text-primary shadow-xs border border-border/80"
                      : "text-secondary hover:text-primary"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Backlog</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    activeTaskTab === 'backlog' ? "bg-indigo-500/10 text-indigo-500 font-bold" : "bg-surface text-muted"
                  )}>
                    {backlogTasks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTaskTab('log')}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTaskTab === 'log'
                      ? "bg-surface text-primary shadow-xs border border-border/80"
                      : "text-secondary hover:text-primary"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-cat-routines" />
                  <span>Daily Log</span>
                </button>
              </div>
            </div>

            {/* TAB 1: TODAY'S TASKS */}
            {activeTaskTab === 'today' && (
              <div className="flex flex-col flex-1 gap-3.5">
                {/* Inline Task Add Input */}
                <form onSubmit={handleCreateInlineTask} className="relative">
                  <input
                    type="text"
                    value={inlineTaskTitle}
                    onChange={(e) => setInlineTaskTitle(e.target.value)}
                    placeholder="+ Add a task for today... (Press Enter)"
                    className="w-full pl-3.5 pr-20 py-2 bg-surface-hover/50 border border-border rounded-xl text-xs text-primary placeholder:text-muted focus:outline-hidden focus:border-accent focus:bg-surface transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inlineTaskTitle.trim() || createTaskMutation.isPending}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-accent text-white text-[11px] font-semibold disabled:opacity-40 hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                {/* Today's Tasks List */}
                {todayTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl bg-surface-hover/20 p-4">
                    <Calendar className="w-8 h-8 text-muted mb-2 stroke-[1.5]" />
                    <h5 className="text-xs font-bold text-primary mb-1">No tasks scheduled for today</h5>
                    <p className="text-[11px] text-muted max-w-[240px] mb-3">
                      Add a task above, or browse your workspace backlog to pull in pending tasks.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTaskTab('backlog')}
                      className="px-3 py-1.5 bg-accent/10 hover:bg-accent hover:text-white text-accent rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Browse Backlog ({backlogTasks.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[550px] pr-1">
                    {todayTasks.map((task: any) => {
                      const isDone = task.status === 'DONE';

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border transition-all group bg-surface shadow-2xs",
                            isDone ? "border-border/60 opacity-65 bg-surface-hover/30" : "border-border hover:border-accent/40 hover:shadow-xs"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                if (onToggleTask) {
                                  onToggleTask(task, e);
                                } else {
                                  updateTaskMutation.mutate({
                                    id: task.id,
                                    data: { status: isDone ? 'TODO' : 'DONE' }
                                  });
                                }
                              }}
                              className="text-muted hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>

                            <div 
                              className="min-w-0 flex-1 cursor-pointer"
                              onClick={() => onClickTask && onClickTask(task)}
                            >
                              <span className={cn(
                                "text-xs font-medium block truncate",
                                isDone ? "text-muted line-through" : "text-primary"
                              )}>
                                {task.title}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {task.project?.name && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-surface-hover text-secondary border border-border">
                                    {task.project.name}
                                  </span>
                                )}
                                {task.priority && task.priority !== 'MEDIUM' && (
                                  <span className={cn(
                                    "text-[9px] font-bold font-mono uppercase px-1.5 py-0.2 rounded",
                                    task.priority === 'URGENT' ? "bg-danger-bg text-danger-fg" : "bg-warning-bg text-warning-fg"
                                  )}>
                                    {task.priority}
                                  </span>
                                )}
                                {task.estimateMinutes && (
                                  <span className="text-[9px] font-mono text-muted">
                                    {task.estimateMinutes}m
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Task Actions: Time Block, Unschedule, Delete */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onAddTimeBlock && (
                              <button
                                type="button"
                                onClick={() => handleTimeBlockFromTask(task)}
                                className="px-2 py-1 rounded-lg bg-accent/10 hover:bg-accent hover:text-white text-accent text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Schedule into a time block on your day timeline"
                              >
                                <Clock className="w-3 h-3" />
                                <span>Time Block</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleUnschedule(task)}
                              className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors"
                              title="Move to backlog"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteTaskMutation.mutate(task.id)}
                              className="p-1 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: WORKSPACE BACKLOG */}
            {activeTaskTab === 'backlog' && (
              <div className="flex flex-col flex-1 gap-3.5">
                {/* Search Backlog */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={backlogSearch}
                    onChange={(e) => setBacklogSearch(e.target.value)}
                    placeholder="Search backlog tasks..."
                    className="w-full pl-8 pr-3 py-1.5 bg-surface-hover/50 border border-border rounded-xl text-xs text-primary placeholder:text-muted focus:outline-hidden focus:border-accent transition-colors"
                  />
                </div>

                {/* Backlog Items List */}
                {filteredBacklogTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl bg-surface-hover/20 p-4">
                    <Check className="w-8 h-8 text-emerald-500 mb-2 stroke-[2]" />
                    <h5 className="text-xs font-bold text-primary mb-1">
                      {backlogSearch ? "No matching backlog tasks" : "Workspace backlog is clear!"}
                    </h5>
                    <p className="text-[11px] text-muted max-w-[240px]">
                      {backlogSearch ? "Try a different search term." : "All open tasks are scheduled or completed."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[550px] pr-1">
                    {filteredBacklogTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border hover:border-accent/40 bg-surface shadow-2xs hover:shadow-xs transition-all group"
                      >
                        <div 
                          className="min-w-0 flex-1 cursor-pointer pr-2"
                          onClick={() => onClickTask && onClickTask(task)}
                        >
                          <span className="text-xs font-semibold text-primary block truncate">
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {task.project?.name && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-surface-hover text-secondary border border-border">
                                {task.project.name}
                              </span>
                            )}
                            {task.priority && task.priority !== 'MEDIUM' && (
                              <span className={cn(
                                "text-[9px] font-bold font-mono uppercase px-1.5 py-0.2 rounded",
                                task.priority === 'URGENT' ? "bg-danger-bg text-danger-fg" : "bg-warning-bg text-warning-fg"
                              )}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions to schedule into day */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleScheduleForToday(task)}
                            className="px-2.5 py-1 rounded-lg bg-surface-hover hover:bg-accent hover:text-white text-secondary text-[11px] font-semibold transition-colors border border-border cursor-pointer"
                            title="Schedule for today"
                          >
                            + Today
                          </button>

                          {onAddTimeBlock && (
                            <button
                              type="button"
                              onClick={() => handleTimeBlockFromTask(task)}
                              className="px-2 py-1 rounded-lg bg-accent/10 hover:bg-accent hover:text-white text-accent text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Time block this task on your day timeline"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Time Block</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DAILY LOG & DEBRIEF */}
            {activeTaskTab === 'log' && (
              <DailyLogSection day={day} />
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
