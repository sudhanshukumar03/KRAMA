import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IssueWithRelations } from '../types/schema';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { Circle, CircleDot, CircleDashed, CheckCircle, CheckCircle2, ListChecks, Search, Filter, Plus, User, Trash2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];

function getStatusIcon(status: string) {
  switch (status) {
    case 'backlog': return <Circle className="w-3.5 h-3.5 text-muted stroke-[1.5]" />;
    case 'todo': return <CircleDot className="w-3.5 h-3.5 text-secondary stroke-[1.5]" />;
    case 'in_progress': return <CircleDashed className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#00E5FF] stroke-[1.5] animate-spin-slow" />;
    case 'review': return <CheckCircle className="w-3.5 h-3.5 text-[#7C3AED] dark:text-[#A78BFA] stroke-[1.5]" />;
    case 'testing': return <CheckCircle className="w-3.5 h-3.5 text-secondary stroke-[1.5]" />;
    case 'done': return <CheckCircle2 className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" />;
    case 'released': return <CheckCircle2 className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" />;
    default: return <Circle className="w-3.5 h-3.5 stroke-[1.5]" />;
  }
}

function IssueCard({ issue, isDragging, onDelete, onClick }: { issue: IssueWithRelations, isDragging?: boolean, onDelete?: (issue: IssueWithRelations) => void, onClick?: (issue: IssueWithRelations) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const isUrgent = issue.priority === 'urgent';
  const isHigh = issue.priority === 'high';

  const completedSubtasks = issue.childIssues?.filter((c: { status: string }) => c.status === 'done').length || 0;
  const totalSubtasks = issue.childIssues?.length || 0;
  const subtaskPct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const hasDependencies = (issue.blockedBy && issue.blockedBy.length > 0) || (issue.blocking && issue.blocking.length > 0);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => onClick && onClick(issue)}
      className={cn(
        "p-3 rounded-xl border border-border bg-surface text-sm cursor-grab active:cursor-grabbing hover:border-[#2563EB]/60 dark:hover:border-[#00E5FF]/60 transition-all duration-200 group relative hover:shadow-sm",
        isDragging && "scale-[1.02] shadow-md opacity-95 border-[#2563EB] dark:border-[#00E5FF] ring-1 ring-[#2563EB] dark:ring-[#00E5FF] z-50 cursor-grabbing bg-surface-hover"
      )}
    >
      {/* Top Bar: Always visible minimal header */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-mono text-[10px] text-muted font-bold tracking-wider group-hover:text-primary transition-colors">{issue.id}</span>
        <div className="flex items-center gap-1.5">
          {/* Show Blocked warning dot by default if blocked */}
          {issue.blockedBy && issue.blockedBy.length > 0 && (
            <span title="Blocked by dependencies" className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
          )}
          <span className={cn(
            "px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-widest border",
            isUrgent ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30 animate-pulse" 
            : isHigh ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" 
            : "bg-surface-hover text-secondary border-border"
          )}>
            {issue.priority}
          </span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(issue);
              }}
              title="Delete Directive"
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#DC2626]/10 rounded text-muted hover:text-[#DC2626] transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3 stroke-[1.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Task Title: Clean high-contrast typography */}
      <div className="font-medium text-primary line-clamp-2 group-hover:text-[#2563EB] dark:group-hover:text-[#00E5FF] transition-colors leading-snug">
        {issue.title}
      </div>

      {/* HOVER REVEAL SECTION: Linear-style progressive disclosure (hidden by default, slides down on hover) */}
      <div className="max-h-0 opacity-0 group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-3 group-hover:pt-3 group-hover:border-t group-hover:border-border/60 transition-all duration-200 overflow-hidden space-y-2.5">
        
        {/* Dependency Badges */}
        {hasDependencies && (
          <div className="flex flex-wrap gap-1.5">
            {issue.blockedBy && issue.blockedBy.length > 0 && (
              <span 
                title={`Blocked by: ${issue.blockedBy.map((b: any) => b.title).join(', ')}`}
                className="px-2 py-0.5 rounded bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full"
              >
                <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" />
                Blocked: {issue.blockedBy.map((b: any) => b.id.slice(0, 6).toUpperCase()).join(', ')}
              </span>
            )}
            {issue.blocking && issue.blocking.length > 0 && (
              <span 
                title={`Blocking: ${issue.blocking.map((b: any) => b.title).join(', ')}`}
                className="px-2 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full"
              >
                <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" />
                Blocking: {issue.blocking.length} {issue.blocking.length === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>
        )}

        {/* Subtask Telemetry Bar */}
        {totalSubtasks > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-secondary font-mono">
              <span>Sub-tasks</span>
              <span className="text-primary font-bold">{completedSubtasks}/{totalSubtasks}</span>
            </div>
            <div className="h-1 w-full bg-surface-hover rounded-full overflow-hidden border border-border/40">
              <div className="h-full bg-[#2563EB] dark:bg-[#00E5FF] transition-all duration-300 ease-out" style={{ width: `${subtaskPct}%` }} />
            </div>
          </div>
        )}

        {/* Assignee Avatar & Estimate Row */}
        <div className="flex items-center justify-between text-xs text-secondary font-mono pt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-surface-hover border border-border flex items-center justify-center text-[9px] font-bold text-primary">
              <User className="w-2.5 h-2.5 stroke-[1.5]" />
            </div>
            <span className="text-[11px] font-normal truncate max-w-[120px] text-muted">{issue.assignee ? 'Assignee' : 'Solo Builder'}</span>
          </div>
          {issue.estimate && (
            <span className="text-[10px] bg-surface-hover px-1.5 py-0.5 rounded border border-border text-primary font-bold">{issue.estimate}h est</span>
          )}
        </div>

      </div>
    </div>
  );
}

