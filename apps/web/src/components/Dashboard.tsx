import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useDashboard } from '../hooks/useDashboard';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { WelcomeDashboard } from './dashboard/WelcomeDashboard';
import { PomodoroTimer } from './dashboard/PomodoroTimer';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { QuickCaptureModal } from './ui/QuickCaptureModal';
import { EmptyState } from './ui/EmptyState';
import { 
  Target, Sparkles, CheckSquare, Clock, Link as LinkIcon, FileText, Lightbulb, Activity, Flame, Zap, RefreshCw, Briefcase, Calendar
} from 'lucide-react';
import { isHabitScheduledToday } from '../lib/habitFilters';
import { toast } from 'sonner';

export function Dashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useDashboard();
  
  const { data: analyticsOverview } = useQuery({
    queryKey: ['analytics', 'overview', '7d'],
    queryFn: () => api.analytics.overview('7d')
  });

  const { data: aiInsight, isLoading: insightLoading } = useQuery({
    queryKey: ['dashboard-insight'],
    queryFn: () => api.ai.getDashboardInsight()
  });

  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'task' | 'note' | 'idea' | 'link'>('task');
  const [regeneratingInsight, setRegeneratingInsight] = useState(false);

  const handleRegenerateInsight = async () => {
    try {
      setRegeneratingInsight(true);
      const res = await api.ai.getDashboardInsight(true);
      queryClient.setQueryData(['dashboard-insight'], res);
      toast.success('Insight regenerated for today');
    } catch (err: any) {
      if (err.message && err.message.includes('429')) {
        toast.error('You have reached the daily limit (3) for generating AI dashboard insights.');
      } else {
        toast.error('Failed to regenerate insight');
      }
    } finally {
      setRegeneratingInsight(false);
    }
  };

  const toggleTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
      return api.tasks.update(task.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    }
  });

  if (isLoading) return <LoadingState variant="dashboard" title="Loading Dashboard..." />;
  if (isError) return <ErrorState message={(error as any)?.message || 'Failed to load dashboard'} />;
  if (!data) return null;

  const handleQuickCapture = (mode: string) => {
    setCaptureMode(mode as any);
    setCaptureOpen(true);
  };

  // Unlock the main dashboard once they've completed the core setup steps:
  // Workspace, Goal, Project, Task, and Habit.
  const requiredCoreSteps = ['workspace', 'goal', 'project', 'task', 'habit'];
  const hasIncompleteCoreSteps = data.onboarding.steps
    .filter((step: any) => requiredCoreSteps.includes(step.id))
    .some((step: any) => !step.completed);

  if (hasIncompleteCoreSteps) {
    return (
      <>
        <WelcomeDashboard dashboardData={data} onQuickCapture={handleQuickCapture} />
        <QuickCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} defaultMode={captureMode} />
      </>
    );
  }

  // Today's Focus Card logic
  const todayTasks = data.today?.tasks || [];
  const topPriorityTask = todayTasks.find((t: any) => t.priority === 'URGENT' || t.priority === 'HIGH') || todayTasks[0];
  const totalToday = todayTasks.length;
  const completedToday = todayTasks.filter((t: any) => t.status === 'DONE').length;
  const progressPercent = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

  return (
    <div className="h-full flex flex-col p-8 lg:p-12 max-w-7xl mx-auto space-y-8 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary mb-2 tracking-tight">{data.greeting}</h1>
          <p className="text-secondary text-lg">Here's what's happening today.</p>
        </div>
      </div>

      {/* 4-Metric Overview Row */}
      {analyticsOverview && analyticsOverview.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-primary">{analyticsOverview[analyticsOverview.length - 1].weeklyVelocity || 0}</div>
              <div className="text-xs text-secondary uppercase tracking-widest font-mono mt-0.5">Velocity (7d)</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-primary">{Math.round((analyticsOverview[analyticsOverview.length - 1].okrPace || 0) * 100)}%</div>
              <div className="text-xs text-secondary uppercase tracking-widest font-mono mt-0.5">OKR Pace</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-primary">{analyticsOverview[analyticsOverview.length - 1].deepWorkLogged || 0}h</div>
              <div className="text-xs text-secondary uppercase tracking-widest font-mono mt-0.5">Deep Work</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-primary">{analyticsOverview[analyticsOverview.length - 1].activeStreaks || 0}</div>
              <div className="text-xs text-secondary uppercase tracking-widest font-mono mt-0.5">Active Streaks</div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Insight */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-card-title text-primary flex items-center gap-2">
                    Daily Insight
                    {(insightLoading || regeneratingInsight) && <span className="inline-block w-4 h-4 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />}
                  </h3>
                  <button 
                    onClick={handleRegenerateInsight}
                    disabled={insightLoading || regeneratingInsight}
                    className="text-xs font-medium text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 ml-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regeneratingInsight ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
                <p className="text-secondary leading-relaxed whitespace-pre-wrap break-words">
                  {insightLoading 
                    ? 'Analyzing your workspace context to generate a personalized insight for today...' 
                    : aiInsight?.insight || 'No insight available right now.'}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Focus Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-card-title text-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-secondary" />
                Today's Focus
              </h2>
              <button onClick={() => window.location.hash = '#/planner'} className="text-sm font-medium text-blue-500 hover:text-blue-600 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                Open Planner
              </button>
            </div>
            
            {topPriorityTask ? (
              <div className="border border-border rounded-xl p-5 bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${topPriorityTask.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {topPriorityTask.priority || 'NORMAL'}
                    </span>
                    {topPriorityTask.dueDate && (
                      <span className="text-xs text-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(topPriorityTask.dueDate))}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-primary truncate" title={topPriorityTask.title}>{topPriorityTask.title}</h3>
                </div>
                <div className="w-full md:w-48 shrink-0">
                  <div className="flex justify-between text-xs text-secondary mb-1.5">
                    <span className="font-medium">Daily Progress</span>
                    <span className="font-mono">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 border border-border rounded-xl bg-surface text-center flex flex-col items-center justify-center">
                <CheckSquare className="w-8 h-8 text-muted mb-2" />
                <p className="text-primary font-medium">All caught up!</p>
                <p className="text-secondary text-sm">No critical focus tasks identified for today.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Projects List */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-card-title text-primary mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-secondary" />
                Active Projects
              </h2>
              {data.projects && data.projects.length > 0 ? (
                <div className="space-y-4">
                  {data.projects.slice(0, 4).map((p: any) => (
                    <div key={p.id} className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-surface hover:bg-surface-hover transition-colors group cursor-pointer" onClick={() => window.location.hash = `#/projects/${p.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary truncate max-w-[180px] group-hover:text-blue-500 transition-colors">{p.name}</span>
                        <span className="text-[10px] uppercase tracking-wider font-mono text-secondary px-2 py-1 bg-surface-hover rounded-md border border-border">{p.status}</span>
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-[10px] text-secondary mb-1">
                          <span>Progress</span>
                          <span>{p.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-center">
                  <Briefcase className="w-6 h-6 text-muted mb-2" />
                  <p className="text-sm text-secondary">No active projects.</p>
                </div>
              )}
            </div>

            {/* Weekly Habit Matrix preview */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-card-title text-primary mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-secondary" />
                Habits Preview
              </h2>
              {data.habits && data.habits.filter(isHabitScheduledToday).length > 0 ? (
                <div className="space-y-3">
                  {data.habits.filter(isHabitScheduledToday).slice(0, 4).map((h: any) => {
                    // Generate last 5 days
                    const days = Array.from({ length: 5 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (4 - i));
                      return d;
                    });
                    return (
                      <div key={h.id} className="flex items-center justify-between p-2 border border-transparent hover:border-border hover:bg-surface rounded-lg transition-colors cursor-pointer" onClick={() => window.location.hash = '#/habits'}>
                        <span className="text-sm font-medium text-primary truncate pr-4">{h.name}</span>
                        <div className="flex gap-1.5">
                          {days.map((d, i) => {
                            const dateStr = d.toDateString();
                            const isCompleted = h.completions?.some((c: any) => new Date(c.completedAt).toDateString() === dateStr);
                            const dayNum = d.getDay();
                            const isScheduled = !h.scheduledDays || h.scheduledDays.includes(dayNum === 0 ? 7 : dayNum);
                            
                            let boxClass = 'bg-surface-hover border border-border'; // default/missed/not scheduled
                            if (isCompleted) boxClass = 'bg-[#EA580C]'; // completed (orange brand color)
                            else if (!isScheduled) boxClass = 'bg-transparent border border-border/50 opacity-50'; // not scheduled

                            return <div key={i} className={`w-3 h-3 rounded-[2px] ${boxClass}`} title={dateStr} />
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-center">
                  <Flame className="w-6 h-6 text-muted mb-2" />
                  <p className="text-sm text-secondary">No habits set up.</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-card-title text-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              Recent Activity
            </h2>
            <ActivityFeed activities={data.activity} />
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Quick Capture (Moved here per spec) */}
          {data.features.quickCapture && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-card-title text-primary mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-secondary" />
                Quick Capture
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'note', icon: FileText, label: 'Note', color: 'bg-purple-500/10 text-purple-500' },
                  { id: 'task', icon: CheckSquare, label: 'Task', color: 'bg-blue-500/10 text-blue-500' },
                  { id: 'idea', icon: Lightbulb, label: 'Idea', color: 'bg-amber-500/10 text-amber-500' },
                  { id: 'link', icon: LinkIcon, label: 'Link', color: 'bg-emerald-500/10 text-emerald-500' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickCapture(item.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-border-hover transition-all group"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-primary">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pomodoro Timer */}
          {data.features.pomodoro && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-card-title text-primary mb-6 flex items-center justify-center gap-2">
                Focus Timer
              </h2>
              <PomodoroTimer />
            </div>
          )}

          {/* Today's Tasks */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col max-h-[600px]">
            <h2 className="text-card-title text-primary mb-4 flex items-center gap-2 shrink-0">
              <CheckSquare className="w-5 h-5 text-secondary" />
              Due Today
            </h2>
            {todayTasks.length === 0 ? (
              <div className="flex-1 py-4">
                <EmptyState 
                  icon={CheckSquare}
                  description="No tasks due today."
                  actionLabel="Create Task"
                  onAction={() => handleQuickCapture('task')}
                />
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                {todayTasks.map((task: any) => (
                  <div key={task.id} className={`p-3 border rounded-xl flex items-start gap-3 transition-colors ${task.status === 'DONE' ? 'bg-surface-hover border-transparent' : 'bg-surface border-border hover:border-blue-500/50'}`}>
                    <button 
                      onClick={() => toggleTaskMutation.mutate(task)}
                      disabled={toggleTaskMutation.isPending}
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${task.status === 'DONE' ? 'bg-blue-500 border-blue-500 text-white' : 'border-secondary hover:border-blue-500'}`}
                    >
                      {task.status === 'DONE' && <CheckSquare className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${task.status === 'DONE' ? 'text-muted line-through' : 'text-primary'}`}>
                        {task.title}
                      </p>
                      {task.priority && task.status !== 'DONE' && (
                        <span className={`inline-block mt-1 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${task.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>

      <QuickCaptureModal 
        open={captureOpen} 
        onClose={() => setCaptureOpen(false)} 
        defaultMode={captureMode} 
      />
    </div>
  );
}
