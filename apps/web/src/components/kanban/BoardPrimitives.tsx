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
    Trash2
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn, parseLocalDate } from '../../lib/utils';
import type { IssueWithRelations, TaskStatus } from '../../types/schema';
import { taskDay } from './boardConfig';
import { PaginatedItems } from '../ui/PaginatedItems';


// Distinct color per priority so URGENT (red) / HIGH (amber) / MEDIUM (blue) /
// LOW (green/neutral) are visually separable and accessible.
const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-danger-bg text-danger-fg border border-danger-border",
  HIGH: "bg-warning-bg text-warning-fg border border-warning-border",
  MEDIUM: "bg-accent-subtle text-accent-fg border border-accent/20",
  LOW: "bg-surface-hover text-secondary border border-border/80",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.LOW;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase",
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
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isExpanded = isHovered || menuOpen;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsHovered(false);
        }
      }}
      onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "Enter") { event.preventDefault(); onClick?.(issue); } else listeners?.onKeyDown?.(event); }}
      onClick={() => {
        if (!menuOpen && onClick) onClick(issue);
      }}
      className={cn(
        "directive-card p-3 rounded-xl bg-surface border border-border/80 shadow-2xs hover:shadow-md hover:border-accent/40 transition-all duration-200 cursor-grab active:cursor-grabbing group/card relative flex flex-col w-full box-border",
        isDragging && "scale-[1.02] shadow-xl opacity-95 border-primary z-50 cursor-grabbing rotate-[1deg] ring-2 ring-primary/20",
        isSortableDragging && "opacity-35 border-dashed border-2 border-accent"
      )}
    >
      {/* Title & More Actions Row (Title & Menu visible in resting state) */}
      <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
        <div
          className="font-semibold text-sm text-primary group-hover:text-accent transition-colors leading-snug tracking-tight min-w-0 flex-1"
          style={{ overflowWrap: 'anywhere' }}
        >
          {issue.title}
        </div>

        {/* Three-Dot Menu - subtle until hovered */}
        <div ref={menuRef} className="relative shrink-0 -mr-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(prev => !prev);
            }}
            title="More options"
            aria-label={`Actions for ${issue.title}`}
            aria-expanded={menuOpen}
            onPointerDown={e => e.stopPropagation()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer opacity-70 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-xl shadow-lg z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
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
                  type="button"
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

      {/* Expandable Details Container: hidden in resting state, revealed on hover or focus */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden flex flex-col gap-2",
          isExpanded
            ? "max-h-96 opacity-100 pt-2"
            : "max-h-0 opacity-0 group-hover/card:max-h-96 group-hover/card:opacity-100 group-hover/card:pt-2 group-focus-within/card:max-h-96 group-focus-within/card:opacity-100 group-focus-within/card:pt-2"
        )}
      >
          {/* Description Preview - only if present */}
          {issue.description && issue.description.trim() ? (
            <p
              className="text-xs text-secondary line-clamp-2 leading-relaxed min-w-0"
              style={{ overflowWrap: 'anywhere' }}
            >
              {issue.description}
            </p>
          ) : null}

          {/* Subtask Telemetry Bar (Visible when subtasks exist) */}
          {totalSubtasks > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-secondary font-mono">
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
            <div className="flex flex-wrap gap-1.5">
              {isBlocked && issue.blockedBy && (
                <span
                  title={`Blocked by: ${issue.blockedBy.title}`}
                  className="px-2 py-0.5 rounded bg-danger-bg text-danger-fg border border-danger-border text-xs font-semibold flex items-center gap-1 truncate max-w-full"
                >
                  <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" />
                  Blocked: {issue.blockedBy.title}
                </span>
              )}
              {issue.blocking && issue.blocking.length > 0 && (
                <span
                  title={`Blocking: ${issue.blocking.map((b: any) => b.title).join(', ')}`}
                  className="px-2 py-0.5 rounded bg-info-bg text-info-fg border border-info-border text-xs font-semibold flex items-center gap-1 truncate max-w-full"
                >
                  <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" />
                  Blocking: {issue.blocking.length} {issue.blocking.length === 1 ? 'task' : 'tasks'}
                </span>
              )}
            </div>
          )}

          {/* Unified Metadata Footer: Priority Badge + Project Tag + Due Date / Estimate */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 mt-auto text-xs text-secondary">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <PriorityBadge priority={issue.priority} />
              {issue.project?.name ? (
                <span
                  title={`Project: ${issue.project.name}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary max-w-[120px] truncate px-1.5 py-0.5 rounded bg-surface-hover border border-border/60"
                >
                  <Folder className="w-3 h-3 shrink-0 text-muted" />
                  <span className="truncate">{issue.project.name}</span>
                </span>
              ) : null}
            </div>

            {/* Right side: Due Date or Estimate */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {formattedDate ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted font-medium font-mono">
                  <Clock className="w-3 h-3 text-muted/80" />
                  {formattedDate}
                </span>
              ) : issue.estimateMinutes ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-surface-hover px-1.5 py-0.5 rounded border border-border/80 text-secondary font-medium">
                  <Clock className="w-2.5 h-2.5 text-muted" />
                  {issue.estimateMinutes}m
                </span>
              ) : null}
            </div>
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
      ref={setNodeRef}
      role="region"
      aria-label={`${col.title} column`}
      className={cn(
        "w-full min-w-[270px] lg:min-w-0 box-border h-full flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden shadow-2xs group/column",
        col.bgLight,
        isOver && "ring-2 ring-primary/60 bg-accent/10 border-primary"
      )}
    >
      {/* Column Header: Clean, single-row header without redundant subtitles */}
      <div className={cn(
        "px-3.5 py-3 flex items-center justify-between bg-surface/90 border-b border-border/70 shrink-0",
        col.topBorder
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("w-4 h-4 stroke-[2] shrink-0", col.iconColor)} />
          <h3 className="font-bold text-sm text-primary tracking-tight truncate">
            {col.title}
          </h3>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 shadow-2xs", col.badgeBg)}>
            {issues.length}
          </span>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => {
              if (onCreate) onCreate(col.id);
            }}
            title={`Add directive to ${col.title}`}
            aria-label={`Add directive to ${col.title}`}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-hover/80 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Scrollable Tasks Container */}
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-2.5 flex flex-col gap-2.5">
        <div className="space-y-2.5">
          {issues.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/40 m-0.5">
              <ListChecks className="w-5 h-5 text-muted mb-1.5 stroke-[1.5]" />
              <span className="text-xs text-secondary font-medium">No tasks yet</span>
            </div>
          ) : (
            <PaginatedItems items={issues} label={`${col.title} tasks`} className="space-y-2.5">
              {visible => (
                <SortableContext items={visible.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {visible.map((issue, idx) => (
                    <IssueCard key={issue.id} issue={issue} index={idx} onDelete={onDelete} onMove={onMove} onClick={onClick} />
                  ))}
                </SortableContext>
              )}
            </PaginatedItems>
          )}
        </div>

        {/* Notion-style bottom "+ New" button: centered & reveals when hovering the column section */}
        {onCreate && (
          <button
            type="button"
            onClick={() => onCreate(col.id)}
            aria-label={`New task in ${col.title}`}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-secondary/70 hover:text-primary rounded-xl hover:bg-surface/80 border border-transparent hover:border-border/60 transition-all duration-150 cursor-pointer text-center mt-0.5 opacity-0 group-hover/column:opacity-100 focus-visible:opacity-100 focus:opacity-100"
          >
            <Plus className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors stroke-[2]" />
            <span>New</span>
          </button>
        )}
      </div>
    </div>
  );
});
