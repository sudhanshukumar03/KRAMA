// =============================================================================
// PLANNER MATRIX - KRAMA OS
// =============================================================================
// The core 7-day grid with: Routines, Tasks, Schedule, Projects

import { format, isSameDay, parseISO } from "date-fns";
import { Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, MoreVertical, CircleDot, Target, Clock, Layers } from "lucide-react";
import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { PlannerData } from "../../types/planner";

const BLOCK_COLORS: Record<string, string> = {
  MEETING:  "bg-purple-50 border-purple-200 text-purple-800",
  PERSONAL: "bg-orange-50 border-orange-200 text-orange-800",
  STUDY:    "bg-emerald-50 border-emerald-200 text-emerald-800",
  WORK:     "bg-blue-50 border-blue-200 text-blue-800",
  HEALTH:   "bg-rose-50 border-rose-200 text-rose-800",
  ADMIN:    "bg-gray-50 border-gray-200 text-gray-800",
  OTHER:    "bg-slate-50 dark:bg-[#1E293B] border-slate-200 dark:border-[#334155] text-slate-800 dark:text-slate-100",
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

const ROUTINE_COLORS = ["text-orange-500", "text-emerald-500", "text-blue-500", "text-purple-500", "text-rose-500", "text-slate-500 dark:text-slate-400"];

type MatrixCategory = "routines" | "tasks" | "timeBlocks" | "projects";

const DEFAULT_EXPANDED: Record<MatrixCategory, boolean> = {
  routines: true,
  tasks: true,
  timeBlocks: true,
  projects: true,
};

const MATRIX_COLLAPSE_STORAGE_KEY = "krama.planner.matrix.expanded.v5";

function formatMinutes(minutes?: number) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
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
  onAddTimeBlock: (day?: Date) => void;
  onAddTask?: (day?: Date) => void;
  onAddRoutine?: (day?: Date) => void;
  onAddProject?: (day?: Date) => void;
  onToggleTask?: (task: any, e: React.MouseEvent) => void;
  onClickTask?: (task: any) => void;
  onClickTimeBlock?: (block: any) => void;
}



function MatrixTaskComponent({ task, onClickTask, onToggleTask }: { task: any, onClickTask?: (task: any) => void, onToggleTask?: (task: any, e: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'Task', task }
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const isDone = task.status === 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex items-start gap-2 cursor-grab active:cursor-grabbing p-1 -mx-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-[#1E293B] ${isDragging ? 'opacity-50 shadow-md ring-2 ring-blue-500 z-50 bg-white dark:bg-slate-800' : ''}`}
    >
      <button
        type="button"
        className="mt-0.5 shrink-0 transition-transform active:scale-90"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleTask) onToggleTask(task, e);
        }}
      >
        {isDone ? (
          <CheckCircle2 size={13} className="text-emerald-500" />
        ) : (
          <Circle size={13} className="text-slate-300 dark:text-slate-600 group-hover:border-blue-500 transition-colors" />
        )}
      </button>
      <div 
        className="flex-1 min-w-0"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (onClickTask) onClickTask(task);
        }}
      >
        <span className={"text-[10px] font-semibold leading-tight block truncate " + (isDone ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400")}>
          {task.title}
        </span>
      </div>
    </div>
  );
}

