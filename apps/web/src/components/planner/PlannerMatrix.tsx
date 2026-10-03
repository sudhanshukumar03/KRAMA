// =============================================================================
// PLANNER MATRIX - KRAMA OS
// =============================================================================
// The core 7-day grid with: Routines, Tasks, Schedule, Projects

import { format, isSameDay, parseISO } from "date-fns";
import { Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, CircleDot, Target, Clock, Trash2, PinOff, Flag } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { cn, formatBlockTime } from "../../lib/utils";
import { blockTypeStyle } from "../../lib/blockTypeStyles";
import type { PlannerData } from "../../types/planner";


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
function safeTimeFormat(isoString: string) {
  return formatBlockTime(isoString);
}

interface Props {
  data: PlannerData;
  days: Date[];
  occurrenceFor: (routineId: string, day: Date) => any;
  onToggleRoutine: (occurrence: any) => void;
  onAddTimeBlock: (day?: Date) => void;
  onAddTask?: (day?: Date) => void;
  onAddRoutine?: (day?: Date) => void;
  onToggleTask?: (task: any, e: React.MouseEvent) => void;
  onClickTask?: (task: any) => void;
  onClickTimeBlock?: (block: any) => void;
  onDeleteTask?: (task: any) => void;
  onDeleteTimeBlock?: (block: any) => void;
  onDeleteRoutine?: (routine: any) => void;
  onOpenDayView?: (day: Date) => void;
  onScheduleTask?: (taskId: string, targetDateStr: string) => void;
  onLinkTaskToBlock?: (blockId: string, taskId: string, blockDate?: string) => void;
  onMoveTimeBlock?: (blockId: string, targetDateStr: string) => void;
  onAddMilestone?: (day?: Date) => void;
  onClickMilestone?: (milestone: any) => void;
  onToggleMilestone?: (milestone: any) => void;
  onClickGoalDeadline?: (goal: any) => void;
}



const MatrixTaskComponent = memo(function MatrixTaskComponent({ task, onClickTask, onToggleTask, onDeleteTask }: { task: any, onClickTask?: (task: any) => void, onToggleTask?: (task: any, e: any) => void, onDeleteTask?: (task: any) => void }) {
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
      className={`group flex items-start gap-1.5 cursor-grab active:cursor-grabbing p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-surface-hover ${isDragging ? 'opacity-50 shadow-md ring-2 ring-accent z-50 bg-surface' : ''}`}
    >
      <button
        type="button"
        className="mt-[3px] shrink-0 transition-transform active:scale-[0.98]"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleTask) onToggleTask(task, e);
        }}
      >
        {isDone ? (
          <CheckCircle2 size={12} className="text-success" />
        ) : (
          <Circle size={12} className="text-muted group-hover:text-accent/60 transition-colors" />
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
        <span className={"text-[10px] font-medium leading-snug block " + (isDone ? "text-muted line-through" : "text-primary group-hover:text-primary")}>
          {task.title}
        </span>
      </div>
      {onDeleteTask && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDeleteTask(task);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-error-tint text-error rounded transition-opacity shrink-0"
          title="Delete task"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
});

function DroppableTaskCell({ day, tasks, dateKeyFn, onClickTask, onToggleTask, onAddTask, onDeleteTask }: { day: Date, tasks: any[], dateKeyFn: (d: Date) => string, onClickTask?: (task: any) => void, onToggleTask?: (task: any, e: any) => void, onAddTask?: (d: Date) => void, onDeleteTask?: (task: any) => void }) {
  const dKey = dateKeyFn(day);
  const { isOver, setNodeRef } = useDroppable({
    id: `task-drop-${dKey}`,
    data: { type: 'TaskColumn', date: dKey }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`relative group border-r border-border last:border-r-0 p-2 pb-6 flex flex-col gap-1 min-h-[48px] transition-colors ${isOver ? 'bg-accent/10' : ''}`}
    >
      {tasks.map((task: any) => (
        <MatrixTaskComponent key={task.id} task={task} onClickTask={onClickTask} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} />
      ))}
      
      {onAddTask && (
        <button
          onClick={() => onAddTask(day)}
          aria-label="New task"
          className="absolute bottom-1 left-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-all text-[9px] font-bold"
        >
          <Plus size={10} strokeWidth={3} /> New Task
        </button>
      )}
    </div>
  );
}

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}


