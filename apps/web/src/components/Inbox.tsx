import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDownToLine, CalendarDays, CheckSquare, FileText, Lightbulb, Link2, ListTodo, Plus } from 'lucide-react';
import { api } from '../api/client';
import { useDashboard } from '../hooks/useDashboard';
import { taskMetadata } from '../lib/personalTasks';
import { errorMessage } from '../lib/utils';
import { QuickCaptureModal } from './ui/QuickCaptureModal';
import { ErrorState } from './ui/ErrorState';
import { InboxIllustration } from './ui/InboxIllustration';
import type { CaptureMode } from '../lib/captureDraft';
import type { DocumentWithRelations, IssueWithRelations } from '../types/schema';
import '../styles/inbox.css';

type InboxItem = { kind: 'task'; item: IssueWithRelations } | { kind: 'note'; item: DocumentWithRelations };

const captureSuggestions = [
  { mode: 'task', label: 'A task', Icon: CheckSquare },
  { mode: 'note', label: 'A note', Icon: FileText },
  { mode: 'idea', label: 'An idea', Icon: Lightbulb },
  { mode: 'link', label: 'A link', Icon: Link2 },
] as const;

function itemPresentation(entry: InboxItem) {
  if (entry.kind === 'task') return { label: 'Task', Icon: ListTodo, tone: 'task' };
  if (entry.item.documentType === 'IDEA') return { label: 'Idea', Icon: Lightbulb, tone: 'idea' };
  if (entry.item.documentType === 'GENERAL') return { label: 'Link / note', Icon: Link2, tone: 'link' };
  return { label: entry.item.documentType.toLowerCase(), Icon: FileText, tone: 'note' };
}

