import { format } from "date-fns";
import { AlertTriangle, Calendar, CalendarCheck, Check, CheckCircle2, Circle, Clock, Layers, Search, Trash2, XCircle } from "lucide-react";
import type { useTodayPlanner } from '../../hooks/useTodayPlanner';
import type { PlannerTask } from '../../types/planner';
import { cn } from '../../lib/utils';
interface Props {
  day: Date;
  planner: ReturnType<typeof useTodayPlanner>;
  onToggleTask?: (task: PlannerTask, event: React.MouseEvent) => void;
  onClickTask?: (task: PlannerTask) => void;
  canAddTimeBlock: boolean;
}
/** Render task execution and backlog; the parent hook owns requests and writes. */
export function TodayTasks({ day, planner, onToggleTask, onClickTask, canAddTimeBlock }: Props) {
  const { isViewingToday, updateTaskMutation, createTaskMutation, deleteTaskMutation, filteredBacklogTasks, handleScheduleForToday, handleUnschedule, handleRescheduleAllOverdue, handleCreateInlineTask, handleTimeBlockFromTask, todayTasks, carriedOverTasks, backlogTasks, activeTaskTab, setActiveTaskTab, backlogSearch, setBacklogSearch, inlineTaskTitle, setInlineTaskTitle } = planner;
  return (<>
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
                      {carriedOverTasks.map((task: PlannerTask) => (
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
                                    data: { status: 'DONE', version: task.version }
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
                    {todayTasks.map((task: PlannerTask) => {
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
                                    data: { status: isDone ? 'TODO' : 'DONE', version: task.version }
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
                            {canAddTimeBlock && (
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
                    {filteredBacklogTasks.map((task: PlannerTask) => (
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

                          {canAddTimeBlock && (
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
  </>);
}
