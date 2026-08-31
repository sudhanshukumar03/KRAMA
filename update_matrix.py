import codecs

def update_matrix(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Import hooks
    if 'useDroppable' not in content:
        content = content.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useDraggable, useDroppable } from "@dnd-kit/core";')
        content = content.replace('import { Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, MoreVertical, CircleDot, Target, Clock, Layers } from "lucide-react";', 'import { Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, MoreVertical, CircleDot, Target, Clock, Layers, GripVertical } from "lucide-react";')

    # Add MatrixTaskComponent
    task_component = """
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
"""
    if 'function MatrixTaskComponent' not in content:
        content = content.replace('function dateKey(date: Date) {', task_component + '\nfunction dateKey(date: Date) {')

    
    import re
    # We need to replace the entire map for dayTasks
    pattern = r'<div key={dateKey\(day\)} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 p-2 flex flex-col gap-1\.5 overflow-y-auto hide-scrollbar">.*?</div>\s*</div>\s*\);\s*}\)}'
    
    match = re.search(pattern, content, re.DOTALL)
    if match:
        new_str = '<DroppableTaskCell key={dateKey(day)} day={day} tasks={dayTasks} dateKeyFn={dateKey} onClickTask={onClickTask} onToggleTask={onToggleTask} />\n                  )}'
        content = content[:match.start()] + new_str + content[match.end():]
        print("Successfully replaced dayTasks mapping")
    else:
        print("Could not find dayTasks mapping pattern")

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

update_matrix('apps/web/src/components/planner/PlannerMatrix.tsx')
