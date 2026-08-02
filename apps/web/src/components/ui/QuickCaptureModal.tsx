import { useState } from 'react';
import { X, FileText, CheckSquare, Lightbulb, Link as LinkIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'note' | 'task' | 'idea' | 'link';
}

export function QuickCaptureModal({ open, onClose, defaultMode = 'task' }: QuickCaptureModalProps) {
  const [mode, setMode] = useState(defaultMode);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && mode !== 'link') return;
    
    setIsSubmitting(true);
    try {
      if (mode === 'task') {
        await api.tasks.create({ title, description: content });
        toast.success('Task created', { action: { label: 'Undo', onClick: () => {} } });
      } else if (mode === 'note') {
        await api.pages.create({ title, content });
        toast.success('Note created', { action: { label: 'Undo', onClick: () => {} } });
      } else if (mode === 'idea') {
        await api.pages.create({ title, content, tags: ['Idea'] });
        toast.success('Idea saved', { action: { label: 'Undo', onClick: () => {} } });
      } else if (mode === 'link') {
        await api.pages.create({ title: title || 'Bookmark', content: content, tags: ['Bookmark'] });
        toast.success('Bookmark saved', { action: { label: 'Undo', onClick: () => {} } });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTitle('');
      setContent('');
      onClose();
    } catch {
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
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden">
        
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover/50">
          <div className="flex gap-2">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === t.id ? 'bg-primary text-surface' : 'text-secondary hover:text-primary hover:bg-surface'}`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary">
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
              autoFocus
            />
          </div>

          <div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={mode === 'link' ? "https://..." : "Add more details..."}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted text-secondary min-h-[100px] resize-none"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <BaseButton type="submit" variant="primary" disabled={isSubmitting || (!title.trim() && mode !== 'link')}>
              {isSubmitting ? 'Saving...' : 'Save to Inbox'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}
