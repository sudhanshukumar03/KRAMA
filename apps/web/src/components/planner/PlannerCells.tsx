import { format } from "date-fns";
import { Plus, CheckCircle2, Circle, Target, Trash2, Flag } from "lucide-react";
import { memo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn, formatBlockTime } from "../../lib/utils";
import { blockTypeStyle } from "../../lib/blockTypeStyles";
import type { PlannerTask, TimeBlock, Milestone, GoalDeadline } from "../../types/planner";


function safeTimeFormat(isoString: string) { return formatBlockTime(isoString); }

export const MatrixTaskComponent = memo(function MatrixTaskComponent({ task, onClickTask, onToggleTask, onDeleteTask }: { task: PlannerTask, onClickTask?: (task: PlannerTask) => void, onToggleTask?: (task: PlannerTask, e: React.MouseEvent) => void, onDeleteTask?: (task: PlannerTask) => void }) {
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
        <span className={"text-badge font-medium leading-snug block " + (isDone ? "text-muted line-through" : "text-primary group-hover:text-primary")}>
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

export function DroppableTaskCell({ day, tasks, dateKeyFn, onClickTask, onToggleTask, onAddTask, onDeleteTask }: { day: Date, tasks: PlannerTask[], dateKeyFn: (d: Date) => string, onClickTask?: (task: PlannerTask) => void, onToggleTask?: (task: PlannerTask, e: React.MouseEvent) => void, onAddTask?: (d: Date) => void, onDeleteTask?: (task: PlannerTask) => void }) {
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
      {tasks.map((task: PlannerTask) => (
        <MatrixTaskComponent key={task.id} task={task} onClickTask={onClickTask} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} />
      ))}

      {onAddTask && (
        <button
          onClick={() => onAddTask(day)}
          aria-label="New task"
          className="absolute bottom-1 left-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-all text-badge font-bold"
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


export const DroppableTimeBlock = memo(function DroppableTimeBlock({ block, tasks, onClickTimeBlock, onDeleteTimeBlock }: { block: TimeBlock, tasks: PlannerTask[], onClickTimeBlock?: (block: TimeBlock) => void, onDeleteTimeBlock?: (block: TimeBlock) => void }) {
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
  const linkedTask = tasks.find((t: PlannerTask) => t.id === block.taskId);

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
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
          <span className="text-badge font-bold tracking-tight text-secondary">
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
            className="opacity-100 md:opacity-0 md:group-hover/timeblock:opacity-100 focus:opacity-100 group-focus-within/timeblock:opacity-100 p-0.5 hover:bg-danger-bg text-danger-fg rounded transition-opacity shrink-0"
            title="Delete time block"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
      <div className="text-badge font-semibold leading-tight text-primary line-clamp-2">
        {block.title}
      </div>
      {block.taskId && (
        <div className="mt-1 bg-surface-hover rounded px-1.5 py-0.5 text-badge font-medium text-secondary truncate flex items-center gap-1 border border-border">
          <CheckCircle2 size={8} className="text-accent" />
          {linkedTask ? linkedTask.title : "Linked Task"}
        </div>
      )}
    </div>
  );
});

export function TimeBlockCell({ day, blocks, tasks, onClickTimeBlock, onAddTimeBlock, onDeleteTimeBlock }: { day: Date, blocks: TimeBlock[], tasks: PlannerTask[], onClickTimeBlock?: (b: TimeBlock) => void, onAddTimeBlock?: (d: Date) => void, onDeleteTimeBlock?: (b: TimeBlock) => void }) {
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
          className="absolute bottom-1 left-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-all text-badge font-bold"
        >
          <Plus size={10} strokeWidth={3} /> Add Block
        </button>
      )}
    </div>
  );
}

// Per-day milestone chips (C10). Milestones are project-scoped markers keyed to a
// day; toggling flips completed, clicking opens the edit modal.
export function MilestoneCell({ day, milestones, goalDeadlines = [], onClickMilestone, onToggleMilestone, onAddMilestone, onClickGoalDeadline }: { day: Date, milestones: Milestone[], goalDeadlines?: GoalDeadline[], onClickMilestone?: (m: Milestone) => void, onToggleMilestone?: (m: Milestone) => void, onAddMilestone?: (d: Date) => void, onClickGoalDeadline?: (goal: GoalDeadline) => void }) {
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
            <span className={cn("text-badge font-semibold leading-tight truncate", m.completed ? "text-muted line-through" : "text-primary")}>
              {m.title}
            </span>
          </button>
        </div>
      ))}
      {goalDeadlines.map((g: GoalDeadline) => {
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
            <span className={cn("text-badge font-semibold leading-tight truncate flex-1 min-w-0", isDone ? "line-through text-muted" : "text-primary")}>
              {g.title}
            </span>
            <span className="text-badge font-mono font-bold text-accent shrink-0">
              {g.progress}%
            </span>
          </button>
        );
      })}

      {onAddMilestone && (
        <button
          onClick={() => onAddMilestone(day)}
          aria-label="Add milestone"
          className="absolute bottom-1 left-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-all text-badge font-bold"
        >
          <Plus size={10} strokeWidth={3} /> Milestone
        </button>
      )}
    </div>
  );
}

export const BacklogTaskCard = memo(function BacklogTaskCard({
  task,
  days,
  onClickTask,
  onToggleTask,
  onScheduleTask,
}: {
  task: PlannerTask;
  days: Date[];
  onClickTask?: (task: PlannerTask) => void;
  onToggleTask?: (task: PlannerTask, e: React.MouseEvent) => void;
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
          <span className="text-badge text-muted truncate block mt-0.5">
            {task.project?.name || 'General Task'}
          </span>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-1 pt-1 border-t border-border/50"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="text-badge text-muted font-medium mr-0.5">Place:</span>
        <button
          type="button"
          onClick={() => onScheduleTask && onScheduleTask(task.id, format(new Date(), 'yyyy-MM-dd'))}
          className="px-1.5 py-0.5 rounded bg-accent/10 hover:bg-accent hover:text-white text-accent text-badge font-bold transition-colors cursor-pointer"
          title="Schedule for Today"
        >
          Today
        </button>
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onScheduleTask && onScheduleTask(task.id, format(d, 'yyyy-MM-dd'))}
            className="px-1.5 py-0.5 rounded bg-surface-hover hover:bg-surface text-secondary hover:text-primary border border-border/60 text-badge font-medium transition-colors cursor-pointer"
            title={`Schedule for ${format(d, 'EEEE, MMM d')}`}
          >
            {format(d, 'EEE')}
          </button>
        ))}
      </div>
    </div>
  );
});
