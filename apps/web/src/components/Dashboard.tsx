import type { Habit, Issue } from '../types/schema';
import { errorMessage } from '../lib/utils';
import '../styles/insights.css';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, CheckSquare, Link2, FileText, Lightbulb, Briefcase, ArrowRight, Flame, Check, Circle, Play, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../contexts/AuthContext';
import { useHabitCompletion } from '../hooks/useHabitCompletion';
import { isHabitLoggableToday } from '../lib/habitFilters';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { QuickCaptureModal } from './ui/QuickCaptureModal';
import { PageHeader } from './ui/PageHeader';
import { toast } from 'sonner';
import { parseLocalDate } from '../lib/utils';

const priorityLabel = (priority: string) => priority === 'NONE' ? 'No priority' : `${priority.charAt(0)}${priority.slice(1).toLowerCase()} priority`;

function DashboardCard({ title, children, action, primary = false }: { title: string; children: ReactNode; action?: ReactNode; primary?: boolean }) {
  return <section className={`insights-panel ${primary ? 'insights-focus' : ''} krama-card p-4 sm:p-5 min-w-0`}><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-4"><h2 className="text-base font-semibold text-primary">{title}</h2>{action}</div>{children}</section>;
}

function HabitCheckoff({ habit }: { habit: Habit }) {
  const { isCompletedToday, toggleHabit, isPending } = useHabitCompletion(habit);
  return <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
    <div className="min-w-0"><p className="text-sm font-medium text-primary break-words">{habit.name}</p><p className="text-xs text-secondary mt-1">{habit.streak || 0} {habit.cadence === 'weekly' ? 'week' : 'day'} streak</p></div>
    <button type="button" aria-label={`${isCompletedToday ? 'Uncheck' : 'Complete'} habit ${habit.name}`} aria-pressed={isCompletedToday} disabled={isPending} onClick={toggleHabit} className={`min-h-11 min-w-11 rounded-xl border shrink-0 flex items-center justify-center disabled:opacity-50 ${isCompletedToday ? 'bg-accent text-on-accent border-accent' : 'border-border text-secondary hover:bg-surface-hover'}`}>{isCompletedToday ? <Check className="w-5 h-5" aria-hidden="true" /> : <Circle className="w-5 h-5" aria-hidden="true" />}</button>
  </div>;
}

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard();
  const [captureMode, setCaptureMode] = useState<'task' | 'note' | 'idea' | 'link' | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all');
  const toggleTask = useMutation({
    mutationFn: (task: Issue) => api.tasks.update(task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE', version: task.version }),
    onSuccess: (updated) => { for (const key of ['focus-schedule', 'dashboard', 'analytics', 'issues', 'tasks', 'task', 'planner', 'projects', 'project', 'goals', 'goal']) queryClient.invalidateQueries({ queryKey: [key] }); toast.success(updated.status === 'DONE' ? 'Task completed' : 'Task reopened'); },
    onError: (err) => { toast.error(errorMessage(err, 'Could not update task')); refetch(); },
  });
  if (isLoading) return <LoadingState variant="dashboard" title="Loading your dashboard..." />;
  if (isError || !data) return <div className="p-6"><ErrorState message={errorMessage(error, 'Could not load dashboard')} onRetry={() => refetch()} /></div>;
  const tasks = data.today?.tasks || [];
  const openTasks = tasks.filter((task) => task.status !== 'DONE');
  const completed = tasks.length - openTasks.length;
  const overdue = new Set(data.today?.overdueTaskIds || []);
  const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const nextTask = [...openTasks].sort((a, b) => Number(overdue.has(b.id)) - Number(overdue.has(a.id)) || (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4))[0];
  const visibleTasks = tasks.filter((task) => taskFilter === 'all' || (taskFilter === 'done' ? task.status === 'DONE' : task.status !== 'DONE'));
  const completedPercent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const openTask = (id: string) => navigate(`/app/board?task=${encodeURIComponent(id)}`);
  const habits = (data.habits || []).filter(isHabitLoggableToday);
  const hasWorkspaceContent = Object.values(data.stats).some(value => typeof value === 'number' && value > 0);
  const displayName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const link = (label: string, path: string) => <button type="button" onClick={() => navigate(path)} className="text-sm text-accent-fg min-h-11 inline-flex items-center gap-1 hover:underline shrink-0">{label}<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></button>;
  return <div className="insights-page h-full overflow-y-auto min-h-0 bg-canvas"><div className="max-w-[1360px] mx-auto p-4 sm:p-6 md:p-8 space-y-6">
    <PageHeader className="insights-header" icon={Target} title={`${greeting}, ${displayName}.`} description={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(parseLocalDate(data.dateKey) || new Date()) + ' · Your work, routines and progress in one place.'}>
      <button type="button" onClick={() => refetch()} disabled={isFetching} className="krama-btn min-h-11 px-3 text-caption text-secondary flex items-center gap-2 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />{isFetching ? 'Refreshing...' : 'Refresh dashboard'}</button>{link('Analytics', '/app/analytics')}
    </PageHeader>
    {hasWorkspaceContent && <div className="insights-workspace-summary" aria-label="Workspace summary">
      {([['Projects', data.stats.totalProjects, Briefcase, '/app/projects'], ['Tasks', data.stats.totalTasks, CheckSquare, '/app/board'], ['Habits', data.stats.totalHabits, Flame, '/app/habits'], ['Notes', data.stats.totalNotes, FileText, '/app/brain']] as const).map(([label, value, Icon, path]) => <button type="button" key={label} onClick={() => navigate(path)} className="min-w-0"><Icon className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" /><span className="text-sm text-secondary">{label}</span><span className="insights-count tabular-nums text-primary">{value}</span></button>)}
    </div>}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
      <div className="xl:col-span-2 space-y-5 min-w-0">
        <DashboardCard primary title="Today's Focus" action={link('Open Planner', '/app/planner')}>
          {nextTask ? <div className="border-l-4 border-accent pl-4 sm:pl-5 py-1 space-y-4"><div className="flex flex-wrap items-center gap-2 text-xs text-secondary"><span className="rounded-md bg-accent-subtle text-accent-fg px-2 py-1">{priorityLabel(nextTask.priority)}</span>{overdue.has(nextTask.id) && <span className="text-danger-fg font-medium">Overdue</span>}</div><h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-primary break-words">{nextTask.title}</h3><div className="flex flex-wrap gap-2"><button type="button" disabled={toggleTask.isPending} onClick={() => toggleTask.mutate(nextTask)} className="min-h-11 px-4 rounded-lg bg-accent text-on-accent text-sm font-medium disabled:opacity-50">{toggleTask.isPending && toggleTask.variables?.id === nextTask.id ? 'Saving...' : 'Complete focus task'}</button><button type="button" onClick={() => openTask(nextTask.id)} className="min-h-11 px-4 rounded-lg border border-border text-sm text-primary hover:bg-surface-hover">View task details</button></div></div> : <div className="insights-focus-empty"><Target className="w-7 h-7 text-secondary mx-auto mb-2" aria-hidden="true" /><p className="text-primary font-medium">{completed ? 'Today’s work is complete.' : 'Plan your day'}</p><p className="text-sm text-secondary mt-1">No tasks scheduled or due today.</p><p className="text-caption text-secondary mt-1">Capture a task, then give it a place in Planner.</p><button type="button" onClick={() => setCaptureMode('task')} className="krama-btn krama-btn-primary min-h-11 mt-3 px-4 text-sm">Create Task</button>{tasks.length === 0 && !(data.today?.focusMinutes > 0) && <button type="button" onClick={() => navigate('/focus')} className="min-h-11 mt-3 px-4 text-sm text-accent-fg inline-flex items-center gap-2"><Play className="w-4 h-4" aria-hidden="true" />Start Focus</button>}</div>}
          {(tasks.length > 0 || data.today?.focusMinutes > 0) && <><div className="flex flex-wrap justify-between items-center gap-2 text-sm text-secondary mt-4"><span>{tasks.length ? `${completed} of ${tasks.length} listed tasks completed` : 'Start a session when you’re ready.'}</span><button type="button" onClick={() => navigate('/focus')} className="min-h-11 inline-flex items-center gap-2 text-accent-fg"><Play className="w-4 h-4" aria-hidden="true" />Start Focus</button></div>{tasks.length > 0 && <progress aria-label="Today's task completion" value={completedPercent} max={100} className="krama-progress w-full h-1.5" />}{(tasks.length > 0 || data.today?.focusMinutes > 0) && <p className="text-xs text-secondary mt-2">{Math.round(data.today?.focusMinutes || 0)} min of your focus time today</p>}</>}
        </DashboardCard>
        {tasks.length > 0 && <DashboardCard title="Today's work" action={link('View all tasks', '/app/board')}>
          <p className="text-xs text-secondary mb-3">Scheduled or due today, plus unfinished overdue work. Up to 50 tasks are included.</p>
          {tasks.length > 0 && <div className="flex flex-wrap gap-1 p-1 bg-surface-hover rounded-xl mb-3" role="group" aria-label="Today's work filter">{(['all', 'open', 'done'] as const).map(filter => <button key={filter} type="button" aria-pressed={taskFilter === filter} onClick={() => setTaskFilter(filter)} className={`min-h-11 px-3 rounded-lg text-sm ${taskFilter === filter ? 'bg-surface text-primary font-medium shadow-xs' : 'text-secondary hover:bg-surface'}`}>{filter === 'all' ? 'All' : filter === 'open' ? 'Open' : 'Done'} <span className="tabular-nums">{filter === 'all' ? tasks.length : filter === 'open' ? openTasks.length : completed}</span></button>)}</div>}
          {visibleTasks.length ? <ul className="divide-y divide-border">{visibleTasks.map((task) => <li key={task.id} className="flex items-start gap-3 py-3"><button type="button" aria-label={`${task.status === 'DONE' ? 'Reopen' : 'Complete'} task ${task.title}`} aria-pressed={task.status === 'DONE'} disabled={toggleTask.isPending} onClick={() => toggleTask.mutate(task)} className={`min-w-11 min-h-11 shrink-0 rounded-lg border flex items-center justify-center disabled:opacity-50 ${task.status === 'DONE' ? 'bg-accent text-on-accent border-accent' : 'border-border text-secondary hover:bg-surface-hover'}`}>{task.status === 'DONE' ? <Check className="w-5 h-5" aria-hidden="true" /> : <Circle className="w-5 h-5" aria-hidden="true" />}</button><button type="button" aria-label={`Open task ${task.title}`} onClick={() => openTask(task.id)} className="min-w-0 flex-1 min-h-11 text-left rounded-lg py-1 hover:bg-surface-hover"><span className={`text-sm break-words block ${task.status === 'DONE' ? 'text-secondary line-through' : 'text-primary'}`}>{task.title}</span><span className={`text-xs block mt-1 ${overdue.has(task.id) ? 'text-danger-fg' : 'text-secondary'}`}>{overdue.has(task.id) ? 'Overdue' : 'Today'} · {priorityLabel(task.priority)}</span></button></li>)}</ul> : tasks.length ? <p role="status" className="py-5 text-sm text-secondary">{taskFilter === 'done' ? 'No completed tasks yet.' : 'No open tasks left today.'}</p> : <div className="py-5 text-center"><p className="text-sm text-secondary">No tasks scheduled or due today.</p><button type="button" onClick={() => setCaptureMode('task')} className="min-h-11 mt-3 px-4 rounded-lg bg-accent text-on-accent text-sm">Create Task</button></div>}
        </DashboardCard>}
        {(data.activity || []).length > 0 && <DashboardCard title="Your recent activity"><ActivityFeed activities={(data.activity || []).slice(0, 8)} /></DashboardCard>}
      </div>
      <div className="insights-secondary space-y-5 min-w-0">
        <DashboardCard title="Quick Capture"><div className="insights-capture grid grid-cols-2 gap-3">{([{ id: 'task', label: 'Task', Icon: CheckSquare }, { id: 'note', label: 'Note', Icon: FileText }, { id: 'idea', label: 'Idea', Icon: Lightbulb }, { id: 'link', label: 'Link', Icon: Link2 }] as const).map(item => <button type="button" key={item.id} onClick={() => setCaptureMode(item.id)} className="rounded-xl border border-border hover:bg-surface-hover px-3 py-3 min-h-11 flex items-center gap-3 text-sm text-primary"><item.Icon className="w-5 h-5 text-accent-fg" aria-hidden="true" />{item.label}</button>)}</div></DashboardCard>
        {habits.length > 0 && <DashboardCard title="Habits Today" action={link('All habits', '/app/habits')}>{habits.length ? habits.map((habit) => <HabitCheckoff key={habit.id} habit={habit} />) : <p className="text-sm text-secondary py-3">No routines scheduled today. Weekly habits can be checked off on any day.</p>}</DashboardCard>}
        {data.projects?.length > 0 && <DashboardCard title="Projects" action={link('All projects', '/app/projects')}>{data.projects?.length ? data.projects.slice(0, 4).map((project) => <button type="button" key={project.id} onClick={() => navigate(`/app/projects/${project.id}`)} className="insights-support-list block w-full text-left p-3 mb-2 rounded-xl border border-border hover:bg-surface-hover"><p className="text-sm text-primary break-words">{project.name}</p><div className="flex justify-between text-xs text-secondary mt-2"><span>{project.status}</span><span>{project.progress}% complete</span></div><progress aria-label={`${project.name} progress`} value={project.progress} max={100} className="krama-progress w-full h-1.5 mt-2" /></button>) : <p className="text-sm text-secondary py-3">Create a project to organize your tasks.</p>}</DashboardCard>}
        {data.goals?.length > 0 && <DashboardCard title="Goal Progress" action={link('All goals', '/app/goals')}>{data.goals?.length ? data.goals.map((goal) => <button type="button" key={goal.id} onClick={() => navigate('/app/goals')} className="insights-support-list block w-full text-left p-3 mb-2 rounded-xl border border-border hover:bg-surface-hover"><div className="flex justify-between gap-3 text-sm"><span className="text-primary break-words">{goal.title}</span><span className="text-secondary shrink-0">{goal.progress}%</span></div><progress aria-label={`${goal.title} progress`} value={goal.progress} max={100} className="krama-progress w-full h-1.5 mt-2" /></button>) : <p className="text-sm text-secondary py-3">Set a goal to connect your work to a bigger outcome.</p>}</DashboardCard>}
        {!habits.length && !data.projects?.length && !data.goals?.length && <DashboardCard title="Connect your work"><p className="text-caption text-secondary mb-3">Give your daily tasks a bigger purpose.</p><div className="divide-y divide-border">{[{ label: 'Set a goal', detail: 'Choose the outcome', Icon: Target, path: '/app/goals' }, { label: 'Create a project', detail: 'Organize the work', Icon: Briefcase, path: '/app/projects' }, { label: 'Build a habit', detail: 'Make progress repeatable', Icon: Flame, path: '/app/habits' }].map(item => <button key={item.path} type="button" onClick={() => navigate(item.path)} className="w-full min-h-11 py-3 flex items-center gap-3 text-left hover:bg-surface-hover rounded-lg"><item.Icon className="w-4 h-4 text-accent-fg shrink-0" aria-hidden="true" /><span className="flex-1"><span className="block text-caption font-medium text-primary">{item.label}</span><span className="block text-xs text-secondary mt-0.5">{item.detail}</span></span><ArrowRight className="w-4 h-4 text-secondary" aria-hidden="true" /></button>)}</div></DashboardCard>}
      </div>
    </div>
    {captureMode && <QuickCaptureModal key={captureMode} open onClose={() => setCaptureMode(null)} defaultMode={captureMode} defaultScheduledDate={captureMode === 'task' ? new Date() : undefined} />}
  </div></div>;
}
