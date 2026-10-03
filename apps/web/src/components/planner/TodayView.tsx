import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Clock4,
  Edit3,
  Flag,
  Layers,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { cn, blockMinutesOfDay, formatBlockTime } from "../../lib/utils";
import { blockTypeStyle } from "../../lib/blockTypeStyles";
import { toast } from "sonner";

interface Props {
  day: Date;
  data: any; // PlannerData
  onToggleTask?: (task: any, e: React.MouseEvent) => void;
  onClickTask?: (task: any) => void;
  onClickTimeBlock?: (block: any) => void;
  onDeleteTimeBlock?: (block: any) => void;
  onAddTask?: (day: Date) => void;
  onAddTimeBlock?: (day: Date, initialData?: any) => void;
  onAddMilestone?: (day?: Date) => void;
  onClickMilestone?: (milestone: any) => void;
  onToggleMilestone?: (milestone: any) => void;
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
  onAddMilestone,
  onClickMilestone,
  onToggleMilestone,
  onBack,
  backLabel = 'Plan',
}: Props) {
  const queryClient = useQueryClient();
  const { workspaceId } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTaskTab, setActiveTaskTab] = useState<'today' | 'backlog'>('today');
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
    queryKey: ['issues', workspaceId],
    queryFn: api.tasks.list,
    staleTime: 10_000,
  });

  // Query specific day planner week/blocks if day is navigated outside current cached week
  const { data: dayPlannerData } = useQuery({
    queryKey: ['planner', 'day', targetDateStr, workspaceId],
    queryFn: () => api.planner.getWeek(targetDateStr, targetDateStr),
    staleTime: 15_000,
  });

  // Task Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update task: ' + (err?.message || 'Unknown error'));
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => api.tasks.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      // Drop synthesized holiday pseudo-blocks (isExternal): they have ids like
      // "holiday-<name>" with no real row, so their Edit/Delete controls 404.
      // PlannerMatrix applies the same filter.
      .filter((b: any) => !b.isExternal)
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
      const isCompleted = t.status === 'DONE' || t.status === 'CANCELED';
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

  // Time blocks are stored as UTC wall-clock; read/format them with UTC helpers.
  const formatTime = (iso: string) => formatBlockTime(iso);

  const getHHMM = (isoOrTime: string) => {
    const formatted = formatBlockTime(isoOrTime);
    return formatted || '09:00';
  };

  const getDurationString = (startIso: string, endIso: string) => {
    const sMin = blockMinutesOfDay(startIso);
    const eMin = blockMinutesOfDay(endIso);
    if (sMin === null || eMin === null) return '';
    const mins = Math.max(0, eMin - sMin);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };

  const getNextAvailableSlot = (blocks: any[], forDay: Date) => {
    const intervals: { start: number; end: number }[] = [];
    for (const b of blocks) {
      const sMin = blockMinutesOfDay(b.startTime);
      const eMin = blockMinutesOfDay(b.endTime);
      if (sMin !== null && eMin !== null && eMin > sMin) {
        intervals.push({ start: sMin, end: eMin });
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

  const handleRescheduleAllOverdue = async () => {
    const whenLabel = isViewingToday ? 'today' : format(day, 'MMM d');
    const results = await Promise.allSettled(
      carriedOverTasks.map((t: any) =>
        updateTaskMutation.mutateAsync({
          id: t.id,
          data: { scheduledDate: targetDateIso }
        })
      )
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    if (succeeded > 0) {
      toast.success(`Rescheduled ${succeeded} task(s) to ${whenLabel}`);
    }
    if (failed > 0) {
      toast.error(`Failed to reschedule ${failed} task(s)`);
    }
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

  // Milestones for this day (C10). Prefer the day-scoped planner fetch, fall
  // back to the week payload passed in via `data`.
  const dayMilestones = useMemo(() => {
    const source = dayPlannerData?.milestones ?? data?.milestones ?? [];
    return source.filter((m: any) => {
      try {
        return m.date && isSameDay(parseISO(m.date), day);
      } catch {
        return false;
      }
    });
  }, [dayPlannerData?.milestones, data?.milestones, day]);

  // Goals whose target date lands on this day — read-only deadline chips
  // (goals are edited from the Goals page, not the planner).
  const dayGoalDeadlines = useMemo(() => {
    const source = dayPlannerData?.goalDeadlines ?? data?.goalDeadlines ?? [];
    return source.filter((g: any) => {
      try {
        return g.targetDate && isSameDay(parseISO(g.targetDate), day);
      } catch {
        return false;
      }
    });
  }, [dayPlannerData?.goalDeadlines, data?.goalDeadlines, day]);

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
          <div className="krama-card p-5 md:p-6 flex flex-col">
            
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
                  const typeCfg = blockTypeStyle(tb.type);
                  const TypeIcon = typeCfg.Icon;
                  const durationStr = getDurationString(tb.startTime, tb.endTime);
                  const linkedTask = tb.taskId ? taskList.find((t: any) => t.id === tb.taskId) : null;
                  const isTaskDone = linkedTask ? linkedTask.status === "DONE" : false;

                  // Blocks store wall-clock as UTC; compare against the viewer's
                  // local wall-clock minutes-of-day so "now" lines up with the
                  // times shown in the block (which are rendered in UTC).
                  const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
                  const sMin = blockMinutesOfDay(tb.startTime) ?? 0;
                  const eMin = blockMinutesOfDay(tb.endTime) ?? 0;
                  const isCurrent = isViewingToday && nowMin >= sMin && nowMin <= eMin;
                  const percentElapsed = isCurrent && eMin > sMin
                    ? Math.min(100, Math.max(0, Math.round(((nowMin - sMin) / (eMin - sMin)) * 100)))
                    : 0;
                  const minutesRemaining = isCurrent ? Math.max(0, eMin - nowMin) : 0;

                  const nextTb = timeBlocks[idx + 1];
                  let gapMinutes = 0;
                  if (nextTb) {
                    const nextStart = blockMinutesOfDay(nextTb.startTime) ?? 0;
                    gapMinutes = nextStart - eMin;
                  }

                  return (
                    <div key={tb.id} className="flex flex-col gap-2">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onClickTimeBlock && onClickTimeBlock(tb)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (onClickTimeBlock) onClickTimeBlock(tb);
                          }
                        }}
                        className={cn(
                          "relative flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer group bg-surface shadow-2xs hover:shadow-xs overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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
                              <TypeIcon className="w-3.5 h-3.5" />
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
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onClickTask) onClickTask(linkedTask);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onClickTask) onClickTask(linkedTask);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover border border-border text-[11px] font-medium text-secondary hover:text-primary max-w-full truncate mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onToggleTask) onToggleTask(linkedTask, e);
                                }}
                                className="text-muted hover:text-success-fg shrink-0"
                                title={isTaskDone ? "Mark incomplete" : "Mark done"}
                              >
                                {isTaskDone ? (
                                  <CheckCircle2 className="w-3 h-3 text-success-fg" />
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
                              className="w-7 h-7 rounded-lg text-muted hover:text-danger-fg hover:bg-danger-bg flex items-center justify-center transition-colors"
                              title="Delete time block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Active Progress Line */}
                        {isCurrent && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-success-bg overflow-hidden">
                            <div
                              className="h-full bg-success-fg transition-all duration-1000"
                              style={{ width: `${percentElapsed}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Gap Slot Filler */}
                      {gapMinutes >= 30 && nextTb && (
                        <button
                          type="button"
                          onClick={() => onAddTimeBlock && onAddTimeBlock(day, {
                            date: targetDateStr,
                            startTime: getHHMM(tb.endTime),
                            endTime: getHHMM(nextTb.startTime),
                            type: 'WORK'
                          })}
                          className="w-full my-1 py-1.5 px-3 rounded-lg border border-dashed border-border/80 hover:border-accent/50 hover:bg-accent/5 text-[11px] font-medium text-secondary hover:text-accent flex items-center justify-between cursor-pointer transition-colors group/gap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <span className="flex items-center gap-1.5">
                            <Plus className="w-3 h-3 text-muted group-hover/gap:text-accent" />
                            Free window: {formatTime(tb.endTime)} - {formatTime(nextTb.startTime)} ({gapMinutes >= 60 ? `${Math.floor(gapMinutes/60)}h ${gapMinutes%60 > 0 ? `${gapMinutes%60}m` : ''}` : `${gapMinutes}m`})
                          </span>
                          <span className="text-[10px] font-mono text-muted group-hover/gap:text-accent">
                            + Fill Slot
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MILESTONES CARD */}
          <div className="krama-card p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cat-projects-bg text-cat-projects flex items-center justify-center">
                  <Target className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Milestones</h3>
                  <p className="text-[11px] text-secondary">
                    Project checkpoints due {format(day, 'MMM d')}
                  </p>
                </div>
              </div>
              {onAddMilestone && (
                <button
                  type="button"
                  onClick={() => onAddMilestone(day)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-semibold transition-colors cursor-pointer"
                  title="Add milestone"
                >
                  <Plus className="w-3.5 h-3.5 text-secondary" />
                  <span>Milestone</span>
                </button>
              )}
            </div>

            {dayMilestones.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-border rounded-xl bg-surface-hover/30">
                <p className="text-xs text-secondary">No milestones for this day.</p>
                {onAddMilestone && (
                  <button
                    type="button"
                    onClick={() => onAddMilestone(day)}
                    className="mt-2 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                  >
                    + Add a milestone
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {dayMilestones.map((m: any) => (
                  <div
                    key={m.id}
                    className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-surface shadow-2xs hover:border-cat-projects/40 transition-colors"
                  >
                    <button
                      type="button"
                      aria-label={m.completed ? 'Mark milestone incomplete' : 'Mark milestone complete'}
                      onClick={() => onToggleMilestone && onToggleMilestone(m)}
                      className="shrink-0 transition-transform active:scale-[0.98]"
                    >
                      {m.completed
                        ? <CheckCircle2 className="w-4 h-4 text-cat-projects" />
                        : <Circle className="w-4 h-4 text-muted hover:text-cat-projects transition-colors" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onClickMilestone && onClickMilestone(m)}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5 shrink-0 text-cat-projects" />
                      <span className={cn(
                        "text-xs font-semibold truncate",
                        m.completed ? "text-muted line-through" : "text-primary"
                      )}>
                        {m.title}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Goal deadlines due this day (read-only) */}
            {dayGoalDeadlines.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary mb-2 flex items-center gap-1.5">
                  <Flag className="w-3 h-3 text-accent" />
                  Goal Deadlines
                </p>
                <div className="space-y-2">
                  {dayGoalDeadlines.map((g: any) => {
                    const done = g.progress >= 100;
                    return (
                      <div
                        key={g.id}
                        onClick={() => navigate('/app/goals')}
                        className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-xl border shadow-2xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs",
                          done ? "border-border bg-surface-hover/40 text-muted" : "border-accent/30 bg-accent-subtle hover:bg-accent/15"
                        )}
                        title={`Strategic Goal due: ${g.title} (${g.progress}%) — Click to open OKRs`}
                      >
                        <Flag className={cn("w-3.5 h-3.5 shrink-0", done ? "text-muted" : "text-accent")} />
                        <span className={cn(
                          "text-xs font-semibold truncate flex-1 min-w-0",
                          done ? "text-muted line-through" : "text-primary"
                        )}>
                          {g.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-accent shrink-0">
                          {g.progress}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): TASKS & SCHEDULING PANEL */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="krama-card p-5 flex flex-col min-h-[500px]">

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
                  <Layers className="w-3.5 h-3.5 text-cat-tasks" />
                  <span>Backlog</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    activeTaskTab === 'backlog' ? "bg-cat-tasks-bg text-cat-tasks font-bold" : "bg-surface text-muted"
                  )}>
                    {backlogTasks.length}
                  </span>
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

                {/* Overdue / Carried Over Tasks Section */}
                {carriedOverTasks.length > 0 && (
                  <div className="rounded-xl border border-warning-border bg-warning-bg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning-fg shrink-0" />
                        <span className="text-xs font-bold text-primary">
                          Carried Over ({carriedOverTasks.length})
                        </span>
                        <span className="text-[10px] text-muted hidden sm:inline">
                          Overdue from past days
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRescheduleAllOverdue}
                        className="text-[11px] font-semibold text-warning-fg hover:underline cursor-pointer"
                      >
                        Reschedule all →
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                      {carriedOverTasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border shadow-2xs group text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                if (onToggleTask) {
                                  onToggleTask(task, e);
                                } else {
                                  updateTaskMutation.mutate({
                                    id: task.id,
                                    data: { status: 'DONE' }
                                  });
                                }
                              }}
                              className="text-muted hover:text-success-fg transition-colors shrink-0 cursor-pointer"
                              title="Mark done"
                            >
                              <Circle className="w-3.5 h-3.5" />
                            </button>
                            <span 
                              className="font-medium text-primary truncate cursor-pointer hover:text-accent"
                              onClick={() => onClickTask && onClickTask(task)}
                            >
                              {task.title}
                            </span>
                            {task.project?.name && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-surface-hover text-secondary border border-border shrink-0">
                                {task.project.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => handleScheduleForToday(task)}
                              className="px-2 py-0.5 rounded bg-accent/10 hover:bg-accent hover:text-white text-accent text-[10px] font-semibold transition-colors cursor-pointer"
                              title={`Schedule for ${isViewingToday ? 'today' : format(day, 'MMM d')}`}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnschedule(task)}
                              className="p-1 rounded text-muted hover:text-primary transition-colors cursor-pointer"
                              title="Move to backlog"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Today's Tasks List */}
                {todayTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl bg-surface-hover/20 p-4">
                    <Calendar className="w-8 h-8 text-muted mb-2 stroke-[1.5]" />
                    <h5 className="text-xs font-bold text-primary mb-1">
                      {carriedOverTasks.length > 0 ? "No new tasks scheduled for today" : "No tasks scheduled for today"}
                    </h5>
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
                              className="text-muted hover:text-success-fg transition-colors shrink-0 cursor-pointer"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-success-fg" />
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
                              className="p-1 rounded-lg text-muted hover:text-danger-fg hover:bg-danger-bg transition-colors"
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
                    <Check className="w-8 h-8 text-success-fg mb-2 stroke-[2]" />
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

          </div>
        </div>

      </div>
    </div>
  );
}
