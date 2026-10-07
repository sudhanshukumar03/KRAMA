import { useModalA11y } from '../hooks/useModalA11y';
import React, { useState, useMemo, useEffect, useCallback, useRef, useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent,
  CollisionDetection
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IssueWithRelations, TaskStatus, TaskPriority } from '../types/schema';
import { BaseButton } from './ui/BaseButton';
import { PageHeader } from './ui/PageHeader';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { 
  CircleDashed, CheckCircle2, ListChecks, 
  Search, Plus, AlertCircle, X, KanbanSquare, Clock, 
  Folder, CheckSquare, MoreVertical, ChevronDown, 
  LayoutGrid, List, Calendar, Inbox, Trash2, Edit2, Zap, Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '../lib/utils';
import { useReducedMotion } from '../hooks/useReducedMotion';

function taskDay(value: unknown) { return value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : ''; }

// Status columns aligned with execution stages
const STATUS_COLUMNS = [
  {
    id: "BACKLOG" as TaskStatus,
    title: "Backlog",
    subtitle: "Ideas and upcoming work",
    icon: Inbox,
    iconColor: "text-accent-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-accent",
    badgeBg: "bg-accent-subtle text-accent-fg border border-accent/20",
    addText: "text-accent-fg hover:bg-accent-subtle hover:border-accent/30",
  },
  {
    id: "TODO" as TaskStatus,
    title: "To Do",
    subtitle: "Ready for execution",
    icon: ListChecks,
    iconColor: "text-info-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-info-border",
    badgeBg: "bg-info-bg text-info-fg border border-info-border",
    addText: "text-info-fg hover:bg-info-bg hover:border-info-border",
  },
  {
    id: "IN_PROGRESS" as TaskStatus,
    title: "In Progress",
    subtitle: "Actively being worked on",
    icon: CircleDashed,
    iconColor: "text-warning-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-warning-border",
    badgeBg: "bg-warning-bg text-warning-fg border border-warning-border",
    addText: "text-warning-fg hover:bg-warning-bg hover:border-warning-border",
  },
  {
    id: "REVIEW" as TaskStatus, title: "Review", subtitle: "Ready for checking", icon: Search, iconColor: "text-info-fg", bgLight: "bg-surface border-border/80", topBorder: "border-t-[3px] border-t-info-border", badgeBg: "bg-info-bg text-info-fg border border-info-border", addText: "text-info-fg hover:bg-info-bg",
  },
  {
    id: "DONE" as TaskStatus,
    title: "Done",
    subtitle: "Completed and shipped",
    icon: CheckCircle2,
    iconColor: "text-success-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-success-border",
    badgeBg: "bg-success-bg text-success-fg border border-success-border",
    addText: "text-success-fg hover:bg-success-bg hover:border-success-border",
  },
];

const CANCELED_COLUMN = {
  id: "CANCELED" as TaskStatus,
  title: "Canceled",
  subtitle: "Archived & abandoned directives",
  icon: Archive,
  iconColor: "text-muted",
  bgLight: "bg-surface/50 border-border/60",
  topBorder: "border-t-[3px] border-t-muted/40",
  badgeBg: "bg-surface-hover text-muted border border-border",
  addText: "text-muted hover:bg-surface-hover",
};

const STATUS_IDS = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"];

// Distinct color per priority so URGENT (red) / HIGH (amber) / MEDIUM (blue) /
// LOW (green) are visually separable — previously URGENT and HIGH were both red.
const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-danger-bg text-danger-fg border border-danger-border",
  HIGH: "bg-warning-bg text-warning-fg border border-warning-border",
  MEDIUM: "bg-info-bg text-info-fg border border-info-border",
  LOW: "bg-success-bg text-success-fg border border-success-border",
};

