import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Briefcase, User, GraduationCap, HeartPulse, Shield, Grid } from 'lucide-react';
import type { CreateTimeBlockInput, TimeBlockType } from '../../types/planner';

interface TimeBlockModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTimeBlockInput) => void;
  defaultDate: Date;
  isSubmitting: boolean;
}

const TYPES: { value: TimeBlockType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'MEETING', label: 'Meeting', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'WORK', label: 'Work', icon: <Grid className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700' },
  { value: 'PERSONAL', label: 'Personal', icon: <User className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700' },
  { value: 'STUDY', label: 'Study', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'HEALTH', label: 'Health', icon: <HeartPulse className="w-3.5 h-3.5" />, color: 'bg-rose-100 text-rose-700' },
  { value: 'ADMIN', label: 'Admin', icon: <Shield className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700' },
];

export function TimeBlockModal({ open, onClose, onSubmit, defaultDate, isSubmitting }: TimeBlockModalProps) {
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<TimeBlockType>('WORK');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setDateStr(defaultDate.toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      setType('WORK');
      setNotes('');
      setError('');
    }
  }, [open, defaultDate]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    setError('');
    onSubmit({
      title: title.trim(),
      date: dateStr,
      startTime,
      endTime,
      type,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Add Time Block</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 rounded-lg p-1.5">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              placeholder="E.g., Team Sync, Deep Work..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><CalendarIcon size={12}/> Date</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock size={12}/> Time</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
                />
                <span className="text-slate-400 text-xs">—</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                    type === t.value
                      ? `border-slate-300 shadow-sm ${t.color}`
                      : 'border-slate-100 text-slate-500 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {t.icon}
                  <span className="text-[10px] font-semibold uppercase">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Time Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
