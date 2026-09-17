import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
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
  LayoutList,
  Target,
  Zap,
  Flame
} from "lucide-react";
import { api } from "../../api/client";
import { cn } from "../../lib/utils";
import { getIconForString } from "../../lib/iconMap";

interface Props {
  day: Date;
  data: any; // PlannerData
  dayData?: any; // The day object from data.days
  occurrenceFor: (routineId: string, day: Date) => any;
  onToggleRoutine: (occurrence: any) => void;
  onToggleTask: (task: any, e: React.MouseEvent) => void;
  onClickTask: (task: any) => void;
  onClickTimeBlock?: (block: any) => void;
  onDeleteTask?: (task: any) => void;
  onDeleteTimeBlock?: (block: any) => void;
  onDeleteRoutine?: (routine: any) => void;
  onAddTask?: (day: Date) => void;
  onAddTimeBlock?: (day: Date) => void;
  onAddRoutine?: (day: Date) => void;
  onBack?: () => void;
  backLabel?: string;
}

export function TodayView({
  day,
  data,
  occurrenceFor,
  onToggleRoutine,
  onToggleTask,
  onClickTask,
  onClickTimeBlock,
  onDeleteTask,
  onDeleteTimeBlock,
  onDeleteRoutine,
  onAddTask,
  onAddTimeBlock,
  onAddRoutine,
  onBack,
  backLabel = 'Plan',
}: Props) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time ticking clock for Live Horizon
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isViewingToday = day.toDateString() === new Date().toDateString();
  const targetDateStr = format(day, 'yyyy-MM-dd');
  const targetStart = useMemo(() => new Date(new Date(day).setHours(0, 0, 0, 0)), [day]);
  const targetEnd = useMemo(() => new Date(new Date(day).setHours(23, 59, 59, 999)), [day]);

  // Query all workspace tasks to guarantee overdue/carried-over detection across entire history
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

  const taskList = allIssues.length > 0 ? allIssues : (data?.tasks || []);
  const rawBlocks = dayPlannerData?.timeBlocks || data?.timeBlocks || [];

  // Filter and sort time blocks for this day
  const timeBlocks = useMemo(() => {
    return rawBlocks
      .filter((b: any) => {
        const bDate = b.date ? b.date.split('T')[0] : (b.startTime ? b.startTime.split('T')[0] : '');
        return bDate === targetDateStr;
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [rawBlocks, targetDateStr]);

  // Linked task IDs attached to time blocks
  const linkedTaskIds = useMemo(() => {
    return new Set(timeBlocks.map((tb: any) => tb.taskId).filter(Boolean));
  }, [timeBlocks]);

  // Tasks scheduled for today OR overdue tasks carried over from previous days
  const { carriedOverTasks, todayUnlinkedTasks, allDayTasks } = useMemo(() => {
    const carriedOver: any[] = [];
    const todayUnlinked: any[] = [];
    const allToday: any[] = [];

    taskList.forEach((t: any) => {
      const tDate = t.scheduledDate ? new Date(t.scheduledDate) : t.dueDate ? new Date(t.dueDate) : null;
      if (!tDate) return;

      const isToday = tDate.getTime() >= targetStart.getTime() && tDate.getTime() <= targetEnd.getTime();
      const isPast = tDate.getTime() < targetStart.getTime();

      if (isToday) {
        allToday.push(t);
        if (!linkedTaskIds.has(t.id)) {
          todayUnlinked.push(t);
        }
      } else if (isPast && t.status !== "DONE") {
        // Carry over incomplete tasks from the past
        carriedOver.push(t);
        allToday.push(t);
      }
    });

    return {
      carriedOverTasks: carriedOver,
      todayUnlinkedTasks: todayUnlinked,
      allDayTasks: allToday,
    };
  }, [taskList, targetStart, targetEnd, linkedTaskIds]);

  // Combine unlinked day tasks + time blocks into chronological agenda
  const agendaItems = useMemo(() => {
    const items: Array<{
      type: 'task' | 'timeblock';
      id: string;
      sortTime: number;
      data: any;
      linkedTask?: any;
    }> = [
      ...todayUnlinkedTasks.map((task: any) => ({
        type: 'task' as const,
        id: 'task-' + task.id,
        sortTime: 0,
        data: task,
      })),
      ...timeBlocks.map((tb: any) => ({
        type: 'timeblock' as const,
        id: 'tb-' + tb.id,
        sortTime: new Date(tb.startTime).getTime(),
        data: tb,
        linkedTask: taskList.find((t: any) => t.id === tb.taskId),
      })),
    ];

    return items.sort((a, b) => a.sortTime - b.sortTime);
  }, [todayUnlinkedTasks, timeBlocks, taskList]);

  // Routines scheduled for today
  const routines = useMemo(() => {
    return (data?.routines || [])
      .map((r: any) => ({ routine: r, occurrence: occurrenceFor(r.id, day) }))
      .filter((item: any) => !!item.occurrence);
  }, [data?.routines, occurrenceFor, day]);

  const completedRoutinesCount = routines.filter((r: any) => r.occurrence?.completed).length;

  // Calculate total focus time planned in minutes
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

  const completedTasksCount = allDayTasks.filter((t: any) => t.status === 'DONE').length;

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150 pb-12">
      {/* TOP CONTEXT BAR: Back Navigation + Live Horizon + Quick Actions */}
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
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono uppercase tracking-wider border border-blue-500/20">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Chronological day agenda, time-blocked execution, and focus routines.
            </p>
          </div>
        </div>

        {/* Live Horizon + Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Live Horizon Clock */}
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
              onClick={() => onAddTimeBlock(day)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Add Time Block"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Time Block</span>
            </button>
          )}

          {onAddTask && (
            <button
              onClick={() => onAddTask(day)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Add Task"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-secondary" />
              <span>Task</span>
            </button>
          )}

          {onAddRoutine && (
            <button
              onClick={() => onAddRoutine(day)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Add Routine"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Routine</span>
            </button>
          )}
        </div>
      </div>

      {/* TWO-COLUMN GRID: Chronological Timeline (Left) + Companion Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* MAIN COLUMN (8 cols): Chronological Timeline & Carried-Over Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* 1. CARRIED OVER / OVERDUE TASKS BANNER (if any) */}
          {carriedOverTasks.length > 0 && (
            <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 md:p-5 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Carried Over from Previous Days ({carriedOverTasks.length})
                    </h3>
                    <p className="text-[11px] text-amber-600/90 dark:text-amber-400/80">
                      Uncompleted tasks from earlier dates carried over to keep your momentum intact.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {carriedOverTasks.map((task) => {
                  const isDone = task.status === "DONE" || task.status === "REVIEW";
                  const Icon = getIconForString(task.title);

                  return (
                    <div
                      key={'carried-' + task.id}
                      onClick={() => onClickTask(task)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group bg-surface shadow-2xs",
                        isDone 
                          ? "border-border/60 opacity-60" 
                          : "border-amber-500/30 hover:border-amber-500 hover:shadow-xs"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(task, e);
                          }}
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0",
                            isDone 
                              ? "bg-primary border-primary text-white" 
                              : "border-border hover:border-accent text-transparent hover:text-accent"
                          )}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </button>

                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "text-xs font-semibold truncate",
                              isDone ? "text-muted line-through" : "text-primary"
                            )}>
                              {task.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-mono font-bold uppercase tracking-wider border border-amber-500/20 shrink-0">
                              Carried Over
                            </span>
                            {task.priority && task.priority !== 'MEDIUM' && (
                              <span className={cn(
                                "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase shrink-0",
                                task.priority === 'URGENT' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                              )}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                          {task.estimateMinutes && (
                            <span className="text-[10px] text-secondary font-mono">
                              Estimated: {task.estimateMinutes}m
                            </span>
                          )}
                        </div>
                      </div>

                      {onDeleteTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task);
                          }}
                          className="w-7 h-7 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. CHRONOLOGICAL EXECUTION TIMELINE CARD */}
          <div className="bg-surface border border-border rounded-2xl p-5 md:p-6 shadow-sm flex flex-col">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock4 className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Daily Agenda & Timeline</h3>
                  <p className="text-[11px] text-secondary">
                    Sequential chronological schedule for {format(day, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border text-[11px] font-mono font-medium text-secondary">
                  {timeBlocks.length} Blocks • {focusTimeString}
                </span>
                {onAddTimeBlock && (
                  <button
                    onClick={() => onAddTimeBlock(day)}
                    className="w-7 h-7 rounded-lg bg-accent/10 hover:bg-accent hover:text-white text-accent flex items-center justify-center transition-colors cursor-pointer"
                    title="Add Time Block"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Timeline Stream */}
            {agendaItems.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-surface-hover/30">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h4 className="text-sm font-bold text-primary mb-1">No events scheduled for this day</h4>
                <p className="text-xs text-secondary max-w-sm mb-4">
                  Your agenda is clear. Plan your time blocks or schedule tasks to execute with precision.
                </p>
                <div className="flex items-center gap-2.5">
                  {onAddTimeBlock && (
                    <button
                      onClick={() => onAddTimeBlock(day)}
                      className="px-3.5 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-semibold transition-all shadow-xs cursor-pointer"
                    >
                      + Add Time Block
                    </button>
                  )}
                  {onAddTask && (
                    <button
                      onClick={() => onAddTask(day)}
                      className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + Schedule Task
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {agendaItems.map((item) => {
                  // RENDER UNLINKED TASK ITEM
                  if (item.type === 'task') {
                    const task = item.data;
                    const isDone = task.status === "DONE" || task.status === "REVIEW";
                    const Icon = getIconForString(task.title);

                    return (
                      <div key={item.id} className="relative group/timeline">
                        {/* Connecting vertical line */}
                        <div className="absolute left-[39px] -top-2 -bottom-6 w-[2px] border-l-2 border-dashed border-border group-last/timeline:hidden" />

                        <div className="flex items-start gap-4 relative">
                          {/* Time label on left */}
                          <div className="w-[80px] shrink-0 text-right pt-2.5">
                            <span className="text-[11px] font-mono font-medium text-secondary">
                              Anytime
                            </span>
                          </div>

                          {/* Node icon on line */}
                          <div className={cn(
                            "w-8 h-8 rounded-full ring-4 ring-canvas flex items-center justify-center transition-colors z-10 shrink-0",
                            isDone 
                              ? "bg-primary text-white" 
                              : "bg-surface border-2 border-dashed border-border text-secondary"
                          )}>
                            {isDone ? (
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            ) : (
                              <Target className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Card Content */}
                          <div
                            onClick={() => onClickTask(task)}
                            className={cn(
                              "flex-1 rounded-xl p-3.5 transition-all flex items-center justify-between border border-dashed cursor-pointer group/card",
                              isDone 
                                ? "bg-surface border-border/60 opacity-60" 
                                : "bg-surface border-border hover:border-primary shadow-2xs hover:shadow-xs"
                            )}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTask(task, e);
                                }}
                                className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0",
                                  isDone 
                                    ? "bg-primary border-primary text-white" 
                                    : "border-border hover:border-accent text-transparent hover:text-accent"
                                )}
                              >
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              </button>

                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                isDone ? "bg-surface border border-border" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              )}>
                                <Icon className="w-4 h-4 stroke-[1.75]" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={cn(
                                    "font-semibold text-xs truncate mb-0.5",
                                    isDone ? "text-muted line-through" : "text-primary"
                                  )}>
                                    {task.title}
                                  </h4>
                                  <span className="px-1.5 py-0.2 rounded bg-surface-hover text-secondary text-[9px] font-mono font-medium border border-border">
                                    Day Task
                                  </span>
                                  {task.priority && task.priority !== 'MEDIUM' && (
                                    <span className={cn(
                                      "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase",
                                      task.priority === 'URGENT' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                    )}>
                                      {task.priority}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-secondary font-mono">
                                  {task.estimateMinutes ? `${task.estimateMinutes}m estimated` : 'No estimate'}
                                </div>
                              </div>
                            </div>

                            {onDeleteTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTask(task);
                                }}
                                className="w-8 h-8 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shrink-0 cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // RENDER TIME BLOCK ITEM
                  const tb = item.data;
                  const hasLinkedTask = !!item.linkedTask;
                  const blockTitle = hasLinkedTask ? item.linkedTask.title : tb.title;
                  const isDone = hasLinkedTask ? (item.linkedTask.status === "DONE" || item.linkedTask.status === "REVIEW") : false;
                  const Icon = getIconForString(blockTitle);

                  const now = currentTime.getTime();
                  const tbStart = new Date(tb.startTime).getTime();
                  const tbEnd = new Date(tb.endTime).getTime();
                  const isCurrent = isViewingToday && (now >= tbStart && now <= tbEnd);
                  const isPast = isViewingToday ? now > tbEnd : day.getTime() < new Date().setHours(0,0,0,0);

                  return (
                    <div key={item.id} className="relative group/timeline">
                      {/* Connecting vertical line */}
                      <div className="absolute left-[39px] -top-2 -bottom-6 w-[2px] bg-border group-last/timeline:hidden" />

                      <div className="flex items-start gap-4 relative">
                        {/* Time labels on left */}
                        <div className="w-[80px] shrink-0 text-right pt-2 flex flex-col gap-0.5">
                          <div className={cn(
                            "text-xs font-mono font-bold tracking-tight",
                            isCurrent ? "text-accent" : "text-primary"
                          )}>
                            {formatTime(tb.startTime)}
                          </div>
                          <div className="text-[10px] font-mono text-secondary">
                            {formatTime(tb.endTime)}
                          </div>
                        </div>

                        {/* Node circle on timeline */}
                        <div className={cn(
                          "w-8 h-8 rounded-full ring-4 ring-canvas flex items-center justify-center transition-all z-10 shrink-0",
                          isDone 
                            ? "bg-primary text-white shadow-xs" 
                            : isCurrent 
                            ? "bg-accent text-white ring-2 ring-accent/30 shadow-md animate-pulse" 
                            : isPast 
                            ? "bg-surface border-2 border-border text-muted" 
                            : "bg-surface border-2 border-accent text-accent"
                        )}>
                          {isDone ? (
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          ) : isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          )}
                        </div>

                        {/* Card Content */}
                        <div
                          onClick={() => onClickTimeBlock ? onClickTimeBlock(tb) : (hasLinkedTask && onClickTask(item.linkedTask))}
                          className={cn(
                            "flex-1 rounded-xl p-3.5 transition-all flex items-center justify-between border cursor-pointer group/card",
                            isDone 
                              ? "bg-surface border-border/60 opacity-60" 
                              : isCurrent 
                              ? "bg-surface border-accent ring-1 ring-accent/30 shadow-md" 
                              : "bg-surface border-border hover:border-primary shadow-2xs hover:shadow-xs"
                          )}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {hasLinkedTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTask(item.linkedTask, e);
                                }}
                                className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0",
                                  isDone 
                                    ? "bg-primary border-primary text-white" 
                                    : "border-border hover:border-accent text-transparent hover:text-accent"
                                )}
                              >
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            )}

                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                              isDone 
                                ? "bg-surface border border-border" 
                                : isCurrent 
                                ? "bg-accent text-white shadow-xs" 
                                : "bg-accent/10 text-accent border border-accent/20"
                            )}>
                              <Icon className="w-4 h-4 stroke-[1.75]" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={cn(
                                  "font-semibold text-xs truncate mb-0.5",
                                  isDone ? "text-muted line-through" : "text-primary"
                                )}>
                                  {blockTitle}
                                </h4>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded bg-accent/10 text-accent text-[9px] font-mono font-bold uppercase tracking-wider border border-accent/20 animate-pulse">
                                    In Progress Now
                                  </span>
                                )}
                                {hasLinkedTask && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-mono font-bold uppercase tracking-wider border border-blue-500/20">
                                    Linked Task
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-secondary font-mono flex items-center gap-2">
                                <span className="px-1.5 py-0.2 bg-surface-hover rounded border border-border/80">
                                  {tb.type || 'WORK'} Block
                                </span>
                                {tb.notes && (
                                  <span className="truncate max-w-[200px] text-muted italic">
                                    "{tb.notes}"
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {onDeleteTimeBlock && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTimeBlock(tb);
                              }}
                              className="w-8 h-8 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shrink-0 cursor-pointer"
                              title="Delete time block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COMPANION COLUMN (4 cols): Routines & Focus Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* 1. DAILY ROUTINES / HABIT CHECKLIST */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <LayoutList className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                    Daily Routines
                  </h3>
                  <span className="text-[11px] text-secondary font-mono">
                    {completedRoutinesCount} of {routines.length} completed
                  </span>
                </div>
              </div>

              {routines.length > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
                  completedRoutinesCount === routines.length 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                    : "bg-surface-hover text-secondary border border-border"
                )}>
                  {Math.round((completedRoutinesCount / routines.length) * 100)}%
                </span>
              )}
            </div>

            {/* Progress bar */}
            {routines.length > 0 && (
              <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden mb-4 border border-border/50">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(completedRoutinesCount / routines.length) * 100}%` }}
                />
              </div>
            )}

            {routines.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-border rounded-xl bg-surface-hover/30">
                <p className="text-xs text-muted mb-2">No routines scheduled for this day.</p>
                {onAddRoutine && (
                  <button
                    onClick={() => onAddRoutine(day)}
                    className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Add Routine
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {routines.map(({ routine, occurrence }: any) => {
                  const isDone = occurrence.completed;

                  return (
                    <div
                      key={routine.id}
                      onClick={() => onToggleRoutine(occurrence)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group shadow-2xs",
                        isDone 
                          ? "bg-surface border-border/60 opacity-65" 
                          : "bg-surface border-border hover:border-emerald-500/50 hover:shadow-xs"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0",
                            isDone 
                              ? "text-emerald-500" 
                              : "text-muted hover:text-emerald-500"
                          )}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 fill-emerald-500/10" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <span className={cn(
                            "text-xs font-semibold block truncate",
                            isDone ? "text-muted line-through" : "text-primary"
                          )}>
                            {routine.name}
                          </span>
                          {routine.frequency && (
                            <span className="text-[10px] text-secondary font-mono uppercase">
                              {routine.frequency}
                            </span>
                          )}
                        </div>
                      </div>

                      {onDeleteRoutine && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRoutine(routine);
                          }}
                          className="w-7 h-7 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                          title="Delete routine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {onAddRoutine && (
                  <button
                    onClick={() => onAddRoutine(day)}
                    className="w-full mt-2 py-2 border border-dashed border-border hover:border-emerald-500 text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Routine</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. DAY FOCUS METRICS */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-border">
              <Zap className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Day Execution Metrics
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface-hover/50 border border-border rounded-xl">
                <span className="text-[10px] text-secondary font-mono uppercase block mb-1">
                  Focus Planned
                </span>
                <span className="text-base font-bold text-primary font-mono">
                  {focusTimeString}
                </span>
              </div>

              <div className="p-3 bg-surface-hover/50 border border-border rounded-xl">
                <span className="text-[10px] text-secondary font-mono uppercase block mb-1">
                  Time Blocks
                </span>
                <span className="text-base font-bold text-primary font-mono">
                  {timeBlocks.length}
                </span>
              </div>

              <div className="p-3 bg-surface-hover/50 border border-border rounded-xl">
                <span className="text-[10px] text-secondary font-mono uppercase block mb-1">
                  Tasks Done
                </span>
                <span className="text-base font-bold text-primary font-mono">
                  {completedTasksCount} / {allDayTasks.length}
                </span>
              </div>

              <div className="p-3 bg-surface-hover/50 border border-border rounded-xl">
                <span className="text-[10px] text-secondary font-mono uppercase block mb-1">
                  Routines Done
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {completedRoutinesCount} / {routines.length}
                </span>
              </div>
            </div>

            {carriedOverTasks.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{carriedOverTasks.length} carried-over task{carriedOverTasks.length > 1 ? 's' : ''} require attention.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
