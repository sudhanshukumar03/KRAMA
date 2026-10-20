import { useModalA11y } from '../../hooks/useModalA11y';
import { useState, useRef } from 'react';
import { X, FileText, CheckSquare, Lightbulb, Link as LinkIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { formatLocalDate } from '../../lib/utils';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { captureDraftKey, readCaptureDrafts, writeCaptureDraft, type CaptureMode } from '../../lib/captureDraft';

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'note' | 'task' | 'idea' | 'link';
  defaultScheduledDate?: Date;
}

export function QuickCaptureModal({ open, onClose, defaultMode = 'task', defaultScheduledDate }: QuickCaptureModalProps) {
  const { user, workspaceId } = useAuth();
  if (!open || !user || !workspaceId) return null;
  const storageKey = captureDraftKey(user.id, workspaceId, formatLocalDate(defaultScheduledDate) || undefined);
  return <CaptureDialog key={`${storageKey}.${defaultMode}`} storageKey={storageKey} onClose={onClose} defaultMode={defaultMode} defaultScheduledDate={defaultScheduledDate} />;
}

function CaptureDialog({ storageKey, onClose, defaultMode = 'task', defaultScheduledDate }: Omit<QuickCaptureModalProps, 'open'> & { storageKey: string }) {
  const [mode, setMode] = useState(defaultMode);
  const [drafts, setDrafts] = useState(() => readCaptureDrafts(storageKey));
  const { title = '', content = '' } = drafts[mode] || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const dismiss = () => { if (!submitting.current) onClose(); };
  const dialogRef = useModalA11y(true, dismiss);
  const updateDraft = (change: { title?: string; content?: string }) => {
    const draft = { title, content, ...change };
    setDrafts(previous => ({ ...previous, [mode]: draft }));
    setStorageAvailable(writeCaptureDraft(storageKey, mode, draft));
  };
  const discardDraft = () => {
    setDrafts(previous => ({ ...previous, [mode]: { title: '', content: '' } }));
    setStorageAvailable(writeCaptureDraft(storageKey, mode, null, { title, content }));
  };

  // Build a TipTap doc from the free-text body so Notes/Ideas/Links persist
  // their content instead of creating empty Brain documents.
  const buildContentJson = (text: string) => {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => ({ type: 'paragraph', content: [{ type: 'text', text: p }] }));
    return { type: 'doc', content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph' }] };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || (!title.trim() && mode !== 'link')) return;
    if (mode === 'link') {
      try { const url = new URL(content.trim()); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); }
      catch { setError('Enter a valid http or https link.'); return; }
    }
    setError('');

    submitting.current = true;
    setIsSubmitting(true);
    try {
      if (mode === 'task') {
        const dayKey = formatLocalDate(defaultScheduledDate);
        const scheduledIso = dayKey ? `${dayKey}T12:00:00.000Z` : undefined;
        await api.tasks.create({ title: title.trim(), description: content, scheduledDate: scheduledIso, status: scheduledIso ? 'TODO' : 'BACKLOG', metadata: { inbox: !scheduledIso } });
        toast.success('Task created');
        queryClient.invalidateQueries({ queryKey: ['planner'] });
        queryClient.invalidateQueries({ queryKey: ['issues'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      } else if (mode === 'note') {
        await api.documents.create({ title: title.trim(), documentType: 'NOTE', statusBadges: ['Inbox'], contentJson: buildContentJson(content) });
        toast.success('Note created in Brain');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      } else if (mode === 'idea') {
        await api.documents.create({ title: title.trim(), documentType: 'IDEA', statusBadges: ['Inbox'], contentJson: buildContentJson(content) });
        toast.success('Idea saved in Brain');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      } else if (mode === 'link') {
        await api.documents.create({ title: title.trim() || 'Bookmark', documentType: 'GENERAL', statusBadges: ['Inbox'], contentJson: buildContentJson(content) });
        toast.success('Bookmark saved in Brain');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      discardDraft();
      onClose();
    } catch {
      setError('Could not save. Your draft is retained; please try again.');
      toast.error('Failed to capture');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'task', label: 'Task', icon: CheckSquare },
    { id: 'note', label: 'Note', icon: FileText },
    { id: 'idea', label: 'Idea', icon: Lightbulb },
    { id: 'link', label: 'Link', icon: LinkIcon }
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={dismiss}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Quick capture" aria-busy={isSubmitting} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl">

        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover/50">
          <div className="grid grid-cols-2 sm:flex gap-2">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                aria-pressed={mode === t.id} disabled={isSubmitting}
                onClick={() => { setMode(t.id as CaptureMode); setError(''); }}
                className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${mode === t.id ? 'bg-primary text-surface' : 'text-secondary hover:text-primary hover:bg-surface'}`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={dismiss} disabled={isSubmitting} className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary cursor-pointer" aria-label="Close modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-secondary">{defaultScheduledDate && mode === 'task' ? 'This task will be scheduled in Planner.' : 'Saved items appear together in Inbox. Organize them when you are ready.'}</p>
          <div>
            <input
              id="quick-capture-title"
              name="title"
              type="text"
              value={title}
              disabled={isSubmitting}
              maxLength={255}
              onChange={e => updateDraft({ title: e.target.value })}
              placeholder={mode === 'link' ? "Page title (optional)" : `What's your ${mode}?`}
              className="w-full text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted text-primary"
              aria-label="Title"
            />
          </div>

          <div>
            <textarea
              aria-label={mode === 'link' ? 'Link URL' : 'Details'}
              value={content}
              disabled={isSubmitting}
              onChange={e => updateDraft({ content: e.target.value })}
              placeholder={mode === 'link' ? "https://..." : "Add more details..."}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted text-secondary min-h-[100px] resize-none"
            />
          </div>

          {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
          <p className="text-xs text-secondary" role="status">{storageAvailable ? 'Drafts stay on this browser until saved or discarded.' : 'Browser storage is unavailable. Keep this dialog open to preserve your draft.'}</p>
          <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-border">
            <BaseButton type="button" variant="secondary" disabled={isSubmitting || (!title && !content)} onClick={discardDraft}>Discard draft</BaseButton>
            <BaseButton type="submit" variant="primary" disabled={isSubmitting || (!title.trim() && mode !== 'link')}>
              {isSubmitting ? 'Saving...' : (defaultScheduledDate && mode === 'task' ? 'Schedule Task' : 'Save to Inbox')}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}
