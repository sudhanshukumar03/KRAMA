import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  TrendingUp,
  Zap,
  Flame,
  Target,
  Clock,
  Activity,
  CheckCircle2,
  Brain
} from 'lucide-react';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { PageHeader } from './ui/PageHeader';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type RangeOption = '7d' | '30d' | '90d';

export function AnalyticsPage() {
  const [range, setRange] = useState<RangeOption>('30d');

  const { data: analytics = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: () => api.analytics.overview(range),
    staleTime: 30_000,
  });

  const { data: focusHistory = [] } = useQuery({
    queryKey: ['analytics', 'focus-history', range],
    queryFn: () => api.analytics.focusHistory(range),
    staleTime: 30_000,
  });

  const latestStats = useMemo(() => {
    if (!analytics.length) {
      return {
        weeklyVelocity: 0,
        activeStreaks: 0,
        okrPace: 0,
        deepWorkLogged: 0,
      };
    }
    const last = analytics[analytics.length - 1];
    return {
      weeklyVelocity: last.weeklyVelocity || 0,
      activeStreaks: last.activeStreaks || 0,
      okrPace: Math.round(last.okrPace || 0),
      deepWorkLogged: last.deepWorkLogged || 0,
    };
  }, [analytics]);

  const totalDeepWorkHours = useMemo(() => {
    const totalMinutes = analytics.reduce((sum: number, item: any) => sum + (item.deepWorkLogged || 0), 0);
    return (totalMinutes / 60).toFixed(1);
  }, [analytics]);

  const chartData = useMemo(() => {
    return analytics.map((item: any) => ({
      date: format(new Date(item.date), range === '7d' ? 'EEE' : 'MMM d'),
      rawDate: item.date,
      velocity: item.weeklyVelocity || 0,
      deepWorkHours: Number(((item.deepWorkLogged || 0) / 60).toFixed(1)),
      streaks: item.activeStreaks || 0,
      okrPace: Math.round(item.okrPace || 0),
    }));
  }, [analytics, range]);

  if (isLoading) {
    return <LoadingState variant="dashboard" title="Aggregating workspace analytics..." description="Calculating velocity, deep work, streaks, and OKR pace..." />;
  }

  if (isError) {
    return <ErrorState message="Failed to load analytics" onRetry={() => refetch()} />;
  }

  return (
    <div className="h-full w-full max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 pt-6 pb-12 flex flex-col overflow-y-auto min-h-0 animate-in fade-in duration-200">
      <PageHeader
        icon={TrendingUp}
        title="Analytics & Velocity"
        description="Continuous operational telemetry: velocity, deep work, streak consistency, and strategic OKR pace."
        className="mb-6"
      >
        {/* Range Segmented Control */}
        <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-2xs">
          {(['7d', '30d', '90d'] as RangeOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setRange(opt)}
              className={cn(
                'px-3.5 py-1.5 text-badge font-mono font-semibold rounded-lg transition-all cursor-pointer',
                range === opt
                  ? 'bg-accent text-on-accent shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover',
              )}
            >
              {opt === '7d' ? '7 DAYS' : opt === '30d' ? '30 DAYS' : '90 DAYS'}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Weekly Velocity */}
        <div className="krama-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Weekly Velocity</span>
            <div className="p-1.5 rounded-md bg-accent-subtle border border-accent/20 text-accent-fg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary tabular-nums">{latestStats.weeklyVelocity}</span>
            <span className="text-xs text-secondary font-mono">tasks / wk</span>
          </div>
          <p className="text-xs text-secondary mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-success-fg" />
            Completed over last 7 days
          </p>
        </div>

        {/* Card 2: Deep Work */}
        <div className="krama-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Total Deep Work</span>
            <div className="p-1.5 rounded-md bg-cat-timeblocks-bg border border-cat-timeblocks/20 text-cat-timeblocks">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary tabular-nums">{totalDeepWorkHours}</span>
            <span className="text-xs text-secondary font-mono">hours</span>
          </div>
          <p className="text-xs text-secondary mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cat-timeblocks" />
            {latestStats.deepWorkLogged} mins logged today
          </p>
        </div>

        {/* Card 3: Active Streaks */}
        <div className="krama-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Active Streaks</span>
            <div className="p-1.5 rounded-md bg-warning-bg border border-warning-border text-warning-fg">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary tabular-nums">{latestStats.activeStreaks}</span>
            <span className="text-xs text-secondary font-mono">habits alive</span>
          </div>
          <p className="text-xs text-secondary mt-2 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-warning-fg" />
            Routines maintained continuously
          </p>
        </div>

        {/* Card 4: OKR Pace */}
        <div className="krama-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">OKR Strategic Pace</span>
            <div className="p-1.5 rounded-md bg-cat-projects-bg border border-cat-projects/20 text-cat-projects">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary tabular-nums">{latestStats.okrPace}%</span>
            <span className="text-xs text-secondary font-mono">avg progress</span>
          </div>
          <div className="w-full bg-surface-hover rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-cat-projects h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, latestStats.okrPace))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart 1: Task Velocity Trend */}
        <div className="krama-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-primary">Task Velocity Over Time</h2>
              <p className="text-xs text-secondary">Rolling 7-day completed task count</p>
            </div>
            <div className="text-xs font-mono text-secondary bg-surface-hover px-2.5 py-1 rounded-md">
              {range.toUpperCase()}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="date" tickLine={false} stroke="currentColor" className="text-muted text-[11px] font-mono" />
                <YAxis tickLine={false} stroke="currentColor" className="text-muted text-[11px] font-mono" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-primary)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="velocity"
                  name="Completed Tasks"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#velocityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Deep Work Distribution */}
        <div className="krama-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-primary">Daily Deep Work Hours</h2>
              <p className="text-xs text-secondary">Hours recorded via planner daily logs</p>
            </div>
            <div className="text-xs font-mono text-secondary bg-surface-hover px-2.5 py-1 rounded-md">
              HOURS / DAY
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="date" tickLine={false} stroke="currentColor" className="text-muted text-[11px] font-mono" />
                <YAxis tickLine={false} stroke="currentColor" className="text-muted text-[11px] font-mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-primary)',
                  }}
                />
                <Bar
                  dataKey="deepWorkHours"
                  name="Deep Work (hrs)"
                  fill="var(--color-accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Focus Session Log History */}
      <div className="krama-card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-primary">Recent Focus Sessions</h2>
            <p className="text-xs text-secondary">Recorded Pomodoro and flow blocks in this workspace</p>
          </div>
          <div className="text-xs font-mono text-secondary">
            {focusHistory.length} Sessions Logged
          </div>
        </div>

        {focusHistory.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-muted">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No focus sessions recorded in this time range.</p>
            <p className="text-xs mt-1">Start a timer from Focus Mode to build your deep work history.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {focusHistory.slice(0, 10).map((session: any) => (
              <div key={session.id} className="py-3 flex items-center justify-between hover:bg-surface-hover/50 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cat-timeblocks-bg border border-cat-timeblocks/20 text-cat-timeblocks flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {session.task?.title || session.project?.name || 'Unlinked Focus Session'}
                    </p>
                    <p className="text-xs text-secondary font-mono">
                      {session.startTime ? format(new Date(session.startTime), 'MMM d, yyyy · h:mm a') : 'Recently'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-hover text-primary">
                    {session.duration ? `${Math.round(session.duration / 60)} min` : 'Completed'}
                  </span>
                  {session.completed ? (
                    <span className="text-[11px] text-success-fg font-mono font-medium">DONE</span>
                  ) : (
                    <span className="text-[11px] text-muted font-mono">PARTIAL</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
