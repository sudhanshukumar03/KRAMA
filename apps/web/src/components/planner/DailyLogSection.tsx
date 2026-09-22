import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Smile, Zap, Trophy, AlertCircle, FileText, Check,
  Save, Loader2, Sparkles
} from 'lucide-react';

interface Props {
  day: Date;
}

const MOOD_OPTIONS = [
  { label: 'Productive', value: 'productive', icon: '🚀' },
  { label: 'Focused', value: 'focused', icon: '🎯' },
  { label: 'Balanced', value: 'balanced', icon: '🧘' },
  { label: 'Exhausted', value: 'exhausted', icon: '🥱' },
  { label: 'Blocked', value: 'blocked', icon: '🛑' },
];

const ENERGY_OPTIONS = [
  { label: 'High', value: 'high', bars: 3, color: 'text-success-fg bg-success-bg' },
  { label: 'Medium', value: 'medium', bars: 2, color: 'text-warning-fg bg-warning-bg' },
  { label: 'Low', value: 'low', bars: 1, color: 'text-danger-fg bg-danger-bg' },
];

export function DailyLogSection({ day }: Props) {
  const queryClient = useQueryClient();
  const dateStr = format(day, 'yyyy-MM-dd');
  const dayIso = startOfDay(day).toISOString();

  // Fetch log for current day
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['daily-logs', dateStr],
    queryFn: () => api.dailyLogs.list({ date: dateStr }),
  });

  const existingLog = logs[0] || null;

  // Form states
  const [mood, setMood] = useState<string>('');
  const [energy, setEnergy] = useState<string>('medium');
  const [winsText, setWinsText] = useState<string>('');
  const [blockersText, setBlockersText] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [deepWorkMinutes, setDeepWorkMinutes] = useState<number>(0);

  // Sync state when log loads
  useEffect(() => {
    if (existingLog) {
      setMood(existingLog.mood || '');
      setEnergy(existingLog.energy || 'medium');
      setWinsText(Array.isArray(existingLog.wins) ? existingLog.wins.join('\n') : '');
      setBlockersText(Array.isArray(existingLog.blockers) ? existingLog.blockers.join('\n') : '');
      setNotes(existingLog.notes || '');
      setDeepWorkMinutes(existingLog.deepWorkMinutes || 0);
    } else {
      setMood('');
      setEnergy('medium');
      setWinsText('');
      setBlockersText('');
      setNotes('');
      setDeepWorkMinutes(0);
    }
  }, [existingLog, dateStr]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const wins = winsText.split('\n').map(w => w.trim()).filter(Boolean);
      const blockers = blockersText.split('\n').map(b => b.trim()).filter(Boolean);

      const payload = {
        date: dayIso,
        mood: mood || undefined,
        energy: energy || undefined,
        wins,
        blockers,
        notes: notes || undefined,
        deepWorkMinutes: Number(deepWorkMinutes) || 0,
      };

      if (existingLog) {
        return api.dailyLogs.update(existingLog.id, {
          ...payload,
          version: existingLog.version,
        });
      } else {
        return api.dailyLogs.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(existingLog ? 'Daily log updated' : 'Daily log recorded');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save daily log');
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted">
        <Loader2 className="w-6 h-6 animate-spin mb-2 text-accent" />
        <span className="text-caption font-mono">Loading daily log...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 gap-4 overflow-y-auto max-h-[580px] pr-1">
      {/* Header card with day label */}
      <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between shadow-2xs">
        <div>
          <h4 className="text-caption font-bold text-primary flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-accent" />
            <span>Daily Debrief & Log</span>
          </h4>
          <p className="text-[11px] text-secondary">
            {format(day, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {existingLog && (
          <span className="text-badge font-mono px-2 py-0.5 rounded-full bg-success-bg text-success-fg font-semibold flex items-center gap-1">
            <Check className="w-3 h-3" /> Logged
          </span>
        )}
      </div>

      {/* Energy & Mood Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mood selector */}
        <div className="p-3 bg-surface border border-border rounded-xl space-y-2">
          <label className="text-[11px] font-semibold text-secondary flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Smile className="w-3 h-3 text-accent" />
            <span>Mood / Vibe</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map((opt) => {
              const isSelected = mood === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMood(isSelected ? '' : opt.value)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer",
                    isSelected
                      ? "bg-accent-subtle border-accent text-accent-fg font-bold shadow-2xs"
                      : "bg-surface-hover/60 border-border text-secondary hover:text-primary hover:bg-surface-hover"
                  )}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy selector */}
        <div className="p-3 bg-surface border border-border rounded-xl space-y-2">
          <label className="text-[11px] font-semibold text-secondary flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Zap className="w-3 h-3 text-warning" />
            <span>Energy Level</span>
          </label>
          <div className="flex items-center gap-2">
            {ENERGY_OPTIONS.map((opt) => {
              const isSelected = energy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergy(opt.value)}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer",
                    isSelected
                      ? "border-accent bg-accent text-on-accent shadow-xs"
                      : "bg-surface-hover/60 border-border text-secondary hover:text-primary hover:bg-surface-hover"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Key Wins / Completed Deliverables */}
      <div className="p-3 bg-surface border border-border rounded-xl space-y-1.5">
        <label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-accent" />
          <span>Key Wins & Milestones Today</span>
        </label>
        <textarea
          rows={2}
          value={winsText}
          onChange={(e) => setWinsText(e.target.value)}
          placeholder="What went exceptionally well? (1 per line)"
          className="w-full p-2.5 bg-surface-hover/40 border border-border rounded-lg text-xs text-primary placeholder:text-muted focus:outline-hidden focus:border-accent focus:bg-surface transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Blockers or Friction */}
      <div className="p-3 bg-surface border border-border rounded-xl space-y-1.5">
        <label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-danger-fg" />
          <span>Blockers & Friction Points</span>
        </label>
        <textarea
          rows={2}
          value={blockersText}
          onChange={(e) => setBlockersText(e.target.value)}
          placeholder="Any obstacles, bugs, or delays? (1 per line)"
          className="w-full p-2.5 bg-surface-hover/40 border border-border rounded-lg text-xs text-primary placeholder:text-muted focus:outline-hidden focus:border-accent focus:bg-surface transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Notes & Reflections */}
      <div className="p-3 bg-surface border border-border rounded-xl space-y-1.5">
        <label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Notes & Reflections for Tomorrow</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write down any notes, thoughts, or what you should prioritize tomorrow..."
          className="w-full p-2.5 bg-surface-hover/40 border border-border rounded-lg text-xs text-primary placeholder:text-muted focus:outline-hidden focus:border-accent focus:bg-surface transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Save Action */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{existingLog ? 'Update Daily Log' : 'Save Daily Log'}</span>
        </button>
      </div>
    </div>
  );
}
