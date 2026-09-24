import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { QuickCaptureModal } from './ui/QuickCaptureModal';
import { 
  Target, CheckSquare, Clock, Link2, 
  FileText, Lightbulb, Zap, 
  Briefcase, ArrowRight, BarChart2
} from 'lucide-react';
import { isHabitScheduledToday, isHabitScheduledForDay } from '../lib/habitFilters';
import { toast } from 'sonner';

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useDashboard();

  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'task' | 'note' | 'idea' | 'link'>('task');

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

  // Date formatting matching reference: "Saturday, Sep 19, 2026"
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  // Salutation matching reference: "Good Evening, sudd."
  const hour = new Date().getHours();
  const timeSalutation = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const displayName = user?.name || user?.email?.split('@')[0] || 'sudd';
  const salutation = `${timeSalutation}, ${displayName}.`;
  const subtitle = "Let's wrap up today and keep the momentum going.";

  // Today's Focus calculations
  const todayTasks = data.today?.tasks || [];
  const topPriorityTask = todayTasks.find((t: any) => t.priority === 'URGENT' || t.priority === 'HIGH') || todayTasks[0];
  const totalToday = todayTasks.length;
  const completedToday = todayTasks.filter((t: any) => t.status === 'DONE').length;
  const progressPercent = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

  return (
    <div className="h-full w-full max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 pt-6 pb-6 flex flex-col justify-between overflow-y-auto min-h-0 animate-in fade-in duration-200">
      
      {/* Top Utility Row */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="text-xs sm:text-sm font-normal text-secondary/80">
          {todayFormatted}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2E1A47] text-white flex items-center justify-center font-semibold text-xs sm:text-sm select-none shadow-2xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Greeting Header */}
      <div className="shrink-0 mb-4 lg:mb-5">
        <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-primary tracking-tight">
          {salutation}
        </h1>
        <p className="text-xs sm:text-sm text-secondary mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Main Operational Cockpit Layout - Fixed Viewport Fit */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5 pb-1">
        
        {/* Left Column (2/3 width on wide screens) */}
        <div className="xl:col-span-2 flex flex-col justify-between gap-4 lg:gap-5 h-full min-h-0">
          
          {/* Today's Focus Card */}
          <div className="v4-card p-4 sm:p-5 shadow-2xs flex-1 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span>Today's Focus</span>
              </h2>
              <button 
                onClick={() => navigate('/app/planner')} 
                className="text-xs font-medium text-accent-fg hover:text-accent bg-accent-subtle hover:bg-accent/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Open Planner</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            
            {topPriorityTask ? (
              <div className="flex-1 border border-border rounded-xl p-4 bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-0">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                      topPriorityTask.priority === 'URGENT' 
                        ? 'bg-error-tint text-error' 
                        : 'bg-accent/10 text-accent'
                    }`}>
                      {topPriorityTask.priority || 'NORMAL'}
                    </span>
                    {topPriorityTask.dueDate && (
                      <span className="text-xs text-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(topPriorityTask.dueDate))}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-primary truncate" title={topPriorityTask.title}>
                    {topPriorityTask.title}
                  </h3>
                </div>
                <div className="w-full md:w-44 shrink-0">
                  <div className="flex justify-between text-xs text-secondary mb-1">
                    <span className="font-medium">Daily Progress</span>
                    <span className="font-mono">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden border border-border/50">
                    <div className="h-full bg-accent transition-all duration-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-4 border border-border/70 rounded-xl bg-surface/30 flex flex-col items-center justify-center text-center min-h-0">
                <CheckSquare className="w-7 h-7 text-secondary/50 mb-2" />
                <p className="text-sm font-semibold text-primary">All caught up!</p>
                <p className="text-xs text-secondary mt-0.5">No critical focus tasks identified for today.</p>
              </div>
            )}
          </div>

          {/* Active Projects & Habits Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 flex-1 min-h-0">
            {/* Active Projects */}
            <div className="v4-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span>Active Projects</span>
                </h2>
                <button
                  onClick={() => navigate('/app/projects')}
                  className="text-xs font-medium text-accent-fg hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {data.projects && data.projects.length > 0 ? (
                <div className="flex-1 space-y-2 overflow-hidden min-h-0">
                  {data.projects.slice(0, 2).map((p: any) => (
                    <div 
                      key={p.id} 
                      className="flex flex-col gap-1.5 p-2.5 border border-border rounded-xl bg-surface hover:bg-surface-hover transition-colors group cursor-pointer" 
                      onClick={() => navigate(`/app/projects/${p.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-primary truncate max-w-[180px] group-hover:text-accent transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-mono text-secondary px-1.5 py-0.5 bg-surface-hover rounded border border-border">
                          {p.status}
                        </span>
                      </div>
                      <div className="w-full">
                        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 py-2 flex flex-col items-center justify-center text-center min-h-0">
                  <Briefcase className="w-7 h-7 text-secondary/50 mb-1.5 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-primary">No active projects yet.</p>
                  <p className="text-xs text-secondary mt-0.5 mb-3">Create a project to organize your work.</p>
                  <button
                    onClick={() => navigate('/app/projects')}
                    className="px-3.5 py-1.5 rounded-lg bg-accent-subtle hover:bg-accent/20 text-accent-fg border border-accent/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>+</span>
                    <span>New Project</span>
                  </button>
                </div>
              )}
            </div>

            {/* Habits Today */}
            <div className="v4-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <span>Habits Today</span>
                </h2>
                <button
                  onClick={() => navigate('/app/habits')}
                  className="text-xs font-medium text-accent-fg hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {data.habits && data.habits.filter(isHabitScheduledToday).length > 0 ? (
                <div className="flex-1 space-y-2 overflow-hidden min-h-0">
                  {data.habits.filter(isHabitScheduledToday).slice(0, 2).map((h: any) => {
                    const days = Array.from({ length: 5 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (4 - i));
                      return d;
                    });
                    return (
                      <div 
                        key={h.id} 
                        className="flex items-center justify-between p-2 border border-border/60 hover:border-border hover:bg-surface rounded-xl transition-colors cursor-pointer" 
                        onClick={() => navigate('/app/habits')}
                      >
                        <span className="text-xs font-medium text-primary truncate pr-2">{h.name}</span>
                        <div className="flex gap-1 shrink-0">
                          {days.map((d, i) => {
                            const dateStr = d.toDateString();
                            const isCompleted = h.completions?.some((c: any) => new Date(c.completedAt).toDateString() === dateStr);
                            const dayNum = d.getDay();
                            const isScheduled = isHabitScheduledForDay(h, dayNum);
                            
                            let boxClass = 'bg-surface-hover border border-border';
                            if (isCompleted) boxClass = 'bg-[#EA580C] text-white';
                            else if (!isScheduled) boxClass = 'bg-transparent border border-border/40 opacity-40';

                            return <div key={i} className={`w-3 h-3 rounded-[3px] ${boxClass}`} title={dateStr} />;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 py-2 flex flex-col items-center justify-center text-center min-h-0">
                  <BarChart2 className="w-7 h-7 text-secondary/50 mb-1.5 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-primary">No habits scheduled for today.</p>
                  <p className="text-xs text-secondary mt-0.5 mb-3">Start building better habits.</p>
                  <button
                    onClick={() => navigate('/app/habits')}
                    className="px-3.5 py-1.5 rounded-lg bg-success-bg hover:bg-success-bg/80 text-success-fg border border-success-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>+</span>
                    <span>Add Habit</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="v4-card p-4 sm:p-5 shadow-2xs flex-1 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Recent Activity</span>
              </h2>
              <button
                onClick={() => navigate('/app/board')}
                className="text-xs font-medium text-accent-fg hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {data.activity && data.activity.length > 0 ? (
              <div className="flex-1 overflow-hidden min-h-0">
                <ActivityFeed activities={data.activity.slice(0, 3)} />
              </div>
            ) : (
              <div className="flex-1 py-2 flex flex-col items-center justify-center text-center min-h-0">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-secondary/70 mb-1.5">
                  <Clock className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold text-primary">No recent activity.</p>
                <p className="text-xs text-secondary mt-0.5">Your latest updates across KRAMA will appear here.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (1/3 width on wide screens) */}
        <div className="flex flex-col justify-between gap-4 lg:gap-5 h-full min-h-0">
          
          {/* Quick Capture Card */}
          <div className="v4-card p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-shadow flex flex-col justify-between min-h-0">
            <h2 className="text-sm font-semibold text-primary mb-3 shrink-0 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Quick Capture</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              {[
                { id: 'note', icon: FileText, label: 'Note', bg: 'bg-accent-subtle text-accent-fg', border: 'hover:border-accent/40' },
                { id: 'task', icon: CheckSquare, label: 'Task', bg: 'bg-cat-tasks-bg text-cat-tasks', border: 'hover:border-cat-tasks/40' },
                { id: 'idea', icon: Lightbulb, label: 'Idea', bg: 'bg-warning-bg text-warning-fg', border: 'hover:border-warning-border' },
                { id: 'link', icon: Link2, label: 'Link', bg: 'bg-cat-timeblocks-bg text-cat-timeblocks', border: 'hover:border-cat-timeblocks/40' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => handleQuickCapture(item.id)}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover ${item.border} transition-all group cursor-pointer`}
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center mb-1.5 ${item.bg} group-hover:scale-105 transition-transform`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-primary">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Today's Due Tasks */}
          <div className="v4-card p-4 sm:p-5 shadow-2xs flex-1 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span>Due Today</span>
              </h2>
              <span className="px-2 py-0.5 rounded-md border border-border bg-surface text-xs font-mono text-secondary font-medium">
                {todayTasks.length}
              </span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="flex-1 py-3 flex flex-col items-center justify-center text-center min-h-0">
                <div className="w-14 h-14 rounded-2xl border border-border/80 bg-surface/50 flex items-center justify-center text-secondary/60 mb-2.5">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-primary">No tasks due today.</p>
                <p className="text-xs text-secondary mt-0.5 mb-4 text-center">Enjoy a clear day or capture new tasks.</p>
                <button
                  onClick={() => handleQuickCapture('task')}
                  className="w-full sm:w-auto px-6 py-2 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-medium text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-hidden min-h-0">
                {todayTasks.slice(0, 4).map((task: any) => (
                  <div 
                    key={task.id} 
                    className={`p-2.5 border rounded-xl flex items-start gap-2.5 transition-colors ${
                      task.status === 'DONE' 
                        ? 'bg-surface-hover/50 border-transparent' 
                        : 'bg-surface border-border hover:border-accent/30'
                    }`}
                  >
                    <button 
                      onClick={() => toggleTaskMutation.mutate(task)}
                      disabled={toggleTaskMutation.isPending}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        task.status === 'DONE' 
                          ? 'bg-accent border-accent text-on-accent' 
                          : 'border-secondary/60 hover:border-accent'
                      }`}
                    >
                      {task.status === 'DONE' && <CheckSquare className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${
                        task.status === 'DONE' ? 'text-muted line-through' : 'text-primary'
                      }`}>
                        {task.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>

      </div>

      {captureOpen && (
        <QuickCaptureModal 
          key={captureMode}
          open={captureOpen} 
          onClose={() => setCaptureOpen(false)} 
          defaultMode={captureMode} 
        />
      )}
    </div>
  );
}
