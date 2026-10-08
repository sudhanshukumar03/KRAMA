import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    X
} from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { IssueWithRelations, TaskPriority, TaskStatus } from '../../types/schema';
import { BaseButton } from '../ui/BaseButton';
import { ErrorState } from '../ui/ErrorState';
import { CANCELED_COLUMN, STATUS_COLUMNS, taskDay } from './boardConfig';


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
