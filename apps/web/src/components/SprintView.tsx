import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Clock, Play, ListTodo, Flame, CheckCircle2, TrendingDown, Activity, Check } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { cn } from '../lib/utils';

export function SprintView() {
 const queryClient = useQueryClient();
 const { data: sprints = [], isLoading: sprintsLoading } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });
 const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
 const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

 const handleStartSprint = async () => {
 try {
 if (projects.length === 0) {
 toast.error('No project found. Create a project first!');
 return;
 }
 const now = new Date();
 const end = new Date(now.getTime() + 14 * 86400000);
 await api.sprints.create({
 name: `Sprint ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
 startDate: now.toISOString().split('T')[0],
 endDate: end.toISOString().split('T')[0],
 projectId: projects[0].id,
 goals: 'Execute high-priority sprint backlog items.'
 });
 queryClient.invalidateQueries({ queryKey: ['sprints'] });
 toast.success('Started new 14-day sprint!');
 } catch {
 toast.error('Failed to start sprint');
 }
 };

 if (sprintsLoading || issuesLoading) return <LoadingState title="Loading Sprint View..." description="Synchronizing sprint burnup and team velocity..." />;

 const activeSprint = sprints[0];

 if (!activeSprint) {
 return (
 <div className="p-8 max-w-5xl mx-auto w-full h-full flex items-center justify-center bg-canvas animate-in fade-in duration-150">
 <EmptyState 
 icon={Clock}
 title="No Active Sprint"
 description="Plan a sprint to focus your execution."
 actionLabel="Start Sprint"
 onAction={handleStartSprint}
 />
 </div>
 );
 }

 // Calculate days remaining
 const end = new Date(activeSprint.endDate);
 const now = new Date();
 const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24)));
 const totalDays = 14;
 const dayOfSprint = Math.max(1, totalDays - daysRemaining);

 const activeSprintIssues = issues.filter(i => i.sprintId === activeSprint.id);
 const sprintIssues = activeSprintIssues.filter(i => ["TODO", "IN_PROGRESS", "REVIEW"].includes(i.status));
 const doneIssues = activeSprintIssues.filter(i => ["DONE"].includes(i.status));
 
 const totalIssues = sprintIssues.length + doneIssues.length;
 const progress = totalIssues === 0 ? 0 : Math.round((doneIssues.length / totalIssues) * 100);

 // Compute story points from estimates (default 3h if missing)
 const completedPoints = doneIssues.reduce((acc, i) => acc + (i.estimateMinutes || 3), 0);
 const remainingPoints = sprintIssues.reduce((acc, i) => acc + (i.estimateMinutes || 3), 0);
 const totalPoints = completedPoints + remainingPoints;
 const velocityPacing = (completedPoints / Math.max(1, dayOfSprint)) * 7;

 return (
 <div className="p-8 max-w-6xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-20">
 
 {/* Main Sprint Banner */}
 <div className="mb-6 v4-card p-8 relative overflow-hidden shadow-sm">
 {/* Progress Background */}
 <div className="absolute top-0 left-0 h-1.5 bg-[#E5E8EC] w-full" />
 <div className="absolute top-0 left-0 h-1.5 bg-[#2563EB] transition-all duration-400 ease-out" style={{ width: `${progress}%` }} />

 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
 <div>
 <div className="flex items-center gap-2.5 mb-3">
 <span className="bg-primary text-white px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-[0.02em] uppercase">
 Active Sprint
 </span>
 <span className="bg-[#EFF4FE] text-[#2563EB] border border-[#2563EB]/20 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-[0.02em] uppercase">
 {totalIssues} issues
 </span>
 <span className="text-secondary text-caption font-medium flex items-center gap-1.5 ml-1">
 <Clock className="w-3.5 h-3.5 stroke-[1.75]" /> Day {dayOfSprint} of {totalDays} ({daysRemaining} days remaining)
 </span>
 </div>
 <h1 className="text-title text-primary mb-4 ">{activeSprint.name}</h1>
 <p className="text-body text-secondary">Focused execution cycle for strategic engineering milestones.</p>
 </div>
 <div className="sm:text-right bg-surface-hover p-3 rounded-xl border border-border shrink-0">
 <div className="text-4xl font-medium text-[#2563EB] mb-0.5 font-mono">{progress}%</div>
 <div className="text-badge font-mono font-medium text-secondary uppercase tracking-[0.02em]">Sprint Burndown</div>
 </div>
 </div>

 {/* NEW: Burndown & Velocity Summary Header Scorecard */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border">
 <div className="bg-surface-hover p-3.5 rounded-lg border border-border/60">
 <div className="text-badge font-mono text-secondary uppercase tracking-[0.02em] mb-1 flex items-center gap-1.5">
 <Activity className="w-3.5 h-3.5 text-[#2563EB]" /> Total Story Points
 </div>
 <div className="text-xl font-mono font-bold text-primary">{totalPoints} pts</div>
 <div className="text-[10px] text-secondary mt-0.5">Across {totalIssues} tickets</div>
 </div>

 <div className="bg-surface-hover p-3.5 rounded-lg border border-border/60">
 <div className="text-badge font-mono text-secondary uppercase tracking-[0.02em] mb-1 flex items-center gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" /> Burned Down
 </div>
 <div className="text-xl font-mono font-bold text-[#2563EB]">{completedPoints} pts</div>
 <div className="text-[10px] text-secondary mt-0.5">{remainingPoints} pts remaining</div>
 </div>

 <div className="bg-surface-hover p-3.5 rounded-lg border border-border/60">
 <div className="text-badge font-mono text-secondary uppercase tracking-[0.02em] mb-1 flex items-center gap-1.5">
 <Flame className="w-3.5 h-3.5 text-[#2563EB]" /> Velocity Pacing
 </div>
 <div className="text-xl font-mono font-bold text-primary">{Math.round(velocityPacing)} pts/wk</div>
 <div className="text-[10px] text-secondary mt-0.5">Projected weekly output</div>
 </div>

 <div className="bg-surface-hover p-3.5 rounded-lg border border-border/60">
 <div className="text-badge font-mono text-secondary uppercase tracking-[0.02em] mb-1 flex items-center gap-1.5">
 <TrendingDown className="w-3.5 h-3.5 text-[#2563EB]" /> Trajectory
 </div>
 <div className="text-xl font-mono font-bold text-[#2563EB]">On Track</div>
 <div className="text-[10px] text-secondary mt-0.5">Est. finish 1d before close</div>
 </div>
 </div>

 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
 
 {/* Current Focus (Backlog & In Progress) */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
 <Play className="w-4 h-4 stroke-[1.75] fill-[#2563EB]" />
 </div>
 <h2 className="text-section text-primary mb-3 ">Current Focus</h2>
 </div>
 <span className="text-caption font-mono text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border">
 {sprintIssues.length} open
 </span>
 </div>

 <div className="v4-card overflow-hidden divide-y divide-border shadow-sm">
 {sprintIssues.map(issue => (
 <div key={issue.id} className="p-4 hover:bg-surface-hover transition-colors duration-150 flex gap-3.5 items-start cursor-pointer group">
 <div className="mt-1">
 <div className="w-4 h-4 rounded border-2 border-[#D1D5DB] group-hover:border-[#2563EB] transition-colors" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-medium text-body text-primary mb-1.5 leading-tight group-hover:text-[#2563EB] transition-colors truncate">{issue.title}</div>
 <div className="flex flex-wrap items-center gap-2 text-badge text-secondary font-mono">
 <span className="capitalize bg-surface-hover px-1.5 py-0.2 rounded border border-border">{issue.status.replace('_', ' ')}</span>
 <span>•</span>
 <span className={cn("px-1.5 py-0.2 rounded uppercase font-bold text-[9px] border",
 issue.priority === "URGENT" ?"bg-blue-500/10 text-[#2563EB] border-[#2563EB]/20" :"bg-surface-hover text-secondary border-border"
 )}>{issue.priority}</span>
 <span>•</span>
 <span className="text-primary font-medium">{issue.estimateMinutes || 3}h pt</span>
 {issue.childTasks && issue.childTasks.length > 0 && (
 <>
 <span>•</span>
 <span className="text-[#2563EB]">
 {issue.childTasks.filter((c: any) => c.status === "DONE" || c.status === "REVIEW").length}/{issue.childTasks.length} sub-tasks
 </span>
 </>
 )}
 </div>
 </div>
 </div>
 ))}
 {sprintIssues.length === 0 && (
 <div className="h-48 flex items-center justify-center">
 <EmptyState 
 icon={Play}
 description="No active issues in this sprint."
 />
 </div>
 )}
 </div>
 </div>

 {/* Done */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
 <ListTodo className="w-4 h-4 stroke-[1.75]" />
 </div>
 <h2 className="text-section text-primary mb-3 ">Completed</h2>
 </div>
 <span className="text-caption font-mono text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded font-medium">
 {doneIssues.length} done
 </span>
 </div>

 <div className="bg-surface-hover border border-border rounded-xl overflow-hidden divide-y divide-border opacity-90 shadow-2xs">
 {doneIssues.map(issue => (
 <div key={issue.id} className="p-4 flex gap-3.5 items-start text-muted group hover:bg-surface transition-colors">
 <div className="mt-1">
 <div className="w-4 h-4 rounded bg-[#2563EB] flex items-center justify-center shadow-2xs">
 <Check className="w-3 h-3 text-white stroke-[3]" />
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-medium text-body mb-1 leading-tight line-through text-secondary group-hover:text-primary transition-colors truncate">{issue.title}</div>
 <div className="text-badge font-mono text-muted flex items-center gap-2">
 <span>Released & Done</span>
 <span>•</span>
 <span>{issue.estimateMinutes || 3}h pt logged</span>
 </div>
 </div>
 </div>
 ))}
 {doneIssues.length === 0 && (
 <div className="h-48 flex items-center justify-center">
 <EmptyState 
 icon={ListTodo}
 description="No completed issues yet."
 />
 </div>
 )}
 </div>
 </div>

 </div>
 </div>
 );
}

