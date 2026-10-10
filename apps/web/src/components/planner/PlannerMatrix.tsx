import { formatBlockTime as safeTimeFormat } from '../../lib/utils';
import { DroppableTaskCell, TimeBlockCell, MilestoneCell, BacklogTaskCard } from './PlannerCells';
// =============================================================================
// PLANNER MATRIX - KRAMA OS
// =============================================================================
// The core 7-day grid with: Routines, Tasks, Schedule, Projects

import { format, isSameDay } from "date-fns";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, CircleDot, Target, Clock, PinOff } from "lucide-react";
import { useState, useMemo } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { parseLocalDate, cn } from "../../lib/utils";
import { blockTypeStyle } from "../../lib/blockTypeStyles";
import type { PlannerData, PlannerTask, RoutineOccurrence, TimeBlock, Milestone, GoalDeadline } from "../../types/planner";


const ROUTINE_COLORS = ["text-cat-routines", "text-success-fg", "text-accent-fg", "text-cat-projects", "text-danger-fg", "text-secondary"];

type MatrixCategory = "routines" | "tasks" | "timeBlocks" | "milestones";

const DEFAULT_EXPANDED: Record<MatrixCategory, boolean> = {
  routines: true,
  tasks: true,
  timeBlocks: true,
  milestones: true,
};

const MATRIX_COLLAPSE_STORAGE_KEY = "krama.planner.matrix.expanded.v6";


// Time blocks are stored as UTC wall-clock, so format them with UTC accessors
// (via formatBlockTime) rather than local parseISO/format.

interface Props {
  data: PlannerData;
  days: Date[];
  occurrenceFor: (routineId: string, day: Date) => RoutineOccurrence | undefined;
  onToggleRoutine: (occurrence: RoutineOccurrence) => void;
  onAddTimeBlock: (day?: Date) => void;
  onAddTask?: (day?: Date) => void;
  onAddRoutine?: (day?: Date) => void;
  onToggleTask?: (task: PlannerTask, e: React.MouseEvent) => void;
  onClickTask?: (task: PlannerTask) => void;
  onClickTimeBlock?: (block: TimeBlock) => void;
  onDeleteTask?: (task: PlannerTask) => void;
  onDeleteTimeBlock?: (block: TimeBlock) => void;
  onDeleteRoutine?: (routine: PlannerData['routines'][number]) => void;
  onOpenDayView?: (day: Date) => void;
  onScheduleTask?: (taskId: string, targetDateStr: string) => void;
  onLinkTaskToBlock?: (blockId: string, taskId: string, blockDate?: string) => void;
  onMoveTimeBlock?: (blockId: string, targetDateStr: string) => void;
  onAddMilestone?: (day?: Date) => void;
  onClickMilestone?: (milestone: Milestone) => void;
  onToggleMilestone?: (milestone: Milestone) => void;
  onClickGoalDeadline?: (goal: GoalDeadline) => void;
}



