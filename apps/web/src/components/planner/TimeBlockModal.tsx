import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Briefcase, User, GraduationCap, HeartPulse, Shield, Grid, Trash2 } from 'lucide-react';
import type { TimeBlockType } from '../../types/planner';

interface TimeBlockModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  defaultDate: Date;
  isSubmitting: boolean;
  tasks?: any[];
  projects?: any[];
  editingBlock?: any;
  onDelete?: () => void;
}

const TYPES: { value: TimeBlockType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'MEETING', label: 'Meeting', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'WORK', label: 'Work', icon: <Grid className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700' },
  { value: 'PERSONAL', label: 'Personal', icon: <User className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700' },
  { value: 'STUDY', label: 'Study', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'HEALTH', label: 'Health', icon: <HeartPulse className="w-3.5 h-3.5" />, color: 'bg-rose-100 text-rose-700' },
  { value: 'ADMIN', label: 'Admin', icon: <Shield className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700' },
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

  useEffect(() => {
    if (open) {
      if (editingBlock) {
        setTitle(editingBlock.title);
        setDateStr(editingBlock.date ? editingBlock.date.split('T')[0] : '');
        
        // Convert UTC ISO string to local HH:mm format
        if (editingBlock.startTime) {
          const d = new Date(editingBlock.startTime);
          setStartTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
        } else {
          setStartTime('09:00');
        }

        if (editingBlock.endTime) {
          const d = new Date(editingBlock.endTime);
          setEndTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
        } else {
          setEndTime('10:00');
        }

        setType(editingBlock.type || 'WORK');
        setTaskId(editingBlock.taskId || '');
        setProjectId(editingBlock.projectId || '');
        setNotes(editingBlock.notes || '');
      } else {
        setTitle('');
        setDateStr(defaultDate.toISOString().split('T')[0]);
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

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    const startDateTime = new Date(`${dateStr}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${dateStr}T${endTime}:00`).toISOString();

    const data: any = {
      title,
      date: new Date(`${dateStr}T12:00:00`).toISOString(),
      startTime: startDateTime,
      endTime: endDateTime,
      type,
    };
    if (taskId) data.taskId = taskId;
    if (projectId) data.projectId = projectId;
    if (notes) data.notes = notes;

    onSubmit(data);
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <h2 className="text-sm font-bold text-slate-800">{editingBlock ? 'Edit Time Block' : 'Add Time Block'}</h2>
          <div className="flex items-center gap-2">
            {editingBlock && onDelete && (
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
            <input
              autoFocus
              type="text"
              placeholder="What are you working on?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-base font-semibold placeholder:text-slate-300 text-slate-800 focus:outline-none bg-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 ${type === t.value ? t.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock size={12} /> Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium text-slate-700 text-center"
                />
                <span className="text-slate-300 font-medium">-</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium text-slate-700 text-center"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">Task</label>
              <select
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">None</option>
                {tasks?.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">Project</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">None</option>
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? 'Saving...' : editingBlock ? 'Save Changes' : 'Create Time Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}