const DroppableTimeBlock = memo(function DroppableTimeBlock({ block, tasks, onClickTimeBlock, onDeleteTimeBlock }: { block: any, tasks: any[], onClickTimeBlock?: (block: any) => void, onDeleteTimeBlock?: (block: any) => void }) {
  // The block is BOTH a drop target (a task can be dragged onto it to link) and
  // a draggable (drag it onto another day column to move it — C5). The two
  // dnd-kit refs share one node via setRefs.
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `timeblock-${block.id}`,
    data: { type: 'TimeBlock', block }
  });
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `block-drag-${block.id}`,
    data: { type: 'Block', block }
  });
  const setRefs = (node: HTMLElement | null) => { setDropRef(node); setDragRef(node); };
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const cfg = blockTypeStyle(block.type);
  const Icon = cfg.Icon;
  const linkedTask = tasks.find((t: any) => t.id === block.taskId);

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onClickTimeBlock) onClickTimeBlock(block);
        }
      }}
      onClick={() => onClickTimeBlock && onClickTimeBlock(block)}
      className={cn(
        "w-full text-left rounded-md p-1.5 border-l-2 shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing flex flex-col gap-0.5 group/timeblock",
        cfg.border,
        cfg.bg,
        isDragging && "opacity-50 shadow-md ring-2 ring-accent z-50",
        isOver ? "ring-2 ring-accent ring-offset-1 scale-[1.02]" : "border border-border"
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">
          <Icon size={10} className={cfg.color} />
          <span className="text-[9px] font-bold tracking-tight text-secondary">
            {safeTimeFormat(block.startTime)} - {safeTimeFormat(block.endTime)}
          </span>
        </div>
        {onDeleteTimeBlock && !block.isExternal && (
          <button
            type="button"
            aria-label="Delete time block"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteTimeBlock(block);
            }}
            className="opacity-0 group-hover/timeblock:opacity-100 p-0.5 hover:bg-danger-bg text-danger-fg rounded transition-opacity shrink-0"
            title="Delete time block"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
      <div className="text-[10px] font-semibold leading-tight text-primary line-clamp-2">
        {block.title}
      </div>
      {block.taskId && (
        <div className="mt-1 bg-surface-hover rounded px-1.5 py-0.5 text-[8.5px] font-medium text-secondary truncate flex items-center gap-1 border border-border">
          <CheckCircle2 size={8} className="text-accent" />
          {linkedTask ? linkedTask.title : "Linked Task"}
        </div>
      )}
    </div>
  );
});

function TimeBlockCell({ day, blocks, tasks, onClickTimeBlock, onAddTimeBlock, onDeleteTimeBlock }: { day: Date, blocks: any[], tasks: any[], onClickTimeBlock?: (b: any) => void, onAddTimeBlock?: (d: Date) => void, onDeleteTimeBlock?: (b: any) => void }) {
  const dKey = dateKey(day);
  // Drop target for cross-day block moves (C5). A block dragged here PATCHes to
  // this day; the server preserves the block's wall-clock start/end (A1).
  const { isOver, setNodeRef } = useDroppable({
    id: `block-drop-${dKey}`,
    data: { type: 'BlockColumn', date: dKey }
  });
  return (
    <div ref={setNodeRef} className={`relative group border-r border-border last:border-r-0 p-1.5 pb-6 flex flex-col gap-1.5 min-h-[48px] h-full transition-colors ${isOver ? 'bg-accent/10' : ''}`}>
      {blocks.map((block) => (
        <DroppableTimeBlock key={block.id} block={block} tasks={tasks} onClickTimeBlock={onClickTimeBlock} onDeleteTimeBlock={onDeleteTimeBlock} />
      ))}

      {onAddTimeBlock && (
        <button
          onClick={() => onAddTimeBlock(day)}
          aria-label="Add time block"
          className="absolute bottom-1 left-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-all text-[9px] font-bold"
        >
          <Plus size={10} strokeWidth={3} /> Add Block
        </button>
      )}
    </div>
  );
}

