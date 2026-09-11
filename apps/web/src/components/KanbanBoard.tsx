import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
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
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { 
  CircleDashed, CheckCircle, CheckCircle2, ListChecks, 
  Search, Plus, AlertCircle, X, KanbanSquare, Clock, 
  Folder, CheckSquare, MoreVertical, Bell, ChevronRight, ChevronDown, 
  LayoutGrid, List, Calendar, Inbox, Trash2, Edit2, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

// Four core status columns as specified in reference design
const STATUS_COLUMNS = [
  {
    id: "BACKLOG" as TaskStatus,
    title: "Backlog",
    subtitle: "Ideas and upcoming work",
    icon: Inbox,
    iconColor: "text-blue-500",
    bgLight: "bg-[#F0F6FF]/70 border-[#D0E2FF]/80 dark:bg-[#0B1528]/40 dark:border-[#1E3A8A]/40",
    topBorder: "border-t-[3px] border-t-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    addText: "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30",
  },
  {
    id: "IN_PROGRESS" as TaskStatus,
    title: "In Progress",
    subtitle: "Actively being worked on",
    icon: CircleDashed,
    iconColor: "text-amber-500",
    bgLight: "bg-[#FFF9EB]/70 border-[#FDE68A]/80 dark:bg-[#201806]/40 dark:border-[#78350F]/40",
    topBorder: "border-t-[3px] border-t-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    addText: "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30",
  },
  {
    id: "REVIEW" as TaskStatus,
    title: "Review",
    subtitle: "In review or awaiting feedback",
    icon: CheckCircle,
    iconColor: "text-purple-500",
    bgLight: "bg-[#FAF5FF]/70 border-[#E9D5FF]/80 dark:bg-[#1C0F2D]/40 dark:border-[#581C87]/40",
    topBorder: "border-t-[3px] border-t-purple-500",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    addText: "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30",
  },
  {
    id: "DONE" as TaskStatus,
    title: "Done",
    subtitle: "Completed and shipped",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    bgLight: "bg-[#F0FDF4]/70 border-[#BBF7D0]/80 dark:bg-[#061F12]/40 dark:border-[#065F46]/40",
    topBorder: "border-t-[3px] border-t-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    addText: "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30",
  },
];

const STATUS_IDS = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"];

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "URGENT":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40">
          Urgent
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/80 dark:border-red-900/40">
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/40">
          MEDIUM
        </span>
      );
    case "LOW":
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/40">
          LOW
        </span>
      );
  }
}

