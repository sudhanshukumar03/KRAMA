import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Flag, Trash2 } from 'lucide-react';

interface MilestoneModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; date: string; projectId: string }) => void;
  defaultDate: Date;
  isSubmitting: boolean;
  projects?: { id: string; name: string }[];
  editingMilestone?: any;
  onDelete?: () => void;
}

export function MilestoneModal({ open, onClose, onSubmit, defaultDate, isSubmitting, projects = [], editingMilestone, onDelete }: MilestoneModalProps) {
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editingMilestone) {
        setTitle(editingMilestone.title);
        setDateStr(editingMilestone.date ? editingMilestone.date.split('T')[0] : '');
        setProjectId(editingMilestone.projectId || '');
      } else {
        setTitle('');
        setDateStr(defaultDate.toISOString().split('T')[0]);
        setProjectId('');
      }
      setError('');
    }
  }, [open, defaultDate, editingMilestone]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!projectId) {
      setError('Please select a project');
      return;
    }

    onSubmit({
      title,
      date: new Date(`${dateStr}T12:00:00`).toISOString(),
      projectId,
    });
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Flag size={14} className="text-emerald-500" />
            {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
          </h2>
          <div className="flex items-center gap-2">
            {editingMilestone && onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors" type="button">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg border border-rose-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Milestone Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Beta Release"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CalendarIcon size={12} /> Date
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white transition-colors"
              >
                <option value="">Select Project...</option>
                {projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? 'Saving...' : editingMilestone ? 'Save Changes' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}