import { useMemo } from "react";
import { 
  format,
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useHolidays, getCalendarGridRange } from "../../hooks/useHolidays";
import { api } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Target,
  Flag
} from "lucide-react";
import { parseLocalDate, cn } from "../../lib/utils";

function getHolidayDateKey(dateVal: any): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal.slice(0, 10);
  if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
  return '';
}

function parseCalendarDate(dateVal: any): Date {
  const key = getHolidayDateKey(dateVal);
  if (!key) return new Date();
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

interface Props {
  calendarDate: Date;
  currentCountry: string;
  currentRegion: string | null;
  localOnly: boolean;
  onOpenDayView?: (day: Date) => void;
  tasks?: any[];
  onClickMilestone?: (milestone: any) => void;
  onToggleMilestone?: (milestone: any) => void;
}

export function CalendarMode({
  calendarDate,
  currentCountry,
  currentRegion,
  localOnly,
  onOpenDayView,
  tasks: propTasks = [],
  onClickMilestone,
  onToggleMilestone,
}: Props) {
  const { workspaceId } = useAuth();

  // Query all workspace tasks to guarantee month-wide task visibility
  const { data: allIssues = [] } = useQuery({
    queryKey: ['issues', workspaceId],
    queryFn: api.tasks.list,
    staleTime: 15_000,
  });

  const taskList = allIssues.length > 0 ? allIssues : propTasks;

  // Calendar Grid Math (Monday start, shared with useHolidays)
  const { startDate, endDate } = getCalendarGridRange(calendarDate);
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Milestones spanning the full visible grid (C10). Keyed to the same
  // `['planner', ...]` prefix the week/day views use so optimistic writes propagate.
  const gridStartKey = format(startDate, 'yyyy-MM-dd');
  const gridEndKey = format(endDate, 'yyyy-MM-dd');
  const { data: gridPlannerData, isError: milestonesError, refetch: retryMilestones } = useQuery({
    queryKey: ['planner', 'milestones', gridStartKey, gridEndKey, workspaceId],
    queryFn: () => api.planner.getMilestones(gridStartKey, gridEndKey, workspaceId),
    staleTime: 15_000,
  });
  const milestones = gridPlannerData?.milestones || [];
  const goalDeadlines = gridPlannerData?.goalDeadlines || [];

  const { data: monthData, isLoading: isHolidaysLoading, isError: holidaysError, refetch: retryHolidays } = useHolidays(currentCountry, currentRegion, calendarDate);

  const holidays = useMemo(() => {
    const raw = monthData?.holidays || [];
    return localOnly ? raw.filter((h: any) => h.isPublicHoliday) : raw;
  }, [monthData?.holidays, localOnly]);

  // Filter holidays belonging to the active month for the sidebar
  const currentMonthKey = format(calendarDate, 'yyyy-MM');
  const monthHolidays = useMemo(() => {
    return holidays.filter((h: any) => {
      const key = getHolidayDateKey(h.date);
      return key.startsWith(currentMonthKey);
    });
  }, [holidays, currentMonthKey]);

  // Active tasks excluding canceled
  const activeTaskList = useMemo(() => {
    return taskList.filter((t: any) => t.status !== 'CANCELED');
  }, [taskList]);

  // Filter tasks belonging to current active month
  const monthTasks = useMemo(() => {
    return activeTaskList.filter((t: any) => {
      const dStr = t.scheduledDate || t.dueDate;
      if (!dStr) return false;
      try {
        const d = (parseLocalDate(dStr) ?? new Date(NaN));
        return isSameMonth(d, calendarDate);
      } catch {
        return false;
      }
    });
  }, [activeTaskList, calendarDate]);

  const completedMonthTasks = useMemo(() => {
    return monthTasks.filter((t: any) => t.status === 'DONE');
  }, [monthTasks]);

  const completionPercentage = monthTasks.length > 0 
    ? Math.round((completedMonthTasks.length / monthTasks.length) * 100) 
    : 0;

  // Upcoming scheduled tasks in the month
  const upcomingMonthTasks = useMemo(() => {
    const todayZero = new Date(new Date().setHours(0, 0, 0, 0));
    return monthTasks
      .filter((t: any) => {
        const dStr = t.scheduledDate || t.dueDate;
        if (!dStr) return false;
        try {
          return (parseLocalDate(dStr) ?? new Date(NaN)).getTime() >= todayZero.getTime() && t.status !== 'DONE';
        } catch {
          return false;
        }
      })
      .sort((a: any, b: any) => {
        const da = new Date(a.scheduledDate || a.dueDate).getTime();
        const db = new Date(b.scheduledDate || b.dueDate).getTime();
        return da - db;
      })
      .slice(0, 5);
  }, [monthTasks]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">

      {(milestonesError || holidaysError) && <div role="alert" className="shrink-0 text-sm text-warning-fg">
        Some calendar events could not be loaded. <button type="button" className="underline" onClick={() => { retryMilestones(); retryHolidays(); }}>Retry calendar events</button>
      </div>}
      {/* CALENDAR GRID */}
      <div className="flex-1 flex flex-col min-h-0 pb-1">
        {(monthData?.coverage?.missingNationalYears?.length > 0 || monthData?.coverage?.missingRegionalYears?.length > 0) && (
          <p role="status" className="mb-2 text-sm text-warning-fg">
            {monthData.coverage.missingNationalYears.length > 0
              ? 'Holiday dates are unavailable for part of this period.'
              : 'State holiday dates are unavailable for this period. Showing national dates only.'}
          </p>
        )}
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-0 text-center text-[11px] mb-2 flex-shrink-0">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
            <div key={i} className="font-bold text-muted uppercase tracking-wider py-2 border-b border-border">
              {d}
            </div>
          ))}
        </div>

        {/* Month matrix cells */}
        <div className="grid grid-cols-7 auto-rows-fr gap-0 flex-1 overflow-hidden border-l border-t border-border rounded-[14px] [box-shadow:0_1px_2px_0_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.07)]">
          {monthDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayHolidays = holidays.filter((h: any) => {
              return getHolidayDateKey(h.date) === dayKey;
            });

            const dayTasks = activeTaskList.filter((t: any) => {
              const dStr = t.scheduledDate || t.dueDate;
              if (!dStr) return false;
              try {
                return isSameDay((parseLocalDate(dStr) ?? new Date(NaN)), day);
              } catch {
                return false;
              }
            });

            const dayMilestones = milestones.filter((m: any) => {
              try {
                return m.date && isSameDay((parseLocalDate(m.date) ?? new Date(NaN)), day);
              } catch {
                return false;
              }
            });

            const dayGoalDeadlines = goalDeadlines.filter((g: any) => {
              try {
                return g.targetDate && isSameDay((parseLocalDate(g.targetDate) ?? new Date(NaN)), day);
              } catch {
                return false;
              }
            });

            const isCurrentMonth = isSameMonth(day, calendarDate);
            const today = isToday(day);

            // Row budget of 2 shared across holiday → milestone → goal → tasks
            const shownHolidays = dayHolidays.slice(0, 1);
            const shownMilestones = dayMilestones.slice(0, 1);
            const shownGoals = dayGoalDeadlines.slice(0, 1);
            const taskSlots = Math.max(0, 2 - shownHolidays.length - shownMilestones.length - shownGoals.length);
            const shownTasks = dayTasks.slice(0, taskSlots);
            const remainingCount =
              (dayHolidays.length - shownHolidays.length) +
              (dayMilestones.length - shownMilestones.length) +
              (dayGoalDeadlines.length - shownGoals.length) +
              (dayTasks.length - shownTasks.length);

            return (
              <div
                key={day.toISOString()}
                role="button"
                tabIndex={0}
                aria-label={`Open schedule for ${format(day, 'EEEE, MMMM d')}`}
                onClick={() => onOpenDayView?.(day)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onOpenDayView?.(day);
                  }
                }}
                className={cn(
                  "flex flex-col min-h-0 p-1.5 border-r border-b border-border transition-all overflow-hidden cursor-pointer select-none group text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset focus-visible:z-10",
                  isCurrentMonth ? "bg-surface hover:bg-surface-hover/70" : "bg-surface-hover/30 hover:bg-surface-hover/60",
                  today && "ring-1 ring-inset ring-accent z-10"
                )}
              >
                {/* Cell Header: Date Number & Count Badge */}
                <div className="flex justify-between items-center mb-1">
                  <span className={cn(
                    "text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full transition-transform group-hover:scale-105",
                    today
                      ? "bg-accent text-on-accent shadow-2xs"
                      : isCurrentMonth
                      ? "text-primary font-semibold"
                      : "text-muted/60"
                  )}>
                    {format(day, "d")}
                  </span>

                  {dayTasks.length > 0 && (
                    <span className="text-[9px] font-mono px-1 rounded bg-surface-hover text-secondary border border-border/50">
                      {dayTasks.filter((t: any) => t.status === 'DONE').length}/{dayTasks.length}
                    </span>
                  )}
                </div>
                
                {/* Cell Body: Holidays, Milestones and Scheduled Tasks */}
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {/* Holidays */}
                  {shownHolidays.map((h: any) => (
                    <div
                      key={h.id || h.name}
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded leading-tight truncate border",
                        h.isPublicHoliday
                          ? "bg-danger-bg text-danger-fg border-danger-border"
                          : "bg-success-bg text-success-fg border-success-border"
                      )}
                      title={h.name}
                    >
                      🎉 {h.name}
                    </div>
                  ))}

                  {/* Milestones */}
                  {shownMilestones.map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-1 text-[9px] px-1 py-0.5 rounded leading-tight border bg-cat-projects-bg border-cat-projects/30"
                      title={m.title}
                    >
                      <button
                        type="button"
                        aria-label={m.completed ? 'Mark milestone incomplete' : 'Mark milestone complete'}
                        onClick={(e) => { e.stopPropagation(); onToggleMilestone?.(m); }}
                        className="shrink-0"
                      >
                        {m.completed
                          ? <CheckCircle2 className="w-2.5 h-2.5 text-cat-projects" />
                          : <Circle className="w-2.5 h-2.5 text-cat-projects/70 hover:text-cat-projects" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClickMilestone?.(m); }}
                        className="flex items-center gap-1 min-w-0 flex-1 text-left"
                      >
                        <Target className="w-2.5 h-2.5 shrink-0 text-cat-projects" />
                        <span className={cn(
                          "truncate font-semibold",
                          m.completed ? "text-muted line-through" : "text-cat-projects"
                        )}>
                          {m.title}
                        </span>
                      </button>
                    </div>
                  ))}

                  {/* Goal deadlines (read-only — goals are edited on the Goals page) */}
                  {shownGoals.map((g: any) => {
                    const done = g.progress >= 100;
                    return (
                      <div
                        key={g.id}
                        className={cn(
                          "flex items-center gap-1 text-[9px] px-1 py-0.5 rounded leading-tight border",
                          done
                            ? "bg-surface-hover/50 border-border/60"
                            : "bg-accent-subtle border-accent/30"
                        )}
                        title={`Goal due: ${g.title} (${g.progress}%)`}
                      >
                        <Flag className={cn("w-2.5 h-2.5 shrink-0", done ? "text-muted" : "text-accent")} />
                        <span className={cn(
                          "truncate font-semibold",
                          done ? "text-muted line-through" : "text-accent"
                        )}>
                          {g.title}
                        </span>
                      </div>
                    );
                  })}

                  {/* Tasks */}
                  {shownTasks.map((task: any) => {
                    const isDone = task.status === 'DONE';
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded leading-tight truncate flex items-center gap-1 border transition-colors",
                          isDone
                            ? "bg-surface-hover/50 text-muted line-through border-border/60"
                            : "bg-accent/5 text-primary border-accent/20 hover:border-accent/40 font-medium"
                        )}
                        title={task.title}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-success shrink-0" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 text-accent shrink-0" />
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}

                  {/* More indicator */}
                  {remainingCount > 0 && (
                    <div className="text-[9px] font-medium text-secondary pl-1 hover:text-accent transition-colors">
                      +{remainingCount} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SIDEBAR: MONTHLY OVERVIEW & HOLIDAYS */}
      <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-3.5 overflow-y-auto hide-scrollbar pb-2">
        
        {/* MONTHLY EXECUTION OVERVIEW */}
        <div className="flex flex-col krama-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <h3 className="text-xs font-bold text-primary">Monthly Execution</h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {format(calendarDate, "MMM yyyy")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-surface-hover/50 border border-border">
              <span className="text-[10px] text-secondary font-medium">Scheduled</span>
              <div className="text-base font-bold text-primary mt-0.5">{monthTasks.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-hover/50 border border-border">
              <span className="text-[10px] text-secondary font-medium">Completed</span>
              <div className="text-base font-bold text-success mt-0.5">{completedMonthTasks.length}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-medium text-secondary mb-1">
              <span>Completion Rate</span>
              <span className="font-mono font-bold text-primary">{completionPercentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border/50">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* UPCOMING TASKS IN MONTH */}
        <div className="flex flex-col krama-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-primary">Upcoming in Month</h3>
          </div>

          {upcomingMonthTasks.length === 0 ? (
            <div className="text-xs text-secondary py-4 text-center italic border border-dashed border-border rounded-xl">
              No pending tasks scheduled for this month.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingMonthTasks.map((t: any) => {
                const d = (parseLocalDate(t.scheduledDate || t.dueDate) ?? new Date(NaN));
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => onOpenDayView && onOpenDayView(d)}
                    aria-label={`Open day schedule for ${t.title} on ${format(d, 'MMMM d')}`}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover transition-colors cursor-pointer group text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-surface border border-border flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-secondary uppercase leading-none">{format(d, "MMM")}</span>
                        <span className="text-xs font-bold text-primary leading-none mt-0.5">{format(d, "d")}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-primary truncate group-hover:text-accent transition-colors">
                          {t.title}
                        </h4>
                        <span className="text-[10px] text-secondary truncate block">
                          {t.project?.name || 'General'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* UPCOMING HOLIDAYS */}
        <div className="flex flex-col bg-surface rounded-2xl p-4 border border-border shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4 text-danger-fg" />
            <h3 className="text-xs font-bold text-primary">Holidays & Observances</h3>
          </div>

          <div className="flex flex-col gap-2">
            {isHolidaysLoading ? (
              <div className="text-xs text-muted animate-pulse py-2">Loading holidays...</div>
            ) : monthHolidays.length === 0 ? (
              <div className="text-xs text-secondary py-4 text-center italic border border-dashed border-border rounded-xl">
                No holidays in this month.
              </div>
            ) : (
              monthHolidays.slice(0, 6).map((h: any) => {
                const hDate = parseCalendarDate(h.date);
                return (
                  <div 
                    key={h.id || h.name} 
                    className="flex gap-2.5 items-center p-2 rounded-xl border border-border bg-surface-hover/30"
                  >
                    <div className="w-8 h-8 rounded-lg bg-danger-bg border border-danger-border flex flex-col items-center justify-center shrink-0 text-danger-fg">
                      <span className="text-[8px] font-bold uppercase leading-none">{format(hDate, "MMM")}</span>
                      <span className="text-xs font-bold leading-none mt-0.5">{format(hDate, "d")}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-primary truncate">{h.name}</div>
                      <div className="text-[9px] font-medium text-secondary uppercase tracking-wider">
                        {h.type ? h.type.replace(/_/g, " ") : "Holiday"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Tip */}
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/15 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-secondary leading-relaxed">
            Click any day cell to jump straight into that date's chronological schedule and time blocks.
          </p>
        </div>

      </div>
    </div>
  );
}