// Per-day milestone chips (C10). Milestones are project-scoped markers keyed to a
// day; toggling flips completed, clicking opens the edit modal.
function MilestoneCell({ day, milestones, goalDeadlines = [], onClickMilestone, onToggleMilestone, onAddMilestone, onClickGoalDeadline }: { day: Date, milestones: any[], goalDeadlines?: any[], onClickMilestone?: (m: any) => void, onToggleMilestone?: (m: any) => void, onAddMilestone?: (d: Date) => void, onClickGoalDeadline?: (goal: any) => void }) {
  return (
    <div className="relative group border-r border-border last:border-r-0 p-1.5 pb-6 flex flex-col gap-1 min-h-[40px]">
      {milestones.map((m) => (
        <div
          key={m.id}
          className="group/ms flex items-center gap-1 rounded-md pl-1 pr-1.5 py-1 border-l-2 border-l-cat-projects bg-cat-projects-bg"
        >
          <button
            type="button"
            aria-label={m.completed ? 'Mark milestone incomplete' : 'Mark milestone complete'}
            onClick={(e) => { e.stopPropagation(); onToggleMilestone?.(m); }}
            className="shrink-0 transition-transform active:scale-[0.98]"
          >
            {m.completed
              ? <CheckCircle2 size={11} className="text-cat-projects" />
              : <Circle size={11} className="text-muted hover:text-cat-projects transition-colors" />}
          </button>
          <button
            type="button"
            onClick={() => onClickMilestone && onClickMilestone(m)}
            className="flex-1 min-w-0 flex items-center gap-1 text-left"
          >
            <Target size={9} className="shrink-0 text-cat-projects" />
            <span className={cn("text-[10px] font-semibold leading-tight truncate", m.completed ? "text-muted line-through" : "text-primary")}>
              {m.title}
            </span>
          </button>
        </div>
      ))}
      {goalDeadlines.map((g: any) => {
        const isDone = g.progress >= 100;
        return (
          <button
            key={g.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onClickGoalDeadline?.(g); }}
            className={cn(
              "group/gd flex items-center gap-1 rounded-md pl-1 pr-1.5 py-1 border-l-2 text-left cursor-pointer transition-all hover:scale-[1.01] w-full",
              isDone ? "border-l-border bg-surface-hover/40 text-muted" : "border-l-accent bg-accent-subtle hover:bg-accent/15"
            )}
            title={`Strategic Goal due: ${g.title} (${g.progress}%) — Click to open OKRs`}
          >
            <Flag size={9} className={cn("shrink-0", isDone ? "text-muted" : "text-accent")} />
            <span className={cn("text-[10px] font-semibold leading-tight truncate flex-1 min-w-0", isDone ? "line-through text-muted" : "text-primary")}>
              {g.title}
            </span>
            <span className="text-[9px] font-mono font-bold text-accent shrink-0">
              {g.progress}%
            </span>
          </button>
        );
      })}

      {onAddMilestone && (
        <button
          onClick={() => onAddMilestone(day)}
          aria-label="Add milestone"
          className="absolute bottom-1 left-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-all text-[9px] font-bold"
        >
          <Plus size={10} strokeWidth={3} /> Milestone
        </button>
      )}
    </div>
  );
}

