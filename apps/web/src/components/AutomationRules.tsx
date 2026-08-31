import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Zap, Plus, Settings2, Trash2, ArrowRight, CheckCircle2, Play, Activity } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { toast } from 'sonner';

export function AutomationRules() {
  const queryClient = useQueryClient();
  const { data: rules = [], isLoading } = useQuery({ queryKey: ['automations'], queryFn: api.automations.list });
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: api.automations.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Rule deleted');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => api.automations.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    }
  });

  if (isLoading) return <LoadingState title="Loading Automations..." />;

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500 fill-amber-500/20" /> Automations
          </h1>
          <p className="text-secondary mt-1">Configure internal workflows and triggers.</p>
        </div>
        <BaseButton onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Rule
        </BaseButton>
      </div>

      <div className="p-8 flex-1 overflow-y-auto">
        {rules.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">No active automations</h3>
            <p className="text-secondary max-w-md mx-auto mb-6">Create rules to automate your workflow, like adding comments when tasks are completed or triggering notifications on urgent bugs.</p>
            <BaseButton onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create First Rule
            </BaseButton>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl mx-auto">
            {rules.map(rule => (
              <div key={rule.id} className="v4-card border border-border bg-surface-hover/30 p-5 rounded-2xl flex items-center justify-between group">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rule.isActive ? 'bg-amber-500/10 text-amber-500' : 'bg-surface border border-border text-muted'}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-primary">{rule.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-caption text-secondary font-mono bg-surface border border-border/50 px-2.5 py-1 rounded-md w-fit">
                      <span className="text-[#2563EB] font-bold">{rule.triggerType}</span>
                      <ArrowRight className="w-3 h-3 text-muted" />
                      <span className="text-emerald-600 font-bold">{rule.actionType}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={rule.isActive} onChange={(e) => toggleMutation.mutate({ id: rule.id, isActive: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-surface border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                  </label>
                  <button onClick={() => deleteMutation.mutate(rule.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-[#DC2626] hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && <RuleCreateModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

function RuleCreateModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('TASK_UPDATED');
  const [conditionField, setConditionField] = useState('status');
  const [conditionValue, setConditionValue] = useState('DONE');
  const [actionType, setActionType] = useState('ADD_COMMENT');
  const [actionMessage, setActionMessage] = useState('Automated: Task completed!');
  
  const createMutation = useMutation({
    mutationFn: api.automations.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Rule created');
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      triggerType,
      conditions: { [conditionField]: conditionValue },
      actionType,
      actionPayload: { message: actionMessage }
    });
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div onClick={e => e.stopPropagation()} className="v4-card w-full max-w-xl bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-surface-hover/50 flex items-center justify-between">
          <h3 className="font-semibold text-primary flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> New Automation</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-caption font-mono font-medium text-secondary uppercase mb-2">Rule Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Celebrate done tasks" className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-primary" required />
          </div>

          <div className="p-4 border border-border rounded-xl bg-surface-hover/30 space-y-4">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2"><Play className="w-4 h-4 text-emerald-500" /> WHEN</h4>
            <div className="grid grid-cols-2 gap-3">
              <select value={triggerType} onChange={e => setTriggerType(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-surface text-primary">
                <option value="TASK_UPDATED">Task is Updated</option>
                {/* Future: <option value="HABIT_COMPLETED">Habit is Completed</option> */}
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-caption font-medium text-secondary">IF</span>
              <select value={conditionField} onChange={e => setConditionField(e.target.value)} className="px-3 py-1.5 border border-border rounded-md bg-surface text-primary text-sm">
                <option value="status">Status</option>
                <option value="priority">Priority</option>
              </select>
              <span className="text-caption font-medium text-secondary">IS</span>
              <input type="text" value={conditionValue} onChange={e => setConditionValue(e.target.value)} className="flex-1 px-3 py-1.5 border border-border rounded-md bg-surface text-primary text-sm" />
            </div>
          </div>

          <div className="p-4 border border-border rounded-xl bg-amber-500/5 space-y-4">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2"><Settings2 className="w-4 h-4 text-amber-500" /> THEN</h4>
            <select value={actionType} onChange={e => setActionType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-primary">
              <option value="ADD_COMMENT">Add a Comment</option>
              <option value="CREATE_NOTIFICATION">Send Notification</option>
            </select>
            <input type="text" value={actionMessage} onChange={e => setActionMessage(e.target.value)} placeholder="Message content..." className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-primary" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <BaseButton type="button" variant="secondary" onClick={onClose}>Cancel</BaseButton>
            <BaseButton type="submit" disabled={!name || createMutation.isPending}>Create Rule</BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}
