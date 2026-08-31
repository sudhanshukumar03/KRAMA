# -*- coding: utf-8 -*-
import os

code = '''// =============================================================================
// PLANNER MATRIX - KRAMA OS
// =============================================================================
// The core 7-day grid with: Routines, Tasks, Schedule, Projects

import { format, isSameDay, parseISO } from "date-fns";
import { Plus, CheckCircle2, Circle, ChevronDown, MoreVertical, CircleDot } from "lucide-react";
import { useState } from "react";
import type { PlannerData } from "../../types/planner";

const BLOCK_COLORS: Record<string, string> = {
  MEETING:  "bg-purple-50 border-purple-200 text-purple-800",
  PERSONAL: "bg-orange-50 border-orange-200 text-orange-800",
  STUDY:    "bg-emerald-50 border-emerald-200 text-emerald-800",
  WORK:     "bg-blue-50 border-blue-200 text-blue-800",
  HEALTH:   "bg-rose-50 border-rose-200 text-rose-800",
  ADMIN:    "bg-gray-50 border-gray-200 text-gray-800",
  OTHER:    "bg-slate-50 border-slate-200 text-slate-800",
};

const BLOCK_ACCENTS: Record<string, string> = {
  MEETING:  "border-l-purple-500",
  PERSONAL: "border-l-orange-500",
  STUDY:    "border-l-emerald-500",
  WORK:     "border-l-blue-500",
  HEALTH:   "border-l-rose-500",
  ADMIN:    "border-l-gray-500",
  OTHER:    "border-l-slate-500",
};

const ROUTINE_COLORS = ["text-orange-500", "text-emerald-500", "text-blue-500", "text-purple-500", "text-rose-500", "text-slate-500"];

type MatrixCategory = "holidays" | "routines" | "tasks" | "timeBlocks" | "projects";

const DEFAULT_EXPANDED: Record<MatrixCategory, boolean> = {
  holidays: true,
  routines: true,
  tasks: true,
  timeBlocks: true,
  projects: true,
};

const MATRIX_COLLAPSE_STORAGE_KEY = "krama.planner.matrix.expanded.v3";

function formatMinutes(minutes?: number) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return \\h \m\;
  if (h > 0) return \\h\;
  return \\m\;
}

function safeTimeFormat(dateString: string) {
  try {
    return format(parseISO(dateString), "HH:mm");
  } catch (e) {
    return "";
  }
}

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
  onClickTimeBlock?: (block: any) => void;
}

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
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
  onClickTask,
  onClickTimeBlock
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

  const holidayBlocks = data.timeBlocks.filter(b => b.isExternal);
  const normalBlocks = data.timeBlocks.filter(b => !b.isExternal);

  return (
    <>
      <section className="overflow-hidden bg-white flex flex-col w-full h-full border-none">
        <div className="w-full flex flex-col flex-1 min-h-0">

          {/* DAY HEADERS */}
          <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] border-b border-border flex-shrink-0">
            <div className="p-3 flex flex-col justify-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border">
              Categories
            </div>
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={dateKey(day)} className={"flex flex-col items-center justify-center p-2 border-r border-border last:border-r-0 " + (isToday ? "bg-blue-50/30" : "")}>
                  <div className={"text-[11px] font-bold uppercase " + (isToday ? "text-blue-600" : "text-muted-foreground")}>
                    {format(day, "EEE")}
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <div className={"text-[13px] font-black " + (isToday ? "text-blue-700" : "text-foreground")}>
                      {format(day, "MMM d")}
                    </div>
                    {isToday && (
                      <span className="inline-flex rounded-full bg-blue-500 px-2 py-0.5 text-[9px] font-bold text-white leading-none">
                        TODAY
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col hide-scrollbar">
            
            {/* ALL DAY / HOLIDAYS */}
            <MatrixRow 
              label="All Day / Holidays" 
              subtitle="Holidays & Events" 
              isExpanded={expandedState.holidays} 
              onToggle={() => handleToggle("holidays")} 
              flexClass="flex-shrink-0"
            >
              <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] w-full min-h-[40px]">
                <div className="border-r border-border flex flex-col">
                  <CategoryHeader label="All Day / Holidays" subtitle="Holidays & Events" onToggle={() => handleToggle("holidays")} />
                </div>
                {days.map((day) => {
                  const dayHols = holidayBlocks.filter(b => isSameDay(parseISO(b.date), day));
                  return (
                    <div key={dateKey(day)} className="border-r border-border last:border-r-0 p-1.5 flex flex-col gap-1 items-center justify-center">
                      {dayHols.map(h => (
                        <div key={h.id} className="text-[10px] font-bold text-red-500 text-center leading-tight">
                          • {h.title}
                          {h.type !== 'NATIONAL' && <div className="text-[9px] text-orange-500 font-medium">({h.type.toLowerCase()})</div>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </MatrixRow>

            {/* ROUTINES (Sub-rows) */}
            <MatrixRow 
              label="Routines" 
              subtitle={\\ routines\} 
              isExpanded={expandedState.routines} 
              onToggle={() => handleToggle("routines")}
              flexClass="flex-shrink-0"
            >
              <div className="flex flex-col w-full">
                <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] w-full min-h-[40px]">
                  <div className="border-r border-border flex flex-col">
                    <CategoryHeader label="Routines" subtitle={\\ routines\} onToggle={() => handleToggle("routines")} />
                  </div>
                  {days.map(day => <div key={dateKey(day)} className="border-r border-border last:border-r-0" />)}
                </div>
                {data.routines.map((routine, idx) => (
                  <div key={routine.id} className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] w-full border-t border-border/50">
                    <div className="border-r border-border p-2 flex items-center gap-2">
                      <CircleDot size={12} className={ROUTINE_COLORS[idx % ROUTINE_COLORS.length]} />
                      <span className="text-[11px] font-bold text-foreground truncate">{routine.name}</span>
                    </div>
                    {days.map((day) => {
                      const occ = occurrenceFor(routine.id, day);
                      if (!occ) return <div key={dateKey(day)} className="border-r border-border last:border-r-0" />;
                      return (
                        <div key={dateKey(day)} className="border-r border-border last:border-r-0 flex items-center justify-center p-1">
                          <button
                            onClick={() => onToggleRoutine(occ)}
                            className={"flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors " +
                              (occ.completed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 hover:border-emerald-400")}
                          >
                            {occ.completed && (
                              <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 7.5 5.5 10 11 4" />
                              </svg>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </MatrixRow>

            {/* TASKS */}
            <MatrixRow 
              label="Tasks" 
              subtitle="From Daily Schedule" 
              isExpanded={expandedState.tasks} 
              onToggle={() => handleToggle("tasks")}
              flexClass="flex-1 min-h-[100px]"
            >
              <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] w-full h-full">
                <div className="border-r border-border flex flex-col h-full">
                  <CategoryHeader label="Tasks" subtitle="From Daily Schedule" onToggle={() => handleToggle("tasks")} />
                  <div className="px-3 pb-2 ml-4 text-[10px] text-muted-foreground font-medium">{data.tasks.length} tasks</div>
                </div>
                {days.map((day) => {
                  const dayTasks = data.tasks.filter(
                    (t) => (t.scheduledDate && isSameDay(parseISO(t.scheduledDate), day)) ||
                           (!t.scheduledDate && t.dueDate && isSameDay(parseISO(t.dueDate), day))
                  );
                  return (
                    <div key={dateKey(day)} className="border-r border-border last:border-r-0 p-2 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar">
                      {dayTasks.map((task) => {
                        const isDone = task.status === "DONE";
                        return (
                          <div
                            key={task.id}
                            className="w-full flex items-start gap-2 group"
                          >
                            <button
                              className="mt-0.5 shrink-0"
                              onClick={(e) => {
                                if (onToggleTask) onToggleTask(task, e);
                              }}
                            >
                              <div className={"flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border transition-colors " +
                                (isDone ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 group-hover:border-emerald-400")}
                              >
                                {isDone && (
                                  <svg viewBox="0 0 14 14" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 7.5 5.5 10 11 4" />
                                  </svg>
                                )}
                              </div>
                            </button>
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => onClickTask && onClickTask(task)}
                            >
                              <span className={"text-[11px] font-semibold leading-tight block truncate " + (isDone ? "text-slate-400 line-through" : "text-slate-700 hover:text-blue-600")}>
                                {task.title}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </MatrixRow>

            {/* TIME BLOCKS */}
            <MatrixRow 
              label="Time Blocks" 
              subtitle="Planned time" 
              isExpanded={expandedState.timeBlocks} 
              onToggle={() => handleToggle("timeBlocks")}
              flexClass="flex-1 min-h-[100px]"
            >
              <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] w-full h-full">
                <div className="border-r border-border flex flex-col h-full">
                  <CategoryHeader label="Time Blocks" subtitle="Planned time" onToggle={() => handleToggle("timeBlocks")} />
                </div>
                {days.map((day) => {
                  const dayBlocks = normalBlocks.filter(b => isSameDay(parseISO(b.date), day));
                  return (
                    <div key={dateKey(day)} className="border-r border-border last:border-r-0 p-1.5 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar">
                      {dayBlocks.map((block) => (
                        <button
                          key={block.id}
                          onClick={() => onClickTimeBlock && onClickTimeBlock(block)}
                          className={\w-full text-left rounded-lg p-2 border-l-4 border-t border-r border-b shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 \ \\}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] font-black tracking-tight opacity-80">
                              {safeTimeFormat(block.startTime)} - {safeTimeFormat(block.endTime)}
                            </span>
                            <MoreVertical size={10} className="opacity-50" />
                          </div>
                          <div className="text-[11px] font-bold leading-tight line-clamp-2">
                            {block.title}
                          </div>
                          <div className="text-[8px] font-bold uppercase tracking-wider opacity-60">
                            {block.type}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </MatrixRow>

            {/* PROJECTS */}
            <MatrixRow 
              label="Projects / Milestones" 
              subtitle={\\ projects\} 
              isExpanded={expandedState.projects} 
              onToggle={() => handleToggle("projects")}
              flexClass="flex-shrink-0"
            >
              <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] w-full h-full min-h-[60px]">
                <div className="border-r border-border flex flex-col h-full">
                  <CategoryHeader label="Projects / Milestones" subtitle={\\ projects\} onToggle={() => handleToggle("projects")} />
                  <div className="px-3 pb-2 ml-4 text-[10px] text-muted-foreground font-medium">{data.milestones.length} milestones</div>
                </div>
                {days.map((day) => {
                  const dayMilestones = data.milestones.filter(m => isSameDay(parseISO(m.date), day));
                  return (
                    <div key={dateKey(day)} className="border-r border-border last:border-r-0 p-1.5 flex flex-col gap-1.5">
                      {dayMilestones.map((m) => (
                        <div key={m.id} className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-[9px] font-bold text-emerald-700 shadow-sm flex items-center justify-center gap-1 truncate">
                          <div className="w-1.5 h-1.5 rounded-sm bg-emerald-400 shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </MatrixRow>

          </div>
          
          {/* LEGEND & ADD BUTTON */}
          <div className="flex-shrink-0 border-t border-border bg-slate-50/50 p-2 flex flex-col items-center justify-center gap-2">
            <button 
              onClick={() => onAddTimeBlock(new Date())}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={12} strokeWidth={3} /> Add New Item
            </button>
            <div className="flex items-center justify-center gap-4 flex-wrap text-[9px] font-bold uppercase tracking-wider text-slate-500 pb-1">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Focus</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Sync / Meeting</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Personal</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Project</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Admin</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Other</div>
              <div className="w-px h-3 bg-slate-300 mx-1" />
              <div className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Completed</div>
              <div className="flex items-center gap-1"><Circle size={10} className="text-slate-300" /> Planned</div>
              <div className="w-px h-3 bg-slate-300 mx-1" />
              <div className="flex items-center gap-1 text-red-500 font-black"><span className="text-red-500">•</span> Holiday</div>
            </div>
          </div>
        </div>
      </section>
      <style dangerouslySetInnerHTML={{ __html: \
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      \}} />
    </>
  );
}

function CategoryHeader({ label, subtitle, onToggle }: { label: string; subtitle: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full p-3 flex flex-col text-left hover:bg-muted/10 transition-colors"
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
        <ChevronDown size={13} className="text-muted-foreground" />
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground font-medium mt-0.5 ml-4">
        {subtitle}
      </div>
    </button>
  );
}

function MatrixRow({
  label,
  subtitle,
  isExpanded,
  onToggle,
  flexClass,
  children,
}: {
  label: string;
  subtitle: string;
  isExpanded: boolean;
  onToggle: () => void;
  flexClass: string;
  children: React.ReactNode;
}) {
  if (!isExpanded) {
    return (
      <div className="border-b border-border w-full flex-shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-3 flex items-center text-left hover:bg-muted/10 transition-colors"
        >
          <div className="w-[148px] flex items-center text-[11px] font-bold uppercase tracking-wider text-foreground gap-1.5 shrink-0">
            <ChevronDown size={13} className="-rotate-90 text-muted-foreground" />
            {label}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">
            {subtitle}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={\lex flex-col border-b border-border w-full \\}>
      <div className="flex-1 min-h-0 w-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
'''

with open('apps/web/src/components/planner/PlannerMatrix.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

