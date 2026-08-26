import { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RoutineModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('PRODUCTIVITY');
  const [duration, setDuration] = useState(15);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create habit using the existing API
      return api.habits.create({
        name: name.trim(),
        category,
        expectedDurationMinutes: duration,
        cadence: 'daily',
        difficulty: 'MEDIUM',
        scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Default all days for a planner creation
        timeOfDay: 'anytime'
      });
    },
    onSuccess: () => {
      toast.success('Routine created');
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setName('');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create routine');
    }
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Add Routine</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Routine Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
              placeholder="e.g., Morning Meditaton, Workout"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm bg-white"
              >
                <option value="PRODUCTIVITY">Productivity</option>
                <option value="HEALTH">Health</option>
                <option value="LEARNING">Learning</option>
                <option value="MINDFULNESS">Mindfulness</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration (m)</label>
              <input
                type="number"
                min="1"
                required
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