const BacklogTaskCard = memo(function BacklogTaskCard({
  task,
  days,
  onClickTask,
  onToggleTask,
  onScheduleTask,
}: {
  task: any;
  days: Date[];
  onClickTask?: (task: any) => void;
  onToggleTask?: (task: any, e: any) => void;
  onScheduleTask?: (taskId: string, targetDateStr: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `backlog-task-${task.id}`,
    data: { type: 'Task', task },
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "w-60 shrink-0 p-2.5 rounded-xl border border-border bg-surface hover:border-accent/40 shadow-2xs flex flex-col justify-between gap-2 group transition-all cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-40 ring-2 ring-accent z-50 shadow-md"
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => onToggleTask && onToggleTask(task, e)}
          className="mt-0.5 shrink-0 transition-transform active:scale-[0.98]"
        >
          <Circle className="w-3 h-3 text-muted hover:text-accent transition-colors" />
        </button>
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onClickTask && onClickTask(task)}
        >
          <h5 className="text-xs font-semibold text-primary truncate group-hover:text-accent transition-colors">
            {task.title}
          </h5>
          <span className="text-[9px] text-muted truncate block mt-0.5">
            {task.project?.name || 'General Task'}
          </span>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-1 pt-1 border-t border-border/50"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="text-[9px] text-muted font-medium mr-0.5">Place:</span>
        <button
          type="button"
          onClick={() => onScheduleTask && onScheduleTask(task.id, format(new Date(), 'yyyy-MM-dd'))}
          className="px-1.5 py-0.5 rounded bg-accent/10 hover:bg-accent hover:text-white text-accent text-[9px] font-bold transition-colors cursor-pointer"
          title="Schedule for Today"
        >
          Today
        </button>
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onScheduleTask && onScheduleTask(task.id, format(d, 'yyyy-MM-dd'))}
            className="px-1.5 py-0.5 rounded bg-surface-hover hover:bg-surface text-secondary hover:text-primary border border-border/60 text-[8.5px] font-medium transition-colors cursor-pointer"
            title={`Schedule for ${format(d, 'EEEE, MMM d')}`}
          >
            {format(d, 'EEE')}
          </button>
        ))}
      </div>
    </div>
  );
});

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
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [activeBlock, setActiveBlock] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const activeData = event.active.data.current;
    if (activeData?.type === 'Task') {
      setActiveTask(activeData.task);
    } else if (activeData?.type === 'Block') {
      setActiveBlock(activeData.block);
    }
  };

  const handleDragEnd = (event: any) => {
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
        targetDate = format(parseISO(overData.block.date), 'yyyy-MM-dd');
      }
      if (!targetDate || !block.date) return;
      const sourceDate = format(parseISO(block.date), 'yyyy-MM-dd');
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

  const normalBlocks = data.timeBlocks.filter(b => !(b as any).isExternal);

  const unscheduledTasks = useMemo(() => {
    return (data.tasks || []).filter(
      (t: any) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELED'
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
              className="p-2 flex flex-col justify-start pt-2 text-[10px] font-bold uppercase tracking-wider text-primary border-r border-border sticky left-0 z-40 bg-surface hover:bg-surface-hover transition-colors cursor-pointer text-left select-none group"
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
                  <div className={"text-[10px] font-bold uppercase " + (isToday ? "text-accent" : "text-secondary")}>
                    {format(day, "EEE")}
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <div className={"text-[12px] font-black " + (isToday ? "text-accent" : "text-primary")}>
                      {format(day, "MMM d")}
                    </div>
                    {isToday && (
                      <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[8px] font-bold text-white leading-none">
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
                      <span className="text-[10px] font-bold text-primary truncate pr-4">{routine.name}</span>
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
                      <span className="text-[9px] text-muted font-medium">{data.tasks.length} tasks</span>
                      {unscheduledTasks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowBacklog(prev => !prev)}
                          className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1",
                            showBacklog 
                              ? "bg-accent text-on-accent" 
                              : "bg-warning-bg text-warning-fg hover:bg-warning-subtle"
                          )}
                          title="Toggle Unscheduled Backlog drawer"
                        >
                          <span>Backlog</span>
                          <span className="px-1 rounded-full bg-black/10 text-[8px] font-mono">{unscheduledTasks.length}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {days.map((day) => {
                    const dayTasks = data.tasks.filter(
                      (t) => (t.scheduledDate && isSameDay(parseISO(t.scheduledDate), day)) ||
                             (!t.scheduledDate && t.dueDate && isSameDay(parseISO(t.dueDate), day))
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
                        <span className="text-[10px] text-muted hidden sm:inline">
                          Place a directive directly into this week's plan:
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowBacklog(false)}
                        className="text-[10px] text-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {unscheduledTasks.map((task: any) => (
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
                  const dayBlocks = normalBlocks.filter(b => isSameDay(parseISO(b.date), day));
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
                  const dayMilestones = (data.milestones || []).filter(m => m.date && isSameDay(parseISO(m.date), day));
                  const dayGoalDeadlines = (data.goalDeadlines || []).filter(g => g.targetDate && isSameDay(parseISO(g.targetDate), day));
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
                  <span className="text-[9px] font-bold text-secondary">
                    {safeTimeFormat(activeBlock.startTime)} - {safeTimeFormat(activeBlock.endTime)}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-primary truncate">{activeBlock.title}</span>
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
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          {icon || <ChevronDown size={13} className="text-secondary" />}
          {label}
        </div>
        <div className="text-[9px] text-secondary font-medium mt-0.5 ml-5">
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
          <div className="w-[128px] flex items-center text-[10px] font-bold uppercase tracking-wider text-primary gap-1.5 shrink-0">
            {icon || <ChevronDown size={13} className="-rotate-90 text-secondary" />}
            {label}
          </div>
          <div className="text-[9px] text-secondary font-medium">
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
