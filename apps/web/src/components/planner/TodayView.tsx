import { format } from "date-fns";
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
import { useTodayPlanner } from '../../hooks/useTodayPlanner';
import { blockTypeStyle } from "../../lib/blockTypeStyles";
import { blockMinutesOfDay, cn } from "../../lib/utils";

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
  const { currentTime, navigate, isViewingToday, targetDateStr, updateTaskMutation, createTaskMutation, deleteTaskMutation, taskList, timeBlocks, filteredBacklogTasks, focusTimeString, timeString, formatTime, getHHMM, getDurationString, getNextAvailableSlot, handleScheduleForToday, handleUnschedule, handleRescheduleAllOverdue, handleCreateInlineTask, handleTimeBlockFromTask, dayMilestones, dayGoalDeadlines, todayTasks, carriedOverTasks, backlogTasks, activeTaskTab, setActiveTaskTab, backlogSearch, setBacklogSearch, inlineTaskTitle, setInlineTaskTitle } = useTodayPlanner({ day, data, onAddTimeBlock });

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
                <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent-fg text-badge font-bold font-mono uppercase tracking-wider border border-accent/20">
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
            <div className="text-caption font-semibold text-accent flex items-center gap-1.5">
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
              <p className="text-caption text-secondary mt-0.5">
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
                  <p className="text-caption text-secondary">
                    Sequential chronological schedule for {format(day, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border text-caption font-mono font-medium text-secondary">
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
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
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
                          <span className="text-badge font-mono text-secondary">
                            {formatTime(tb.endTime)}
                          </span>
                          {durationStr && (
                            <span className="text-badge font-mono text-muted mt-0.5">
                              {durationStr}
                            </span>
                          )}
                        </div>

                        {/* Main Block Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-badge font-semibold uppercase tracking-wider font-mono",
                              typeCfg.bg,
                              typeCfg.color
                            )}>
                              <TypeIcon className="w-3.5 h-3.5" />
                              {typeCfg.label}
                            </span>

                            {isCurrent && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-bg text-success-fg text-badge font-bold uppercase tracking-wider border border-success-border">
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
                                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onClickTask) onClickTask(linkedTask);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover border border-border text-caption font-medium text-secondary hover:text-primary max-w-full truncate mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                            <p className="text-caption text-muted line-clamp-1 mt-1 font-sans">
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
                          className="w-full my-1 py-1.5 px-3 rounded-lg border border-dashed border-border/80 hover:border-accent/50 hover:bg-accent/5 text-caption font-medium text-secondary hover:text-accent flex items-center justify-between cursor-pointer transition-colors group/gap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <span className="flex items-center gap-1.5">
                            <Plus className="w-3 h-3 text-muted group-hover/gap:text-accent" />
                            Free window: {formatTime(tb.endTime)} - {formatTime(nextTb.startTime)} ({gapMinutes >= 60 ? `${Math.floor(gapMinutes/60)}h ${gapMinutes%60 > 0 ? `${gapMinutes%60}m` : ''}` : `${gapMinutes}m`})
                          </span>
                          <span className="text-badge font-mono text-muted group-hover/gap:text-accent">
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
                  <p className="text-caption text-secondary">
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
                    className="mt-2 text-caption font-semibold text-accent hover:underline cursor-pointer"
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
                <p className="text-badge font-mono font-bold uppercase tracking-wider text-secondary mb-2 flex items-center gap-1.5">
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
                        <span className="text-badge font-mono font-bold text-accent shrink-0">
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
                    "px-1.5 py-0.2 rounded-full text-badge font-mono",
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
                    "px-1.5 py-0.2 rounded-full text-badge font-mono",
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
                    aria-label="Add task for selected day"
                    maxLength={200}
                    value={inlineTaskTitle}
                    onChange={(e) => setInlineTaskTitle(e.target.value)}
                    placeholder={`+ Add a task for ${isViewingToday ? "today" : format(day, "MMM d")}... (Press Enter)`}
                    className="w-full pl-3.5 pr-20 py-2 bg-surface-hover/50 border border-border rounded-xl text-xs text-primary placeholder:text-muted focus:outline-hidden focus:border-accent focus:bg-surface transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inlineTaskTitle.trim() || createTaskMutation.isPending}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-accent text-white text-caption font-semibold disabled:opacity-40 hover:bg-accent-hover transition-colors cursor-pointer"
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
                        <span className="text-badge text-muted hidden sm:inline">
                          Overdue from past days
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRescheduleAllOverdue}
                        className="text-caption font-semibold text-warning-fg hover:underline cursor-pointer"
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
                              aria-label={task.status === "DONE" ? "Mark task incomplete" : "Mark task complete"}
                              className="text-muted hover:text-success-fg transition-colors shrink-0 cursor-pointer"
                              title="Mark done"
                            >
                              <Circle className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" aria-label={task.title}
                              className="font-medium text-primary truncate cursor-pointer hover:text-accent"
                              onClick={() => onClickTask && onClickTask(task)}
                            >
                              {task.title}
                            </button>
                            {task.project?.name && (
                              <span className="text-badge font-medium px-1.5 py-0.2 rounded bg-surface-hover text-secondary border border-border shrink-0">
                                {task.project.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => handleScheduleForToday(task)}
                              className="px-2 py-0.5 rounded bg-accent/10 hover:bg-accent hover:text-white text-accent text-badge font-semibold transition-colors cursor-pointer"
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
                    <p className="text-caption text-muted max-w-[240px] mb-3">
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
                              aria-label={task.status === "DONE" ? "Mark task incomplete" : "Mark task complete"}
                              className="text-muted hover:text-success-fg transition-colors shrink-0 cursor-pointer"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-success-fg" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>

                            <button type="button" aria-label={task.title}
                              className="text-left min-w-0 flex-1 cursor-pointer"
                              onClick={() => onClickTask && onClickTask(task)}
                            >
                              <span className={cn(
                                "text-xs font-medium block truncate",
                                isDone ? "text-muted line-through" : "text-primary"
                              )}>
                                {task.title}
                              </span>
                              <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {task.project?.name && (
                                  <span className="text-badge font-medium px-1.5 py-0.2 rounded bg-surface-hover text-secondary border border-border">
                                    {task.project.name}
                                  </span>
                                )}
                                {task.priority && task.priority !== 'MEDIUM' && (
                                  <span className={cn(
                                    "text-badge font-bold font-mono uppercase px-1.5 py-0.2 rounded",
                                    task.priority === 'URGENT' ? "bg-danger-bg text-danger-fg" : "bg-warning-bg text-warning-fg"
                                  )}>
                                    {task.priority}
                                  </span>
                                )}
                                {task.estimateMinutes && (
                                  <span className="text-badge font-mono text-muted">
                                    {task.estimateMinutes}m
                                  </span>
                                )}
                              </span>
                            </button>
                          </div>

                          {/* Quick Task Actions: Time Block, Unschedule, Delete */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onAddTimeBlock && (
                              <button
                                type="button"
                                onClick={() => handleTimeBlockFromTask(task)}
                                className="px-2 py-1 rounded-lg bg-accent/10 hover:bg-accent hover:text-white text-accent text-badge font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
                    aria-label="Search backlog tasks"
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
                    <p className="text-caption text-muted max-w-[240px]">
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
                        <button type="button" aria-label={task.title}
                          className="text-left min-w-0 flex-1 cursor-pointer pr-2"
                          onClick={() => onClickTask && onClickTask(task)}
                        >
                          <span className="text-xs font-semibold text-primary block truncate">
                            {task.title}
                          </span>
                          <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {task.project?.name && (
                              <span className="text-badge font-medium px-1.5 py-0.2 rounded bg-surface-hover text-secondary border border-border">
                                {task.project.name}
                              </span>
                            )}
                            {task.priority && task.priority !== 'MEDIUM' && (
                              <span className={cn(
                                "text-badge font-bold font-mono uppercase px-1.5 py-0.2 rounded",
                                task.priority === 'URGENT' ? "bg-danger-bg text-danger-fg" : "bg-warning-bg text-warning-fg"
                              )}>
                                {task.priority}
                              </span>
                            )}
                          </span>
                        </button>

                        {/* Actions to schedule into day */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleScheduleForToday(task)}
                            className="px-2.5 py-1 rounded-lg bg-surface-hover hover:bg-accent hover:text-white text-secondary text-caption font-semibold transition-colors border border-border cursor-pointer"
                            title="Schedule for today"
                          >
                            + Today
                          </button>

                          {onAddTimeBlock && (
                            <button
                              type="button"
                              onClick={() => handleTimeBlockFromTask(task)}
                              className="px-2 py-1 rounded-lg bg-accent/10 hover:bg-accent hover:text-white text-accent text-caption font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
