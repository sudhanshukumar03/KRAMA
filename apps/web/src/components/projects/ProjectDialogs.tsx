import {
    Trash2,
    X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { IconPicker } from '../ui/IconPicker';

import { useModalA11y } from '../../hooks/useModalA11y';


interface ProjectEditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; problemStatement: string; status: string; targetDate: string; icon?: string | null; goalId?: string | null; version?: number }) => void;
  isSubmitting: boolean;
  initialData: any;
  goals?: any[];
}

export function ProjectEditModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  goals = []
}: ProjectEditModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [problemStatement, setProblemStatement] = useState(initialData?.problemStatement || '');
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [goalId, setGoalId] = useState(initialData?.goalId || '');
  const [targetDate, setTargetDate] = useState(() => {
    if (initialData?.targetDate) return new Date(initialData.targetDate).toISOString().split('T')[0];
    return '';
  });
  const [icon, setIcon] = useState(initialData?.icon || 'FolderKanban');
  const [initialVersion, setInitialVersion] = useState(initialData?.version);

  const modalRef = useModalA11y(open, () => { if (!isSubmitting) onClose(); });
  const initialRef = useRef(initialData);
  initialRef.current = initialData;
  const initialId = initialData?.id;
  useEffect(() => {
    const initialData = initialRef.current;
    if (open && initialData) {
      setName(initialData.name || '');
      setProblemStatement(initialData.problemStatement || '');
      setStatus(initialData.status || 'active');
      setGoalId(initialData.goalId || '');
      const tDate = initialData.targetDate || (initialData.metadata as any)?.targetDate;
      setTargetDate(tDate ? new Date(tDate).toISOString().split('T')[0] : '');
      setIcon(initialData.icon || 'FolderKanban');
      setInitialVersion(initialData.version);
    }
  }, [open, initialId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !name.trim()) return;
    onSubmit({
      name: name.trim(),
      problemStatement: problemStatement.trim(),
      status,
      targetDate,
      icon,
      goalId: goalId || null,
      version: initialVersion,
    });
  };

  return (
    <div
      onClick={() => { if (!isSubmitting) onClose(); }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="edit-project-title"
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[calc(100dvh-2rem)] overflow-y-auto text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <IconPicker value={icon} onChange={setIcon} />
            <div>
              <h3 id="edit-project-title" className="text-title text-primary mb-1 font-bold">Edit Initiative Settings</h3>
              <p className="text-caption text-secondary font-mono">Configure roadmap alignment and technical scope</p>
            </div>
          </div>
          <button
            onClick={onClose} disabled={isSubmitting} aria-label="Close project settings"
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {initialData?.version !== initialVersion && <p role="alert" className="text-caption text-warning-fg">This project changed elsewhere. Your draft is preserved. Close and reopen the editor to load the latest values before saving.</p>}
          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Initiative Name <span className="text-danger-fg">*</span>
            </label>
            <input
              type="text" aria-label="Initiative Name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Krama OS Core"
              required
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all bg-surface font-sans"
            />
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Problem Statement / Technical Scope
            </label>
            <textarea aria-label="Problem Statement / Technical Scope"
              value={problemStatement}
              onChange={e => setProblemStatement(e.target.value)}
              placeholder="Describe the objective, architectural constraints, and target outcomes..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none bg-surface font-sans"
            />
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Strategic OKR / Linked Goal
            </label>
            <select aria-label="Strategic OKR / Linked Goal"
              value={goalId}
              onChange={e => setGoalId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans cursor-pointer"
            >
              <option value="">None (Standalone Initiative)</option>
              {goals.map((g: any) => (
                <option key={g.id} value={g.id}>
                  🎯 {g.title} ({g.type?.toUpperCase() || 'OKR'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Status
              </label>
              <select aria-label="Status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold cursor-pointer"
              >
                <option value="idea">💡 Idea / Discovery</option>
                <option value="active">⚡ Active Execution</option>
                <option value="paused">⏸️ Paused</option>
                <option value="shipped">🚀 Shipped / Live</option>
                <option value="completed">✅ Completed</option>
                <option value="archived">🗄️ Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Target Date
              </label>
              <input
                type="date" aria-label="Target Date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Initiative'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteInitiativeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  initiativeName: string;
}

export function DeleteInitiativeModal({
  open,
  onClose,
  onConfirm,
  isDeleting,
  initiativeName
}: DeleteInitiativeModalProps) {
  const modalRef = useModalA11y(open, () => { if (!isDeleting) onClose(); });
  if (!open) return null;

  return (
    <div
      onClick={() => { if (!isDeleting) onClose(); }}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="delete-project-title"
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border-strong rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 max-h-[calc(100dvh-2rem)] overflow-y-auto text-left p-6 space-y-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-danger-bg text-danger-fg border border-danger-border flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div className="space-y-1">
            <h3 id="delete-project-title" className="text-section font-bold text-primary">Delete Initiative?</h3>
            <p className="text-caption text-secondary leading-relaxed">
              Are you sure you want to delete <strong className="text-primary font-mono font-bold">"{initiativeName}"</strong>? Its tasks and milestones will be hidden. You can restore them with Undo after deletion.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end gap-2.5">
          <BaseButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </BaseButton>
          <BaseButton
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
          >
            Delete Initiative
          </BaseButton>
        </div>
      </div>
    </div>
  );
}
