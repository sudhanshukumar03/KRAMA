import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { X, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface PlannerBacklogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DraggableTask({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: 'Task',
      task,
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-start gap-3 p-3 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700 transition-all ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
    >
      <GripVertical size={14} className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
      <div className="flex items-start gap-2 min-w-0 flex-1">
        {task.status === 'DONE' ? (
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <Circle size={14} className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
        )}
        <div className="flex flex-col min-w-0">
          <span className={`text-xs font-bold leading-tight ${task.status === 'DONE' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
            {task.title}
          </span>
          {task.priority && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
              {task.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlannerBacklog({ isOpen, onClose }: PlannerBacklogProps) {
  const { setNodeRef } = useDroppable({
    id: 'droppable-backlog',
    data: { type: 'Backlog' }
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'backlog'],
    queryFn: () => api.tasks.list({ status: 'TODO' }), // Or no scheduledDate? The backend needs to filter.
  });

  // Filter unscheduled tasks locally if backend doesn't support specific filter yet
  const backlogTasks = tasks?.filter((t: any) => !t.scheduledDate && t.status !== 'DONE') || [];

  if (!isOpen) return null;

  return (
    <div 
      className={`w-80 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Backlog</h2>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{backlogTasks.length} Unscheduled Tasks</p>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[400px]"
      >
        {isLoading ? (
          <div className="text-xs text-slate-400 animate-pulse text-center mt-10">Loading backlog...</div>
        ) : backlogTasks.length === 0 ? (
          <div className="text-xs text-slate-400 text-center mt-10 font-medium">Your backlog is empty!</div>
        ) : (
          backlogTasks.map((task: any) => (
            <DraggableTask key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}
