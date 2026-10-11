import {
    ListChecks,
    X
} from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { IssueWithRelations, TaskPriority, TaskStatus } from '../../types/schema';
import { BaseButton } from '../ui/BaseButton';
import { STATUS_COLUMNS } from './boardConfig';


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
