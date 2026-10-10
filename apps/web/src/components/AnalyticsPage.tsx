import '../styles/insights.css';
import { analyticsCsv } from '../lib/analyticsCsv';
import { useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Download, RefreshCw, ArrowRight, Clock, CheckCircle2, CalendarDays, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { api } from '../api/client';
import { cn, parseLocalDate } from '../lib/utils';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { PageHeader } from './ui/PageHeader';

type RangeOption = '7d' | '30d' | '90d';
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const hours = (minutes: number) => minutes > 0 && minutes < 6 ? '< 0.1' : number(minutes / 60);
const sessionLabel = (type: string) => ({ pomodoro: 'Focus session', custom: 'Custom focus', short_break: 'Short break', long_break: 'Long break' }[type] || 'Focus session');

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = searchParams.get('range');
  const range: RangeOption = rangeParam === '7d' || rangeParam === '90d' ? rangeParam : '30d';
  const trend = searchParams.get('trend') === 'rolling' ? 'rolling' : 'daily';
  const setRange = (next: RangeOption) => setSearchParams(previous => {
    const params = new URLSearchParams(previous); params.set('range', next); return params;
  });
  const setTrend = (next: 'daily' | 'rolling') => setSearchParams(previous => {
    const params = new URLSearchParams(previous); params.set('trend', next); return params;
  });
  const dailyDataOpen = searchParams.get('data') === '1';
  const setDailyDataOpen = (open: boolean) => setSearchParams(previous => {
    const params = new URLSearchParams(previous);
    if (open) params.set('data', '1'); else params.delete('data');
    return params;
  }, { replace: true });
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const overview = useQuery({ queryKey: ['analytics', 'overview', range], queryFn: () => api.analytics.overview(range), staleTime: 30_000, retry: 1, refetchInterval: 60_000 });
  const history = useInfiniteQuery({ queryKey: ['analytics', 'focus-history', range], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => api.analytics.focusHistory(range, pageParam), getNextPageParam: page => page.nextCursor || undefined, staleTime: 30_000, retry: 1, refetchInterval: 60_000 });
  const rows = useMemo(() => overview.data || [], [overview.data]);
  const sessions = history.data?.pages.flatMap(page => page.sessions) || [];
  const latest = rows.at(-1);
  const totals = useMemo(() => ({ completed: rows.reduce((sum, row) => sum + row.completedTasks, 0), focus: rows.reduce((sum, row) => sum + row.deepWorkLogged, 0), logged: rows.reduce((sum, row) => sum + (row.loggedDeepWork || 0), 0), loggedDays: rows.filter(row => row.loggedDeepWork !== null).length }), [rows]);
  const chart = useMemo(() => rows.map(row => ({ ...row, label: format(parseLocalDate(row.dayKey)!, range === '7d' ? 'EEE, MMM d' : 'MMM d'), focusHours: row.deepWorkLogged / 60, loggedHours: row.loggedDeepWork === null ? null : row.loggedDeepWork / 60 })), [rows, range]);
  const hasTaskTrend = chart.some(row => (trend === 'daily' ? row.completedTasks : row.weeklyVelocity) > 0);
  const hasWorkTime = totals.focus > 0 || totals.loggedDays > 0;
  const chartDate = (_label: unknown, payload: readonly any[]) => {
    const day = payload?.[0]?.payload?.dayKey;
    return day ? format(parseLocalDate(day)!, 'EEE, MMM d, yyyy') : '';
  };
  const refresh = () => { void overview.refetch(); void history.refetch(); };
  const exportCsv = () => {
    const blob = new Blob([analyticsCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `krama-analytics-${range}-${latest?.dayKey || 'report'}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return <div className="insights-page h-full overflow-y-auto min-h-0 bg-canvas"><div className="max-w-[1360px] mx-auto p-4 sm:p-6 md:p-8 space-y-6">
    <PageHeader className="insights-header" icon={TrendingUp} title="Analytics" description="Understand your progress, then decide what to do next." />
    <section className="insights-report" aria-label="Selected calendar report">
    <section aria-label="Report controls" className="insights-toolbar krama-card p-3 sm:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] xl:grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="grid grid-cols-3 w-full sm:w-fit bg-surface-hover border border-border rounded-xl p-1" role="group" aria-label="Analytics time range">
          {(['7d', '30d', '90d'] as RangeOption[]).map(option => <button type="button" key={option} aria-pressed={range === option} onClick={() => setRange(option)} className={cn('min-h-11 px-2 sm:px-4 rounded-lg text-caption font-medium', range === option ? 'bg-accent text-on-accent' : 'text-secondary hover:bg-surface')}>{option.replace('d', ' days')}</button>)}
        </div>
        <div className="order-3 xl:order-2 sm:col-span-2 xl:col-span-1 text-xs text-secondary space-y-1 border-t xl:border-t-0 border-border pt-3 xl:pt-0 xl:pl-3">
          <p>{latest ? `${format(parseLocalDate(rows[0].dayKey)!, 'MMM d, yyyy')} – ${format(parseLocalDate(latest.dayKey)!, 'MMM d, yyyy')} · Includes today` : 'Choose 7, 30 or 90 calendar days.'}</p>
          <p role="status">{overview.isFetching ? 'Updating report...' : overview.dataUpdatedAt ? `Report updated ${format(new Date(overview.dataUpdatedAt), 'h:mm a')}` : 'Report not loaded'}</p>
        </div>
        <div className="order-2 xl:order-3 flex items-center gap-2">
          <button type="button" aria-label="Refresh analytics" title="Refresh analytics" onClick={refresh} disabled={overview.isFetching || history.isFetching} className="min-h-11 min-w-11 rounded-lg border border-border flex items-center justify-center text-secondary hover:bg-surface-hover disabled:opacity-50"><RefreshCw className={cn('w-4 h-4', (overview.isFetching || history.isFetching) && 'animate-spin')} aria-hidden="true" /></button>
          <button type="button" onClick={exportCsv} disabled={!rows.length || overview.isError || overview.isFetching} className="min-h-11 flex-1 sm:flex-none px-3 rounded-lg border border-border text-caption text-primary inline-flex justify-center items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" aria-hidden="true" />Export CSV</button>
        </div>
      </div>
    </section>
    {overview.isError && overview.data !== undefined && <div role="alert" className="rounded-xl border border-warning-border bg-warning-bg p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-caption font-semibold text-warning-fg">Could not refresh report</p><p className="text-xs text-warning-fg mt-1">Showing the last loaded report. Retry to get the latest values.</p></div><button type="button" onClick={() => overview.refetch()} className="min-h-11 px-3 rounded-lg border border-warning-border text-caption text-warning-fg">Retry report</button></div>}
    {overview.isLoading ? <LoadingState variant="dashboard" title="Loading analytics..." /> : overview.isError && overview.data === undefined ? <ErrorState title="Could not load analytics" onRetry={() => overview.refetch()} /> : <>
      <div className="insights-metrics" aria-label="Analytics summary">
        {[
          { title: 'Completed tasks', value: totals.completed, description: `Workspace tasks in this ${range.replace('d', '-day')} range`, Icon: CheckCircle2 },
          { title: 'Your focus hours', value: hours(totals.focus), description: 'Completed work sessions; breaks excluded', Icon: Clock },
          { title: 'Your Planner log hours', value: totals.loggedDays ? hours(totals.logged) : '—', description: totals.loggedDays ? `${totals.loggedDays} ${totals.loggedDays === 1 ? 'day' : 'days'} with a recorded log` : 'No Planner deep-work logs in this range', Icon: CalendarDays },
        ].map(({ title, value, description, Icon }) => <section key={title} className="insights-metric krama-card min-w-0 grid grid-cols-[1fr_auto] sm:block gap-x-4"><div className="flex justify-between gap-2 col-start-1"><h2 className="text-sm text-secondary">{title}</h2><Icon className="hidden sm:block w-4 h-4 text-secondary shrink-0" aria-hidden="true" /></div><p className="insights-value text-3xl font-semibold tracking-tight tabular-nums text-primary col-start-2 row-start-1 row-span-2 self-center sm:mt-3">{value}</p><p className="insights-description text-xs text-secondary leading-relaxed col-start-1 mt-1 sm:mt-3">{description}</p></section>)}
      </div>
    </>}
    </section>
    {!overview.isLoading && !(overview.isError && overview.data === undefined) && <>
      <section aria-label="Current workspace snapshot" className="insights-snapshot"><h2 className="text-sm font-semibold text-primary mb-3">Current snapshot <span className="font-normal text-secondary">· As of today</span></h2><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[
        { title: 'Weekly velocity', value: latest?.weeklyVelocity || 0, description: 'Workspace tasks completed in the last 7 days', path: '/app/board' },
        { title: 'Your active streaks', value: latest?.activeStreaks || 0, description: 'Current streaks for your habit checkoffs', path: '/app/habits' },
        { title: 'Goal progress', value: latest?.okrPace == null ? '—' : `${latest.okrPace}%`, description: latest?.goalCount ? `Average of ${latest.goalCount} top-level workspace goals` : 'Create a goal to track progress', path: '/app/goals' },
      ].map(item => <button key={item.title} type="button" onClick={() => navigate(item.path)} className="min-h-11 text-left rounded-lg hover:bg-surface-hover p-2 -m-2 min-w-0"><div className="flex items-center justify-between gap-2"><span className="text-sm text-secondary">{item.title}</span><span className="text-lg font-semibold text-primary tabular-nums">{item.value}</span></div><p className="text-xs text-secondary mt-1 leading-relaxed">{item.description}</p></button>)}</div></section>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <section className="insights-chart krama-card p-4 sm:p-5 min-w-0" aria-label="Task velocity chart"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold text-primary">Task completion trend</h2><div className="flex rounded-lg bg-surface-hover p-1" role="group" aria-label="Task trend measure">{(['daily', 'rolling'] as const).map(mode => <button key={mode} type="button" aria-pressed={trend === mode} onClick={() => setTrend(mode)} className={cn('min-h-11 px-3 rounded-md text-xs', trend === mode ? 'bg-surface text-primary font-medium shadow-xs' : 'text-secondary')}>{mode === 'daily' ? 'Daily' : '7-day rolling'}</button>)}</div></div><p className="text-xs text-secondary mt-2 mb-4">{trend === 'daily' ? 'Tasks completed each day in this range.' : 'Rolling 7-day count, including days before the selected range.'}</p><div className={hasTaskTrend ? "h-64" : ""}>{hasTaskTrend ? <ResponsiveContainer width="100%" height="100%"><AreaChart key={`${range}-${trend}`} accessibilityLayer data={chart} margin={{ left: -12, right: 12, top: 12, bottom: 4 }}><CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" minTickGap={32} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-secondary)' }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-secondary)' }} /><Tooltip labelFormatter={chartDate} formatter={(value: any, name: any) => [`${number(Number(value))} tasks`, name]} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }} /><Area type="monotone" dataKey={trend === 'daily' ? 'completedTasks' : 'weeklyVelocity'} name={trend === 'daily' ? 'Completed tasks' : '7-day completed tasks'} stroke="var(--color-accent)" strokeWidth={2} fill="var(--color-accent)" fillOpacity={0.12} isAnimationActive={!reducedMotion} /></AreaChart></ResponsiveContainer> : <div className="insights-empty-chart"><CheckCircle2 className="w-7 h-7 text-secondary" aria-hidden="true" /><p className="text-sm text-secondary">{trend === 'daily' ? 'No tasks completed in this selected range.' : 'No completed tasks in these rolling windows.'}</p><button type="button" onClick={() => navigate('/app/board')} className="min-h-11 text-sm text-accent-fg">Open Execution Board</button></div>}</div></section>
        <section className="insights-chart krama-card p-4 sm:p-5 min-w-0" aria-label="Focus and Planner chart"><h2 className="text-base font-semibold text-primary">Your daily work time</h2><p className="text-xs text-secondary mt-1 mb-4">Timer sessions and Planner logs are separate measures and may overlap.</p><div className={hasWorkTime ? "h-64" : ""}>{hasWorkTime ? <ResponsiveContainer width="100%" height="100%"><BarChart key={range} accessibilityLayer data={chart} margin={{ left: -12, right: 12, top: 12, bottom: 4 }}><CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" minTickGap={32} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-secondary)' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-secondary)' }} /><Tooltip labelFormatter={chartDate} formatter={(value: any, name: any) => [`${number(Number(value) * 60)} min`, name]} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }} /><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="focusHours" name="Focus hours" fill="var(--color-accent)" radius={[3, 3, 0, 0]} isAnimationActive={!reducedMotion} /><Bar dataKey="loggedHours" name="Planner log hours" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} isAnimationActive={!reducedMotion} /></BarChart></ResponsiveContainer> : <div className="insights-empty-chart"><Clock className="w-7 h-7 text-secondary" aria-hidden="true" /><p className="text-sm text-secondary">No work time recorded in this range.</p><button type="button" onClick={() => navigate('/focus')} className="min-h-11 text-sm text-accent-fg">Record a focus session</button></div>}</div></section>
      </div>
      <details open={dailyDataOpen} onToggle={event => { const open = event.currentTarget.open; if (open !== dailyDataOpen) setDailyDataOpen(open); }} className="insights-disclosure krama-card p-4 sm:p-5"><summary className="min-h-11 cursor-pointer text-sm font-medium text-primary">View daily data ({rows.length} days)</summary><p className="text-xs text-secondary my-3">A dash means no Planner log was recorded. Older tasks without a completion timestamp use their last update date.</p><div role="region" aria-label="Scrollable daily analytics" tabIndex={0} className="overflow-x-auto rounded-lg"><table className="w-full text-sm text-left whitespace-nowrap"><caption className="sr-only">Daily analytics values for the selected calendar range</caption><thead><tr>{['Date', 'Completed tasks', '7-day tasks', 'Focus minutes', 'Planner minutes', 'Your streaks'].map(column => <th key={column} scope="col" className="py-3 pr-5 text-secondary font-medium">{column}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.dayKey} className="border-t border-border"><th scope="row" className="py-3 pr-5 font-normal text-primary">{row.dayKey}</th><td>{row.completedTasks}</td><td>{row.weeklyVelocity}</td><td>{number(row.deepWorkLogged)}</td><td>{row.loggedDeepWork === null ? '—' : row.loggedDeepWork}</td><td>{row.activeStreaks}</td></tr>)}</tbody></table></div></details>
    </>}
    <section className="insights-panel krama-card p-4 sm:p-5 min-w-0"><div className="flex flex-wrap justify-between items-center gap-3 mb-4"><div><h2 className="text-base font-semibold text-primary">Your focus history</h2><p className="text-xs text-secondary mt-1">Work sessions, breaks and partial sessions in this range.</p></div><button type="button" onClick={() => navigate('/focus')} className="text-sm text-accent-fg min-h-11 inline-flex items-center gap-1">Start Focus<ArrowRight className="w-4 h-4" aria-hidden="true" /></button></div>
      {history.isLoading && <p role="status" className="text-sm text-secondary">Loading focus history...</p>}
      {history.isError && <ErrorState title={history.isFetchNextPageError ? 'Could not load more sessions' : 'Could not load focus history'} message={history.isFetchNextPageError ? 'Your loaded sessions are still available. Retry to load the next page.' : 'Check your connection and try again.'} onRetry={() => history.isFetchNextPageError ? history.fetchNextPage() : history.refetch()} />}
      {!history.isLoading && !history.isError && sessions.length === 0 && <p className="text-sm text-secondary py-6">No focus sessions recorded in this range. Start Focus to record your first session.</p>}
      {sessions.length > 0 && <><p className="text-xs text-secondary mb-3">Showing {sessions.length} of {history.data?.pages[0].total} sessions</p><ul className="divide-y divide-border">{sessions.map(session => <li key={session.id} className="py-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-primary break-words">{['short_break', 'long_break'].includes(session.type) ? sessionLabel(session.type) : session.task?.title || session.project?.name || 'Unlinked session'}</p><p className="text-xs text-secondary mt-1">{format(new Date(session.startTime), 'MMM d, yyyy · h:mm a')} · {sessionLabel(session.type)}</p>{!['short_break', 'long_break'].includes(session.type) && (session.task || session.project) && <button type="button" onClick={() => navigate(session.task ? `/app/board?task=${encodeURIComponent(session.task.id)}` : `/app/projects/${session.project!.id}`)} className="min-h-11 text-xs text-accent-fg hover:underline mt-1">{session.task ? 'View task' : 'View project'}</button>}</div><div className="text-right shrink-0"><p className="text-sm text-primary tabular-nums">{session.duration < 60 ? `${number(session.duration)} sec` : `${number(session.duration / 60)} min`}</p><p className="text-xs text-secondary mt-1">{session.completed ? 'Completed' : 'Partial'}</p></div></li>)}</ul>{history.hasNextPage && !history.isFetchNextPageError && <button type="button" onClick={() => history.fetchNextPage()} disabled={history.isFetchingNextPage} className="min-h-11 px-4 rounded-xl border border-border text-sm text-primary mt-4 disabled:opacity-50">{history.isFetchingNextPage ? 'Loading...' : 'Load more sessions'}</button>}</>}
    </section>
  </div></div>;
}
