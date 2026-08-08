import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { X, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function WorkspaceCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const { switchWorkspace } = useAuth();

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) => api.workspaces.create(data),
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created successfully!');
      switchWorkspace(newWorkspace.id);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create workspace');
    }
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-card text-primary mb-0 font-semibold tracking-tight">Create Workspace</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5 tracking-wider">
              Workspace Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Acme Corp or Personal Brain"
              required
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-body font-medium text-secondary bg-surface-hover hover:text-primary rounded-lg transition-colors border border-border outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2 text-body font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-all shadow-sm disabled:opacity-50 outline-none flex items-center justify-center"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