export function Inbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [capture, setCapture] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('task');
  const openCapture = (opener: HTMLButtonElement, mode: CaptureMode = 'task') => {
    opener.focus();
    setCaptureMode(mode);
    setCapture(true);
  };
  const tasks = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const documents = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() });
  const dashboard = useDashboard();
  const inbox: InboxItem[] = [
    ...(tasks.data || []).filter(task => taskMetadata(task).inbox === true && !['DONE', 'CANCELED'].includes(task.status)).map(item => ({ kind: 'task' as const, item })),
    ...(documents.data || []).filter(doc => doc.statusBadges?.includes('Inbox')).map(item => ({ kind: 'note' as const, item })),
  ].sort((a, b) => String(b.item.createdAt || '').localeCompare(String(a.item.createdAt || '')));
  const organize = useMutation({
    mutationFn: async ({ entry, today }: { entry: InboxItem; today: boolean }) => {
      if (entry.kind === 'task') {
        // A cached snapshot may belong to yesterday after sleep or a clock jump.
        // Resolve the reporting day at the time of the write.
        const date = today ? (await api.dashboard.get()).dateKey : undefined;
        if (today && !date) throw new Error('Today could not load. Retry after refreshing.');
        return api.tasks.update(entry.item.id, { version: entry.item.version, metadata: { ...taskMetadata(entry.item), inbox: false }, ...(today ? { status: 'TODO', scheduledDate: `${date}T12:00:00.000Z` } : {}) });
      }
      return api.documents.update(entry.item.id, { expectedUpdatedAt: entry.item.updatedAt, statusBadges: entry.item.statusBadges.filter(badge => badge !== 'Inbox') });
    },
    onSuccess: async (_, variables) => {
      await Promise.all(['issues', 'tasks', 'documents', 'dashboard', 'planner', 'focus-schedule'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(variables.today ? 'Scheduled for today' : variables.entry.kind === 'task' ? 'Filed in Tasks' : 'Filed in Brain');
    },
    onError: error => toast.error(errorMessage(error, 'Could not organize this item.')),
  });
  const isLoading = tasks.isLoading || documents.isLoading;
  const isError = tasks.isError || documents.isError;
  const isEmpty = !isLoading && !isError && inbox.length === 0;
  const openItem = (entry: InboxItem) => navigate(entry.kind === 'task' ? `/app/board?task=${entry.item.id}` : `/app/brain?doc=${entry.item.id}`);

  return (
    <div className="inbox-page">
      <div className="inbox-workspace">
        <header className="inbox-header">
          <div className="inbox-heading">
            <div>
              <h1>Inbox</h1>
              <p>Save what is on your mind. Decide what to do with it when you are ready.</p>
            </div>
          </div>
          <button className="inbox-capture" onClick={event => openCapture(event.currentTarget)}>
            <Plus size={17} aria-hidden="true" />
            <span>Capture something</span>
          </button>
        </header>

        <section aria-label="Inbox items" className={`inbox-surface${isEmpty ? ' inbox-surface-empty' : ''}`} aria-busy={isLoading || organize.isPending}>
          {!isEmpty && (
            <div className="inbox-list-heading">
              <div>
                <h2>To organise</h2>
                {(!isLoading || inbox.length > 0) && (
                  <span className="inbox-count" aria-live="polite" aria-atomic="true" aria-label={`${inbox.length} ${isError || isLoading ? 'loaded ' : ''}items to organise`}>
                    {inbox.length}
                  </span>
                )}
              </div>
              {inbox.length > 0 && <span className="inbox-order">Newest first</span>}
            </div>
          )}

          {isError && (
            <div className="inbox-feedback">
              {tasks.isError && documents.isError ? (
                <ErrorState message="Could not load Inbox." onRetry={() => { tasks.refetch(); documents.refetch(); }} />
              ) : (
                <ErrorState title={tasks.isError ? 'Could not load tasks' : 'Could not load notes'} message="Available items are shown below. Retry to load the rest of your Inbox." onRetry={() => { if (tasks.isError) tasks.refetch(); if (documents.isError) documents.refetch(); }} />
              )}
            </div>
          )}
          {isLoading && inbox.length > 0 && <p className="px-6 py-3 text-caption text-secondary" role="status">Loading the remaining Inbox items...</p>}
          {isLoading && inbox.length === 0 ? (
            <div className="inbox-loading" role="status">
              <span className="sr-only">Loading Inbox...</span>
              {[0, 1, 2].map(index => <div className="inbox-placeholder" key={index} aria-hidden="true"><span /><div><i /><i /></div></div>)}
            </div>
          ) : inbox.length > 0 ? (
            <ul className="inbox-list">
              {inbox.map(entry => {
                const { label, Icon, tone } = itemPresentation(entry);
                const isOrganizing = organize.isPending && organize.variables.entry.item.id === entry.item.id;
                return (
                  <li className="inbox-entry" key={`${entry.kind}.${entry.item.id}`}>
                    <div className="inbox-entry-main">
                      <span className={`inbox-type-icon inbox-type-${tone}`} aria-hidden="true">
                        <Icon size={18} strokeWidth={1.8} />
                      </span>
                      <div className="inbox-entry-copy">
                        <span className="inbox-kind">{isOrganizing ? organize.variables.today ? 'Scheduling…' : 'Filing…' : label}</span>
                        <button className="inbox-item-title" onClick={() => openItem(entry)}>
                          {entry.item.title}
                        </button>
                      </div>
                    </div>
                    <div className="inbox-entry-actions">
                      {entry.kind === 'task' && (
                        <button
                          className="inbox-action inbox-action-today"
                          disabled={organize.isPending || !dashboard.data?.dateKey}
                          aria-label={`Schedule today: ${entry.item.title}`}
                          onClick={() => organize.mutate({ entry, today: true })}
                        >
                          <CalendarDays size={15} aria-hidden="true" />
                          <span>Do today</span>
                        </button>
                      )}
                      <button
                        className="inbox-action inbox-action-file"
                        disabled={organize.isPending}
                        aria-label={`File ${entry.item.title}`}
                        onClick={() => organize.mutate({ entry, today: false })}
                      >
                        <ArrowDownToLine size={15} aria-hidden="true" />
                        <span>{entry.kind === 'task' ? 'Keep in Tasks' : 'Keep in Brain'}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : isEmpty ? (
            <div className="inbox-empty" role="status">
              <InboxIllustration />
              <h2>Your Inbox is clear</h2>
              <p>Anything you save with Quick Capture will appear here.</p>
              <div className="inbox-suggestions">
                <p>Try capturing:</p>
                <div role="group" aria-label="Capture suggestions">
                  {captureSuggestions.map(({ mode, label, Icon }) => (
                    <button key={mode} type="button" aria-haspopup="dialog" onClick={event => openCapture(event.currentTarget, mode)}>
                      <Icon size={18} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <QuickCaptureModal open={capture} onClose={() => setCapture(false)} defaultMode={captureMode} />
      </div>
    </div>
  );
}