function Column({ title, issues, isLast, onDelete, onCreate, onClick }: { id: string, title: string, issues: IssueWithRelations[], isLast: boolean, onDelete?: (issue: IssueWithRelations) => void, onCreate?: (status: string) => void, onClick?: (issue: IssueWithRelations) => void }) {
  return (
    <div className={cn(
      "flex flex-col w-[300px] flex-shrink-0 bg-surface h-full",
      !isLast && "border-r border-border"
    )}>
      <div className={cn(
        "px-4 py-3 font-medium text-sm text-primary flex justify-between items-center bg-surface-hover/50 border-b border-border relative",
        title === 'todo' && "border-t-2 border-t-[#6B7280]",
        title === 'in_progress' && "border-t-2 border-t-[#2563EB] dark:border-t-[#00E5FF]",
        title === 'blocked' && "border-t-2 border-t-[#DC2626]",
        title === 'review' && "border-t-2 border-t-[#7C3AED] dark:border-t-[#A78BFA]",
        title === 'done' && "border-t-2 border-t-[#109868]"
      )}>
        <div className="flex items-center gap-2">
          {getStatusIcon(title)}
          <span className="capitalize font-mono font-bold text-xs tracking-wider text-primary">{title.replace('_', ' ')}</span>
        </div>
        <span className="bg-surface border border-border px-2 py-0.5 rounded font-mono text-[10px] text-secondary font-bold shadow-2xs">{issues.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 flex flex-col justify-between">
        <div className="space-y-2.5">
          {issues.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <ListChecks className="w-5 h-5 text-muted mb-1.5 stroke-[1.5]" />
              <span className="text-xs text-muted font-normal">No issues in {title.replace('_', ' ')}</span>
            </div>
          ) : (
            <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {issues.map(issue => (
                <IssueCard key={issue.id} issue={issue} onDelete={onDelete} onClick={onClick} />
              ))}
            </SortableContext>
          )}
        </div>

        {/* Inline + Quick Add Button */}
        <button 
          onClick={() => onCreate ? onCreate(title) : toast.info(`Quick add task to ${title.replace('_', ' ')}`)}
          className="w-full mt-2 py-2 border border-dashed border-border hover:border-[#111827] hover:bg-surface-hover rounded-lg text-xs font-medium text-muted hover:text-primary transition-all flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" /> Quick Add
        </button>
      </div>
    </div>
  );
}

