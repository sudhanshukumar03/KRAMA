import {
    useDroppable
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import {
    AlertCircle,
    CheckSquare,
    Clock,
    Edit2,
    Folder,
    ListChecks,
    MoreVertical,
    Plus,
    Trash2,
    Zap
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn, parseLocalDate } from '../../lib/utils';
import type { IssueWithRelations, TaskStatus } from '../../types/schema';
import { taskDay } from './boardConfig';


// Distinct color per priority so URGENT (red) / HIGH (amber) / MEDIUM (blue) /
// LOW (green) are visually separable — previously URGENT and HIGH were both red.
const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-danger-bg text-danger-fg border border-danger-border",
  HIGH: "bg-warning-bg text-warning-fg border border-warning-border",
  MEDIUM: "bg-info-bg text-info-fg border border-info-border",
  LOW: "bg-success-bg text-success-fg border border-success-border",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.LOW;
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase",
      style
    )}>
      {priority || 'LOW'}
    </span>
  );
}

export const IssueCard = React.memo(function IssueCard({
  issue,
  isDragging,
  onDelete,
  onMove,
  onClick
}: {
  issue: IssueWithRelations;
  index?: number;
  isDragging?: boolean;
  onDelete?: (issue: IssueWithRelations) => void;
  onMove?: (issue: IssueWithRelations, direction: number) => void;
  onClick?: (issue: IssueWithRelations) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: issue.id,
    disabled: isDragging,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const style = isDragging ? undefined : {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform var(--motion-ui) var(--ease-spring)',
    opacity: isSortableDragging ? 0.35 : 1,
  };

  const completedSubtasks = issue.childTasks?.filter((c: { status: string }) => c.status === "DONE").length || 0;
  const totalSubtasks = issue.childTasks?.length || 0;
  const subtaskPct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const isBlocked = issue.blockedBy && !issue.blockedBy.deletedAt && !['DONE', 'CANCELED'].includes(issue.blockedBy.status);
  const hasDependencies = Boolean(isBlocked) || (issue.blocking && issue.blocking.length > 0);

  // Format due date e.g. "Sep 15"
  const formattedDate = useMemo(() => {
    if (issue.dueDate) {
      try {
        return format(parseLocalDate(taskDay(issue.dueDate))!, 'MMM d');
      } catch {
        return null;
      }
    }
    if (issue.scheduledDate) {
      try {
        return format(parseLocalDate(taskDay(issue.scheduledDate))!, 'MMM d');
      } catch {
        return null;
      }
    }
    return null;
  }, [issue.dueDate, issue.scheduledDate]);

  return (
    <div
      ref={isDragging ? undefined : setNodeRef}
      style={style}
      {...(isDragging ? {} : attributes)}
      {...(isDragging ? {} : listeners)}
      aria-label={`Move directive ${issue.title}`}
      onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "Enter") { event.preventDefault(); onClick?.(issue); } else listeners?.onKeyDown?.(event); }}
      onClick={() => {
        if (!menuOpen && onClick) onClick(issue);
      }}
      className={cn(
        "p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs hover:shadow-md hover:border-accent/40 transition-all duration-150 cursor-grab active:cursor-grabbing group relative flex flex-col gap-2.5 w-full box-border",
        isDragging && "scale-[1.02] shadow-xl opacity-95 border-primary z-50 cursor-grabbing rotate-[1deg] ring-2 ring-primary/20",
        isSortableDragging && "opacity-35 border-dashed border-2 border-accent"
      )}
    >
      {/* Top Line: Priority Badge + Three-Dot Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={issue.priority} />
        </div>
        <div className="flex items-center gap-1.5 relative">
          {/* Three-Dot Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(prev => !prev);
              }}
              title="More options"
              aria-label={`Actions for ${issue.title}`} aria-expanded={menuOpen} onPointerDown={e => e.stopPropagation()}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-xl shadow-lg z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onClick?.(issue);
                  }}
                  className="w-full px-3 py-1.5 text-left text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-muted" /> Edit
                </button>
                {onMove && <><button type="button" onClick={() => { setMenuOpen(false); onMove(issue, -1); }} className="w-full min-h-11 px-3 text-left text-primary hover:bg-surface-hover">Move up</button><button type="button" onClick={() => { setMenuOpen(false); onMove(issue, 1); }} className="w-full min-h-11 px-3 text-left text-primary hover:bg-surface-hover">Move down</button></>}
                {onDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(issue);
                    }}
                    className="w-full px-3 py-1.5 text-left text-danger-fg hover:bg-danger-fg/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Title */}
      <div 
        className="font-bold text-sm text-primary group-hover:text-accent transition-colors leading-snug tracking-tight min-w-0"
        style={{ overflowWrap: 'anywhere' }}
      >
        {issue.title}
      </div>

      {/* Description Preview */}
      {issue.description && (
        <p 
          className="text-xs text-secondary line-clamp-2 leading-relaxed -mt-1 min-w-0"
          style={{ overflowWrap: 'anywhere' }}
        >
          {issue.description}
        </p>
      )}

      {/* Subtask Telemetry Bar (Visible when subtasks exist) */}
      {totalSubtasks > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-[10px] text-secondary font-mono">
            <span className="flex items-center gap-1 font-medium">
              <CheckSquare className="w-3 h-3 text-accent stroke-[1.5]" />
              Subtasks
            </span>
            <span className="text-primary font-bold">{completedSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border/40">
            <div className="h-full bg-accent transition-all duration-300 ease-out" style={{ width: `${subtaskPct}%` }} />
          </div>
        </div>
      )}

      {/* Blocked Dependencies Pill */}
      {hasDependencies && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {isBlocked && issue.blockedBy && (
            <span
              title={`Blocked by: ${issue.blockedBy.title}`}
              className="px-2 py-0.5 rounded bg-danger-bg text-danger-fg border border-danger-border font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full"
            >
              <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" />
              Blocked: {issue.blockedBy.title}
            </span>
          )}
          {issue.blocking && issue.blocking.length > 0 && (
            <span
              title={`Blocking: ${issue.blocking.map((b: any) => b.title).join(', ')}`}
              className="px-2 py-0.5 rounded bg-info-bg text-info-fg border border-info-border font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full"
            >
              <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" />
              Blocking: {issue.blocking.length} {issue.blocking.length === 1 ? 'task' : 'tasks'}
            </span>
          )}
        </div>
      )}

      {/* Bottom Metadata: Project Tag + Assignee Avatar + Due Date */}
      <div className="flex items-center justify-between text-xs text-secondary font-mono pt-1.5 border-t border-border/40">
        {/* Project Tag */}
        <div className="flex items-center gap-1 min-w-0">
          {issue.project?.name ? (
            <span
              title={`Project: ${issue.project.name}`}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-secondary max-w-[110px] truncate"
            >
              <Folder className="w-3 h-3 shrink-0 text-muted" />
              <span className="truncate">{issue.project.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-warning-fg bg-warning-bg px-1.5 py-0.5 rounded border border-warning-border">
              <Zap className="w-2.5 h-2.5 shrink-0" />
              <span>Operations</span>
            </span>
          )}
        </div>

        {/* Right side: Due Date or Estimate */}
        <div className="flex items-center gap-2.5 shrink-0">
          {formattedDate ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted font-medium">
              <Clock className="w-3 h-3 text-muted" />
              {formattedDate}
            </span>
          ) : issue.estimateMinutes ? (
            <span className="inline-flex items-center gap-1 text-[10px] bg-surface-hover px-1.5 py-0.5 rounded-md border border-border/80 text-primary font-bold">
              <Clock className="w-2.5 h-2.5 text-muted" />
              {issue.estimateMinutes}m
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export const Column = React.memo(function Column({
  col,
  issues,
  onDelete,
  onCreate,
  onMove,
  onClick,
}: {
  col: {
    id: TaskStatus;
    title: string;
    subtitle?: string;
    icon: any;
    iconColor: string;
    bgLight: string;
    topBorder: string;
    badgeBg: string;
    addText: string;
  };
  issues: IssueWithRelations[];
  onDelete?: (issue: IssueWithRelations) => void;
  onMove?: (issue: IssueWithRelations, direction: number) => void;
  onCreate?: (status: TaskStatus) => void;
  onClick?: (issue: IssueWithRelations) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: {
      type: 'Column',
      status: col.id,
    }
  });

  const Icon = col.icon;

  return (
    <div
      ref={setNodeRef} role="region" aria-label={`${col.title} column`}
      className={cn(
        "w-full min-w-[270px] lg:min-w-0 box-border h-full flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden shadow-2xs",
        col.bgLight,
        isOver && "ring-2 ring-primary/60 bg-accent/10 border-primary"
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "px-4 py-3.5 flex flex-col gap-1 bg-surface/80 border-b border-border/70 shrink-0",
        col.topBorder
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4 stroke-[2]", col.iconColor)} />
            <h3 className="font-bold text-sm text-primary tracking-tight">
              {col.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("px-2 py-0.5 rounded-full font-mono text-xs font-bold shadow-2xs", col.badgeBg)}>
              {issues.length}
            </span>
            <button
              onClick={() => {
                if (onCreate) onCreate(col.id);
              }}
              title={`Add directive to ${col.title}`}
              aria-label={`Add directive to ${col.title}`}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-surface border border-border/80 text-secondary hover:text-primary hover:bg-surface-hover shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-secondary font-normal">
          {col.subtitle}
        </p>
      </div>

      {/* Scrollable Tasks Container */}
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-2.5 flex flex-col gap-2.5">
        <div className="space-y-2.5">
          {issues.length === 0 ? (
            <div className="py-6 text-center flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-surface/30 m-1">
              <ListChecks className="w-5 h-5 text-muted mb-1.5 stroke-[1.5]" />
              <span className="text-xs text-secondary font-medium">No directives yet</span>
            </div>
          ) : (
            <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {issues.map((issue, idx) => (
                <IssueCard key={issue.id} issue={issue} index={idx} onDelete={onDelete} onMove={onMove} onClick={onClick} />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
});