export function PlannerMatrix({
  data,
  days,
  occurrenceFor,
  onToggleRoutine,
  onAddTimeBlock,
  onAddTask,
  onAddRoutine,
  onToggleTask,
  onClickTask,
  onClickTimeBlock,
  onDeleteTask,
  onDeleteTimeBlock,
  onDeleteRoutine,
  onOpenDayView,
  onScheduleTask,
  onLinkTaskToBlock,
  onMoveTimeBlock,
  onAddMilestone,
  onClickMilestone,
  onToggleMilestone,
  onClickGoalDeadline,
}: Props) {
  const today = new Date();
  const [showBacklog, setShowBacklog] = useState(true);
  const [activeTask, setActiveTask] = useState<PlannerTask | null>(null);
  const [activeBlock, setActiveBlock] = useState<TimeBlock | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (activeData?.type === 'Task') {
      setActiveTask(activeData.task);
    } else if (activeData?.type === 'Block') {
      setActiveBlock(activeData.block);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveBlock(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'Task') {
      const task = activeData.task;
      if (overData?.type === 'TaskColumn' && onScheduleTask) {
        onScheduleTask(task.id, overData.date);
      } else if (overData?.type === 'TimeBlock' && onLinkTaskToBlock) {
        onLinkTaskToBlock(overData.block.id, task.id, overData.block?.date || overData.date);
      }
    } else if (activeData?.type === 'Block' && onMoveTimeBlock) {
      const block = activeData.block;
      // Cross-day move (C5): dropping on a day column, or on another block,
      // both resolve to a target day-key. No-op if it's the same day.
      let targetDate: string | undefined;
      if (overData?.type === 'BlockColumn') {
        targetDate = overData.date;
      } else if (overData?.type === 'TimeBlock' && overData.block?.date) {
        targetDate = format((parseLocalDate(overData.block.date) ?? new Date(NaN)), 'yyyy-MM-dd');
      }
      if (!targetDate || !block.date) return;
      const sourceDate = format((parseLocalDate(block.date) ?? new Date(NaN)), 'yyyy-MM-dd');
      if (targetDate !== sourceDate) {
        onMoveTimeBlock(block.id, targetDate);
      }
    }
  };

  const [expandedState, setExpandedState] = useState<Record<MatrixCategory, boolean>>(() => {
    try {
      const stored = localStorage.getItem(MATRIX_COLLAPSE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === "object" && parsed !== null) {
          return { ...DEFAULT_EXPANDED, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_EXPANDED;
  });

  const handleToggle = (key: MatrixCategory) => {
    setExpandedState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(MATRIX_COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const allCollapsed = !expandedState.routines && !expandedState.tasks && !expandedState.timeBlocks && !expandedState.milestones;
  const handleToggleAll = () => {
    const nextVal = allCollapsed;
    const nextState = {
      routines: nextVal,
      tasks: nextVal,
      timeBlocks: nextVal,
      milestones: nextVal,
    };
    setExpandedState(nextState);
    try {
      localStorage.setItem(MATRIX_COLLAPSE_STORAGE_KEY, JSON.stringify(nextState));
    } catch {}
  };

  const normalBlocks = data.timeBlocks.filter(b => !b.isExternal);

  const unscheduledTasks = useMemo(() => {
    return (data.tasks || []).filter(
      (t: PlannerTask) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELED'
    );
  }, [data.tasks]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <section className="krama-card flex flex-col w-full flex-1 min-h-0 overflow-hidden">
        <div className="w-full flex flex-col flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
          <div className="min-w-[1020px] w-full flex flex-col flex-1">

          {/* DAY HEADERS */}
          <div className="grid grid-cols-[140px_repeat(7,minmax(125px,1fr))] border-b border-border flex-shrink-0 bg-surface sticky top-0 z-30">
            <button
              type="button"
              onClick={handleToggleAll}
              title={allCollapsed ? "Expand all categories" : "Collapse all categories"}
              className="p-2 flex flex-col justify-start pt-2 text-badge font-bold uppercase tracking-wider text-primary border-r border-border sticky left-0 z-40 bg-surface hover:bg-surface-hover transition-colors cursor-pointer text-left select-none group"
            >
              <div className="flex items-center gap-1.5">
                {allCollapsed ? (
                  <ChevronDown size={13} className="text-secondary group-hover:text-primary transition-transform" />
                ) : (
                  <ChevronUp size={13} className="text-secondary group-hover:text-primary transition-transform" />
                )}
                <span>CATEGORIES</span>
              </div>
            </button>
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={dateKey(day)}
                  type="button"
                  onClick={() => onOpenDayView && onOpenDayView(day)}
                  aria-label={`Open day view for ${format(day, "EEEE, MMM d")}`}
                  title="Open day view"
                  className={"flex flex-col items-center justify-center p-1.5 border-r border-border last:border-r-0 cursor-pointer select-none transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset " + (isToday ? "bg-transparent" : "")}
                >
                  <div className={"text-badge font-bold uppercase " + (isToday ? "text-accent" : "text-secondary")}>
                    {format(day, "EEE")}
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <div className={"text-[12px] font-black " + (isToday ? "text-accent" : "text-primary")}>
                      {format(day, "MMM d")}
                    </div>
                    {isToday && (
                      <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-badge font-bold text-white leading-none">
                        TODAY
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col">
            
            {/* ROUTINES (Sub-rows) */}
            <MatrixRow
              label="Routines"
              subtitle={`${data.routines.length} routines`}
              icon={<CircleDot size={13} className="text-cat-routines" />}
              isExpanded={expandedState.routines}
              onToggle={() => handleToggle("routines")}
              flexClass="flex-shrink-0"
            >
              <div className="flex flex-col w-full">
                <div className="grid grid-cols-[140px_repeat(7,minmax(125px,1fr))] w-full min-h-[36px]">
                  <div className="border-r border-border flex flex-col sticky left-0 z-20 bg-surface">
                    <CategoryHeader icon={<CircleDot size={13} className="text-cat-routines" />} label="Routines" subtitle={`${data.routines.length} routines`} onToggle={() => handleToggle("routines")} onAdd={onAddRoutine} />
                  </div>
                  {days.map(day => <div key={dateKey(day)} className="border-r border-border last:border-r-0 h-full min-h-[36px]" />)}
                </div>
                {data.routines.map((routine, idx) => (
                  <div key={routine.id} className="grid grid-cols-[140px_repeat(7,minmax(125px,1fr))] w-full border-t border-border group/routine">
                    <div className="border-r border-border p-2 flex items-center gap-2 relative sticky left-0 z-20 bg-surface">
                      <CircleDot size={12} className={ROUTINE_COLORS[idx % ROUTINE_COLORS.length]} />
                      <span className="text-badge font-bold text-primary truncate pr-4">{routine.name}</span>
                      {onDeleteRoutine && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteRoutine(routine);
                          }}
                          className="absolute right-1 opacity-0 group-hover/routine:opacity-100 p-0.5 hover:bg-surface-hover text-muted hover:text-primary rounded transition-opacity shrink-0"
                          title="Unpin routine from planner"
                        >
                          <PinOff size={11} />
                        </button>
                      )}
                    </div>
                    {days.map((day) => {
                      const occ = occurrenceFor(routine.id, day);
                      if (!occ) return <div key={dateKey(day)} className="border-r border-border last:border-r-0 h-full min-h-[36px]" />;
                      return (
                        <div key={dateKey(day)} className="border-r border-border last:border-r-0 flex items-center justify-center p-1">
                          <button
                            onClick={() => onToggleRoutine(occ)}
                            aria-label={occ.completed ? `Mark ${routine.name} incomplete on ${format(day, "MMM d")}` : `Mark ${routine.name} complete on ${format(day, "MMM d")}`}
                            className={"flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors " +
                              (occ.completed ? "bg-accent border-accent text-on-accent" : "bg-surface border-border hover:border-accent")}
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
              icon={<CheckCircle2 size={13} className="text-[var(--cat-routines)]" />}
              isExpanded={expandedState.tasks} 
              onToggle={() => handleToggle("tasks")}
              flexClass="h-auto"
            >
              <div className="flex flex-col w-full">
                <div className="grid grid-cols-[140px_repeat(7,minmax(125px,1fr))] w-full h-full">
                  <div className="border-r border-border flex flex-col h-full sticky left-0 z-20 bg-surface">
                    <CategoryHeader icon={<CheckCircle2 size={13} className="text-[var(--cat-routines)]" />} label="Tasks" subtitle="From Daily Schedule" onToggle={() => handleToggle("tasks")} onAdd={onAddTask} />
                    <div className="px-3 pb-2 flex items-center justify-between">
                      <span className="text-badge text-muted font-medium">{data.tasks.length} tasks</span>
                      {unscheduledTasks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowBacklog(prev => !prev)}
                          className={cn(
                            "text-badge font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1",
                            showBacklog 
                              ? "bg-accent text-on-accent" 
                              : "bg-warning-bg text-warning-fg hover:bg-warning-subtle"
                          )}
                          title="Toggle Unscheduled Backlog drawer"
                        >
                          <span>Backlog</span>
                          <span className="px-1 rounded-full bg-black/10 text-badge font-mono">{unscheduledTasks.length}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {days.map((day) => {
                    const dayTasks = data.tasks.filter(
                      (t) => (t.scheduledDate && isSameDay((parseLocalDate(t.scheduledDate) ?? new Date(NaN)), day)) ||
                             (!t.scheduledDate && t.dueDate && isSameDay((parseLocalDate(t.dueDate) ?? new Date(NaN)), day))
                    );
                    return (
                      <DroppableTaskCell key={dateKey(day)} day={day} tasks={dayTasks} dateKeyFn={dateKey} onClickTask={onClickTask} onToggleTask={onToggleTask} onAddTask={onAddTask} onDeleteTask={onDeleteTask} />
                    );
                  })}
                </div>

                {/* Collapsible Backlog Tray */}
                {showBacklog && unscheduledTasks.length > 0 && (
                  <div className="border-t border-border bg-surface-hover/30 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-warning-fg" />
                        <span className="text-xs font-bold text-primary">Unscheduled Backlog ({unscheduledTasks.length})</span>
                        <span className="text-badge text-muted hidden sm:inline">
                          Place a directive directly into this week's plan:
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowBacklog(false)}
                        className="text-badge text-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {unscheduledTasks.map((task: PlannerTask) => (
                        <BacklogTaskCard
                          key={task.id}
                          task={task}
                          days={days}
                          onClickTask={onClickTask}
                          onToggleTask={onToggleTask}
                          onScheduleTask={onScheduleTask}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </MatrixRow>

            {/* TIME BLOCKS */}
            <MatrixRow 
              label="Time Blocks"
              subtitle="Planned time"
              icon={<Clock size={13} className="text-muted" />}
              isExpanded={expandedState.timeBlocks}
              onToggle={() => handleToggle("timeBlocks")}
              flexClass="flex-1 min-h-[140px]"
            >
              <div className="grid grid-cols-[140px_repeat(7,minmax(125px,1fr))] w-full h-full">
                <div className="border-r border-border flex flex-col h-full sticky left-0 z-20 bg-surface">
                  <CategoryHeader icon={<Clock size={13} className="text-muted" />} label="Time Blocks" subtitle="Planned time" onToggle={() => handleToggle("timeBlocks")} onAdd={onAddTimeBlock} />
                </div>
                {days.map((day) => {
                  const dayBlocks = normalBlocks.filter(b => isSameDay((parseLocalDate(b.date) ?? new Date(NaN)), day));
                  return (
                    <TimeBlockCell key={dateKey(day)} day={day} blocks={dayBlocks} tasks={data.tasks || []} onClickTimeBlock={onClickTimeBlock} onAddTimeBlock={onAddTimeBlock} onDeleteTimeBlock={onDeleteTimeBlock} />
                  );
                })}
              </div>
            </MatrixRow>

            {/* MILESTONES */}
            <MatrixRow
              label="Milestones"
              subtitle="Project checkpoints"
              icon={<Target size={13} className="text-cat-projects" />}
              isExpanded={expandedState.milestones}
              onToggle={() => handleToggle("milestones")}
              flexClass="h-auto"
            >
              <div className="grid grid-cols-[140px_repeat(7,minmax(125px,1fr))] w-full h-full">
                <div className="border-r border-border flex flex-col h-full sticky left-0 z-20 bg-surface">
                  <CategoryHeader icon={<Target size={13} className="text-cat-projects" />} label="Milestones" subtitle={`${(data.milestones || []).length} milestones${(data.goalDeadlines || []).length > 0 ? ` • ${(data.goalDeadlines || []).length} goals` : ''}`} onToggle={() => handleToggle("milestones")} onAdd={onAddMilestone ? () => onAddMilestone() : undefined} />
                </div>
                {days.map((day) => {
                  const dayMilestones = (data.milestones || []).filter(m => m.date && isSameDay((parseLocalDate(m.date) ?? new Date(NaN)), day));
                  const dayGoalDeadlines = (data.goalDeadlines || []).filter(g => g.targetDate && isSameDay((parseLocalDate(g.targetDate) ?? new Date(NaN)), day));
                  return (
                    <MilestoneCell key={dateKey(day)} day={day} milestones={dayMilestones} goalDeadlines={dayGoalDeadlines} onClickMilestone={onClickMilestone} onToggleMilestone={onToggleMilestone} onAddMilestone={onAddMilestone} onClickGoalDeadline={onClickGoalDeadline} />
                  );
                })}
              </div>
            </MatrixRow>

          </div>
          </div>
        </div>
      </section>
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
        {activeTask ? (
          <div className="p-2.5 rounded-xl bg-surface border border-accent/40 shadow-2xl text-xs font-semibold text-primary max-w-[220px] truncate opacity-95 ring-2 ring-accent/30 flex items-center gap-2 pointer-events-none">
            <Circle size={12} className="text-accent shrink-0" />
            <span className="truncate">{activeTask.title}</span>
          </div>
        ) : activeBlock ? (
          (() => {
            const cfg = blockTypeStyle(activeBlock.type);
            const Icon = cfg.Icon;
            return (
              <div className={cn("p-2 rounded-md border-l-2 shadow-2xl text-xs font-semibold max-w-[200px] opacity-95 ring-2 ring-accent/30 flex flex-col gap-0.5 pointer-events-none", cfg.border, cfg.bg)}>
                <div className="flex items-center gap-1">
                  <Icon size={10} className={cfg.color} />
                  <span className="text-badge font-bold text-secondary">
                    {safeTimeFormat(activeBlock.startTime)} - {safeTimeFormat(activeBlock.endTime)}
                  </span>
                </div>
                <span className="text-badge font-semibold text-primary truncate">{activeBlock.title}</span>
              </div>
            );
          })()
        ) : null}
      </DragOverlay>
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </DndContext>
  );
}

function CategoryHeader({ label, subtitle, icon, onToggle, onAdd }: { label: string; subtitle: string; icon?: React.ReactNode; onToggle: () => void; onAdd?: () => void }) {
  return (
    <div className="w-full p-2 flex items-center justify-between hover:bg-surface-hover transition-colors group">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-col text-left flex-1"
      >
        <div className="text-badge font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          {icon || <ChevronDown size={13} className="text-secondary" />}
          {label}
        </div>
        <div className="text-badge text-secondary font-medium mt-0.5 ml-5">
          {subtitle}
        </div>
      </button>
        {onAdd && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdd();
            }} 
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-hover text-secondary"
          >
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
      <div className="border-b border-border w-full flex-shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-2 flex items-center text-left hover:bg-surface-hover transition-colors"
        >
          <div className="w-[128px] flex items-center text-badge font-bold uppercase tracking-wider text-primary gap-1.5 shrink-0">
            {icon || <ChevronDown size={13} className="-rotate-90 text-secondary" />}
            {label}
          </div>
          <div className="text-badge text-secondary font-medium">
            {subtitle}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col border-b border-border w-full ${flexClass}`}>
      {children}
    </div>
  );
}

function dateKey(date: Date) { return format(date, "yyyy-MM-dd"); }
