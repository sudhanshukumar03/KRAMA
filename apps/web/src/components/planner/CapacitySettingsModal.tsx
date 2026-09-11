import { useState, useEffect } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  currentCapacityMinutes: number;
}

export function CapacitySettingsModal({ open, onClose, currentCapacityMinutes }: Props) {
  const [hours, setHours] = useState(40);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setHours(Math.floor((currentCapacityMinutes ?? 2400) / 60));
    }
  }, [open, currentCapacityMinutes]);

  const saveMutation = useMutation({
    mutationFn: async (capacityMinutes: number) => {
      return api.auth.updatePreferences({ 
        weeklyCapacityMinutes: capacityMinutes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Weekly capacity updated');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update capacity');
      onClose();
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="bg-surface rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <CalendarDays size={18} className="text-accent" />
            <h3 className="font-bold text-sm">Weekly Capacity</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-lg text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">Hours per Week</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="168"
                value={hours}
                onChange={e => setHours(parseInt(e.target.value) || 0)}
                className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                placeholder="40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                hours
              </span>
            </div>
            <p className="text-[10px] text-muted mt-2 font-medium">
              This represents your total working capacity for the week. It helps calculate your workload and free time.
            </p>
          </div>
        </div>

        <div className="p-4 bg-surface-hover/50 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(hours * 60)}
            disabled={saveMutation.isPending}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Capacity'}
          </button>
        </div>
      </div>
    </div>
  );
}