function DroppableTaskCell({ day, tasks, dateKeyFn, onClickTask, onToggleTask }: { day: Date, tasks: any[], dateKeyFn: (d: Date) => string, onClickTask?: (task: any) => void, onToggleTask?: (task: any, e: any) => void }) {
  const dKey = dateKeyFn(day);
  const { isOver, setNodeRef } = useDroppable({
    id: `task-drop-${dKey}`,
    data: { type: 'TaskColumn', date: dKey }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`border-r border-slate-200 dark:border-slate-700 last:border-r-0 p-2 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar h-full min-h-[36px] transition-colors ${isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
    >
      {tasks.map((task: any) => (
        <MatrixTaskComponent key={task.id} task={task} onClickTask={onClickTask} onToggleTask={onToggleTask} />
      ))}
    </div>
  );
}

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}


function DroppableTimeBlock({ block, tasks, onClickTimeBlock }: { block: any, tasks: any[], onClickTimeBlock?: (block: any) => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeblock-${block.id}`,
    data: { type: 'TimeBlock', block }
  });
  
  const linkedTask = tasks.find((t: any) => t.id === block.taskId);


  return (
    <button
      ref={setNodeRef}
      key={block.id}
      onClick={() => onClickTimeBlock && onClickTimeBlock(block)}
      className={`w-full text-left rounded-lg p-2 border-l-4 border-t border-r border-b shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 ${BLOCK_COLORS[block.type] || BLOCK_COLORS.OTHER} ${BLOCK_ACCENTS[block.type] || BLOCK_ACCENTS.OTHER} ${isOver ? 'ring-2 ring-blue-500 scale-[1.02]' : ''}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-[9px] font-black tracking-tight opacity-80">
          {safeTimeFormat(block.startTime)} - {safeTimeFormat(block.endTime)}
        </span>
        <MoreVertical size={10} className="opacity-50" />
      </div>
      <div className="text-[10px] font-bold leading-tight line-clamp-2">
        {block.title}
      </div>
      <div className="text-[8px] font-bold uppercase tracking-wider opacity-60">
        {block.type}
      </div>
      {block.taskId && (
        <div className="mt-1 bg-white/60 dark:bg-slate-900/40 rounded px-1.5 py-0.5 text-[8.5px] font-medium truncate flex items-center gap-1">
          <CheckCircle2 size={8} className="text-blue-500" />
          {linkedTask ? linkedTask.title : "Linked Task"}
        </div>
      )}
    </button>
  );
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
  onClickTimeBlock,
  onAddMilestone,
  onClickMilestone,
}: Props & { onAddMilestone?: () => void, onClickMilestone?: (m: any) => void }) {
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

  const normalBlocks = data.timeBlocks.filter(b => !b.isExternal);

  return (
    <>
      <section className="overflow-hidden bg-white dark:bg-[#0F172A] flex flex-col w-full flex-1 min-h-0 border-none">
        <div className="w-full flex flex-col flex-1 min-h-0">

          {/* DAY HEADERS */}
          <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-[#0F172A]">
            <div className="p-2 flex flex-col justify-start pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <ChevronUp size={13} className="text-slate-500 dark:text-slate-400" />
                CATEGORIES
              </div>
            </div>
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={dateKey(day)} className={"flex flex-col items-center justify-center p-1.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0 " + (isToday ? "bg-transparent" : "")}>
                  <div className={"text-[10px] font-bold uppercase " + (isToday ? "text-blue-600" : "text-slate-500 dark:text-slate-400")}>
                    {format(day, "EEE")}
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <div className={"text-[12px] font-black " + (isToday ? "text-blue-700" : "text-slate-800 dark:text-slate-100")}>
                      {format(day, "MMM d")}
                    </div>
                    {isToday && (
                      <span className="inline-flex rounded-full bg-blue-500 px-2 py-0.5 text-[8px] font-bold text-white leading-none">
                        TODAY
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col">
            
            {/* ROUTINES (Sub-rows) */}
            <MatrixRow 
              label="Routines" 
              subtitle={`${data.routines.length} routines`} 
              icon={<Target size={13} className="text-purple-500" />}
              isExpanded={expandedState.routines} 
              onToggle={() => handleToggle("routines")}
              flexClass="flex-shrink-0"
            >
              <div className="flex flex-col w-full">
                <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] w-full min-h-[36px]">
                  <div className="border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <CategoryHeader icon={<Target size={13} className="text-purple-500" />} label="Routines" subtitle={`${data.routines.length} routines`} onToggle={() => handleToggle("routines")} onAdd={onAddRoutine} />
                  </div>
                  {days.map(day => <div key={dateKey(day)} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 h-full min-h-[36px]" />)}
                </div>
                {data.routines.map((routine, idx) => (
                  <div key={routine.id} className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] w-full border-t border-slate-100 dark:border-slate-800">
                    <div className="border-r border-slate-200 dark:border-slate-700 p-2 flex items-center gap-2">
                      <CircleDot size={12} className={ROUTINE_COLORS[idx % ROUTINE_COLORS.length]} />
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{routine.name}</span>
                    </div>
                    {days.map((day) => {
                      const occ = occurrenceFor(routine.id, day);
                      if (!occ) return <div key={dateKey(day)} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 h-full min-h-[36px]" />;
                      return (
                        <div key={dateKey(day)} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 flex items-center justify-center p-1">
                          <button
                            onClick={() => onToggleRoutine(occ)}
                            className={"flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors " +
                              (occ.completed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-[#0F172A] border-slate-300 dark:border-[#475569] hover:border-emerald-400")}
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
              icon={<CheckCircle2 size={13} className="text-purple-500" />}
              isExpanded={expandedState.tasks} 
              onToggle={() => handleToggle("tasks")}
              flexClass="flex-1 min-h-[36px]"
            >
              <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] w-full h-full">
                <div className="border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
                  <CategoryHeader icon={<CheckCircle2 size={13} className="text-purple-500" />} label="Tasks" subtitle="From Daily Schedule" onToggle={() => handleToggle("tasks")} onAdd={onAddTask} />
                  <div className="px-3 pb-2 ml-4 text-[9px] text-slate-500 dark:text-slate-400 font-medium">{data.tasks.length} tasks</div>
                </div>
                {days.map((day) => {
                  const dayTasks = data.tasks.filter(
                    (t) => (t.scheduledDate && isSameDay(parseISO(t.scheduledDate), day)) ||
                           (!t.scheduledDate && t.dueDate && isSameDay(parseISO(t.dueDate), day))
                  );
                  return (
                    <DroppableTaskCell key={dateKey(day)} day={day} tasks={dayTasks} dateKeyFn={dateKey} onClickTask={onClickTask} onToggleTask={onToggleTask} />
                  );
                })}
              </div>
            </MatrixRow>

            {/* TIME BLOCKS */}
            <MatrixRow 
              label="Time Blocks" 
              subtitle="Planned time" 
              icon={<Clock size={13} className="text-slate-500 dark:text-slate-400" />}
              isExpanded={expandedState.timeBlocks} 
              onToggle={() => handleToggle("timeBlocks")}
              flexClass="flex-1 min-h-[36px]"
            >
              <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] w-full h-full">
                <div className="border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
                  <CategoryHeader icon={<Clock size={13} className="text-slate-500 dark:text-slate-400" />} label="Time Blocks" subtitle="Planned time" onToggle={() => handleToggle("timeBlocks")} onAdd={onAddTimeBlock} />
                </div>
                {days.map((day) => {
                  const dayBlocks = normalBlocks.filter(b => isSameDay(parseISO(b.date), day));
                  return (
                    <div key={dateKey(day)} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 p-1.5 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar">
                      {dayBlocks.map((block) => (
                          <DroppableTimeBlock key={block.id} block={block} tasks={data.tasks || []} onClickTimeBlock={onClickTimeBlock} />
                        ))}
                    </div>
                  );
                })}
              </div>
            </MatrixRow>

            {/* PROJECTS */}
            <MatrixRow 
              label="Projects / Milestones" 
              subtitle={`${data.projects.length} projects`} 
              icon={<Layers size={13} className="text-slate-500 dark:text-slate-400" />}
              isExpanded={expandedState.projects} 
              onToggle={() => handleToggle("projects")}
              flexClass="flex-shrink-0"
            >
              <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] w-full h-full min-h-[40px]">
                <div className="border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
                  <CategoryHeader icon={<Layers size={13} className="text-slate-500 dark:text-slate-400" />} label="Projects / Milestones" subtitle={`${data.projects.length} projects`} onToggle={() => handleToggle("projects")} onAdd={onAddMilestone} />
                  <div className="px-3 pb-2 ml-4 text-[9px] text-slate-500 dark:text-slate-400 font-medium">{data.milestones.length} milestones</div>
                </div>
                {days.map((day) => {
                  const dayMilestones = data.milestones.filter(m => isSameDay(parseISO(m.date), day));
                  return (
                    <div key={dateKey(day)} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 p-1.5 flex flex-col gap-1.5">
                      {dayMilestones.map((m) => (
                        <button key={m.id} onClick={() => onClickMilestone && onClickMilestone(m)} className="rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 text-[9px] font-bold text-emerald-700 shadow-sm flex items-center justify-center gap-1 truncate w-full transition-colors cursor-pointer text-left">
                          <div className="w-1.5 h-1.5 rounded-sm bg-emerald-400 shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </MatrixRow>

          </div>
          
          {/* LEGEND & ADD BUTTON */}
          <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] pt-4 pb-12 flex flex-col items-center justify-center gap-3">
            <button 
              onClick={() => onAddTimeBlock(new Date())}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={12} strokeWidth={3} /> Add New Item
            </button>
            <div className="flex items-center justify-center gap-6 flex-wrap text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Focus</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Sync / Meeting</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Personal</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Project</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Admin</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Other</div>
              <div className="w-px h-3 bg-slate-300 mx-1" />
              <div className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Completed</div>
              <div className="flex items-center gap-1"><Circle size={10} className="text-slate-300" /> Planned</div>
            </div>
          </div>
        </div>
      </section>
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </>
  );
}

function CategoryHeader({ label, subtitle, icon, onToggle, onAdd }: { label: string; subtitle: string; icon?: React.ReactNode; onToggle: () => void; onAdd?: () => void }) {
  return (
    <div className="w-full p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors group">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-col text-left flex-1"
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          {icon || <ChevronDown size={13} className="text-slate-500 dark:text-slate-400" />}
          {label}
        </div>
        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 ml-5">
          {subtitle}
        </div>
      </button>
      {onAdd && (
        <button onClick={onAdd} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      )}
    </div>
  );
}

function MatrixRow({
  label,
  subtitle,
  icon,
  isExpanded,
  onToggle,
  flexClass,
  children,
}: {
  label: string;
  subtitle: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  flexClass: string;
  children: React.ReactNode;
}) {
  if (!isExpanded) {
    return (
      <div className="border-b border-slate-200 dark:border-slate-700 w-full flex-shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-2 flex items-center text-left hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors"
        >
          <div className="w-[128px] flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 gap-1.5 shrink-0">
            {icon || <ChevronDown size={13} className="-rotate-90 text-slate-500 dark:text-slate-400" />}
            {label}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
            {subtitle}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col border-b border-slate-200 dark:border-slate-700 w-full ${flexClass}`}>
      {children}
    </div>
  );
}
