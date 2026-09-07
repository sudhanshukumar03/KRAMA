// UI-only refactor — no data/logic changes
import { useState } from 'react';
import { Wand2, ChevronRight, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';

export function DailyNarrativeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.ai.narrative({ narrative: text });
      return res;
    },
    onSuccess: (data) => {
      setResult(data);
      setSelectedActions(new Set(data.actions?.map((_: any, i: number) => i) || []));
      setIsProcessing(false);
      setIsOpen(true);
    },
    onError: (err: any) => {
      toast.error('Failed to parse narrative: ' + err.message);
      setIsProcessing(false);
    }
  });

  const applyMutation = useMutation({
    mutationFn: async (actionsToApply: any[]) => {
      for (const action of actionsToApply) {
        if (action.entityType === 'task' && action.action === 'complete' && action.id) {
          await api.tasks.update(action.id, { status: 'DONE' });
        } else if (action.entityType === 'habit' && action.action === 'complete' && action.id) {
          await api.habits.complete(action.id, new Date().toISOString().split('T')[0], new Date().toISOString());
        } else if (action.entityType === 'goal' && action.action === 'update_progress' && action.id) {
          await api.goals.update(action.id, { progress: action.metadata?.progress || 100 });
        } else if (action.entityType === 'task' && action.action === 'create') {
          await api.tasks.create({ title: action.title, status: 'TODO' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Updates applied successfully');
      setResult(null);
      setNarrative('');
    },
    onError: (err: any) => {
      toast.error('Failed to apply updates: ' + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) return;
    setIsProcessing(true);
    parseMutation.mutate(narrative);
  };

  const handleApply = () => {
    if (!result) return;
    const actionsToApply = result.actions.filter((_: any, i: number) => selectedActions.has(i));
    applyMutation.mutate(actionsToApply);
  };

  return (
    <div className="rounded-xl border border-border bg-surface shadow-2xs mb-8 overflow-hidden transition-all duration-200">
      {/* Header bar / accordion toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-surface-hover/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-primary shrink-0">
            <Wand2 className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body font-semibold text-primary">Daily Narrative Assistant</h3>
              <span className="text-badge font-mono font-medium px-2 py-0.5 rounded bg-surface-hover text-secondary border border-border uppercase">
                AI Copilot
              </span>
            </div>
            <p className="text-caption text-secondary mt-0.5">
              Describe your day in natural language to automatically sync tasks, habits, and progress.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-caption font-mono text-muted hidden sm:inline">
            {isOpen ? 'Collapse' : 'Expand'}
          </span>
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-secondary border border-border bg-surface">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expandable Form Body */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border/70 animate-in fade-in duration-150">
          {!result ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-3">
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="e.g., Finished the Q3 review document, completed 45m deep focus sprint, and need to create a new task to fix the auth edge case tomorrow."
                className="w-full min-h-[96px] p-3.5 bg-surface-hover/60 border border-border rounded-xl text-body text-primary focus:outline-none focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent/20 resize-y placeholder:text-muted font-sans leading-relaxed"
                disabled={isProcessing}
              />
              <div className="flex justify-end items-center gap-3">
                <button
                  type="submit"
                  disabled={isProcessing || !narrative.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg text-caption flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Parsing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 stroke-[2]" />
                      <span>Analyze Narrative</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4 pt-3">
              <div className="p-4 bg-surface-hover/50 border border-border rounded-xl">
                <p className="text-body font-medium text-primary mb-3">{result.summary}</p>
                <h4 className="text-badge font-mono font-bold text-secondary uppercase tracking-wider mb-2.5">
                  Proposed Actions
                </h4>
                {result.actions?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {result.actions.map((action: any, i: number) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 p-3 bg-surface border border-border rounded-lg cursor-pointer hover:border-accent/40 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-accent rounded"
                          checked={selectedActions.has(i)}
                          onChange={(e) => {
                            const newSet = new Set(selectedActions);
                            if (e.target.checked) newSet.add(i);
                            else newSet.delete(i);
                            setSelectedActions(newSet);
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-body font-medium text-primary truncate">
                            {action.action === 'create' ? 'Create' : 'Update'} {action.entityType}: {action.title}
                          </span>
                          <span className="text-caption font-mono text-secondary">
                            {action.action === 'complete' && 'Mark as completed'}
                            {action.action === 'update_progress' && `Set progress to ${action.metadata?.progress || 100}%`}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-caption text-secondary font-mono">No specific actions identified from your narrative.</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="text-caption font-medium text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Discard & Reset
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applyMutation.isPending || selectedActions.size === 0}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg text-caption flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {applyMutation.isPending ? 'Applying...' : `Apply ${selectedActions.size} Update${selectedActions.size !== 1 ? 's' : ''}`}
                  {!applyMutation.isPending && <Check className="w-4 h-4 stroke-[2]" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
