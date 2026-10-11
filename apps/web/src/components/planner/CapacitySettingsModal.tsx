import { useState, useEffect } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { useModalA11y } from '../../hooks/useModalA11y';

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
      setHours((currentCapacityMinutes ?? 2400) / 60);
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
    }
  });

  const dialogRef = useModalA11y(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capacity-modal-title"
        tabIndex={-1}
        className="krama-dialog w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 outline-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <CalendarDays size={18} className="text-accent" />
            <h3 id="capacity-modal-title" className="font-bold text-sm">Weekly Capacity</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 hover:bg-surface-hover rounded-lg text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div>
            <label htmlFor="capacity-hours" className="block text-xs font-bold text-muted mb-1.5">Hours per Week</label>
            <div className="relative">
              <input
                id="capacity-hours"
                step="any"
                type="number"
                min="0"
                max="168"
                value={hours}
                onChange={e => setHours(Number(e.target.value) || 0)}
                className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                placeholder="40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                hours
              </span>
            </div>
            <p className="text-label text-muted mt-2 font-medium">
              This represents your total working capacity for the week. It helps calculate your workload and free time.
            </p>
          </div>
        </div>

        <div className="p-4 bg-surface-hover/50 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="krama-btn krama-btn-secondary px-3.5 py-1.5 text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(Math.round(hours * 60))}
            disabled={saveMutation.isPending || !Number.isFinite(hours) || hours < 0 || hours > 168}
            className="krama-btn krama-btn-primary px-3.5 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Capacity'}
          </button>
        </div>
      </div>
    </div>
  );
}
