import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, X, ArrowUpRight } from 'lucide-react';
import { api } from '../../api/client';
import { useModalA11y } from '../../hooks/useModalA11y';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SelectionToTaskModalProps {
  documentId: string;
  initialTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (task: any) => void;
}

export function SelectionToTaskModal({
  documentId,
  initialTitle,
  isOpen,
  onClose,
  onSuccess,
}: SelectionToTaskModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const modalRef = useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle.trim());
      setPriority('MEDIUM');
      setStatus('TODO');
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen, initialTitle]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error('Task title cannot be empty');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.documents.createTask(documentId, {
        title: cleanTitle,
        priority,
        status,
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['document-links', documentId] });
      toast.success(`Task "${cleanTitle}" created & linked`);
      onClose();
      if (onSuccess && result?.task) {
        onSuccess(result.task);
      }
    } catch (err: any) {
      toast.error('Failed to create task: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="krama-dialog w-full max-w-md shadow-2xl overflow-hidden flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-success-bg border border-success-border text-success-fg flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 id="create-task-title" className="font-bold text-primary text-body leading-tight">
                Create Execution Task
              </h3>
              <p className="text-[11px] font-mono text-secondary">
                Atomically linked to this specification
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5 tracking-wider">
              Task Title <span className="text-danger-fg">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement schema migration..."
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-sans text-body transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5 tracking-wider">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-1">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer text-center border active:scale-[0.98]",
                      priority === p
                        ? "bg-accent text-on-accent border-accent shadow-xs"
                        : "bg-surface hover:bg-surface-hover text-secondary border-border"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5 tracking-wider">
                Initial Status
              </label>
              <div className="grid grid-cols-1 gap-1">
                {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer text-center border active:scale-[0.98]",
                      status === s
                        ? "bg-accent text-on-accent border-accent shadow-xs"
                        : "bg-surface hover:bg-surface-hover text-secondary border-border"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted flex items-center gap-1">
              <kbd className="bg-surface-hover px-1.5 py-0.5 rounded border border-border text-[10px]">Enter ↵</kbd> to create
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-border text-caption font-medium hover:bg-surface-hover transition-colors cursor-pointer active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className={cn(
                  "px-4 py-2 rounded-xl text-caption font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]",
                  title.trim() && !isSubmitting
                    ? "bg-accent hover:bg-accent-hover text-on-accent cursor-pointer"
                    : "bg-accent/40 text-on-accent/60 cursor-not-allowed"
                )}
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
                <span>{isSubmitting ? 'Linking...' : 'Create & Link Task'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
