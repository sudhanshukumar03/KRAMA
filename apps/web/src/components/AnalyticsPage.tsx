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
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
              Analytics & Velocity
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-secondary">
            Continuous operational telemetry: velocity, deep work, streak consistency, and strategic OKR pace.
          </p>
        </div>

        {/* Range Segmented Control */}
        <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-2xs self-start sm:self-auto">
          {(['7d', '30d', '90d'] as RangeOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setRange(opt)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all',
                range === opt
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover'
              )}
            >
              {opt === '7d' ? '7 Days' : opt === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Weekly Velocity */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Weekly Velocity</span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">{latestStats.weeklyVelocity}</span>
            <span className="text-xs text-secondary font-mono">tasks / wk</span>
          </div>
          <p className="text-xs text-secondary mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-success-fg" />
            Completed over last 7 days
          </p>
        </div>

        {/* Card 2: Deep Work */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Total Deep Work</span>
            <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-500">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">{totalDeepWorkHours}</span>
            <span className="text-xs text-secondary font-mono">hours</span>
          </div>
          <p className="text-xs text-secondary mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            {latestStats.deepWorkLogged} mins logged today
          </p>
        </div>

        {/* Card 3: Active Streaks */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Active Streaks</span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">{latestStats.activeStreaks}</span>
            <span className="text-xs text-secondary font-mono">habits alive</span>
          </div>
          <p className="text-xs text-secondary mt-2 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            Routines maintained continuously
          </p>
        </div>

        {/* Card 4: OKR Pace */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">OKR Strategic Pace</span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">{latestStats.okrPace}%</span>
            <span className="text-xs text-secondary font-mono">avg progress</span>
          </div>
          <div className="w-full bg-surface-hover rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, latestStats.okrPace))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart 1: Task Velocity Trend */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col">
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
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="date" tickLine={false} stroke="currentColor" className="text-muted text-[11px] font-mono" />
                <YAxis tickLine={false} stroke="currentColor" className="text-muted text-[11px] font-mono" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface, #1e1e2d)',
                    borderColor: 'var(--color-border, #333)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-primary, #fff)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="velocity"
                  name="Completed Tasks"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#velocityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Deep Work Distribution */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col">
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
                    backgroundColor: 'var(--color-surface, #1e1e2d)',
                    borderColor: 'var(--color-border, #333)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-primary, #fff)',
                  }}
                />
                <Bar
                  dataKey="deepWorkHours"
                  name="Deep Work (hrs)"
                  fill="#0D9488"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Focus Session Log History */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col">
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
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
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
                    <span className="text-[11px] text-teal-600 font-mono font-medium">DONE</span>
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
