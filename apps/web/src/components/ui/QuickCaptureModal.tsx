import { useModalA11y } from '../../hooks/useModalA11y';
import { useState, useEffect } from 'react';
import { X, FileText, CheckSquare, Lightbulb, Link as LinkIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { formatLocalDate } from '../../lib/utils';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'note' | 'task' | 'idea' | 'link';
  defaultScheduledDate?: Date;
}

export function QuickCaptureModal({ open, onClose, defaultMode = 'task', defaultScheduledDate }: QuickCaptureModalProps) {
  const [mode, setMode] = useState(defaultMode);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const dismiss = () => { if (!isSubmitting) onClose(); };
  const dialogRef = useModalA11y(open, dismiss);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setTitle('');
      setContent('');

      setError('');
    }
  }, [open, defaultMode]);

  if (!open) return null;

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
    if (isSubmitting || (!title.trim() && mode !== 'link')) return;
    if (mode === 'link') {
      try { const url = new URL(content.trim()); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); }
      catch { setError('Enter a valid http or https link.'); return; }
    }
    setError('');

    setIsSubmitting(true);
    try {
      if (mode === 'task') {
        const dayKey = formatLocalDate(defaultScheduledDate);
        const scheduledIso = dayKey ? `${dayKey}T12:00:00.000Z` : undefined;
        await api.tasks.create({ title, description: content, scheduledDate: scheduledIso });
        toast.success('Task created');
        queryClient.invalidateQueries({ queryKey: ['planner'] });
        queryClient.invalidateQueries({ queryKey: ['issues'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      } else if (mode === 'note') {
        await api.documents.create({ title, documentType: 'NOTE', contentJson: buildContentJson(content) });
        toast.success('Note created in Brain');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      } else if (mode === 'idea') {
        await api.documents.create({ title, documentType: 'IDEA', contentJson: buildContentJson(content) });
        toast.success('Idea saved in Brain');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      } else if (mode === 'link') {
        await api.documents.create({ title: title || 'Bookmark', documentType: 'GENERAL', contentJson: buildContentJson(content) });
        toast.success('Bookmark saved in Brain');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTitle('');
      setContent('');
      onClose();
    } catch {
      setError('Could not save. Your draft is retained; please try again.');
      toast.error('Failed to capture');
    } finally {
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
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={dismiss}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Quick capture" onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">

        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover/50">
          <div className="grid grid-cols-2 sm:flex gap-2">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                aria-pressed={mode === t.id} disabled={isSubmitting}
                onClick={() => setMode(t.id as any)}
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
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={mode === 'link' ? "Page title (optional)" : `What's your ${mode}?`}
              className="w-full text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted text-primary"
              aria-label="Title"
            />
          </div>

          <div>
            <textarea
              aria-label={mode === 'link' ? 'Link URL' : 'Details'}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={mode === 'link' ? "https://..." : "Add more details..."}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted text-secondary min-h-[100px] resize-none"
            />
          </div>

          {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
          <div className="flex justify-end pt-4 border-t border-border">
            <BaseButton type="submit" variant="primary" disabled={isSubmitting || (!title.trim() && mode !== 'link')}>
              {isSubmitting ? 'Saving...' : (defaultScheduledDate && mode === 'task' ? 'Schedule Task' : 'Save to Inbox')}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}