function getPriorityBadge(priority: string) {
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

const IssueCard = React.memo(function IssueCard({
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
          {getPriorityBadge(issue.priority)}
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

const Column = React.memo(function Column({
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

export function IssueCreateModal({
  open,
  initialStatus,
  allIssues,
  projects = [],
  defaultProjectId,
  onClose,
  onSubmit,
  isSubmitting, error
}: {
  open: boolean;
  initialStatus: TaskStatus;
  allIssues: IssueWithRelations[];
  projects?: { id: string; name: string }[];
  defaultProjectId?: string;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; status: TaskStatus; priority: TaskPriority; estimateMinutes?: number; blockedById?: string | null; projectId?: string; dueDate?: string | null; scheduledDate?: string | null }) => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus || "BACKLOG");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [estimate, setEstimate] = useState(30);
  const [dueDay, setDueDay] = useState('');
  const [scheduledDay, setScheduledDay] = useState('');
  const [blockedById, setBlockedById] = useState<string | null>(null);
  const [selectedProjId, setSelectedProjId] = useState<string>(defaultProjectId || '');

  const initialCapture = useRef({ initialStatus, defaultProjectId }); initialCapture.current = { initialStatus, defaultProjectId };
  useEffect(() => { if (open) { setTitle(''); setDescription(''); setPriority('MEDIUM'); setEstimate(30); setBlockedById(null); setStatus(initialCapture.current.initialStatus || 'BACKLOG'); setSelectedProjId(initialCapture.current.defaultProjectId || ''); setDueDay(''); setScheduledDay(''); } }, [open]);

  const dismiss = () => { if (!isSubmitting) onClose(); };
  const dialogId = useId();
  const dialogRef = useModalA11y(open, dismiss);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      estimateMinutes: Math.round(Number(estimate)) || 0,
      blockedById,
      projectId: selectedProjId || undefined, dueDate: dueDay ? `${dueDay}T12:00:00.000Z` : null, scheduledDate: scheduledDay ? `${scheduledDay}T12:00:00.000Z` : null
    });
  };

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        onClick={e => e.stopPropagation()}
        className="v4-card w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <ListChecks className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 id={`${dialogId}-title`} className="text-card text-primary font-bold">Create New Directive</h3>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close task dialog"
            type="button"
            className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && <p role="alert" className="text-sm text-danger-fg">{error} Your draft is retained.</p>}
          <div>
            <label htmlFor={`${dialogId}-field-1`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Project Scope
            </label>
            <select id={`${dialogId}-field-1`}
              value={selectedProjId}
              onChange={e => setSelectedProjId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
            >
              <option value="">⚡ General Operations (No Project)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>📁 {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${dialogId}-field-2`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Directive Title *
            </label>
            <input id={`${dialogId}-field-2`}
              type="text"
              required maxLength={255}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Implement user authentication"
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary placeholder:text-muted"
            />
          </div>

          <div>
            <label htmlFor={`${dialogId}-field-3`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Description
            </label>
            <textarea id={`${dialogId}-field-3`}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add key context, dependencies, or scope..."
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary placeholder:text-muted resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${dialogId}-field-4`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Column / Status
              </label>
              <select id={`${dialogId}-field-4`}
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                {STATUS_COLUMNS.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`${dialogId}-field-5`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Priority
              </label>
              <select id={`${dialogId}-field-5`}
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`${dialogId}-field-6`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Estimate (Minutes)
            </label>
            <input id={`${dialogId}-field-6`}
              type="number"
              min="0"
              step="1"
              value={estimate}
              onChange={e => setEstimate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm text-secondary">Scheduled date<input aria-label="Scheduled date" type="date" value={scheduledDay} onChange={e => setScheduledDay(e.target.value)} className="block w-full min-h-11 mt-2 px-3 bg-surface border border-border rounded-lg text-primary" /></label>
            <label className="text-sm text-secondary">Due date<input aria-label="Due date" type="date" value={dueDay} onChange={e => setDueDay(e.target.value)} className="block w-full min-h-11 mt-2 px-3 bg-surface border border-border rounded-lg text-primary" /></label>
          </div>
          <div>
            <label htmlFor={`${dialogId}-field-7`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Blocked By (Dependency)
            </label>
            <select id={`${dialogId}-field-7`}
              value={blockedById || ''}
              onChange={e => setBlockedById(e.target.value || null)}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
            >
              <option value="">None (Ready to execute)</option>
              {allIssues.map(i => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.status})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3 shrink-0">
            <BaseButton type="button" variant="secondary" onClick={dismiss} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Directive'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function IssueEditModal({
  open,
  issue,
  allIssues,
  projects = [],
  onClose,
  onSubmit,
  isSubmitting, error, onOpenTask
}: {
  open: boolean;
  issue: IssueWithRelations | null;
  allIssues: IssueWithRelations[];
  projects?: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (id: string, data: Partial<IssueWithRelations> & { blockedById?: string | null; projectId?: string | null }) => void;
  isSubmitting: boolean;
  error?: string;
  onOpenTask?: (task: IssueWithRelations) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>("BACKLOG");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [estimate, setEstimate] = useState(30);
  const [dueDay, setDueDay] = useState('');
  const [scheduledDay, setScheduledDay] = useState('');
  const [blockedById, setBlockedById] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Comments are lazy-loaded per task (the board list no longer ships every
  // task's thread). Fall back to any comments already on the passed issue.
  const { data: fullIssue, isLoading: detailLoading, isError: detailError, refetch: retryDetail } = useQuery({
    queryKey: ['task', issue?.id],
    queryFn: () => api.tasks.get(issue!.id),
    enabled: open && !!issue?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const comments = fullIssue?.comments ?? issue?.comments ?? [];

  const initialIssue = useRef(issue); initialIssue.current = issue;
  useEffect(() => { const source = initialIssue.current; if (source && open) {
    setTitle(source.title || ''); setDescription(source.description || ''); setStatus(source.status); setPriority(source.priority);
    setEstimate(source.estimateMinutes ?? 0); setBlockedById(source.blockedById || null); setProjectId(source.projectId || null); setDraftVersion(source.version); setNewComment('');
    setDueDay(taskDay(source.dueDate)); setScheduledDay(taskDay(source.scheduledDate));
  } }, [issue?.id, open]);

  const dismiss = () => { if (!isSubmitting) onClose(); };
  const dialogId = useId();
  const dialogRef = useModalA11y(open && !!issue, dismiss);

  if (!open || !issue) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !title.trim()) return;
    onSubmit(issue.id, {
      title: title.trim(),
      description: description.trim(),
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      estimateMinutes: Math.round(Number(estimate)) || 0,
      blockedById: blockedById || null,
      projectId: projectId || null, version: draftVersion, dueDate: dueDay ? new Date(`${dueDay}T12:00:00.000Z`) : null, scheduledDate: scheduledDay ? new Date(`${scheduledDay}T12:00:00.000Z`) : null
    });
  };

  const handleAddComment = async () => {
    if (isSubmittingComment || !newComment.trim()) return;
    try {
      setIsSubmittingComment(true);
      await api.tasks.addComment(issue.id, newComment.trim());
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task', issue.id] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        onClick={e => e.stopPropagation()}
        className="v4-card w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold font-mono text-xs">
              KR
            </div>
            <h3 id={`${dialogId}-title`} className="text-card text-primary font-bold">Directive Details</h3>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close task dialog"
            type="button"
            className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && <p role="alert" className="text-sm text-danger-fg">{error} Your draft is retained.</p>}
          <div>
            <label htmlFor={`${dialogId}-field-1`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Directive Title *
            </label>
            <input id={`${dialogId}-field-1`}
              type="text"
              required maxLength={255}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary"
            />
          </div>

          <div>
            <label htmlFor={`${dialogId}-field-2`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Description
            </label>
            <textarea id={`${dialogId}-field-2`}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${dialogId}-field-3`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Column / Status
              </label>
              <select id={`${dialogId}-field-3`}
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                {[...STATUS_COLUMNS, CANCELED_COLUMN].map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`${dialogId}-field-4`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Priority
              </label>
              <select id={`${dialogId}-field-4`}
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <div>
              <label htmlFor={`${dialogId}-field-5`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Project Scope
              </label>
              <select id={`${dialogId}-field-5`}
                value={projectId || ''}
                onChange={e => setProjectId(e.target.value || null)}
                className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                <option value="">⚡ General Operations (No Project)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>📁 {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`${dialogId}-field-6`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Estimate (Minutes)
            </label>
            <input id={`${dialogId}-field-6`}
              type="number"
              min="0"
              step="1"
              value={estimate}
              onChange={e => setEstimate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm text-secondary">Scheduled date<input aria-label="Scheduled date" type="date" value={scheduledDay} onChange={e => setScheduledDay(e.target.value)} className="block w-full min-h-11 mt-2 px-3 bg-surface border border-border rounded-lg text-primary" /></label>
            <label className="text-sm text-secondary">Due date<input aria-label="Due date" type="date" value={dueDay} onChange={e => setDueDay(e.target.value)} className="block w-full min-h-11 mt-2 px-3 bg-surface border border-border rounded-lg text-primary" /></label>
          </div>
          <div>
            <label htmlFor={`${dialogId}-field-7`} className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Blocked By (Dependency)
            </label>
            <select id={`${dialogId}-field-7`}
              value={blockedById || ''}
              onChange={e => setBlockedById(e.target.value || null)}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
            >
              <option value="">None (Ready to execute)</option>
              {allIssues.filter(i => i.id !== issue.id).map(i => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.status})
                </option>
              ))}
            </select>
          </div>

          {fullIssue && fullIssue.version !== draftVersion && <p role="status" className="text-sm text-warning-fg">This task changed elsewhere. Your draft is retained; saving will check its version.</p>}
          {onOpenTask && (fullIssue?.childTasks?.length || 0) > 0 && <section><h4 className="text-sm font-semibold text-primary">Subtasks</h4>{fullIssue?.childTasks?.map((child: any) => <button key={child.id} type="button" onClick={() => onOpenTask(child)} className="block w-full min-h-11 text-left text-accent-fg">Open subtask {child.title}</button>)}</section>}
          {/* Activity / Comments Stream */}
          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="text-sm font-semibold text-primary">Activity & Discussion</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {detailLoading ? <p role="status" className="text-sm text-secondary">Loading discussion...</p> : detailError ? <ErrorState title="Could not load task details" onRetry={() => retryDetail()} /> : comments.length === 0 ? (
                <p className="text-xs text-secondary italic">No comments yet.</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-surface-hover/60 border border-border/50 text-xs">
                    <div className="flex items-center justify-between mb-1 text-[11px] text-muted">
                      <span className="font-semibold text-primary">{c.author?.name || 'User'}</span>
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-secondary whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Add a comment"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-primary"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <BaseButton type="button" onClick={handleAddComment} disabled={!newComment.trim() || isSubmittingComment}>
                Send
              </BaseButton>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-border flex justify-end gap-3 shrink-0">
            <BaseButton type="button" variant="secondary" onClick={dismiss} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface KanbanBoardProps {
  initialProjectId?: string;
  lockedProjectId?: string;
  hideHeader?: boolean;
}

export function KanbanBoard({
  initialProjectId,
  lockedProjectId,
  hideHeader = false,
}: KanbanBoardProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProject = searchParams.get('project') || searchParams.get('projectId');
  const effectiveInitialProject = lockedProjectId || initialProjectId || urlProject || 'all';

  const queryClient = useQueryClient();
  const { data: activeIssues = [], isLoading: isLoadingIssues, isError } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  // CANCELED tasks are excluded from the default /tasks response server-side, so
  // fetch them under a sub-key. invalidateQueries(['issues']) prefix-matches this
  // key too, so the archive stays in sync without extra invalidations.
  const { data: canceledIssues = [], isError: archiveError, isLoading: archiveLoading, refetch: retryArchive } = useQuery({ queryKey: ['issues', 'canceled'], queryFn: () => api.tasks.list({ status: 'CANCELED' }) });
  const issues = useMemo(() => [...activeIssues, ...canceledIssues], [activeIssues, canceledIssues]);
  const { data: projects = [], isError: projectsError, refetch: retryProjects } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  const [activeIssue, setActiveIssue] = useState<IssueWithRelations | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'list' | 'calendar'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | "URGENT" | "HIGH" | "MEDIUM" | "LOW">('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(effectiveInitialProject);
  const [sortBy, setSortBy] = useState<'manual' | 'priority' | 'date' | 'title'>('manual');
  const [showCanceledArchive, setShowCanceledArchive] = useState(false);

  const canceledCount = useMemo(() => issues.filter(i => i.status === "CANCELED").length, [issues]);
  const visibleColumns = useMemo(() => showCanceledArchive ? [...STATUS_COLUMNS, CANCELED_COLUMN] : STATUS_COLUMNS, [showCanceledArchive]);

  useEffect(() => {
    if (lockedProjectId) {
      setSelectedProjectId(lockedProjectId);
    } else if (urlProject) {
      setSelectedProjectId(urlProject);
    }
  }, [lockedProjectId, urlProject]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("BACKLOG");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueWithRelations | null>(null);

  const createIssueMutation = useMutation({
    mutationFn: (data: { title: string; description: string; status: TaskStatus; priority: TaskPriority; estimateMinutes?: number; blockedById?: string | null; projectId?: string; dueDate?: string | null; scheduledDate?: string | null }) =>
      api.tasks.create({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority as any,
        estimateMinutes: data.estimateMinutes,
        projectId: lockedProjectId || data.projectId || null,
        blockedById: data.blockedById, dueDate: data.dueDate, scheduledDate: data.scheduledDate
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setCreateModalOpen(false);
      toast.success(`Created "${newIssue?.title || 'Directive'}"`, {
        description: `Added to ${(newIssue?.status || createStatus).replace('_', ' ')}.`
      });
    },
    onError: () => {
      toast.error('Failed to create directive');
    }
  });

  const updateIssueDetailMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IssueWithRelations> & { blockedById?: string | null } }) =>
      api.tasks.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setEditModalOpen(false);
      setEditingIssue(null);
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true });
      toast.success(`Updated "${updated?.title || 'Directive'}"`);
    },
    onError: () => {
      toast.error('Failed to update directive details');
    }
  });

  const handleCreateIssue = useCallback((status: TaskStatus = "BACKLOG") => {
    createIssueMutation.reset();
    setCreateStatus(status);
    setCreateModalOpen(true);
  }, [createIssueMutation]);

  const isDraggingRef = useRef(false);

  const handleEditIssue = useCallback((issue: IssueWithRelations) => {
    if (isDraggingRef.current) return;
    updateIssueDetailMutation.reset();
    setEditingIssue(issue);
    setEditModalOpen(true);
  }, [updateIssueDetailMutation]);

  const requestedTaskId = searchParams.get('task');
  const openedTaskId = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedTaskId) { openedTaskId.current = null; return; }
    if (openedTaskId.current === requestedTaskId || isLoadingIssues || archiveLoading) return;
    const requested = issues.find(issue => issue.id === requestedTaskId);
    if (!requested && (isError || archiveError)) return;
    openedTaskId.current = requestedTaskId;
    if (requested) handleEditIssue(requested);
    else toast.error('This task is unavailable in this workspace.');
  }, [requestedTaskId, issues, isLoadingIssues, archiveLoading, isError, archiveError, handleEditIssue]);

  const handleDeleteIssue = useCallback(async (issue: IssueWithRelations) => {
    try {
      await api.tasks.delete(issue.id);
      // Remove from both the active list and the canceled archive cache so an
      // archived directive disappears immediately too (exact keys don't prefix-match).
      const removeFromCache = (key: readonly unknown[]) =>
        queryClient.setQueryData<IssueWithRelations[]>(key, old => old?.filter(i => i.id !== issue.id));
      removeFromCache(['issues']);
      removeFromCache(['issues', 'canceled']);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(`Deleted "${issue.title}"`, {
        description: 'Directive removed.',
        action: {
          label: 'Undo',
          onClick: async () => {
            try { await api.tasks.restore(issue.id);
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
            toast.success(`Restored "${issue.title}"`); } catch { toast.error("Could not restore directive. Please try again."); }
          }
        },
        duration: 5000,
      });
    } catch {
      toast.error("Failed to delete directive");
    }
  }, [queryClient]);

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<IssueWithRelations> }) => api.tasks.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] });
      const previousIssues = queryClient.getQueryData<IssueWithRelations[]>(['issues']);
      queryClient.setQueryData<IssueWithRelations[]>(['issues'], old =>
        old?.map(issue => issue.id === id ? { ...issue, ...data } : issue)
      );
      const previousCanceled = queryClient.getQueryData<IssueWithRelations[]>(["issues", "canceled"]);
      queryClient.setQueryData<IssueWithRelations[]>(["issues", "canceled"], old => old?.map(issue => issue.id === id ? { ...issue, ...data } : issue));
      return { previousIssues, previousCanceled };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['issues'], context?.previousIssues);
      queryClient.setQueryData(['issues', 'canceled'], context?.previousCanceled);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reducedMotion = useReducedMotion();

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (issue.parentTaskId && issues.some(parent => parent.id === issue.parentTaskId)) return false;
      // Keep canceled directives out of every view (board columns, list, calendar)
      // unless the archive toggle is on — matches the board's column visibility.
      if (issue.status === 'CANCELED' && !showCanceledArchive) return false;
      const q = searchQuery.toLowerCase().trim();
      const directiveCode = `kr-${issue.id.replace(/[^a-zA-Z0-9]/g, '').slice(-3).toLowerCase()}`;
      const matchesSearch = q === '' || 
        issue.title.toLowerCase().includes(q) || 
        directiveCode.includes(q) ||
        (issue.description && issue.description.toLowerCase().includes(q));
      const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
      const matchesProject = selectedProjectId === 'all' || (selectedProjectId === 'operations' ? !issue.projectId : issue.projectId === selectedProjectId);

      return matchesSearch && matchesPriority && matchesProject;
    }).sort((a, b) => {
      if (sortBy === 'manual') return a.position - b.position || a.id.localeCompare(b.id);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'date') {
        const dateA = a.dueDate ? Date.parse(taskDay(a.dueDate)) : Number.POSITIVE_INFINITY;
        const dateB = b.dueDate ? Date.parse(taskDay(b.dueDate)) : Number.POSITIVE_INFINITY;
        return dateA - dateB;
      }
      // Default: priority sort
      const priorityWeights: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return a.position - b.position;
    });
  }, [issues, searchQuery, priorityFilter, selectedProjectId, sortBy, showCanceledArchive]);

  const moveRelative = (issue: IssueWithRelations, direction: number) => {
    const siblings = filteredIssues.filter(item => item.status === issue.status); const from = siblings.findIndex(item => item.id === issue.id); const target = from + direction;
    if (target < 0 || target >= siblings.length || updateIssueMutation.isPending) return;
    const rest = siblings.filter(item => item.id !== issue.id); const before = rest[target - 1]; const after = rest[target];
    const position = before && after ? (before.position + after.position) / 2 : before ? before.position + 1000 : after.position - 1000;
    updateIssueMutation.mutate({ id: issue.id, data: { position, version: issue.version } }, { onError: () => toast.error('Could not reorder directive. The board has been refreshed.') });
  };

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const issueCollision = pointerCollisions.find(
        c => c.id !== args.active.id && !STATUS_IDS.includes(c.id as string)
      );
      if (issueCollision) {
        return [issueCollision];
      }
      const columnCollision = pointerCollisions.find(
        c => STATUS_IDS.includes(c.id as string)
      );
      if (columnCollision) {
        return [columnCollision];
      }
      return pointerCollisions;
    }
    return closestCorners(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    const { active } = event;
    setActiveIssue(issues.find(i => i.id === active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    const { active, over } = event;
    if (!over || updateIssueMutation.isPending) return;

    if (sortBy !== 'manual') { toast.info('Choose Manual order to arrange directives.'); return; }
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIssueData = issues.find(i => i.id === activeId);
    if (!activeIssueData) return;

    let newStatus = activeIssueData.status;
    const overIssueData = issues.find(i => i.id === overId);

    if (STATUS_IDS.includes(overId)) {
      newStatus = overId as TaskStatus;
    } else if (overIssueData) {
      newStatus = overIssueData.status as TaskStatus;
    }

    let newPosition = activeIssueData.position;

    if (activeId !== overId) {
      const statusIssues = issues
        .filter(i => !i.parentTaskId && i.status === newStatus)
        .sort((a, b) => a.position - b.position);

      if (STATUS_IDS.includes(overId)) {
        // Dropped on empty space or column header
        const otherIssues = statusIssues.filter(i => i.id !== activeId);
        const lastCard = otherIssues[otherIssues.length - 1];
        newPosition = (lastCard?.position ?? 0) + 1000;
      } else {
        const filtered = statusIssues.filter(i => i.id !== activeId);
        let insertIndex = filtered.findIndex(i => i.id === overId);

        if (insertIndex === -1) {
          const lastCard = filtered[filtered.length - 1];
          newPosition = (lastCard?.position ?? 0) + 1000;
        } else {
          const activeIndex = statusIssues.findIndex(i => i.id === activeId);
          if (activeIssueData.status === newStatus && activeIndex !== -1 && activeIndex < insertIndex) {
            insertIndex += 1;
          }

          if (insertIndex === 0) {
            const firstCard = filtered[0];
            newPosition = firstCard ? (firstCard.position > 0 ? firstCard.position / 2 : firstCard.position - 500) : 1000;
          } else if (insertIndex >= filtered.length) {
            const lastCard = filtered[filtered.length - 1];
            newPosition = (lastCard?.position ?? 0) + 1000;
          } else {
            const aboveCard = filtered[insertIndex - 1];
            const belowCard = filtered[insertIndex];
            newPosition = ((aboveCard?.position ?? 0) + (belowCard?.position ?? (aboveCard?.position ?? 0) + 1000)) / 2;
            if (newPosition === aboveCard?.position || newPosition === belowCard?.position) {
              newPosition = (aboveCard?.position ?? 0) + 1;
            }
          }
        }
      }
    }

    if (activeIssueData.status !== newStatus || activeIssueData.position !== newPosition) {
      // onMutate applies the optimistic move (and captures rollback state before it),
      // onSettled re-syncs from the server — no manual cache writes needed here.
      updateIssueMutation.mutate(
        { id: activeId, data: { status: newStatus, position: newPosition, version: activeIssueData.version } },
        { onError: () => toast.error('Failed to move directive') }
      );
    }
  };

  const columnIssuesMap = useMemo(() => {
    const map: Record<string, IssueWithRelations[]> = {};
    for (const col of [...STATUS_COLUMNS, CANCELED_COLUMN]) map[col.id] = [];
    for (const issue of filteredIssues) {
      (map[issue.status] ??= []).push(issue);
    }
    return map;
  }, [filteredIssues]);

  if (isLoadingIssues) return <LoadingState variant="kanban" title="Loading Execution Board..." description="Organizing directives and dependencies..." />;
  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Execution Board"
          message="Could not fetch directives from the server. Please verify your connection."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['issues'] })}
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col min-w-0 w-full bg-canvas select-none overflow-hidden animate-in fade-in duration-150">
      {/* Page Header */}
      {!hideHeader && (
        <PageHeader
          icon={KanbanSquare}
          title="Execution Board"
          description="Organize work, move tasks through each stage, and keep dependencies visible."
          className="mx-6 mt-4 mb-2"
        >
          {/* View Switcher */}
          <div className="flex items-center bg-surface-hover/80 p-0.5 rounded-lg border border-border/80 shadow-2xs">
            {(['board', 'list', 'calendar'] as const).map((view) => {
              const icons = { board: LayoutGrid, list: List, calendar: Calendar };
              const labels = { board: 'Board', list: 'List', calendar: 'Calendar' };
              const V = icons[view];
              return (
                <button
                  key={view}
                  aria-pressed={activeView === view} onClick={() => setActiveView(view)}
                  className={cn(
                    'min-h-11 px-2.5 py-1 rounded-md flex items-center gap-1.5 text-badge font-mono font-semibold transition-all cursor-pointer',
                    activeView === view
                      ? 'bg-surface text-primary shadow-2xs'
                      : 'text-secondary hover:text-primary',
                  )}
                >
                  <V className="w-3.5 h-3.5" /> {labels[view]}
                </button>
              );
            })}
          </div>

          {/* New Directive */}
          <button
            onClick={() => handleCreateIssue('BACKLOG')}
            className="krama-btn krama-btn-primary px-3.5 py-2 text-caption font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Directive
          </button>
        </PageHeader>
      )}

      {/* 3. Filter Bar */}
      <div className={cn("px-6 pb-3 shrink-0", hideHeader ? "pt-3" : "pt-1")}>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border/60 rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative min-w-0 max-w-sm flex-1 basis-full sm:basis-auto">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search directives" placeholder="Search tasks, directives, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-surface border border-border/80 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-muted text-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors cursor-pointer"
                aria-label="Clear search" title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* All Projects Dropdown */}
          {!lockedProjectId && (
            <div className="relative">
              <select
                aria-label="Filter by project" value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
              >
                <option value="all">All Projects</option>
                <option value="operations">⚡ General Operations</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>📁 {p.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}


          {/* All Priorities Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by priority" value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>

        {/* Right Sort Dropdown & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort Priority */}
          <div className="relative">
            <select
              aria-label="Sort directives" value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
            >
              <option value="manual">Manual order</option>
              <option value="priority">Sort Priority</option>
              <option value="date">Sort Due Date</option>
              <option value="title">Sort Title</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Toggle Canceled Archive */}
          <button
            type="button"
            onClick={() => setShowCanceledArchive(prev => !prev)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
              showCanceledArchive
                ? "bg-accent-subtle text-accent-fg border-accent/30 font-semibold"
                : "bg-surface border border-border/80 text-secondary hover:text-primary"
            )}
            aria-pressed={showCanceledArchive} title="Toggle Canceled Directives Archive"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive{canceledCount > 0 ? ` (${canceledCount})` : ''}</span>
          </button>

          {/* Embedded View Switcher and Action Button when header is hidden */}
          {hideHeader && (
            <>
              <div className="flex items-center bg-surface-hover/80 p-0.5 rounded-lg border border-border/80 text-xs shadow-2xs ml-1">
                <button
                  onClick={() => setActiveView('board')}
                  className={cn(
                    "px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer",
                    activeView === 'board'
                      ? "bg-surface text-primary shadow-2xs font-semibold"
                      : "text-secondary hover:text-primary"
                  )}
                  title="Board View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveView('list')}
                  className={cn(
                    "px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer",
                    activeView === 'list'
                      ? "bg-surface text-primary shadow-2xs font-semibold"
                      : "text-secondary hover:text-primary"
                  )}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveView('calendar')}
                  className={cn(
                    "px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer",
                    activeView === 'calendar'
                      ? "bg-surface text-primary shadow-2xs font-semibold"
                      : "text-secondary hover:text-primary"
                  )}
                  title="Calendar View"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => handleCreateIssue("BACKLOG")}
                className="bg-accent hover:opacity-90 text-on-accent px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-sm hover:shadow cursor-pointer ml-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                New Directive
              </button>
          </>
          )}
        </div>
      </div>
      </div>

      {projectsError && <div className="mx-4"><ErrorState title="Could not load projects" onRetry={() => retryProjects()} /></div>}
      {showCanceledArchive && archiveLoading && <p role="status" className="px-4 text-secondary">Loading canceled tasks...</p>}
      {showCanceledArchive && archiveError && <div className="mx-4"><ErrorState title="Could not load canceled tasks" onRetry={() => retryArchive()} /></div>}
      {!filteredIssues.length && <p role="status" className="px-4 pb-3 text-sm text-secondary">No directives match this view. Clear the filters or create a directive.</p>}
      <p className="px-4 pb-2 text-xs text-secondary">Manual order supports dragging and Move up/down actions. Open a directive to change its status or dates.</p>
      {/* 4. Board Viewport - Fluid Notion-style responsive columns */}
      <div className="flex-1 min-h-0 min-w-0 w-full overflow-x-auto overflow-y-hidden px-4 md:px-6 pb-6 pt-1 select-none custom-scrollbar">
        {activeView === 'board' ? (
          <div className="h-full min-w-full w-max flex gap-4">
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => { setActiveIssue(null); isDraggingRef.current = false; }}
            >
              {visibleColumns.map((col) => {
                const columnIssues = columnIssuesMap[col.id] || [];
                return (
                  <div key={col.id} className="w-[280px] lg:w-[310px] shrink-0 h-full flex flex-col">
                    <Column
                      col={col}
                      issues={columnIssues}
                      onDelete={handleDeleteIssue}
                      onMove={sortBy === "manual" && !updateIssueMutation.isPending ? moveRelative : undefined}
                      onCreate={handleCreateIssue}
                      onClick={handleEditIssue}
                    />
                  </div>
                );
              })}

              <DragOverlay dropAnimation={{
                duration: reducedMotion ? 0 : 150,
                easing: 'ease-out'
              }}>
                {activeIssue ? <div className="p-4 rounded-xl bg-surface border border-accent shadow-xl"><p className="text-primary font-semibold">{activeIssue.title}</p>{getPriorityBadge(activeIssue.priority)}</div> : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : activeView === 'list' ? (
          /* List View Alternative */
          <div className="bg-surface rounded-2xl border border-border/80 overflow-y-auto max-h-full p-4 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted uppercase font-mono">
                  <th className="pb-3 font-semibold">Directive</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Project</th>
                  <th className="pb-3 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredIssues.map((issue) => (
                  <tr 
                    key={issue.id} 
                    onClick={() => handleEditIssue(issue)}
                    className="hover:bg-surface-hover/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-semibold text-primary"><button type="button" onClick={() => handleEditIssue(issue)} className="min-h-11 text-left break-words">{issue.title}</button></td>
                    <td className="py-3">
                      <span className="font-mono text-[11px] font-bold text-secondary">
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">{getPriorityBadge(issue.priority)}</td>
                    <td className="py-3 text-secondary">{issue.project?.name || 'General'}</td>
                    <td className="py-3 text-muted">{issue.dueDate ? format(parseLocalDate(taskDay(issue.dueDate))!, 'MMM d') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Calendar View Alternative */
          <div className="bg-surface rounded-2xl border border-border/80 overflow-y-auto max-h-full p-6 shadow-xs text-center">
            <Calendar className="w-8 h-8 text-accent mx-auto mb-2 stroke-[1.5]" />
            <h3 className="font-bold text-sm text-primary mb-1">Calendar Timeline</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto mb-4">
              Dated directives in chronological order; undated work appears last.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
              {[...filteredIssues].sort((a, b) => (taskDay(a.dueDate || a.scheduledDate) || "9999").localeCompare(taskDay(b.dueDate || b.scheduledDate) || "9999")).map((issue) => (
                <button type="button"
                  key={issue.id} 
                  onClick={() => handleEditIssue(issue)}
                  className="p-3 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-primary">{issue.title}</span>
                    {getPriorityBadge(issue.priority)}
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {issue.dueDate || issue.scheduledDate ? format(parseLocalDate(taskDay(issue.dueDate || issue.scheduledDate))!, 'MMM d, yyyy') : 'No target date'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <IssueCreateModal
        error={createIssueMutation.error?.message}
        open={createModalOpen}
        initialStatus={createStatus}
        defaultProjectId={!['all', 'operations'].includes(selectedProjectId) ? selectedProjectId : undefined}
        allIssues={issues}
        projects={projects}
        onClose={() => { if (!createIssueMutation.isPending) setCreateModalOpen(false); }}
        onSubmit={(data) => createIssueMutation.mutate(data)}
        isSubmitting={createIssueMutation.isPending}
      />

      {/* Detail / Edit Modal */}
      <IssueEditModal
        error={updateIssueDetailMutation.error?.message}
        open={editModalOpen}
        issue={editingIssue}
        onOpenTask={handleEditIssue}
        allIssues={issues}
        projects={projects}
        onClose={() => { if (!updateIssueDetailMutation.isPending) { setEditModalOpen(false); setEditingIssue(null); setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true }); } }}
        onSubmit={(id, data) => updateIssueDetailMutation.mutate({ id, data: data as any })}
        isSubmitting={updateIssueDetailMutation.isPending}
      />
    </div>
  );
}
