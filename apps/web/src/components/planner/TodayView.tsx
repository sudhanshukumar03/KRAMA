import { TodayTasks } from './TodayTasks';
import { format } from "date-fns";
import {
    AlertTriangle,
    ArrowLeft,
    CalendarPlus,
    CheckCircle2,
    Circle,
    Clock,
    Clock4,
    Edit3,
    Flag,
    Plus,
    Trash2,
} from "lucide-react";
import { GoalSummitIcon } from '../ui/GoalIcon';
import { useTodayPlanner } from '../../hooks/useTodayPlanner';
import { blockTypeStyle } from "../../lib/blockTypeStyles";
import { blockMinutesOfDay, cn } from "../../lib/utils";

import type { PlannerData, PlannerTask, TimeBlock, TimeBlockDraft, Milestone } from "../../types/planner";

interface Props {
  day: Date;
  data: PlannerData;
  onToggleTask?: (task: PlannerTask, e: React.MouseEvent) => void;
  onClickTask?: (task: PlannerTask) => void;
  onEditTask?: (task: PlannerTask) => void;
  onFocusTimeBlock?: (block: TimeBlock) => void;
  onClickTimeBlock?: (block: TimeBlock) => void;
  onDeleteTimeBlock?: (block: TimeBlock) => void;
  onAddTask?: (day: Date) => void;
  onAddTimeBlock?: (day: Date, initialData?: TimeBlockDraft) => void;
  onAddMilestone?: (day?: Date) => void;
  onClickMilestone?: (milestone: Milestone) => void;
  onToggleMilestone?: (milestone: Milestone) => void;
  onBack?: () => void;
  backLabel?: string;
}

export function TodayView({
  day,
  data,
  onToggleTask,
  onClickTask,
  onClickTimeBlock,
  onEditTask,
  onFocusTimeBlock,
  onDeleteTimeBlock,
  onAddTask,
  onAddTimeBlock,
  onAddMilestone,
  onClickMilestone,
  onToggleMilestone,
  onBack,
  backLabel = 'Plan',
}: Props) {
  const planner = useTodayPlanner({ day, data, onAddTimeBlock });
  const { currentTime, navigate, isViewingToday, targetDateStr, taskList, timeBlocks, focusTimeString, formatTime, getHHMM, getDurationString, getNextAvailableSlot, handleRescheduleAllOverdue, dayMilestones, dayGoalDeadlines, carriedOverTasks, setActiveTaskTab } = planner;

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
                Daily plan
              </h2>
              {isViewingToday && (
                <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent-fg text-badge font-bold font-mono uppercase tracking-wider border border-accent/20">
                  Today
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Horizon Clock & Primary Action */}
        <div className="flex items-center flex-wrap gap-2.5">
          {onAddTimeBlock && (
            <button
              aria-label="Add Time Block"
              onClick={event => { event.currentTarget.focus(); onAddTimeBlock(day, getNextAvailableSlot(timeBlocks, day)); }}
              aria-haspopup="dialog"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-on-accent hover:bg-accent-hover text-xs font-semibold transition-all shadow-xs cursor-pointer"
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
                      className="px-4 py-2 rounded-xl bg-accent text-on-accent hover:bg-accent-hover text-xs font-semibold transition-all shadow-xs cursor-pointer"
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
                {timeBlocks.map((tb, idx) => {
                  const typeCfg = blockTypeStyle(tb.type);
                  const TypeIcon = typeCfg.Icon;
                  const durationStr = getDurationString(tb.startTime, tb.endTime);
                  const linkedTask = tb.taskId ? taskList.find((t) => t.id === tb.taskId) : null;
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
                        onClick={() => (onFocusTimeBlock || onClickTimeBlock)?.(tb)}
                        onKeyDown={(e) => {
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            (onFocusTimeBlock || onClickTimeBlock)?.(tb);
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
                            aria-label={`Edit time block ${tb.title}`}
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
                  <GoalSummitIcon className="w-4 h-4 stroke-[2]" />
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
                {dayMilestones.map((m) => (
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
                      <GoalSummitIcon className="w-3.5 h-3.5 shrink-0 text-cat-projects" />
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
                  {dayGoalDeadlines.map((g) => {
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

        <TodayTasks day={day} planner={planner} onToggleTask={onToggleTask} onClickTask={onClickTask} onEditTask={onEditTask} canAddTimeBlock={!!onAddTimeBlock} />

      </div>
    </div>
  );
}
