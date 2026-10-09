import { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon, Clock, Briefcase, User, GraduationCap, HeartPulse, Shield, Grid, Trash2 } from 'lucide-react';
import type { TimeBlockType, TimeBlockInput, TimeBlock, PlannerTask, PlannerProject } from '../../types/planner';
import { formatBlockTime, formatLocalDate } from '../../lib/utils';
import { useModalA11y } from '../../hooks/useModalA11y';

interface TimeBlockModalProps {
 open: boolean;
 onClose: () => void;
 onSubmit: (data: TimeBlockInput) => void;
 defaultDate: Date;
 isSubmitting: boolean;
 tasks?: Pick<PlannerTask, 'id' | 'title'>[];
 projects?: PlannerProject[];
 editingBlock?: TimeBlock | null;
 onDelete?: () => void;
}

const TYPES: { value: TimeBlockType; label: string; icon: React.ReactNode; color: string }[] = [
 { value: 'MEETING', label: 'Meeting', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'bg-accent/10 text-accent' },
 { value: 'WORK', label: 'Work', icon: <Grid className="w-3.5 h-3.5" />, color: 'bg-surface-hover text-primary' },
 { value: 'PERSONAL', label: 'Personal', icon: <User className="w-3.5 h-3.5" />, color: 'bg-[var(--cat-routines-bg)] text-[var(--cat-routines)]' },
 { value: 'STUDY', label: 'Study', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'bg-success-tint text-success' },
 { value: 'HEALTH', label: 'Health', icon: <HeartPulse className="w-3.5 h-3.5" />, color: 'bg-danger-bg text-danger-fg' },
 { value: 'ADMIN', label: 'Admin', icon: <Shield className="w-3.5 h-3.5" />, color: 'bg-warning-tint text-warning' },
 { value: 'OTHER', label: 'Other', icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-surface-2 text-muted' },
];

export function TimeBlockModal({ open, onClose, onSubmit, defaultDate, isSubmitting, tasks = [], projects = [], editingBlock, onDelete }: TimeBlockModalProps) {
 const [title, setTitle] = useState('');
 const [dateStr, setDateStr] = useState('');
 const [startTime, setStartTime] = useState('09:00');
 const [endTime, setEndTime] = useState('10:00');
 const [type, setType] = useState<TimeBlockType>('WORK');
 const [taskId, setTaskId] = useState('');
 const [projectId, setProjectId] = useState('');
 const [notes, setNotes] = useState('');
 const [error, setError] = useState('');
 const prevOpenRef = useRef(false);
 const editingIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    const changedDocument = editingIdRef.current !== editingBlock?.id;
    editingIdRef.current = editingBlock?.id;

    if (justOpened || (open && changedDocument)) {
      if (editingBlock) {
        setTitle(editingBlock.title || '');
        if (editingBlock.date) {
          setDateStr(editingBlock.date.includes('T') ? editingBlock.date.split('T')[0] : editingBlock.date);
        } else {
          setDateStr(formatLocalDate(defaultDate) || '');
        }
        
        // Times are stored as UTC wall-clock; read them back with UTC accessors
        // (formatBlockTime) so an edit round-trip preserves the entered time.
        setStartTime(editingBlock.startTime ? (formatBlockTime(editingBlock.startTime) || '09:00') : '09:00');
        setEndTime(editingBlock.endTime ? (formatBlockTime(editingBlock.endTime) || '10:00') : '10:00');

        setType(editingBlock.type || 'WORK');
        setTaskId(editingBlock.taskId || '');
        setProjectId(editingBlock.projectId || '');
        setNotes(editingBlock.notes || '');
      } else {
        setTitle('');
        setDateStr(formatLocalDate(defaultDate) || '');
        setStartTime('09:00');
        setEndTime('10:00');
        setType('WORK');
        setTaskId('');
        setProjectId('');
        setNotes('');
      }
      setError('');
    }
  }, [open, defaultDate, editingBlock]);

 const dialogRef = useModalA11y(open, onClose);

 if (!open) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (isSubmitting || !title.trim()) return;

 if (startTime >= endTime) {
 setError('End time must be after start time');
 return;
 }

 const data: any = {
 title: title.trim(),
 // Canonical UTC noon so the day bucket is stable regardless of timezone.
 date: new Date(`${dateStr}T12:00:00.000Z`).toISOString(),
 startTime,
 endTime,
 type,
 };
    if (editingBlock?.id) {
      data.taskId = taskId || null;
      data.projectId = projectId || null;
      data.notes = notes.trim() || null;
    } else {
      if (taskId) data.taskId = taskId;
      if (projectId) data.projectId = projectId;
      if (notes.trim()) data.notes = notes.trim();
    }

 onSubmit(data);
 };

 return (
 <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
 <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="timeblock-modal-title" tabIndex={-1} className="krama-dialog w-full max-w-md animate-in slide-in-from-bottom-4 duration-200 outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>

 {/* Header */}
 <div className="flex items-center justify-between p-4 border-b border-border bg-surface-hover/50">
 <h2 id="timeblock-modal-title" className="text-sm font-bold text-primary">{editingBlock?.id ? 'Edit Time Block' : 'Add Time Block'}</h2>
 <div className="flex items-center gap-2">
 {editingBlock?.id && onDelete && (
 <button onClick={onDelete} aria-label="Delete time block" className="p-1.5 rounded-lg text-danger-fg hover:bg-danger-bg transition-colors" type="button">
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors">
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="p-4 space-y-4">
 {error && (
 <div role="alert" className="p-3 text-xs font-medium text-danger-fg bg-danger-bg rounded-lg border border-danger-border">
 {error}
 </div>
 )}

 <div>
 <input
 autoFocus
 aria-label="Time block title"
 required
 maxLength={200}
 type="text"
 placeholder="What are you working on?"
 value={title}
 onChange={e => setTitle(e.target.value)}
 className="w-full text-base font-semibold placeholder:text-muted text-primary focus:outline-none bg-transparent"
 />
 </div>

 <div className="flex flex-wrap gap-2 pt-2">
 {TYPES.map(t => (
 <button
 key={t.value}
 type="button"
 aria-pressed={type === t.value}
 onClick={() => setType(t.value)}
 className={`px-3 py-1.5 rounded-full text-label font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 ${type === t.value ? t.color + ' ring-2 ring-offset-1 ring-current' : 'bg-surface-2 text-muted hover:bg-surface-hover border border-border'}`}
 >
 {t.icon}
 {t.label}
 </button>
 ))}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-label font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
 <CalendarIcon size={12} /> Date
 </label>
 <input
 type="date"
 required
 aria-label="Date"
 value={dateStr}
 onChange={e => setDateStr(e.target.value)}
 className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-surface-hover text-sm font-mono font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
 />
 </div>
 <div>
 <label className="block text-label font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
 <Clock size={12} /> Time
 </label>
 <div className="flex items-center gap-2">
 <input
 type="time"
 required
 aria-label="Start time"
 value={startTime}
 onChange={e => setStartTime(e.target.value)}
 className="w-full min-w-0 px-2 py-2 rounded-lg border border-border bg-surface-hover text-sm font-mono font-medium text-primary text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
 />
 <span className="text-muted font-medium">-</span>
 <input
 type="time"
 required
 aria-label="End time"
 value={endTime}
 onChange={e => setEndTime(e.target.value)}
 className="w-full min-w-0 px-2 py-2 rounded-lg border border-border bg-surface-hover text-sm font-mono font-medium text-primary text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-label font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">Task</label>
 <select
 aria-label="Task"
 value={taskId}
 onChange={e => setTaskId(e.target.value)}
 className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-surface-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
 >
 <option value="">None</option>
 {tasks?.map(t => (
 <option key={t.id} value={t.id}>{t.title}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-label font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">Project</label>
 <select
 aria-label="Project"
 value={projectId}
 onChange={e => setProjectId(e.target.value)}
 className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-surface-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
 >
 <option value="">None</option>
 {projects?.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
          </div>
        </div>

        <div>
          <label className="block text-label font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
            Notes
          </label>
          <textarea
            aria-label="Notes"
 value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add optional notes or context..."
            rows={2}
            className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-surface-hover text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm resize-none"
          />
        </div>
 <div className="pt-2">
 <button
 type="submit"
 disabled={isSubmitting}
 className="krama-btn krama-btn-primary w-full py-2.5 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? 'Saving...' : editingBlock?.id ? 'Save Changes' : 'Create Time Block'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
