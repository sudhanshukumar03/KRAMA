import { X, Pin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface Props {
 open: boolean;
 onClose: () => void;
}

export function RoutineModal({ open, onClose }: Props) {
 const queryClient = useQueryClient();

 const { data: habits = [], isLoading } = useQuery({
 queryKey: ['habits'],
 queryFn: api.habits.list,
 enabled: open,
 });

 const pinMutation = useMutation({
 mutationFn: (id: string) => api.habits.update(id, { pinnedToPlanner: true }),
 onSuccess: () => {
 toast.success('Routine pinned to planner');
 queryClient.invalidateQueries({ queryKey: ['planner'] });
 queryClient.invalidateQueries({ queryKey: ['habits'] });
 onClose();
 },
 onError: (err: any) => {
 toast.error(err.message || 'Failed to pin routine');
 },
 });

 if (!open) return null;

 const unpinnedHabits = habits.filter((h: any) => !h.pinnedToPlanner);

 return (
 <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
 <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
 <h2 className="text-sm font-bold text-primary">Pin Routine</h2>
 <button onClick={onClose} className="p-1 text-muted hover:text-primary rounded-lg hover:bg-surface-hover transition-colors">
 <X size={16} />
 </button>
 </div>

 <div className="p-4 overflow-y-auto">
 {isLoading ? (
 <div className="text-center text-sm text-muted py-4">Loading routines...</div>
 ) : unpinnedHabits.length === 0 ? (
 <div className="text-center py-6 px-4">
 <p className="text-sm text-primary font-medium mb-2">No available routines to pin.</p>
 <p className="text-[11px] text-muted">Go to the Daily Schedule to create more routines and habits, or unpin some to see them here.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {unpinnedHabits.map((habit: any) => (
 <button
 key={habit.id}
 onClick={() => pinMutation.mutate(habit.id)}
 disabled={pinMutation.isPending}
 className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/20 hover:bg-indigo-50/50 transition-colors text-left disabled:opacity-50"
 >
 <span className="text-sm font-medium text-primary truncate">{habit.name}</span>
 <Pin size={14} className="text-muted" />
 </button>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
