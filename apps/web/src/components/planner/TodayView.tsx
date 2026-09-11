import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, LayoutList, Target, Trash2, ArrowLeft } from "lucide-react";
import { MatrixTaskComponent, DroppableTimeBlock } from "./PlannerMatrix";

interface Props {
  day: Date;
  data: any; // PlannerData
  dayData: any; // The day object from data.days
  occurrenceFor: (routineId: string, day: Date) => any;
  onToggleRoutine: (occurrence: any) => void;
  onToggleTask: (task: any, e: React.MouseEvent) => void;
  onClickTask: (task: any) => void;
  onClickTimeBlock?: (block: any) => void;
  onDeleteTask?: (task: any) => void;
  onDeleteTimeBlock?: (block: any) => void;
  onDeleteRoutine?: (routine: any) => void;
  onAddTask?: (day: Date) => void;
  onAddTimeBlock?: (day: Date) => void;
  onBack?: () => void;
  backLabel?: string;
}

export function TodayView({
  day,
  data,
  dayData,
  occurrenceFor,
  onToggleRoutine,
  onToggleTask,
  onClickTask,
  onClickTimeBlock,
  onDeleteTask,
  onDeleteTimeBlock,
  onDeleteRoutine,
  onAddTask,
  onAddTimeBlock,
  onBack,
  backLabel = 'Plan',
}: Props) {
  if (!dayData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <p>No data for today.</p>
      </div>
    );
  }

  const dateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const _day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${_day}`;
  };

  const blocks = (data?.timeBlocks || [])
    .filter((b: any) => dateKey(new Date(b.startTime)) === dateKey(day))
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
  const tasks = (data?.tasks || []).filter((t: any) => t.scheduledDate && dateKey(new Date(t.scheduledDate)) === dateKey(day));

  // Find routines scheduled for today
  const todayRoutines = data.routines
    .map((r: any) => ({ routine: r, occurrence: occurrenceFor(r.id, day) }))
    .filter((item: any) => !!item.occurrence);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
      
      {/* HEADER / BACK */}
      <div className="md:col-span-3 flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface bg-surface-hover hover:bg-slate-100 dark:hover:bg-slate-800 text-primary text-secondary rounded-lg border border-border text-xs font-bold transition-colors shadow-sm"
            >
              <ArrowLeft size={14} className="text-muted" /> Back to {backLabel}
            </button>
          )}
          <h2 className="text-base font-bold text-primary text-secondary">
            {format(day, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>
      </div>
      
      {/* TIME BLOCKS */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary text-secondary" />
            <h2 className="text-sm font-bold text-primary text-secondary">Time Blocks</h2>
          </div>
          {onAddTimeBlock && (
            <button 
              onClick={() => onAddTimeBlock(day)}
              className="p-1 hover:bg-surface-hover rounded-md text-muted hover:text-primary transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </button>
          )}
        </div>
        
        {blocks.length === 0 ? (
          <p className="text-xs text-muted italic p-4 bg-surface rounded-xl border border-dashed border-border text-center">
            No time blocks scheduled for today.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {blocks.map((block: any) => (
              <div key={block.id} className="relative">
                <DroppableTimeBlock 
                  block={block} 
                  tasks={data.tasks} 
                  onClickTimeBlock={onClickTimeBlock} 
                  onDeleteTimeBlock={onDeleteTimeBlock} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TASKS */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-500" />
            <h2 className="text-sm font-bold text-primary text-secondary">Tasks</h2>
          </div>
          {onAddTask && (
            <button 
              onClick={() => onAddTask(day)}
              className="p-1 hover:bg-surface-hover rounded-md text-muted hover:text-primary transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </button>
          )}
        </div>
        
        {tasks.length === 0 ? (
          <p className="text-xs text-muted italic p-4 bg-surface rounded-xl border border-dashed border-border text-center">
            No tasks planned for today.
          </p>
        ) : (
          <div className="flex flex-col gap-1 bg-surface bg-surface-hover p-2 rounded-xl border border-border border-border">
            {tasks.map((task: any) => (
              <MatrixTaskComponent 
                key={task.id} 
                task={task} 
                onClickTask={onClickTask} 
                onToggleTask={onToggleTask} 
                onDeleteTask={onDeleteTask} 
              />
            ))}
          </div>
        )}
      </div>

      {/* ROUTINES (now Schedule) */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <LayoutList size={16} className="text-emerald-500" />
          <h2 className="text-sm font-bold text-primary text-secondary">Schedule</h2>
        </div>
        
        {todayRoutines.length === 0 ? (
          <p className="text-xs text-muted italic p-4 bg-surface rounded-xl border border-dashed border-border text-center">
            No schedule items planned for today.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayRoutines.map(({ routine, occurrence }: any) => {
              const isDone = occurrence.completed;
              return (
                <div 
                  key={routine.id}
                  onClick={() => onToggleRoutine(occurrence)}
                  className="flex items-center justify-between p-3 bg-surface bg-surface-hover rounded-xl border border-border border-border shadow-sm cursor-pointer hover:border-accent transition-colors group"
                >
                  <span className={"text-xs font-semibold transition-colors " + (isDone ? "text-slate-400 line-through" : "text-primary text-secondary group-hover:text-accent")}>
                    {routine.name}
                  </span>
                  <div className="flex items-center gap-2">
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
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 text-red-500 rounded transition-opacity"
                        title="Delete schedule item"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <Circle size={16} className="text-slate-300 group-hover:text-accent transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
