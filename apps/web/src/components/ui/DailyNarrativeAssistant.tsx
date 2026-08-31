import { useState } from 'react';
import { Wand2, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';

export function DailyNarrativeAssistant() {
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
          await api.habits.complete(action.id, { date: new Date().toISOString() });
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
    <div className="v4-card p-6 mb-8 border border-purple-500/30 bg-purple-500/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="v4-icon-chip v4-icon-chip-purple">
          <Wand2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-card-title text-primary">Daily Narrative Assistant</h2>
          <p className="text-sm text-secondary">Describe your day and let KRAMA AI propose updates to your workspace.</p>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="e.g., I finished the Q3 review document, went for a run, and we should create a new task to fix the login bug tomorrow."
            className="w-full min-h-[100px] p-4 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
            disabled={isProcessing}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || !narrative.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Thinking...' : 'Analyze Narrative'}
              {!isProcessing && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-sm text-primary mb-4">{result.summary}</p>
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Proposed Actions</h3>
            {result.actions?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {result.actions.map((action: any, i: number) => (
                  <label key={i} className="flex items-start gap-3 p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border">
                    <input
                      type="checkbox"
                      className="mt-1 accent-purple-600"
                      checked={selectedActions.has(i)}
                      onChange={(e) => {
                        const newSet = new Set(selectedActions);
                        if (e.target.checked) newSet.add(i);
                        else newSet.delete(i);
                        setSelectedActions(newSet);
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-primary">
                        {action.action === 'create' ? 'Create' : 'Update'} {action.entityType}: {action.title}
                      </span>
                      <span className="text-xs text-secondary">
                        {action.action === 'complete' && 'Mark as done'}
                        {action.action === 'update_progress' && `Set progress to ${action.metadata?.progress || 100}%`}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">No specific actions identified from your narrative.</p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setResult(null)}
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applyMutation.isPending || selectedActions.size === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {applyMutation.isPending ? 'Applying...' : `Apply ${selectedActions.size} Updates`}
              {!applyMutation.isPending && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
