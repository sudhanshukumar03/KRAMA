import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, TrendingUp, Calendar, AlertCircle, ArrowUpCircle, XCircle, Plus, Sparkles, ArrowRight, X } from 'lucide-react';
import { ConfirmDeleteButton } from './ui/ConfirmDeleteButton';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import type { GoalWithRelations } from '../types/schema';
import { computeGoalPace } from '../lib/goalUtils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isHabitScheduledToday } from '../lib/habitFilters';
import { HabitRow } from './HabitRow';
import { IconPicker } from './ui/IconPicker';

function GoalCard({ goal, depth = 0 }: { goal: GoalWithRelations, depth?: number }) {
 const queryClient = useQueryClient();
 const pace = computeGoalPace(goal);
 const [isEditingProgress, setIsEditingProgress] = useState(false);
 const [sliderVal, setSliderVal] = useState(goal.progress);

 const updateGoalMutation = useMutation({
 mutationFn: (newProgress: number) => api.goals.update(goal.id, { progress: newProgress }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 setIsEditingProgress(false);
 }
 });

 const handleDeleteGoal = async (e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 await api.goals.delete(goal.id);
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 toast.success(`Deleted "${goal.title}"`, {
 action: {
 label: 'Undo',
 onClick: async () => {
 await api.goals.restore(goal.id);
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 toast.success(`Restored "${goal.title}"`);
 }
 }
 });
 } catch {
 toast.error('Failed to delete goal');
 }
 };

 // Historical points for the mini trendline from live PostgreSQL snapshots
 const trendPoints = (goal.snapshots && goal.snapshots.length > 0)
 ? [...goal.snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(s => s.progress)
 : [0, goal.progress];

 return (
 <div className="flex flex-col mb-4 group/goal">
 <div 
 className={cn("v4-card p-5 transition-all duration-150 hover:border-[#0D9488]",
 depth > 0 &&"border-l-4 border-l-[#E5E8EC] rounded-l-none bg-surface-hover/60",
 depth === 0 &&"border-l-2 border-l-[#0D9488]"
 )}
 >
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
 <div>
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-[10px] font-mono font-bold uppercase tracking-[0.02em] text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-2 py-0.5 rounded">
 {goal.type}
 </span>
 <h3 className="text-card text-primary mb-2 group-hover/goal:text-[#0D9488] transition-colors">{goal.title}</h3>
 </div>
 {goal.targetDate && (
 <div className="flex items-center gap-1.5 text-caption text-secondary font-mono">
 <Calendar className="w-3.5 h-3.5 stroke-[1.5]" />
 Target: {new Date(goal.targetDate).toLocaleDateString()}
 <span className={cn("px-1.5 py-0.2 rounded text-[10px]",
 pace.daysRemaining > 0 ?"bg-surface-hover text-secondary" :"bg-red-50 text-[#DC2626] font-medium"
 )}>
 {pace.daysRemaining > 0 ? `${pace.daysRemaining}d left` :"Past due"}
 </span>
 </div>
 )}
 {(goal._count?.projects !== undefined || goal._count?.habits !== undefined) && (
  <div className="flex items-center gap-2 mt-1.5 text-caption text-secondary font-mono">
  {goal._count.projects !== undefined && (
  <span className="bg-surface-hover px-1.5 py-0.5 rounded text-[10px]">
  {goal._count.projects} project{goal._count.projects !== 1 ? 's' : ''}
  </span>
  )}
  {goal._count.habits !== undefined && (
  <span className="bg-surface-hover px-1.5 py-0.5 rounded text-[10px]">
  {goal._count.habits} habit{goal._count.habits !== 1 ? 's' : ''}
  </span>
  )}
  </div>
  )}
 </div>
 
 <div className="flex items-center gap-3">
 {/* Interactive Progress Editor Toggle */}
 <button 
 onClick={() => setIsEditingProgress(!isEditingProgress)}
 className="px-2.5 py-1 rounded-md bg-surface-hover hover:bg-[#0D9488]/10 text-secondary hover:text-[#0D9488] border border-border text-caption font-medium transition-colors"
 >
 {isEditingProgress ? 'Done' : 'Update Pace'}
 </button>
 <span className="text-2xl font-medium text-primary font-mono tracking-tight">{goal.progress}%</span>
 <ConfirmDeleteButton
 onConfirm={handleDeleteGoal}
 className="opacity-0 group-hover/goal:opacity-100 ml-1"
 iconClassName="w-4 h-4"
 />
 </div>
 </div>
 
 {/* Progress Bar or Slider */}
 {isEditingProgress ? (
 <div className="mb-4 p-3 bg-surface-hover rounded-lg border border-[#0D9488]/30 animate-in fade-in duration-150">
 <div className="flex items-center justify-between text-caption font-mono text-secondary mb-2">
 <span>Adjust current completion percentage:</span>
 <span className="font-bold text-[#0D9488] text-body">{sliderVal}%</span>
 </div>
 <input 
 type="range" 
 min="0" 
 max="100" 
 value={sliderVal} 
 onChange={(e) => setSliderVal(Number(e.target.value))}
 className="w-full accent-[#0D9488] cursor-pointer" 
 />
 <div className="flex justify-end gap-2 mt-2">
 <button 
 onClick={() => setIsEditingProgress(false)} 
 className="px-2.5 py-1 text-caption text-secondary hover:text-primary"
 >
 Cancel
 </button>
 <button 
 onClick={() => updateGoalMutation.mutate(sliderVal)} 
 className="px-3 py-1 bg-[#0D9488] text-white rounded text-caption font-medium hover:bg-[#0F766E] transition-colors"
 >
 Save Snapshot
 </button>
 </div>
 </div>
 ) : (
 <div className="h-2 w-full bg-[#E5E8EC] rounded-full overflow-hidden mb-4">
 <div 
 className="h-full bg-[#0D9488] transition-all duration-400 ease-out" 
 style={{ width: `${goal.progress}%` }}
 />
 </div>
 )}

 {/* Pace Panel with NEW Mini Trendline */}
 <div className="bg-surface-hover border border-border rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
 
 <div className="flex flex-wrap items-center gap-4">
 <div className="flex items-center gap-1.5">
 {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-[#DC2626] stroke-[1.75]" /> :
 pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-[#DC2626] stroke-[1.75]" /> :
 pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#0D9488] stroke-[1.75]" /> :
 <CheckCircle2 className="w-4 h-4 text-[#0D9488] stroke-[1.75]" />}
 <span className={cn("text-caption font-mono font-bold uppercase tracking-[0.02em]",
 ['stalled', 'past_due', 'behind'].includes(pace.status) ?"text-[#DC2626]" :"text-primary"
 )}>
 {pace.badge}
 </span>
 </div>

 <div className="flex items-center gap-3 text-caption text-secondary font-mono">
 <span>Req: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(1)}%/d</span>
 <span>Act: {pace.actualPace.toFixed(1)}%/d</span>
 </div>
 </div>

 {/* NEW: Mini Trendline Sparkline & Projection */}
 <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-border/60">
 <div className="flex items-end gap-1 h-5 px-2 bg-card border border-border rounded shadow-2xs" title="Recent 5-step snapshot trend">
 {trendPoints.map((val, i) => (
 <div key={i} className="w-1.5 bg-[#0D9488] rounded-t-2xs" style={{ height: `${Math.max(15, (val / 100) * 100)}%` }} />
 ))}
 </div>

 <div className="text-caption font-medium text-primary">
 {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
 <span className="text-secondary font-normal">Stalled progress</span>
 ) : pace.projectedDate ? (
 <span className="font-mono">Est: <b className="font-bold text-[#0D9488]">{pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</b></span>
 ) : null}
 </div>
 </div>

 </div>
 </div>
 
 {/* Child Goals */}
 {goal.childGoals && goal.childGoals.length > 0 && (
 <div className="mt-3 pl-6 md:pl-10 space-y-3">
 {goal.childGoals.map((child: GoalWithRelations) => (
 <GoalCard key={child.id} goal={child} depth={depth + 1} />
 ))}
 </div>
 )}
 </div>
 );
}

function GoalCreateModal({
 open,
 onClose,
 onSubmit,
 isSubmitting
}: {
 open: boolean;
 onClose: () => void;
 onSubmit: (data: { title: string; type: string; progress: number; targetDate: string; icon?: string }) => void;
 isSubmitting: boolean;
}) {
 const [title, setTitle] = useState('');
 const [icon, setIcon] = useState<string | null>(null);
 const [type, setType] = useState('quarterly');
 const [progress, setProgress] = useState(0);
 const [targetDate, setTargetDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 90);
 return d.toISOString().split('T')[0];
 });

 if (!open) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) return;
 onSubmit({ title: title.trim(), icon: icon || undefined, type, progress, targetDate });
 };

 return (
 <div
 onClick={onClose}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
 >
 <div
 onClick={e => e.stopPropagation()}
 className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
 <Target className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">Create New Goal / OKR</h3>
 </div>
 <button
 onClick={onClose}
 type="button"
 className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div className="flex gap-3">
   <div>
     <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
       Icon
     </label>
     <IconPicker
       value={icon}
       onChange={setIcon}
       triggerClassName="w-10 h-10 px-0 py-0"
     />
   </div>
   <div className="flex-1">
     <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
     Objective Title <span className="text-[#DC2626]">*</span>
     </label>
     <input
     type="text"
     value={title}
     onChange={e => setTitle(e.target.value)}
     placeholder="e.g., Ship Krama OS v1.0 Public Beta"
     required
     className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 transition-shadow"
     />
   </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Strategic Horizon
 </label>
 <select
 value={type}
 onChange={e => setType(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition-all"
 >
 <option value="quarterly">Quarterly (90 Days)</option>
 <option value="yearly">Annual Horizon</option>
 <option value="monthly">Monthly Sprint</option>
 </select>
 </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Target Date
 </label>
 <input
 type="date"
 value={targetDate}
 onChange={e => setTargetDate(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition-all"
 />
 </div>
 </div>

 <div>
 <div className="flex justify-between items-center mb-1.5">
 <label className="text-caption font-mono font-medium text-secondary uppercase">
 Initial Progress
 </label>
 <span className="text-caption font-mono font-bold text-[#0D9488]">{progress}%</span>
 </div>
 <input
 type="range"
 min="0"
 max="100"
 value={progress}
 onChange={e => setProgress(Number(e.target.value))}
 className="w-full accent-[#0D9488] cursor-pointer"
 />
 </div>

 <div className="pt-4 border-t border-border flex justify-end gap-3">
 <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
 Cancel
 </BaseButton>
 <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
 {isSubmitting ? 'Creating...' : 'Create Goal'}
 </BaseButton>
 </div>
 </form>
 </div>
 </div>
 );
}

export function Goals() {
 const navigate = useNavigate();
 const { data: goals = [], isLoading: goalsLoading, isError: goalsError } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
 const { data: habits = [], isLoading: habitsLoading, isError: habitsError } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

 const queryClient = useQueryClient();
 const toggleHabitMutation = useMutation({
  mutationFn: (id: string) => api.habits.complete(id),
  onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['habits'] });
  queryClient.invalidateQueries({ queryKey: ['snapshots'] });
  queryClient.invalidateQueries({ queryKey: ['goals'] });
  }
  });

 const restoreHabitMutation = useMutation({
 mutationFn: (snapshot: any) => api.habits.restore(snapshot),
 onSuccess: (restoredHabit) => {
 queryClient.invalidateQueries({ queryKey: ['habits'] });
 queryClient.invalidateQueries({ queryKey: ['snapshots'] });
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 toast.success(`Restored"${restoredHabit?.name || 'Routine'}"`);
 },
 onError: () => toast.error('Failed to restore routine')
 });

 const deleteHabitMutation = useMutation({
 mutationFn: (id: string) => api.habits.delete(id),
 onSuccess: (_, deletedId) => {
 queryClient.invalidateQueries({ queryKey: ['habits'] });
 queryClient.invalidateQueries({ queryKey: ['snapshots'] });
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 const deletedName = habits.find(h => h.id === deletedId)?.name || 'Routine';
 toast.success(`Deleted"${deletedName}"`, {
 action: {
 label: 'Undo',
 onClick: () => restoreHabitMutation.mutate(deletedId)
 }
 });
 },
 onError: () => toast.error('Failed to delete routine')
 });

 const [createModalOpen, setCreateModalOpen] = useState(false);
 const createGoalMutation = useMutation({
 mutationFn: (data: { title: string; type: string; progress: number; targetDate: string; icon?: string }) =>
 api.goals.create({
 title: data.title,
 type: data.type,
 progress: data.progress,
 icon: data.icon,
 targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
 }),
 onSuccess: (newGoal) => {
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 setCreateModalOpen(false);
 toast.success(`Created"${newGoal?.title || 'Goal'}"`);
 },
 onError: () => {
 toast.error('Failed to create goal');
 }
 });

 const handleCreateGoal = () => {
 setCreateModalOpen(true);
 };

 if (goalsLoading || habitsLoading) {
 return <LoadingState variant="goals" title="Loading Goals & OKRs..." description="Calculating progress velocities and habit links..." />;
 }

 if (goalsError || habitsError) {
 return (
 <div className="p-8">
 <ErrorState
 title="Failed to load Goals & OKRs"
 message="Could not retrieve goals and habit data from the server. Please verify your connection."
 onRetry={() => {
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 queryClient.invalidateQueries({ queryKey: ['habits'] });
 }}
 />
 </div>
 );
 }

 const rootGoals = goals.filter(g => !g.parentGoalId);

 return (
 <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-20">
 <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
 <div>
 <div className="flex items-center gap-2.5 mb-1">
 <h1 className="text-title text-primary mb-4 ">Goals & OKRs</h1>
 <span className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-[0.02em] flex items-center gap-1">
 <Sparkles className="w-3 h-3 stroke-[2]" /> Q3 Strategic Horizon
 </span>
 </div>
 <p className="text-[13px] text-secondary">Track high-level quarterly objectives, pacing metrics, and linked daily routines.</p>
 </div>
 <BaseButton onClick={handleCreateGoal}>
 <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> New Goal
 </BaseButton>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
 
 {/* Goals List (Takes up 2/3) - Category Tile: Goals (#0D9488 Teal) */}
 <div className="lg:col-span-2 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-[12px] bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-sm">
 <Target className="w-5 h-5 stroke-[1.75]" />
 </div>
 <div>
 <h2 className="text-section text-primary mb-3 ">Active Goals Tree</h2>
 <p className="text-caption text-secondary">Interactive snapshots and automatic pacing projections</p>
 </div>
 </div>
 <span className="text-caption font-mono text-secondary bg-surface-hover border border-border px-2.5 py-1 rounded font-medium">
 {rootGoals.length} strategic OKRs
 </span>
 </div>
 
 <div className="space-y-4 pt-2">
 {rootGoals.map(goal => (
 <GoalCard key={goal.id} goal={goal} />
 ))}
 {rootGoals.length === 0 && (
 <div className="border border-border rounded-xl bg-surface h-64 flex items-center justify-center shadow-sm">
 <EmptyState 
 icon={Target}
 description="No goals set."
 actionLabel="Set Goal"
 onAction={handleCreateGoal}
 />
 </div>
 )}
 </div>
 </div>

 {/* Habits List Widget (Takes up 1/3) - Category Tile: Habits (#EA580C Orange) */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-[12px] bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-sm">
 <TrendingUp className="w-5 h-5 stroke-[1.75]" />
 </div>
 <div>
 <h2 className="text-section text-primary mb-3 ">Habits Overview</h2>
 <p className="text-caption text-secondary">Daily consistency drivers</p>
 </div>
 </div>
 <button 
 onClick={() => navigate('/app/habits')}
 className="text-caption font-medium text-[#EA580C] hover:underline flex items-center gap-1"
 >
 Full tracker <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 
 <div className="v4-card overflow-hidden pt-1">
 <div className="divide-y divide-border">
 {habits.filter(isHabitScheduledToday).map(habit => (
  <HabitRow
    key={habit.id}
    habit={habit}
    onToggle={() => toggleHabitMutation.mutate(habit.id)}
    onDelete={(id) => deleteHabitMutation.mutate(id)}
    onNavigate={() => navigate('/app/habits')}
  />
 ))}
 {habits.filter(isHabitScheduledToday).length === 0 && (
 <div className="py-8">
 <EmptyState 
 icon={TrendingUp}
 description="No active habits scheduled for today."
 />
 </div>
 )}
 </div>
 <div className="p-3 bg-surface-hover border-t border-border text-center">
 <button onClick={() => navigate('/app/habits')} className="text-caption font-medium text-primary hover:text-[#EA580C] transition-colors">
 View 30-Day Heatmap Tracker &rarr;
 </button>
 </div>
 </div>
 </div>

 </div>

 <GoalCreateModal
 open={createModalOpen}
 onClose={() => setCreateModalOpen(false)}
 onSubmit={(data) => createGoalMutation.mutate(data)}
 isSubmitting={createGoalMutation.isPending}
 />
 </div>
 );
}
