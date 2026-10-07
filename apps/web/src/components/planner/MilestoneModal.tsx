import { useState, useEffect, useRef } from 'react';
import { X, Target, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useModalA11y } from '../../hooks/useModalA11y';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; date: string; projectId: string; completed?: boolean }) => void;
  onDelete?: () => void;
  defaultDate: Date;
  editingMilestone?: any | null;
  projects: { id: string; name: string }[];
  isSubmitting?: boolean;
}

export function MilestoneModal({ open, onClose, onSubmit, onDelete, defaultDate, editingMilestone, projects, isSubmitting }: Props) {
  const initialized = useRef({ open: false, id: undefined as string | undefined });
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [projectId, setProjectId] = useState('');
  const [completed, setCompleted] = useState(false);
  const dialogRef = useModalA11y(open, onClose);

  useEffect(() => {
    const shouldInitialize = open && (!initialized.current.open || initialized.current.id !== editingMilestone?.id);
    initialized.current = { open, id: editingMilestone?.id };
    if (!shouldInitialize) return;
    if (editingMilestone) {
      setTitle(editingMilestone.title || '');
      setDateStr((editingMilestone.date || '').split('T')[0] || format(defaultDate, 'yyyy-MM-dd'));
      setProjectId(editingMilestone.projectId || '');
      setCompleted(!!editingMilestone.completed);
    } else {
      setTitle('');
      setDateStr(format(defaultDate, 'yyyy-MM-dd'));
      setProjectId(projects[0]?.id || '');
      setCompleted(false);
    }
  }, [open, editingMilestone, defaultDate, projects]);

  if (!open) return null;

  const canSubmit = title.trim().length > 0 && !!projectId && !!dateStr;

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    onSubmit({
      title: title.trim(),
      date: `${dateStr}T12:00:00.000Z`,
      projectId,
      ...(editingMilestone ? { completed } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-modal-title"
        tabIndex={-1}
        className="krama-dialog w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 outline-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Target size={18} className="text-accent" />
            <h3 id="milestone-modal-title" className="font-bold text-sm">{editingMilestone ? 'Edit Milestone' : 'New Milestone'}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-hover rounded-lg text-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label htmlFor="milestone-title" className="block text-xs font-bold text-muted mb-1.5">Title</label>
            <input
              id="milestone-title"
              maxLength={200}
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="e.g. Beta launch"
              className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="milestone-date" className="block text-xs font-bold text-muted mb-1.5">Date</label>
              <input
                id="milestone-date"
                type="date"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
              />
            </div>
            <div>
              <label htmlFor="milestone-project" className="block text-xs font-bold text-muted mb-1.5">Project</label>
              <select
                id="milestone-project"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
              >
                {projects.length === 0 && <option value="">No projects</option>}
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {projects.length === 0 && (
            <p className="text-[11px] text-warning-fg font-medium">Create a project first — milestones are scoped to a project.</p>
          )}

          {editingMilestone && (
            <label className="flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer">
              <input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} className="accent-accent" />
              Mark as completed
            </label>
          )}
        </div>

        <div className="p-4 bg-surface-hover/50 border-t border-border flex justify-between gap-2">
          {onDelete ? (
            <button onClick={onDelete} aria-label="Delete milestone" className="krama-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-danger-fg hover:bg-danger-bg transition-colors flex items-center gap-1.5 cursor-pointer">
              <Trash2 size={14} /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="krama-btn krama-btn-secondary px-3.5 py-1.5 text-xs font-medium cursor-pointer">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="krama-btn krama-btn-primary px-3.5 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingMilestone ? 'Save' : 'Add Milestone'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
