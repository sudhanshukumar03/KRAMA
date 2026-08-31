import codecs

def update_matrix(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    import re
    # Remove the broken MatrixTaskComponent
    pattern = r'function MatrixTaskComponent.*?function dateKey\(date: Date\)'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        task_component = r"""
function MatrixTaskComponent({ task, onClickTask, onToggleTask }: { task: any, onClickTask?: (task: any) => void, onToggleTask?: (task: any, e: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: 	ask-,
    data: { type: 'Task', task }
  });

  const style = transform ? { transform: 	ranslate3d(px, px, 0) } : undefined;
  const isDone = task.status === 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={group flex items-start gap-2 cursor-grab active:cursor-grabbing p-1 -mx-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-[#1E293B] }
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
    id: 	ask-drop-,
    data: { type: 'TaskColumn', date: dKey }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={order-r border-slate-200 dark:border-slate-700 last:border-r-0 p-2 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar h-full min-h-[36px] transition-colors }
    >
      {tasks.map((task: any) => (
        <MatrixTaskComponent key={task.id} task={task} onClickTask={onClickTask} onToggleTask={onToggleTask} />
      ))}
    </div>
  );
}
"""
        content = content[:match.start()] + task_component + '\nfunction dateKey(date: Date)' + content[match.end():]
        with codecs.open(filepath, 'w', 'utf-8') as f:
            f.write(content)
        print("Replaced MatrixTaskComponent")
    else:
        print("Could not find pattern")

update_matrix('apps/web/src/components/planner/PlannerMatrix.tsx')
