import { useModalA11y } from '../../hooks/useModalA11y';
import { useEffect, useId, useState, useRef } from 'react';
import { X, FileText, CheckSquare, Lightbulb, Link as LinkIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { formatLocalDate } from '../../lib/utils';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { captureDraftKey, readCaptureDrafts, writeCaptureDraft, type CaptureMode } from '../../lib/captureDraft';
import './primitives.css';

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
  const id = useId();
  const [mode, setMode] = useState(defaultMode);
  const [drafts, setDrafts] = useState(() => readCaptureDrafts(storageKey));
  const { title = '', content = '' } = drafts[mode] || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const dismiss = () => { if (!submitting.current) onClose(); };
  const dialogRef = useModalA11y(true, dismiss);
  useEffect(() => {
    // Keep validation and save failures visible when the form has to scroll.
    if (error) errorRef.current?.focus();
  }, [error]);
  const updateDraft = (change: { title?: string; content?: string }) => {
    const draft = { title, content, ...change };
    setDrafts(previous => ({ ...previous, [mode]: draft }));
    setStorageAvailable(writeCaptureDraft(storageKey, mode, draft));
  };
  const discardDraft = () => {
    setError('');
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
    <div className="krama-capture-backdrop" onClick={dismiss}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-heading`} aria-describedby={`${id}-description`} aria-busy={isSubmitting} data-mode={mode} onClick={e => e.stopPropagation()} className="krama-quick-capture">
        <header className="krama-capture-header">
          <div className="krama-capture-heading">
            <h2 id={`${id}-heading`}>Quick capture</h2>
            <button type="button" onClick={dismiss} disabled={isSubmitting} className="krama-capture-close" aria-label="Close modal"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="krama-capture-modes" role="group" aria-label="Capture type">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                aria-pressed={mode === t.id} disabled={isSubmitting}
                onClick={() => { setMode(t.id as CaptureMode); setError(''); }}
                className="krama-capture-mode"
              >
                <t.icon size={16} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <form id={`${id}-form`} onSubmit={handleSubmit} className="krama-capture-body">
          <p id={`${id}-description`} className="krama-capture-description">{defaultScheduledDate && mode === 'task' ? 'This task will be scheduled in Planner.' : 'Save to Inbox, then organise it when you’re ready.'}</p>
          <div className="krama-field">
            <label htmlFor={`${id}-title`}>Title{mode === 'link' && <span className="krama-capture-optional">Optional</span>}</label>
            <input
              id={`${id}-title`}
              name="title"
              type="text"
              value={title}
              disabled={isSubmitting}
              maxLength={255}
              onChange={e => updateDraft({ title: e.target.value })}
              placeholder={mode === 'link' ? 'A name for this page' : mode === 'task' ? 'What do you want to do?' : `Give your ${mode} a title`}
              className="krama-field-control"
              aria-label="Title"
              aria-required={mode !== 'link'}
            />
          </div>

          <div className="krama-field">
            <label htmlFor={`${id}-content`}>{mode === 'link' ? 'Link URL' : 'Details'}{mode !== 'link' && <span className="krama-capture-optional">Optional</span>}</label>
            <textarea
              id={`${id}-content`}
              aria-label={mode === 'link' ? 'Link URL' : 'Details'}
              aria-required={mode === 'link'}
              aria-invalid={(mode === 'link' && error === 'Enter a valid http or https link.') || undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              value={content}
              disabled={isSubmitting}
              onChange={e => updateDraft({ content: e.target.value })}
              placeholder={mode === 'link' ? 'https://example.com' : 'Add context, a reminder or a next step…'}
              rows={mode === 'link' ? 2 : 3}
              className="krama-field-control"
            />
          </div>

          {error && <p ref={errorRef} id={`${id}-error`} role="alert" tabIndex={-1} className="krama-capture-error">{error}</p>}
          <p className="krama-capture-draft-hint" role="status">{storageAvailable ? 'Drafts stay in this browser until you save or discard them.' : 'Browser storage is unavailable. Keep this dialog open to preserve your draft.'}</p>
        </form>
        <footer className="krama-capture-actions">
            <BaseButton type="button" variant="ghost" disabled={isSubmitting || (!title && !content)} onClick={discardDraft}>Discard draft</BaseButton>
            <BaseButton type="submit" form={`${id}-form`} variant="primary" isLoading={isSubmitting} disabled={!title.trim() && mode !== 'link'}>
              {isSubmitting ? 'Saving...' : (defaultScheduledDate && mode === 'task' ? 'Schedule Task' : 'Save to Inbox')}
            </BaseButton>
        </footer>
      </div>
    </div>
  );
}