function IssueCreateModal({
  open,
  initialStatus,
  allIssues,
  onClose,
  onSubmit,
  isSubmitting
}: {
  open: boolean;
  initialStatus: string;
  allIssues: IssueWithRelations[];
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; status: string; priority: string; estimate: number; blockedByIds: string[] }) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(initialStatus || 'todo');
  const [priority, setPriority] = useState('medium');
  const [estimate, setEstimate] = useState(2);
  const [blockedByIds, setBlockedByIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && initialStatus) setStatus(initialStatus);
  }, [open, initialStatus]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), status, priority, estimate: Number(estimate) || 0, blockedByIds });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <ListChecks className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-base font-medium text-[#111827]">Create New Task / Issue</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
              Task Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Implement OAuth2 Login Flow"
              required
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] placeholder:text-muted focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add technical details, acceptance criteria, or context..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] placeholder:text-muted focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
                Column / Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all capitalize"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
                Estimate (hrs)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={estimate}
                onChange={e => setEstimate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" /> Dependencies (Blocked By)
            </label>
            <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-2.5 space-y-1.5 bg-surface-hover/50">
              {allIssues.length === 0 ? (
                <div className="text-xs text-muted italic text-center py-2">No other tasks available to link as dependencies</div>
              ) : (
                allIssues.map(other => {
                  const isChecked = blockedByIds.includes(other.id);
                  return (
                    <label key={other.id} className="flex items-center gap-2 text-xs text-[#111827] cursor-pointer hover:bg-surface p-1.5 rounded transition-colors border border-transparent hover:border-border">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setBlockedByIds([...blockedByIds, other.id]);
                          } else {
                            setBlockedByIds(blockedByIds.filter(id => id !== other.id));
                          }
                        }}
                        className="rounded border-border text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="font-mono text-secondary text-[10px] bg-surface border border-border px-1 py-0.5 rounded">#{other.id.slice(-4)}</span>
                      <span className="truncate flex-1 font-medium">{other.title}</span>
                      <span className="text-[10px] text-muted uppercase capitalize">{other.status.replace('_', ' ')}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-secondary mt-1">Select any tasks that must be completed before this task can start.</p>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3 shrink-0">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function IssueEditModal({
  open,
  issue,
  allIssues,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  issue: IssueWithRelations | null;
  allIssues: IssueWithRelations[];
  onClose: () => void;
  onSubmit: (id: string, data: { title?: string; description?: string; status?: string; priority?: string; estimate?: number; blockedByIds?: string[] }) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [estimate, setEstimate] = useState(2);
  const [blockedByIds, setBlockedByIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && issue) {
      setTitle(issue.title || '');
      setDescription(issue.description || '');
      setStatus(issue.status || 'todo');
      setPriority(issue.priority || 'medium');
      setEstimate(issue.estimate ?? 2);
      setBlockedByIds(issue.blockedBy?.map((b: any) => b.id) || []);
    }
  }, [open, issue]);

  if (!open || !issue) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(issue.id, {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      estimate: Number(estimate) || 0,
      blockedByIds,
    });
  };

  const otherIssues = allIssues.filter(i => i.id !== issue.id);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <ListChecks className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-base font-medium text-[#111827]">Edit Task #{issue.id.slice(-4)}</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
              Task Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] placeholder:text-muted focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] placeholder:text-muted focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
                Column / Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all capitalize"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5">
                Estimate (hrs)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={estimate}
                onChange={e => setEstimate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-[#111827] bg-surface focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-secondary uppercase mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" /> Dependencies (Blocked By)
            </label>
            <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-2.5 space-y-1.5 bg-surface-hover/50">
              {otherIssues.length === 0 ? (
                <div className="text-xs text-muted italic text-center py-2">No other tasks available to link as dependencies</div>
              ) : (
                otherIssues.map(other => {
                  const isChecked = blockedByIds.includes(other.id);
                  return (
                    <label key={other.id} className="flex items-center gap-2 text-xs text-[#111827] cursor-pointer hover:bg-surface p-1.5 rounded transition-colors border border-transparent hover:border-border">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setBlockedByIds([...blockedByIds, other.id]);
                          } else {
                            setBlockedByIds(blockedByIds.filter(id => id !== other.id));
                          }
                        }}
                        className="rounded border-border text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="font-mono text-secondary text-[10px] bg-surface border border-border px-1 py-0.5 rounded">#{other.id.slice(-4)}</span>
                      <span className="truncate flex-1 font-medium">{other.title}</span>
                      <span className="text-[10px] text-muted uppercase capitalize">{other.status.replace('_', ' ')}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-secondary mt-1">Select any tasks that must be completed before this task can start.</p>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3 shrink-0">
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
  const { data: issues = [], isLoading, isError } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  
  const [activeIssue, setActiveIssue] = useState<IssueWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState('todo');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueWithRelations | null>(null);

  const createIssueMutation = useMutation({
    mutationFn: (data: { title: string; description: string; status: string; priority: string; estimate: number; blockedByIds?: string[] }) =>
      api.issues.create({
        title: data.title,
        description: data.description,
        status: data.status as any,
        priority: data.priority as any,
        estimate: data.estimate,
        assignee: 'me',
        projectId: projects[0]?.id,
        labels: [],
        blockedByIds: data.blockedByIds || []
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setCreateModalOpen(false);
      toast.success(`Created "${newIssue?.title || 'Task'}"`, {
        description: `Added to ${(newIssue?.status || createStatus).replace('_', ' ')}.`
      });
    },
    onError: () => {
      toast.error('Failed to create task');
    }
  });

  const updateIssueDetailMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IssueWithRelations> & { blockedByIds?: string[] } }) =>
      api.issues.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setEditModalOpen(false);
      setEditingIssue(null);
      toast.success(`Updated "${updated?.title || 'Task'}"`);
    },
    onError: () => {
      toast.error('Failed to update task details');
    }
  });

  const handleCreateIssue = (status: string = 'todo') => {
    if (projects.length === 0) {
      toast.error('No project found. Create a project first!');
      return;
    }
    setCreateStatus(status);
    setCreateModalOpen(true);
  };

  const handleEditIssue = (issue: IssueWithRelations) => {
    setEditingIssue(issue);
    setEditModalOpen(true);
  };

  const handleDeleteIssue = async (issue: IssueWithRelations) => {
    try {
      const res = await api.issues.delete(issue.id);
      queryClient.setQueryData<IssueWithRelations[]>(['issues'], old => old?.filter(i => i.id !== issue.id));
      toast.success(`Deleted "${issue.title}"`, {
        description: `Issue #${issue.id.slice(-4)} removed from sprint board.`,
        action: res?.snapshot ? {
          label: 'Undo',
          onClick: async () => {
            await api.issues.restore(res.snapshot);
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            toast.success(`Restored "${issue.title}"`);
          }
        } : undefined,
        duration: 5000,
      });
    } catch (err) {
      toast.error("Failed to delete issue");
    }
  };

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<IssueWithRelations> }) => api.issues.update(id, data),
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

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = searchQuery === '' || issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || issue.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [issues, searchQuery, priorityFilter]);

  if (isLoading) return <LoadingState variant="kanban" title="Loading Kanban Board..." description="Organizing sprint tasks and dependencies..." />;
  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Kanban board"
          message="Could not fetch sprint tasks from the server. Please verify your connection."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['issues'] })}
        />
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveIssue(issues.find(i => i.id === active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIssueData = issues.find(i => i.id === activeId);
    if (!activeIssueData) return;

    let newStatus = activeIssueData.status;
    
    if (STATUSES.includes(overId)) {
      newStatus = overId;
    } else {
      const overIssueData = issues.find(i => i.id === overId);
      if (overIssueData) {
        newStatus = overIssueData.status;
      }
    }

    if (activeIssueData.status !== newStatus) {
      updateIssueMutation.mutate({ id: activeId, data: { status: newStatus } });
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col bg-canvas animate-in fade-in duration-150 gap-6">
      
      {/* Top Bar with Title and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title font-bold tracking-tight text-primary">Execution Board</h1>
          <p className="text-body text-secondary">Drag and drop directives across sprint stages. Bounded mission execution canvas.</p>
        </div>
        <BaseButton onClick={() => handleCreateIssue('todo')}>
          <Plus className="w-4 h-4 mr-1.5 stroke-[1.5]" /> New Directive
        </BaseButton>
      </div>

      {/* Interactive Filter & Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search directives by title or ID (e.g. KR-101)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-[#2563EB] dark:focus:border-[#00E5FF] focus:bg-surface transition-all placeholder:text-muted text-primary"
          />
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-mono font-medium text-secondary flex items-center gap-1 mr-1 shrink-0 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 stroke-[1.5]" /> Priority:
          </span>
          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((pri) => (
            <button
              key={pri}
              onClick={() => setPriorityFilter(pri)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-mono font-bold capitalize transition-all shrink-0 cursor-pointer",
                priorityFilter === pri 
                  ? "bg-primary text-surface shadow-2xs" 
                  : "bg-surface-hover text-secondary hover:text-primary border border-border"
              )}
            >
              {pri}
            </button>
          ))}
        </div>

      </div>

      {/* Single Bounded Board Grid */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="min-w-max h-full border border-border rounded-xl bg-surface shadow-sm flex overflow-hidden">
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {STATUSES.map((status, index) => {
              const columnIssues = filteredIssues.filter(i => i.status === status);
              return (
                <Column key={status} id={status} title={status} issues={columnIssues} isLast={index === STATUSES.length - 1} onDelete={handleDeleteIssue} onCreate={handleCreateIssue} onClick={handleEditIssue} />
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
      </div>

      <IssueCreateModal
        open={createModalOpen}
        initialStatus={createStatus}
        allIssues={issues}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={(data) => createIssueMutation.mutate(data)}
        isSubmitting={createIssueMutation.isPending}
      />

      <IssueEditModal
        open={editModalOpen}
        issue={editingIssue}
        allIssues={issues}
        onClose={() => { setEditModalOpen(false); setEditingIssue(null); }}
        onSubmit={(id, data) => updateIssueDetailMutation.mutate({ id, data })}
        isSubmitting={updateIssueDetailMutation.isPending}
      />
    </div>
  );
}
