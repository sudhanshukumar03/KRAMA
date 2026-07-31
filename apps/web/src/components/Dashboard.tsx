import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, ListTodo, ArrowRight } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { useNavigate } from 'react-router-dom';

function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  return Math.floor(seconds) + 's ago';
}

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: issues = [], isLoading: issuesLoading, isError: issuesError } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [], isLoading: projectsLoading, isError: projectsError } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: dailyLogs = [] } = useQuery({ queryKey: ['daily-logs'], queryFn: api.dailyLogs.list });

  const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);
  const inProgressIssues = useMemo(() => issues.filter(i => i.status === 'in_progress'), [issues]);
  const today = useMemo(() => new Date(), []);
  
  const doneIssues = useMemo(() => issues.filter(i => i.status === 'done' || i.status === 'done_deployed'), [issues]);

  const liveBarData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dayStr = d.toISOString().split('T')[0];
      const completedCount = doneIssues.filter(issue => {
        const dateToUse = issue.completedAt ? new Date(issue.completedAt) : new Date(issue.updatedAt);
        return dateToUse.toISOString().split('T')[0] === dayStr;
      }).length;
      data.push({
        name: days[d.getDay()] || '',
        completed: completedCount
      });
    }
    return data;
  }, [doneIssues, today]);

  const weeklyVelocityCount = useMemo(() => {
    return liveBarData.reduce((sum, item) => sum + item.completed, 0);
  }, [liveBarData]);

  const avgGoalProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalProg = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
    return Math.round(totalProg / goals.length);
  }, [goals]);

  const allActivity = [
    ...projects.map(p => ({ id: p.id, action: `Project updated`, title: p.name, type: 'Project' as const, date: new Date(p.updatedAt), status: p.status, link: `/app/projects/${p.id}` })),
    ...issues.map(i => ({ id: i.id, action: `Issue moved to ${i.status.replace('_', ' ')}`, title: i.title, type: 'Issue' as const, date: new Date(i.updatedAt), status: i.status, link: `/app/board` })),
    ...pages.map(p => ({ id: p.id, action: `Page edited`, title: p.title, type: 'Page' as const, date: new Date(p.updatedAt), status: 'active', link: `/app/brain` })),
    ...goals.map(g => ({ id: g.id, action: `Goal updated`, title: g.title, type: 'Goal' as const, date: new Date(g.updatedAt), status: 'active', link: `/app/goals` })),
    ...habits.map(h => ({ id: h.id, action: `Habit completed`, title: h.name, type: 'Habit' as const, date: new Date(h.updatedAt), status: 'done', link: `/app/goals` }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredActivity = allActivity.slice(0, 5);

  const primaryProject = activeProjects[0] || { name: 'Core Architecture & UI Stabilization', id: 'default' };
  const sprintIssuesCount = inProgressIssues.length || 4;

  const todayLog = dailyLogs.find(l => new Date(l.date).toLocaleDateString() === today.toLocaleDateString());
  const deepWorkMins = todayLog?.deepWorkMinutes || 120;
  const hours = Math.floor(deepWorkMins / 60);
  const mins = deepWorkMins % 60;

  if (issuesLoading || projectsLoading) {
    return <LoadingState variant="dashboard" title="Loading Dashboard..." description="Syncing workspace data..." />;
  }

  if (issuesError || projectsError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Dashboard Offline"
          message="An error occurred while connecting to telemetry systems. Please check server connection."
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full min-h-full animate-in fade-in duration-150 flex flex-col gap-10 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-title mb-2">Dashboard</h1>
          <p className="text-body text-secondary">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — {inProgressIssues.length} active priorities across {activeProjects.length} projects.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => navigate('/app/board')} 
            className="h-9 px-3.5 rounded-lg bg-surface hover:bg-surface-hover text-secondary hover:text-primary border border-border flex items-center gap-2 cursor-pointer shadow-sm text-body font-medium"
          >
            <ListTodo className="w-3.5 h-3.5 stroke-[1.5]" /> Open sprint
          </button>
          <BaseButton onClick={() => navigate('/app/projects')} className="h-9 px-4 text-body font-medium shadow-sm">
            <Plus className="w-4 h-4 mr-1.5 stroke-[1.5]" /> New Project
          </BaseButton>
        </div>
      </div>

      {/* TODAY'S FOCUS (PRIMARY CONTENT = FILLED CARD) */}
      <div className="bg-surface border border-border rounded-[16px] p-8 flex flex-col md:flex-row gap-8 items-start card-hover">
        <div className="flex-1">
          <span className="text-badge text-secondary block mb-3">
            Today's Focus
          </span>
          <h2 className="text-section mb-4">
            Finish {primaryProject.name}
          </h2>
          <p className="text-body text-secondary max-w-xl">
            Focus on clearing remaining blockers to achieve milestone release before weekend cutoff. Ensure all schema migrations are verified.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={() => navigate('/app/board')}
              className="px-6 py-2.5 rounded-[10px] bg-[#2563EB] text-white text-body font-medium hover:bg-[#1D4ED8] btn-press shadow-sm flex items-center gap-2 cursor-pointer"
            >
              Open sprint
            </button>
          </div>
        </div>
        
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 border-l border-border pl-0 md:pl-8 pt-6 md:pt-0 border-t md:border-t-0">
          <div className="flex items-center justify-between">
            <span className="text-body text-secondary">Remaining</span>
            <strong className="text-body text-primary">{sprintIssuesCount} Issues</strong>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-body text-secondary">Deep work logged</span>
            <strong className="text-body text-primary">{hours}h {mins}m</strong>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-body text-secondary">Pace</span>
            <strong className="text-body text-[#0D9488]">Ahead (+18%)</strong>
          </div>
        </div>
      </div>

      {/* SECONDARY PANELS (UNBOXED, HAIRLINE DIVIDERS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
        
        {/* STATS LIST (NO CARDS) */}
        <div>
          <h3 className="text-section mb-4">Execution Metrics</h3>
          <div className="flex flex-col">
            <div className="hairline-row">
              <span className="text-body text-secondary">Weekly Velocity</span>
              <div className="flex items-baseline gap-2 text-right">
                <span className="text-section">{weeklyVelocityCount}</span>
                <span className="text-caption text-secondary">tasks</span>
              </div>
            </div>
            <div className="hairline-row">
              <span className="text-body text-secondary">Active Streaks</span>
              <div className="flex items-baseline gap-2 text-right">
                <span className="text-section">{habits.filter(h => h.streak > 0).length}</span>
                <span className="text-caption text-secondary">habits</span>
              </div>
            </div>
            <div className="hairline-row">
              <span className="text-body text-secondary">OKR Pace</span>
              <div className="flex items-baseline gap-2 text-right">
                <span className="text-section">{avgGoalProgress}%</span>
                <span className="text-caption text-secondary">avg</span>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY LIST (NO CARDS) */}
        <div>
          <h3 className="text-section mb-4">Recent Activity</h3>
          <div className="flex flex-col">
            {filteredActivity.map((activity, idx) => (
              <div key={idx} onClick={() => navigate(activity.link)} className="hairline-row group cursor-pointer hover:bg-surface-hover -mx-3 px-3 rounded-[12px] transition-colors border-transparent border-t border-b-0 border-border">
                <div className="flex flex-col min-w-0">
                  <span className="text-body font-medium truncate group-hover:text-[#2563EB] transition-colors">
                    {activity.title}
                  </span>
                  <span className="text-caption text-secondary mt-0.5 truncate">
                    {activity.action} • {getTimeAgo(activity.date)}
                  </span>
                </div>
                <div className="shrink-0 text-muted group-hover:text-primary transition-colors">
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
            {filteredActivity.length === 0 && (
              <div className="py-6 text-body text-secondary border-t border-border">No recent activity.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
