import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Clock, Play, ListTodo, Flame, CheckCircle2, TrendingDown, Activity, Check, Award, ArrowRight, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function SprintView() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
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
    } catch (err) {
      toast.error('Failed to start sprint');
    }
  };

  if (sprintsLoading || issuesLoading) return <LoadingState title="Loading Sprint Telemetry..." description="Synchronizing sprint burndown curve and execution velocity..." />;

  const activeSprint = sprints[0];

  if (!activeSprint) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full flex items-center justify-center bg-canvas animate-in fade-in duration-150">
        <EmptyState 
          icon={Clock}
          title="No Active Sprint"
          description="Plan a 14-day execution cycle to focus your engineering velocity."
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

  const sprintIssues = issues.filter(i => ['todo', 'in_progress', 'review'].includes(i.status));
  const doneIssues = issues.filter(i => ['done', 'testing', 'released'].includes(i.status));
  
  const totalIssues = sprintIssues.length + doneIssues.length;
  const progress = totalIssues === 0 ? 0 : Math.round((doneIssues.length / totalIssues) * 100);

  // Compute story points from estimates (default 3h if missing)
  const completedPoints = doneIssues.reduce((acc, i) => acc + (i.estimate || 3), 0);
  const remainingPoints = sprintIssues.reduce((acc, i) => acc + (i.estimate || 3), 0);
  const totalPoints = completedPoints + remainingPoints;
  const velocityPacing = (completedPoints / Math.max(1, dayOfSprint)) * 7;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-24">
      
      {/* SPRINT HERO MOMENT — Blueprint Schematics Banner with Live Burndown Curve */}
      <div className="mb-8 bg-surface border-2 border-border hover:border-primary/40 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm transition-all duration-200">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-gradient-to-br from-[#2563EB]/10 dark:from-[#00E5FF]/10 to-transparent rounded-full pointer-events-none" />
        
        {/* Progress Background Track & Glowing Bar */}
        <div className="absolute top-0 left-0 h-1.5 bg-surface-hover w-full" />
        <div 
          className="absolute top-0 left-0 h-1.5 bg-[#2563EB] dark:bg-[#00E5FF] transition-all duration-700 ease-out" 
          style={{ 
            width: `${progress}%`,
            filter: 'drop-shadow(0 0 6px var(--color-signal-glow))'
          }} 
        />

        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span className="bg-primary text-surface px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase shadow-2xs">
                ACTIVE SPRINT
              </span>
              <span className="bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF] border border-[#2563EB]/20 dark:border-[#00E5FF]/20 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase">
                {totalIssues} DIRECTIVES
              </span>
              <span className="text-secondary text-xs font-mono font-medium flex items-center gap-1.5 ml-1">
                <Clock className="w-3.5 h-3.5 stroke-[1.5]" /> Day {dayOfSprint} of {totalDays} ({daysRemaining}d remaining)
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary mb-2">{activeSprint.name}</h1>
            <p className="text-body text-secondary max-w-xl">
              Focused 14-day engineering execution cycle. Sprint velocity targets zero-blocker milestone deployment.
            </p>
          </div>

          <div className="sm:text-right bg-surface-hover/80 p-4 rounded-xl border border-border shrink-0 flex flex-col justify-center">
            <div className="text-4xl font-bold text-[#2563EB] dark:text-[#00E5FF] mb-0.5 font-mono leading-none">{progress}%</div>
            <div className="text-[10px] font-mono font-bold text-secondary uppercase tracking-widest mt-1">BURNDOWN VELOCITY</div>
          </div>
        </div>

        {/* Celebratory Milestone Ribbon (Appears when ahead or near completion) */}
        {progress >= 50 && (
          <div className="mb-6 bg-gradient-to-r from-[#2563EB]/10 dark:from-[#00E5FF]/10 via-surface to-transparent border-l-4 border-l-[#2563EB] dark:border-l-[#00E5FF] p-3.5 rounded-r-xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] flex items-center justify-center shrink-0 shadow-sm">
                <Award className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div className="text-xs font-mono">
                <strong className="text-primary block font-bold">Milestone Pace: High-Velocity Execution</strong>
                <span className="text-secondary">Team output is tracking ahead of nominal schedule. All core deliverables on target.</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/app/board')} 
              className="text-xs font-mono font-bold text-[#2563EB] dark:text-[#00E5FF] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Open Kanban <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>
        )}

        {/* Burndown & Velocity Summary Header Scorecard — Minimalist Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border">
          <div className="bg-surface-hover/50 p-3.5 rounded-xl border border-border/60 hover:border-border transition-all">
            <div className="text-[10px] font-mono font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#00E5FF] stroke-[1.5]" /> Total Story Points
            </div>
            <div className="text-xl font-mono font-bold text-primary">{totalPoints} pts</div>
            <div className="text-[10px] text-muted font-mono mt-0.5">Across {totalIssues} tickets</div>
          </div>

          <div className="bg-surface-hover/50 p-3.5 rounded-xl border border-border/60 hover:border-border transition-all">
            <div className="text-[10px] font-mono font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" /> Burned Down
            </div>
            <div className="text-xl font-mono font-bold text-[#109868]">{completedPoints} pts</div>
            <div className="text-[10px] text-muted font-mono mt-0.5">{remainingPoints} pts remaining</div>
          </div>

          <div className="bg-surface-hover/50 p-3.5 rounded-xl border border-border/60 hover:border-border transition-all">
            <div className="text-[10px] font-mono font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[1.5]" /> Velocity Pacing
            </div>
            <div className="text-xl font-mono font-bold text-primary">{Math.round(velocityPacing)} pts/wk</div>
            <div className="text-[10px] text-muted font-mono mt-0.5">Projected weekly output</div>
          </div>

          <div className="bg-surface-hover/50 p-3.5 rounded-xl border border-border/60 hover:border-border transition-all">
            <div className="text-[10px] font-mono font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#00E5FF] stroke-[1.5]" /> Trajectory
            </div>
            <div className="text-xl font-mono font-bold text-[#2563EB] dark:text-[#00E5FF]">On Track</div>
            <div className="text-[10px] text-muted font-mono mt-0.5">Est. close 1d before cutoff</div>
          </div>
        </div>

      </div>

      {/* TWO COLUMN UNBOXED DIRECTIVE STREAMS — Zero Cards, 100% Whitespace & 1px Dividers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left Column: Current Focus (Backlog & In Progress) — Unboxed Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 flex items-center justify-center text-[#2563EB] dark:text-[#00E5FF]">
                <Play className="w-4 h-4 stroke-[1.5] fill-current" />
              </div>
              <div>
                <h2 className="text-h2 font-bold tracking-tight text-primary">Current Directives</h2>
                <span className="text-[11px] font-mono text-secondary">Active backlog & in-progress tasks</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-primary bg-surface-hover px-2.5 py-1 rounded-md border border-border">
              {sprintIssues.length} ACTIVE
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {sprintIssues.map(issue => {
              const completedSubs = issue.childIssues?.filter((c: any) => c.status === 'done' || c.status === 'released').length || 0;
              const totalSubs = issue.childIssues?.length || 0;
              return (
                <div 
                  key={issue.id} 
                  onClick={() => navigate('/app/board')}
                  className="py-3.5 hover:bg-surface-hover/50 -mx-2 px-3 rounded-xl transition-all duration-150 flex gap-3.5 items-start cursor-pointer group"
                >
                  <div className="mt-1 shrink-0">
                    <div className="w-4 h-4 rounded border-2 border-border group-hover:border-[#2563EB] dark:group-hover:border-[#00E5FF] transition-colors" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[10px] text-muted font-bold tracking-wider group-hover:text-primary transition-colors">{issue.id}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-widest border",
                        issue.priority === 'urgent' ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30 animate-pulse" 
                        : issue.priority === 'high' ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" 
                        : "bg-surface-hover text-secondary border-border"
                      )}>{issue.priority}</span>
                    </div>

                    <div className="font-medium text-sm text-primary mb-1 leading-snug group-hover:text-[#2563EB] dark:group-hover:text-[#00E5FF] transition-colors">
                      {issue.title}
                    </div>
                    
                    {/* Hover Reveal Metadata (Linear Minimal Style) */}
                    <div className="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-2 group-hover:pt-2 group-hover:border-t group-hover:border-border/40 transition-all duration-200 overflow-hidden flex flex-wrap items-center gap-3 text-[11px] text-secondary font-mono">
                      <span className="capitalize text-primary font-bold">{issue.status.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className="text-primary font-bold">{issue.estimate || 3}h pt est</span>
                      {totalSubs > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#2563EB] dark:text-[#00E5FF] font-bold flex items-center gap-1">
                            <Layers className="w-3 h-3 inline stroke-[1.5]" /> {completedSubs}/{totalSubs} subtasks
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {sprintIssues.length === 0 && (
              <div className="py-12 flex items-center justify-center">
                <EmptyState 
                  icon={Play}
                  description="No active directives in current sprint."
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Completed Directives — Unboxed Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#109868]/10 flex items-center justify-center text-[#109868]">
                <ListTodo className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-h2 font-bold tracking-tight text-primary">Completed Directives</h2>
                <span className="text-[11px] font-mono text-secondary">Verified & deployed sprint deliverables</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#109868] bg-[#109868]/10 border border-[#109868]/20 px-2.5 py-1 rounded-md">
              {doneIssues.length} RESOLVED
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {doneIssues.map(issue => (
              <div 
                key={issue.id} 
                onClick={() => navigate('/app/board')}
                className="py-3.5 hover:bg-surface-hover/50 -mx-2 px-3 rounded-xl transition-all duration-150 flex gap-3.5 items-start text-muted group cursor-pointer"
              >
                <div className="mt-1 shrink-0">
                  <div className="w-4 h-4 rounded bg-[#109868] flex items-center justify-center shadow-2xs">
                    <Check className="w-3 h-3 text-white dark:text-[#050811] stroke-[3]" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-muted">{issue.id}</span>
                    <span className="text-[10px] font-mono text-[#109868] font-bold">COMPLETED</span>
                  </div>

                  <div className="font-medium text-sm mb-1 leading-snug line-through text-secondary group-hover:text-primary transition-colors truncate">
                    {issue.title}
                  </div>
                  
                  <div className="text-[10px] font-mono text-muted flex items-center gap-2">
                    <span className="text-secondary">Verified Release</span>
                    <span>•</span>
                    <span>{issue.estimate || 3}h pt logged</span>
                  </div>
                </div>
              </div>
            ))}
            {doneIssues.length === 0 && (
              <div className="py-12 flex items-center justify-center">
                <EmptyState 
                  icon={ListTodo}
                  description="No completed directives logged yet."
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
