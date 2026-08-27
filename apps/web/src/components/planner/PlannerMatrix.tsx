// =============================================================================
// PLANNER MATRIX - KRAMA OS
// =============================================================================
// The core 7-day grid with: Routines, Tasks, Schedule, Projects

import { format, isSameDay, parseISO } from "date-fns";
import { Plus, CheckCircle2, Circle, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { PlannerData } from "../../types/planner";

const BLOCK_COLORS: Record<string, string> = {
  MEETING:  "bg-violet-50 border-violet-200 text-violet-800",
  PERSONAL: "bg-orange-50 border-orange-200 text-orange-800",
  STUDY:    "bg-blue-50 border-blue-200 text-blue-800",
  WORK:     "bg-slate-50 border-slate-200 text-slate-800",
  HEALTH:   "bg-emerald-50 border-emerald-200 text-emerald-800",
  ADMIN:    "bg-gray-50 border-gray-200 text-gray-800",
  OTHER:    "bg-neutral-50 border-neutral-200 text-neutral-800",
};

type MatrixCategory = "routines" | "tasks" | "timeBlocks" | "projects";

const DEFAULT_EXPANDED: Record<MatrixCategory, boolean> = {
  routines: false,
  tasks: false,
  timeBlocks: false,
  projects: false,
};

const MATRIX_COLLAPSE_STORAGE_KEY = "krama.planner.matrix.expanded.v1";

const LEGEND = [
  { label: "Sync / Meeting", color: "bg-violet-500" },
  { label: "Personal",       color: "bg-orange-500" },
  { label: "Study",          color: "bg-blue-500" },
  { label: "Work",           color: "bg-slate-500" },
  { label: "Health",         color: "bg-emerald-500" },
  { label: "Other",          color: "bg-neutral-500" },
  { label: "Completed",      color: "bg-green-500" },
  { label: "Planned",        color: "bg-blue-400" },
];

interface Props {
  data: PlannerData;
  days: Date[];
  occurrenceFor: (routineId: string, day: Date) => any;
  onToggleRoutine: (occurrence: any) => void;
  onAddTimeBlock: (day: Date) => void;
  onAddTask?: (day: Date) => void;
  onAddRoutine?: (day: Date) => void;
  onAddProject?: (day: Date) => void;
  onToggleTask?: (task: any, e: React.MouseEvent) => void;
  onClickTask?: (task: any) => void;
}

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatMinutes(mins: number | undefined | null) {
  if (!mins) return null;
  if (mins < 60) return mins + "m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? h + "h " + m + "m" : h + "h";
}

function safeTimeFormat(dateString: string) {
  try {
    return format(parseISO(dateString), "HH:mm");
  } catch (e) {
    return "";
  }
}

export function PlannerMatrix({
  data,
  days,
  occurrenceFor,
  onToggleRoutine,
  onAddTimeBlock,
  onAddTask,
  onAddRoutine,
  onAddProject,
  onToggleTask,
  onClickTask
}: Props) {
  const today = new Date();
  const [expandedState, setExpandedState] = useState<Record<MatrixCategory, boolean>>(() => {
    try {
      const stored = localStorage.getItem(MATRIX_COLLAPSE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === "object" && parsed !== null) {
          return { ...DEFAULT_EXPANDED, ...parsed };
        }
      }
    } catch (e) {}
    return DEFAULT_EXPANDED;
  });

  const handleToggle = (key: MatrixCategory) => {
    setExpandedState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(MATRIX_COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px] flex flex-col">

            {/* DAY HEADERS */}
            <div className="grid grid-cols-[180px_repeat(7,minmax(130px,1fr))] bg-slate-50 border-b border-slate-200 flex-shrink-0">
              <div className="p-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Categories
              </div>
              {days.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div key={dateKey(day)} className={"border-l border-slate-200 p-3 " + (isToday ? "bg-blue-50/50" : "")}>
                    <div className="text-[11px] font-bold uppercase text-slate-400">
                      {format(day, "EEE")}
                    </div>
                    <div className={"text-base font-semibold mt-0.5 " + (isToday ? "text-blue-600" : "text-slate-800")}>
                      {format(day, "MMM d")}
                    </div>
                    {isToday && (
                      <span className="mt-1 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        TODAY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              {/* ROUTINES */}
              <MatrixRow label="Routines" subtitle={`${data.routines.length} routines`} categoryKey="routines" isExpanded={expandedState.routines} onToggle={() => handleToggle("routines")} itemCount={data.occurrences ? data.occurrences.length : 0}>
                {days.map((day) => {
                  const isPast = day < new Date(today.setHours(0,0,0,0));
                  return (
                    <div key={dateKey(day)} className="border-l border-slate-200 p-2 min-h-[72px]">
                      <div className="space-y-1.5">
                        {data.routines.map((routine: any) => {
                          const occ = occurrenceFor(routine.id, day);
                          if (!occ) return null;
                          return (
                            <button
                              key={occ.id}
                              onClick={() => onToggleRoutine(occ)}
                              className={"flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors border " +
                                (occ.completed ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                 isPast ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-slate-200 text-slate-600 hover:border-blue-300")}
                            >
                              <span className="truncate">{routine.name}</span>
                              <div className={"flex h-3.5 w-3.5 items-center justify-center rounded-full border " +
                                (occ.completed ? "bg-emerald-500 border-emerald-500" :
                                 isPast ? "bg-slate-100 border-slate-200" : "bg-white border-slate-300")}>
                                {occ.completed && (
                                  <svg viewBox="0 0 14 14" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 7.5 5.5 10 11 4" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {onAddRoutine && (
                          <button
                            onClick={() => onAddRoutine(day)}
                            className="flex w-full justify-center rounded-lg border border-dashed border-slate-300 py-1 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mt-1"
                            title="Assign Routine"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </MatrixRow>

              {/* TASKS */}
              <MatrixRow label="Tasks" subtitle={`${data.tasks.length} tasks`} categoryKey="tasks" isExpanded={expandedState.tasks} onToggle={() => handleToggle("tasks")} itemCount={data.tasks.length}>
                {days.map((day) => {
                  const dayTasks = data.tasks.filter(
                    (t) => (t.scheduledDate && isSameDay(parseISO(t.scheduledDate), day)) ||
                           (!t.scheduledDate && t.dueDate && isSameDay(parseISO(t.dueDate), day))
                  );
                  return (
                    <div key={dateKey(day)} className="border-l border-slate-200 p-2 min-h-[72px]">
                      <div className="space-y-1.5">
                        {dayTasks.map((task) => {
                          const isDone = task.status === "DONE";
                          const estString = formatMinutes(task.estimateMinutes);
                          return (
                            <button
                              key={task.id}
                              onClick={() => onClickTask && onClickTask(task)}
                              className={"w-full text-left flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium border transition-colors group " +
                                (isDone ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm")}
                            >
                              <div
                                className="mt-0.5 shrink-0 cursor-pointer"
                                onClick={(e) => {
                                  if (onToggleTask) onToggleTask(task, e);
                                }}
                              >
                                {isDone ? (
                                  <CheckCircle2 size={12} className="text-slate-400" />
                                ) : (
                                  <Circle size={12} className="text-slate-300 group-hover:text-indigo-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col">
                                <span className={"truncate " + (isDone ? "line-through" : "text-slate-700")}>
                                  {task.title}
                                </span>
                                {estString && (
                                  <span className={"text-[9px] mt-0.5 " + (isDone ? "text-slate-400" : "text-indigo-500 font-bold")}>
                                    {estString}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {onAddTask && (
                          <button
                            onClick={() => onAddTask(day)}
                            className="flex w-full justify-center rounded-lg border border-dashed border-slate-300 py-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors mt-1"
                            title="Add Task"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </MatrixRow>

              {/* SCHEDULE / TIME BLOCKS */}
              <MatrixRow label="Time Blocks" subtitle="(planned time)" categoryKey="timeBlocks" isExpanded={expandedState.timeBlocks} onToggle={() => handleToggle("timeBlocks")} itemCount={data.timeBlocks.length}>
                {days.map((day) => {
                  const dayBlocks = data.timeBlocks.filter(
                    (b) => isSameDay(parseISO(b.date), day)
                  );
                  return (
                    <div key={dateKey(day)} className="border-l border-slate-200 p-1.5 min-h-[72px]">
                      <div className="space-y-1.5">
                        {dayBlocks.map((block) => (
                          <div
                            key={block.id}
                            className={"rounded-lg px-2 py-1.5 border shadow-sm " + (BLOCK_COLORS[block.type] || BLOCK_COLORS.OTHER)}
                          >
                            <div className="mt-0.5 text-[11px] font-bold leading-tight truncate">
                              {block.title}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] font-bold tracking-tight opacity-75">
                                {safeTimeFormat(block.startTime)} — {safeTimeFormat(block.endTime)}
                              </span>
                            </div>
                            <div className="mt-1 text-[8.5px] font-black uppercase tracking-wider opacity-60">
                              {block.type}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => onAddTimeBlock(day)}
                          className="flex w-full justify-center rounded-lg border border-dashed border-slate-300 py-1.5 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </MatrixRow>

              {/* PROJECTS / MILESTONES */}
              <MatrixRow label="Projects / Milestones" subtitle={`${data.projects.length} project${data.projects.length !== 1 ? "s" : ""}`} categoryKey="projects" isExpanded={expandedState.projects} onToggle={() => handleToggle("projects")} itemCount={data.milestones.length}>
                {days.map((day) => {
                  const dayMilestones = data.milestones.filter(
                    (m) => isSameDay(parseISO(m.date), day)
                  );
                  return (
                    <div key={dateKey(day)} className="border-l border-slate-200 p-2 min-h-[56px] space-y-1.5">
                      {dayMilestones.map((m) => (
                        <div key={m.id} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-[10px] font-bold text-emerald-800 shadow-sm flex items-center justify-between">
                          <span className="truncate">{m.title}</span>
                        </div>
                      ))}
                      {onAddProject && (
                        <button
                          onClick={() => onAddProject(day)}
                          className="flex w-full justify-center rounded-lg border border-dashed border-slate-300 py-1 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors mt-1"
                          title="Assign Project"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </MatrixRow>
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-[11px] font-semibold text-slate-500 flex-shrink-0">
          <div className="flex gap-4 flex-wrap">
            {LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={"w-2.5 h-2.5 rounded-full shadow-sm " + item.color} />
                {item.label}
              </span>
            ))}
          </div>
          <div className="text-slate-400 hover:text-blue-600 cursor-pointer flex items-center gap-1 transition-colors">
            0% scheduled <span className="text-[13px] leading-none ml-1">→</span>
          </div>
        </div>
      </section>
    </>
  );
}

function MatrixRow({
  label,
  subtitle,
  categoryKey,
  isExpanded,
  onToggle,
  itemCount,
  children,
}: {
  label: string;
  subtitle: string;
  categoryKey: MatrixCategory;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_repeat(7,minmax(130px,1fr))] border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="p-4 flex flex-col justify-center text-left hover:bg-slate-100/60 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`planner-row-${categoryKey}`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
          <span className="inline-flex items-center gap-1.5">
            <ChevronDown size={13} className={isExpanded ? "rotate-0 transition-transform" : "-rotate-90 transition-transform"} />
            {label}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
          {subtitle} · {itemCount}
        </div>
      </button>
      {isExpanded ? (
        children
      ) : (
        <div id={`planner-row-${categoryKey}`} className="col-span-7 min-h-[56px] border-l border-slate-200 bg-slate-50/40" />
      )}
    </div>
  );
}
