import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Target, Sparkles, CheckSquare, Clock, Link as LinkIcon, FileText, Lightbulb, Activity, Flame, Zap
} from 'lucide-react';

export function Dashboard() {
  const { data, isLoading, isError, error } = useDashboard();
  const { data: analyticsOverview } = useQuery({
    queryKey: ['analytics', 'overview', '7d'],
    queryFn: () => api.analytics.overview('7d')
  });

  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'task' | 'note' | 'idea' | 'link'>('task');

  if (isLoading) return <LoadingState variant="dashboard" title="Loading Dashboard..." />;
  if (isError) return <ErrorState message={(error as any)?.message || 'Failed to load dashboard'} />;
  if (!data) return null;

  const handleQuickCapture = (mode: string) => {
    setCaptureMode(mode as any);
    setCaptureOpen(true);
  };

  // If new user, show Welcome Dashboard
  if (data.onboarding.completed < data.onboarding.total) {
    return (
      <>
        <WelcomeDashboard dashboardData={data} onQuickCapture={handleQuickCapture} />
        <QuickCaptureModal 
          open={captureOpen} 
          onClose={() => setCaptureOpen(false)} 
          defaultMode={captureMode} 
        />
      </>
    );
  }

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
          
          {/* AI Insight (Feature Flagged) */}
          {data.features.aiInsights ? (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-card-title text-primary mb-1">AI Assistant</h3>
                  <p className="text-secondary leading-relaxed">
                    Based on your activity, you are most productive between 9 AM and 11 AM. Schedule deep work sessions during this block.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border border-dashed rounded-2xl p-6 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-muted" />
              </div>
              <div>
                <h3 className="text-card-title text-primary mb-1">AI Insights Unavailable</h3>
                <p className="text-secondary text-sm">
                  Not enough productivity history. KRAMA AI will begin generating personalized insights after a few days of usage.
                </p>
              </div>
            </div>
          )}

          {/* Quick Capture */}
          {data.features.quickCapture && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-card-title text-primary mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-secondary" />
                Quick Capture
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'note', icon: FileText, label: 'Note', color: 'bg-purple-500/10 text-purple-500' },
                  { id: 'task', icon: CheckSquare, label: 'Task', color: 'bg-blue-500/10 text-blue-500' },
                  { id: 'idea', icon: Lightbulb, label: 'Idea', color: 'bg-amber-500/10 text-amber-500' },
                  { id: 'link', icon: LinkIcon, label: 'Link', color: 'bg-emerald-500/10 text-emerald-500' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickCapture(item.id)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-border-hover transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-primary">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[250px] flex flex-col">
            <h2 className="text-card-title text-primary mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-secondary" />
              Due Today
            </h2>
            {data.today.tasks.length === 0 ? (
              <div className="flex-1">
                <EmptyState 
                  icon={CheckSquare}
                  description="No tasks due today."
                  actionLabel="Create Task"
                  onAction={() => handleQuickCapture('task')}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {data.today.tasks.map((task: any) => (
                  <div key={task.id} className="p-3 border border-border rounded-lg bg-surface flex items-center gap-3">
                    <div className="w-4 h-4 rounded border border-secondary" />
                    <span className="text-sm text-primary font-medium truncate">{task.title}</span>
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
