import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Smile, Zap, Trophy, AlertCircle, FileText, Check,
  Save, Loader2, Sparkles, X, CheckCheck, Bot
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AiSuggestionAction {
  id?: string;
  entityType: 'task' | 'habit' | 'goal';
  action: 'complete' | 'create' | 'update_progress';
  title: string;
  metadata?: Record<string, any>;
  confidence?: number;
}

interface AiDebriefResult {
  summary: string;
  actions: AiSuggestionAction[];
}

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
  const { workspaceId } = useAuth();
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

  // AI Debrief suggestions state
  const [isDebriefing, setIsDebriefing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiDebriefResult | null>(null);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);

  const handleAiDebrief = async () => {
    const textPieces = [
      winsText.trim() ? `Wins:\n${winsText.trim()}` : '',
      blockersText.trim() ? `Blockers:\n${blockersText.trim()}` : '',
      notes.trim() ? `Notes:\n${notes.trim()}` : '',
    ].filter(Boolean).join('\n\n');

    if (!textPieces) {
      toast.error('Please enter wins, blockers, or notes before running AI Debrief.');
      return;
    }

    setIsDebriefing(true);
    try {
      const result = await api.ai.narrative({
        narrative: textPieces,
        notes: textPieces,
        date: dayIso,
      });
      setAiSuggestions(result);
      toast.success('AI Debrief Complete', {
        description: result.summary || 'Review suggested actions below.',
      });
    } catch (err: any) {
      toast.error('AI Debrief failed', {
        description: err?.message || 'Please try again later.',
      });
    } finally {
      setIsDebriefing(false);
    }
  };

  const handleAcceptSuggestion = async (action: AiSuggestionAction, index: number) => {
    setProcessingIndex(index);
    try {
      if (action.entityType === 'task') {
        if (action.action === 'complete' && action.id) {
          await api.tasks.complete(action.id);
          toast.success(`Completed task "${action.title}"`);
        } else if (action.action === 'create') {
          await api.tasks.create({ title: action.title, status: 'TODO', priority: 'MEDIUM' });
          toast.success(`Created task "${action.title}"`);
        }
      } else if (action.entityType === 'habit') {
        if (action.action === 'complete' && action.id) {
          await api.habits.complete(action.id, dateStr, dayIso);
          toast.success(`Logged habit "${action.title}"`);
        }
      } else if (action.entityType === 'goal') {
        if (action.id && action.action === 'update_progress' && action.metadata?.progress !== undefined) {
          await api.goals.update(action.id, { progress: Number(action.metadata.progress) });
          toast.success(`Updated goal "${action.title}"`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Remove accepted action from suggestion list
      setAiSuggestions(prev => prev ? {
        ...prev,
        actions: prev.actions.filter((_, i) => i !== index),
      } : null);
    } catch (err: any) {
      toast.error(`Action failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setProcessingIndex(null);
    }
  };

  const handleDismissSuggestion = (index: number) => {
    setAiSuggestions(prev => prev ? {
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    } : null);
  };

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
        ...(workspaceId ? { workspaceId } : {}),
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

      {/* AI Debrief Suggestions Panel */}
      {aiSuggestions && (
        <div className="p-3.5 bg-accent-subtle/40 border border-accent/30 rounded-xl space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-accent-fg font-semibold text-xs">
              <Bot className="w-4 h-4 text-accent" />
              <span>AI Suggested Updates</span>
            </div>
            <button
              type="button"
              onClick={() => setAiSuggestions(null)}
              className="text-muted hover:text-primary transition-colors p-1 rounded-md"
              title="Close debrief panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {aiSuggestions.summary && (
            <p className="text-xs text-secondary leading-relaxed bg-surface/70 p-2.5 rounded-lg border border-border">
              {aiSuggestions.summary}
            </p>
          )}

          {aiSuggestions.actions && aiSuggestions.actions.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
                Proposed actions ({aiSuggestions.actions.length})
              </span>
              {aiSuggestions.actions.map((act, idx) => (
                <div
                  key={`${act.entityType}-${act.id || idx}`}
                  className="flex items-center justify-between gap-2 p-2 bg-surface rounded-lg border border-border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase shrink-0",
                      act.entityType === 'task' ? "bg-accent-subtle text-accent-fg" :
                      act.entityType === 'habit' ? "bg-success-bg text-success-fg" : "bg-warning-bg text-warning-fg"
                    )}>
                      {act.entityType}: {act.action}
                    </span>
                    <span className="truncate text-primary font-medium">{act.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAcceptSuggestion(act, idx)}
                      disabled={processingIndex === idx}
                      className="px-2 py-1 rounded bg-success-bg hover:bg-success-bg/80 text-success-fg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Accept suggestion"
                    >
                      {processingIndex === idx ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3" />
                      )}
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissSuggestion(idx)}
                      disabled={processingIndex === idx}
                      className="p-1 rounded text-muted hover:text-danger-fg transition-colors cursor-pointer disabled:opacity-50"
                      title="Dismiss suggestion"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted italic">No pending actions detected from today's debrief notes.</p>
          )}
        </div>
      )}

      {/* Actions Row */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleAiDebrief}
          disabled={isDebriefing}
          className="px-3.5 py-2 rounded-xl bg-accent-subtle hover:bg-accent-subtle/80 text-accent-fg border border-accent/20 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isDebriefing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          )}
          <span>{isDebriefing ? 'Analyzing Notes...' : 'AI Debrief'}</span>
        </button>

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