function IssueCard({
  issue,
  isDragging,
  onDelete,
  onClick
}: {
  issue: IssueWithRelations;
  index?: number;
  isDragging?: boolean;
  onDelete?: (issue: IssueWithRelations) => void;
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

  const completedSubtasks = issue.childTasks?.filter((c: { status: string }) => c.status === "DONE" || c.status === "REVIEW").length || 0;
  const totalSubtasks = issue.childTasks?.length || 0;
  const subtaskPct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const hasDependencies = Boolean(issue.blockedBy) || (issue.blocking && issue.blocking.length > 0);

  // Format due date e.g. "Sep 15"
  const formattedDate = useMemo(() => {
    if (issue.dueDate) {
      try {
        return format(new Date(issue.dueDate), 'MMM d');
      } catch {
        return null;
      }
    }
    if (issue.scheduledDate) {
      try {
        return format(new Date(issue.scheduledDate), 'MMM d');
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
              aria-label="Directive actions"
              className="p-1 -mr-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
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
          {issue.blockedBy && (
            <span
              title={`Blocked by: ${issue.blockedBy.title}`}
              className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full"
            >
              <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" />
              Blocked: {issue.blockedBy.title}
            </span>
          )}
          {issue.blocking && issue.blocking.length > 0 && (
            <span
              title={`Blocking: ${issue.blocking.map((b: any) => b.title).join(', ')}`}
              className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full"
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
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
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
              {issue.estimateMinutes}h
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Column({
  col,
  issues,
  onDelete,
  onCreate,
  onClick,
}: {
  col: (typeof STATUS_COLUMNS)[number];
  issues: IssueWithRelations[];
  onDelete?: (issue: IssueWithRelations) => void;
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
      className={cn(
        "w-full min-w-0 box-border h-full flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden shadow-2xs",
        col.bgLight,
        isOver && "ring-2 ring-primary/60 bg-accent/10 border-primary"
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "px-4 py-3.5 flex flex-col gap-1 bg-surface/80 dark:bg-surface/50 border-b border-border/70 shrink-0",
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
              className="w-6 h-6 flex items-center justify-center rounded-full bg-surface border border-border/80 text-secondary hover:text-primary hover:bg-surface-hover shadow-2xs transition-colors cursor-pointer"
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
                <IssueCard key={issue.id} issue={issue} index={idx} onDelete={onDelete} onClick={onClick} />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
}

export function IssueCreateModal({
  open,
  initialStatus,
  initialSprintId,
  allIssues,
  projects = [],
  sprints = [],
  defaultProjectId,
  onClose,
  onSubmit,
  isSubmitting
}: {
  open: boolean;
  initialStatus: TaskStatus;
  initialSprintId?: string | null;
  allIssues: IssueWithRelations[];
  projects?: { id: string; name: string }[];
  sprints?: { id: string; name: string; status: string }[];
  defaultProjectId?: string;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; status: TaskStatus; priority: TaskPriority; estimateMinutes?: number; blockedById?: string | null; projectId?: string; sprintId?: string | null; dueDate?: string; scheduledDate?: string }) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus || "BACKLOG");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [estimate, setEstimate] = useState(2);
  const [blockedById, setBlockedById] = useState<string | null>(null);
  const [selectedProjId, setSelectedProjId] = useState<string>(defaultProjectId || '');
  const [selectedSprintId, setSelectedSprintId] = useState<string>(initialSprintId || '');

  useEffect(() => {
    if (open) {
      if (initialStatus) setStatus(initialStatus);
      if (initialSprintId !== undefined) setSelectedSprintId(initialSprintId || '');
      if (defaultProjectId) setSelectedProjId(defaultProjectId);
    }
  }, [open, initialStatus, initialSprintId, defaultProjectId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      estimateMinutes: Number(estimate) || 0,
      blockedById,
      projectId: selectedProjId || undefined,
      sprintId: selectedSprintId || null
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="v4-card w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <ListChecks className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-card text-primary font-bold">Create New Directive</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Project Scope
              </label>
              <select
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
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Sprint
              </label>
              <select
                value={selectedSprintId}
                onChange={e => setSelectedSprintId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                <option value="">None (Backlog / General)</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Directive Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Implement user authentication"
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add key context, dependencies, or scope..."
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary placeholder:text-muted resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Column / Status
              </label>
              <select
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
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Priority
              </label>
              <select
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
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Estimate (Hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimate}
              onChange={e => setEstimate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary"
            />
          </div>

          <div>
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Blocked By (Dependency)
            </label>
            <select
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
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
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
  sprints = [],
  onClose,
  onSubmit,
  isSubmitting
}: {
  open: boolean;
  issue: IssueWithRelations | null;
  allIssues: IssueWithRelations[];
  projects?: { id: string; name: string }[];
  sprints?: { id: string; name: string; status: string }[];
  onClose: () => void;
  onSubmit: (id: string, data: Partial<IssueWithRelations> & { blockedById?: string | null; sprintId?: string | null; projectId?: string | null }) => void;
  isSubmitting: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>("BACKLOG");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [estimate, setEstimate] = useState(2);
  const [blockedById, setBlockedById] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (issue && open) {
      setTitle(issue.title || '');
      setDescription(issue.description || '');
      setStatus(issue.status === "TODO" ? "BACKLOG" : (issue.status as TaskStatus));
      setPriority(issue.priority as TaskPriority);
      setEstimate(issue.estimateMinutes || 2);
      setBlockedById(issue.blockedById || null);
      setProjectId(issue.projectId || null);
      setSprintId(issue.sprintId || null);
    }
  }, [issue, open]);

  if (!open || !issue) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(issue.id, {
      title: title.trim(),
      description: description.trim(),
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      estimateMinutes: Number(estimate) || 0,
      blockedById: blockedById || null,
      projectId: projectId || null,
      sprintId: sprintId || null
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      setIsSubmittingComment(true);
      await api.tasks.addComment(issue.id, newComment.trim());
      setNewComment('');
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
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="v4-card w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold font-mono text-xs">
              KR
            </div>
            <h3 className="text-card text-primary font-bold">Directive Details</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Directive Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary"
            />
          </div>

          <div>
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Column / Status
              </label>
              <select
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
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Priority
              </label>
              <select
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Project Scope
              </label>
              <select
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

            <div>
              <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
                Sprint Assignment
              </label>
              <select
                value={sprintId || ''}
                onChange={e => setSprintId(e.target.value || null)}
                className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                <option value="">None (Backlog / General)</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Estimate (Hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimate}
              onChange={e => setEstimate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-accent text-primary"
            />
          </div>

          <div>
            <label className="block text-caption font-mono uppercase tracking-wider text-muted mb-1.5 font-medium">
              Blocked By (Dependency)
            </label>
            <select
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

          {/* Activity / Comments Stream */}
          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="text-sm font-semibold text-primary">Activity & Discussion</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {!issue.comments || issue.comments.length === 0 ? (
                <p className="text-xs text-secondary italic">No comments yet.</p>
              ) : (
                issue.comments.map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-surface-hover/60 border border-border/50 text-xs">
                    <div className="flex items-center justify-between mb-1 text-[11px] text-muted">
                      <span className="font-semibold text-primary">{c.user?.name || 'User'}</span>
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
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
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

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: issues = [], isLoading: isLoadingIssues, isError } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: sprints = [] } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });

  const [activeIssue, setActiveIssue] = useState<IssueWithRelations | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'list' | 'calendar'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | "URGENT" | "HIGH" | "MEDIUM" | "LOW">('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'project'>('status');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'title'>('priority');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("BACKLOG");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueWithRelations | null>(null);

  const createIssueMutation = useMutation({
    mutationFn: (data: { title: string; description: string; status: TaskStatus; priority: TaskPriority; estimateMinutes?: number; blockedById?: string | null; projectId?: string; sprintId?: string | null }) =>
      api.tasks.create({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority as any,
        estimateMinutes: data.estimateMinutes,
        assignee: 'me',
        projectId: data.projectId || null,
        sprintId: data.sprintId ?? (selectedSprintId !== 'all' ? selectedSprintId : null),
        labels: [],
        blockedById: data.blockedById
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
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
    mutationFn: ({ id, data }: { id: string; data: Partial<IssueWithRelations> & { blockedById?: string | null; sprintId?: string | null } }) =>
      api.tasks.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      setEditModalOpen(false);
      setEditingIssue(null);
      toast.success(`Updated "${updated?.title || 'Directive'}"`);
    },
    onError: () => {
      toast.error('Failed to update directive details');
    }
  });

  const handleCreateIssue = (status: TaskStatus = "BACKLOG") => {
    setCreateStatus(status);
    setCreateModalOpen(true);
  };

  const isDraggingRef = useRef(false);

  const handleEditIssue = (issue: IssueWithRelations) => {
    if (isDraggingRef.current) return;
    setEditingIssue(issue);
    setEditModalOpen(true);
  };

  const handleDeleteIssue = async (issue: IssueWithRelations) => {
    try {
      await api.tasks.delete(issue.id);
      queryClient.setQueryData<IssueWithRelations[]>(['issues'], old => old?.filter(i => i.id !== issue.id));
      toast.success(`Deleted "${issue.title}"`, {
        description: 'Directive removed.',
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.tasks.restore(issue.id);
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            toast.success(`Restored "${issue.title}"`);
          }
        },
        duration: 5000,
      });
    } catch {
      toast.error("Failed to delete directive");
    }
  };

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<IssueWithRelations> }) => api.tasks.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] });
      const previousIssues = queryClient.getQueryData<IssueWithRelations[]>(['issues']);
      queryClient.setQueryData<IssueWithRelations[]>(['issues'], old =>
        old?.map(issue => issue.id === id ? { ...issue, ...data } : issue)
      );
      return { previousIssues };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['issues'], context?.previousIssues);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Extract unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const names = new Set<string>();
    issues.forEach(i => {
      if (i.assignee?.name) names.add(i.assignee.name);
    });
    return Array.from(names);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (issue.parentTaskId) return false;
      const q = searchQuery.toLowerCase().trim();
      const directiveCode = `kr-${issue.id.replace(/[^a-zA-Z0-9]/g, '').slice(-3).toLowerCase()}`;
      const matchesSearch = q === '' || 
        issue.title.toLowerCase().includes(q) || 
        directiveCode.includes(q) ||
        (issue.description && issue.description.toLowerCase().includes(q));
      const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
      const matchesProject = selectedProjectId === 'all' || (selectedProjectId === 'operations' ? !issue.projectId : issue.projectId === selectedProjectId);
      const matchesAssignee = selectedAssignee === 'all' || issue.assignee?.name === selectedAssignee;
      const matchesSprint = selectedSprintId === 'all' || issue.sprintId === selectedSprintId;

      return matchesSearch && matchesPriority && matchesProject && matchesAssignee && matchesSprint;
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'date') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateA - dateB;
      }
      // Default: priority sort
      const priorityWeights: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return a.position - b.position;
    });
  }, [issues, searchQuery, priorityFilter, selectedProjectId, selectedAssignee, selectedSprintId, sortBy]);

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
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIssueData = issues.find(i => i.id === activeId);
    if (!activeIssueData) return;

    let newStatus = activeIssueData.status;
    const overIssueData = issues.find(i => i.id === overId);

    if (STATUS_IDS.includes(overId)) {
      newStatus = overId as TaskStatus;
    } else if (overIssueData) {
      newStatus = (overIssueData.status === "TODO" ? "BACKLOG" : overIssueData.status) as TaskStatus;
    }

    let newPosition = activeIssueData.position;

    if (activeId !== overId) {
      const statusIssues = issues
        .filter(i => !i.parentTaskId && (newStatus === "BACKLOG" ? (i.status === "BACKLOG" || i.status === "TODO") : i.status === newStatus))
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
      queryClient.setQueryData(['issues'], (old: any) => {
        if (!old) return old;
        return old.map((i: any) => i.id === activeId ? { ...i, status: newStatus, position: newPosition } : i);
      });

      updateIssueMutation.mutate({ id: activeId, data: { status: newStatus, position: newPosition } }, {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['issues'] });
          toast.error('Failed to move directive');
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['issues'] });
        }
      });
    }
  };

  const openIssuesCount = issues.filter((i: any) => i.status !== "DONE" && i.status !== "CANCELED").length;

  const getColumnIssues = (colId: TaskStatus) => {
    if (colId === "BACKLOG") {
      return filteredIssues.filter(i => i.status === "BACKLOG" || i.status === "TODO");
    }
    return filteredIssues.filter(i => i.status === colId);
  };

  if (isLoadingIssues) return <LoadingState variant="kanban" title="Loading Execution Board..." description="Organizing sprint directives and dependencies..." />;
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
    <div className="h-full flex flex-col min-w-0 w-full bg-canvas select-none overflow-hidden animate-in fade-in duration-150">
      {/* 1. Top Header */}
      <div className="border-b border-border/70 px-6 py-2.5 flex items-center justify-between shrink-0 bg-surface/60 backdrop-blur-md">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors">Execution</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted/70" />
          <span className="text-primary font-semibold">Board</span>
        </div>

        {/* Right: Quick Search, Notifications, User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-cmdk'))}
            className="flex items-center gap-2 bg-surface-hover/80 hover:bg-surface-hover border border-border/80 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition-all cursor-pointer shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search anything...</span>
            <kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-secondary">Ctrl K</kbd>
          </button>

          <button
            title="Notifications"
            className="relative p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover border border-transparent hover:border-border/80 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-surface" />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-border/70 cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'SP'}
            </div>
            <span className="text-xs font-semibold text-primary group-hover:text-accent transition-colors">
              {user?.name || 'Sudhanshu'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* 2. Page Header */}
      <div className="px-6 pt-4 pb-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <KanbanSquare className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-primary tracking-tight">Execution Board</h1>
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold">
                {openIssuesCount} active directives
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Drag and drop directives across sprint stages. Bounded mission execution canvas.
            </p>
          </div>
        </div>

        {/* Right side: View Switcher + New Directive button */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted">View:</span>
            <div className="flex items-center bg-surface-hover/80 p-0.5 rounded-lg border border-border/80 text-xs shadow-2xs">
              <button
                onClick={() => setActiveView('board')}
                className={cn(
                  "px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all cursor-pointer",
                  activeView === 'board'
                    ? "bg-surface text-primary shadow-2xs font-semibold"
                    : "text-secondary hover:text-primary"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Board
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={cn(
                  "px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all cursor-pointer",
                  activeView === 'list'
                    ? "bg-surface text-primary shadow-2xs font-semibold"
                    : "text-secondary hover:text-primary"
                )}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setActiveView('calendar')}
                className={cn(
                  "px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all cursor-pointer",
                  activeView === 'calendar'
                    ? "bg-surface text-primary shadow-2xs font-semibold"
                    : "text-secondary hover:text-primary"
                )}
              >
                <Calendar className="w-3.5 h-3.5" /> Calendar
              </button>
            </div>
          </div>

          <button
            onClick={() => handleCreateIssue("BACKLOG")}
            className="bg-[#2563EB] hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-sm hover:shadow cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Directive
          </button>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="px-6 pb-3 pt-1 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks, directives, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-surface border border-border/80 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-muted text-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* All Projects Dropdown */}
          <div className="relative">
            <select
              value={selectedProjectId}
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

          {/* All Assignees Dropdown */}
          <div className="relative">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">All Assignees</option>
              {uniqueAssignees.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* All Priorities Dropdown */}
          <div className="relative">
            <select
              value={priorityFilter}
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

          {/* All Sprints Dropdown */}
          <div className="relative">
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">All Sprints</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Group By & Sort Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Group By Status */}
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
            >
              <option value="status">Group by Status</option>
              <option value="priority">Group by Priority</option>
              <option value="project">Group by Project</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Priority */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
            >
              <option value="priority">Sort Priority</option>
              <option value="date">Sort Due Date</option>
              <option value="title">Sort Title</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. Board Viewport - Concrete 4-column container with zero horizontal slide bar */}
      <div className="flex-1 min-w-0 w-full overflow-x-auto overflow-y-hidden px-6 pb-6 pt-1 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeView === 'board' ? (
          <div className="w-full h-full min-w-0 grid grid-cols-4 gap-4">
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {STATUS_COLUMNS.map((col) => {
                const columnIssues = getColumnIssues(col.id);
                return (
                  <Column
                    key={col.id}
                    col={col}
                    issues={columnIssues}
                    onDelete={handleDeleteIssue}
                    onCreate={handleCreateIssue}
                    onClick={handleEditIssue}
                  />
                );
              })}

              <DragOverlay dropAnimation={{
                duration: 150,
                easing: 'ease-out'
              }}>
                {activeIssue ? <IssueCard issue={activeIssue} isDragging onDelete={handleDeleteIssue} /> : null}
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
                    <td className="py-3 font-semibold text-primary">{issue.title}</td>
                    <td className="py-3">
                      <span className="font-mono text-[11px] font-bold text-secondary">
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">{getPriorityBadge(issue.priority)}</td>
                    <td className="py-3 text-secondary">{issue.project?.name || 'General'}</td>
                    <td className="py-3 text-muted">{issue.dueDate ? format(new Date(issue.dueDate), 'MMM d') : '-'}</td>
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
              Directives mapped across sprint milestone calendar dates.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
              {filteredIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  onClick={() => handleEditIssue(issue)}
                  className="p-3 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-primary">{issue.title}</span>
                    {getPriorityBadge(issue.priority)}
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {issue.dueDate ? format(new Date(issue.dueDate), 'MMM d, yyyy') : 'No target date'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <IssueCreateModal
        open={createModalOpen}
        initialStatus={createStatus}
        initialSprintId={selectedSprintId !== 'all' ? selectedSprintId : null}
        allIssues={issues}
        projects={projects}
        sprints={sprints}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={(data) => createIssueMutation.mutate(data)}
        isSubmitting={createIssueMutation.isPending}
      />

      {/* Detail / Edit Modal */}
      <IssueEditModal
        open={editModalOpen}
        issue={editingIssue}
        allIssues={issues}
        projects={projects}
        sprints={sprints}
        onClose={() => { setEditModalOpen(false); setEditingIssue(null); }}
        onSubmit={(id, data) => updateIssueDetailMutation.mutate({ id, data: data as any })}
        isSubmitting={updateIssueDetailMutation.isPending}
      />
    </div>
  );
}
