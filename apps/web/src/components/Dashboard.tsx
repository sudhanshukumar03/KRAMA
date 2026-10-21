import type { Habit, Issue } from '../types/schema';
import { errorMessage, parseLocalDate } from '../lib/utils';
import { openFocusTab } from '../lib/focusNavigation';
import '../styles/insights.css';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Target,
  CheckSquare,
  Link2,
  FileText,
  Lightbulb,
  ArrowRight,
  Check,
  Circle,
  Play,
} from 'lucide-react';
import { api } from '../api/client';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../contexts/AuthContext';
import { useHabitCompletion } from '../hooks/useHabitCompletion';
import { isHabitLoggableToday } from '../lib/habitFilters';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { DashboardRefreshButton } from './dashboard/DashboardRefreshButton';
import { QuickCaptureModal } from './ui/QuickCaptureModal';
import { toast } from 'sonner';
import { DailyPlanning } from './dashboard/DailyPlanning';
import { usePersonalDay } from '../hooks/usePersonalDay';
import { taskBlocker } from '../lib/personalTasks';
import { PageHeader } from './ui/PageHeader';

const priorityLabel = (priority: string) =>
  priority === 'NONE' ? 'No priority' : `${priority.charAt(0)}${priority.slice(1).toLowerCase()} priority`;

function DashboardCard({
  title,
  children,
  action,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`krama-card insights-card p-5 sm:p-6 rounded-2xl min-w-0 ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-4">
          <h2 className="text-base sm:text-lg font-bold text-primary tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function HabitCheckoff({ habit }: { habit: Habit }) {
  const { isCompletedToday, toggleHabit, isPending } = useHabitCompletion(habit);
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary break-words">{habit.name}</p>
        <p className="text-xs text-secondary mt-0.5">
          {habit.streak || 0} {habit.cadence === 'weekly' ? 'week' : 'day'} streak
        </p>
      </div>
      <button
        type="button"
        aria-label={`${isCompletedToday ? 'Uncheck' : 'Complete'} habit ${habit.name}`}
        aria-pressed={isCompletedToday}
        disabled={isPending}
        onClick={toggleHabit}
        className={`min-h-11 min-w-11 rounded-xl border shrink-0 flex items-center justify-center disabled:opacity-50 transition-colors ${
          isCompletedToday
            ? 'bg-accent text-on-accent border-accent'
            : 'border-border text-secondary hover:bg-surface-hover'
        }`}
      >
        {isCompletedToday ? <Check className="w-5 h-5" aria-hidden="true" /> : <Circle className="w-5 h-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard();
  const allTasks = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const dayPlan = usePersonalDay(data?.dateKey);
  const [captureMode, setCaptureMode] = useState<'task' | 'note' | 'idea' | 'link' | null>(null);
  const openCapture = (trigger: HTMLButtonElement, mode: NonNullable<typeof captureMode>) => {
    // WebKit may leave a clicked button unfocused. Give the modal a real opener.
    trigger.focus();
    setCaptureMode(mode);
  };
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all');

  const toggleTask = useMutation({
    mutationFn: (task: Issue) =>
      api.tasks.update(task.id, {
        status: task.status === 'DONE' ? 'TODO' : 'DONE',
        version: task.version,
      }),
    onSuccess: (updated) => {
      for (const key of [
        'focus-schedule',
        'dashboard',
        'issues',
        'tasks',
        'task',
        'planner',
        'projects',
        'project',
        'goals',
        'goal',
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success(updated.status === 'DONE' ? 'Task completed' : 'Task reopened');
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Could not update task'));
      refetch();
    },
  });

  if (isLoading) return <LoadingState variant="dashboard" title="Loading your dashboard..." />;
  if (!data) {
    return (
      <div className="p-6">
        <ErrorState message={errorMessage(error, 'Could not load dashboard')} onRetry={() => refetch()} />
      </div>
    );
  }

  const tasks = (data.today?.tasks || []).filter(task => !dayPlan.data?.decisions?.[task.id]);
  const openTasks = tasks.filter((task) => task.status !== 'DONE');
  const completed = tasks.length - openTasks.length;
  const overdue = new Set(data.today?.overdueTaskIds || []);
  const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const priorityTasks = (dayPlan.data?.taskIds || []).map(id => (allTasks.data || []).find(task => task.id === id)).filter(task => task && !['DONE', 'CANCELED'].includes(task.status) && !taskBlocker(task, allTasks.data || []));
  const nextTask = priorityTasks[0] || [...openTasks].filter(task => !taskBlocker(task, allTasks.data || [])).sort(
    (a, b) =>
      Number(overdue.has(b.id)) - Number(overdue.has(a.id)) ||
      (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
  )[0];
  const visibleTasks = tasks.filter(
    (task) => taskFilter === 'all' || (taskFilter === 'done' ? task.status === 'DONE' : task.status !== 'DONE')
  );
  const completedPercent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const openTask = (id: string) => navigate(`/app/board?task=${encodeURIComponent(id)}`);
  const habits = (data.habits || []).filter(isHabitLoggableToday);
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(parseLocalDate(data.dateKey) || new Date());

  const link = (label: string, path: string) => (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="text-sm font-semibold text-accent-fg min-h-11 inline-flex items-center gap-1.5 hover:underline shrink-0"
    >
      <span>{label}</span>
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </button>
  );

  return (
    <div className="workspace-dashboard insights-page h-full overflow-y-auto min-h-0 bg-canvas">
      <div className="workspace-dashboard-content mx-auto space-y-5">
        <PageHeader icon={Target} title={`${greeting}, ${displayName}.`} description={`${dateFormatted} - Make room for what matters today.`}>
          <DashboardRefreshButton key={data.dateKey} isFetching={isFetching} onRefresh={() => refetch({ throwOnError: true })} />
        </PageHeader>
        {isError && <p role="alert" className="text-sm text-danger-fg">Could not refresh your dashboard. Showing the previous data. Use Refresh to try again.</p>}

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column (Main Focus & Work) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4 min-w-0">
            {/* Today's Focus Card */}
            <DashboardCard title="Today's Focus" action={link('Open Planner', '/app/planner')}>
              {nextTask ? (
                <div className="space-y-4 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-accent-subtle text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {priorityLabel(nextTask.priority)}
                    </span>
                    {overdue.has(nextTask.id) && (
                      <span className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        Overdue
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight break-words">
                    <button type="button" onClick={() => openTask(nextTask.id)} className="text-left hover:text-accent-fg rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" title="View task details">{nextTask.title}</button>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={toggleTask.isPending}
                      onClick={() => toggleTask.mutate(nextTask)}
                      className="krama-btn krama-btn-secondary px-4 py-2.5 text-sm disabled:opacity-50"
                    >
                      {toggleTask.isPending && toggleTask.variables?.id === nextTask.id
                        ? 'Saving...'
                        : 'Complete focus task'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openFocusTab(new URLSearchParams({ task: nextTask.id, date: data.dateKey }))}
                      title="Start Focus in a new tab"
                      className="krama-btn krama-btn-primary workspace-primary-action ml-auto"
                    >
                      <Play className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                      <span>Start Focus</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                    {openTasks.length ? 'Your tasks are waiting' : completed && tasks.length ? 'Today’s work is complete.' : Object.keys(dayPlan.data?.decisions || {}).length ? 'Your day is reviewed.' : 'Plan your day'}
                  </h3>
                  <div className="space-y-1 text-sm sm:text-base text-secondary leading-relaxed">
                    <p>{openTasks.length ? 'The remaining tasks are waiting for unfinished prerequisites.' : 'No unreviewed tasks scheduled or due today.'}</p>
                    <p>{openTasks.length ? 'Open Tasks to review what needs to happen first.' : 'Capture a task, then give it a place in Planner.'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={event => openTasks.length ? navigate('/app/board') : openCapture(event.currentTarget, 'task')}
                      className="krama-btn krama-btn-primary workspace-primary-action"
                    >
                      {openTasks.length ? 'Review tasks' : 'Create Task'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openFocusTab()}
                      title="Start Focus in a new tab"
                      className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] text-sm font-medium text-accent-fg hover:text-blue-700 active:scale-[0.98] transition-all"
                    >
                      <Play className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                      <span>Start Focus</span>
                    </button>
                  </div>
                </div>
              )}

              {(tasks.length > 0 || (data.today?.focusMinutes || 0) > 0) && (
                <div className="pt-4 border-t border-border mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-secondary">
                    <span>
                      {tasks.length
                        ? `${completed} of ${tasks.length} tasks completed`
                        : 'Start a session when you’re ready.'}
                    </span>
                    {(data.today?.focusMinutes || 0) > 0 && (
                      <span>{Math.round(data.today?.focusMinutes || 0)} min of your focus time today</span>
                    )}
                  </div>
                  {tasks.length > 0 && (
                    <progress
                      aria-label="Today's task completion"
                      value={completedPercent}
                      max={100}
                      className="krama-progress w-full h-1.5"
                    />
                  )}
                </div>
              )}
            </DashboardCard>

            <DailyPlanning key={data.dateKey} date={data.dateKey} tasks={allTasks.data || tasks} focusTaskId={nextTask?.id} />
        {allTasks.isError && <p role="alert" className="text-sm text-danger-fg">Could not load all tasks. <button onClick={() => allTasks.refetch()} className="underline min-h-11">Retry loading tasks</button></p>}

            {/* Today's Work List (if tasks scheduled or overdue) */}
            {tasks.length > 0 && (
              <DashboardCard title="Today's work" action={link('View all tasks', '/app/board')}>
                <p className="text-xs text-secondary mb-4">
                  Scheduled, due or overdue. Up to 50 tasks.
                </p>
                <div
                  className="flex flex-wrap gap-1 p-1 bg-surface-hover rounded-xl mb-4"
                  role="group"
                  aria-label="Today's work filter"
                >
                  {(['all', 'open', 'done'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={taskFilter === filter}
                      onClick={() => setTaskFilter(filter)}
                      className={`min-h-10 px-3.5 rounded-lg text-sm transition-colors ${
                        taskFilter === filter
                          ? 'bg-surface text-primary font-medium shadow-xs'
                          : 'text-secondary hover:bg-surface'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter === 'open' ? 'Open' : 'Done'}{' '}
                      <span className="tabular-nums font-semibold">
                        {filter === 'all' ? tasks.length : filter === 'open' ? openTasks.length : completed}
                      </span>
                    </button>
                  ))}
                </div>
                {visibleTasks.length ? (
                  <ul className="divide-y divide-border">
                    {visibleTasks.map((task) => (
                      <li key={task.id} className="flex items-start gap-3 py-3">
                        <button
                          type="button"
                          aria-label={`${task.status === 'DONE' ? 'Reopen' : 'Complete'} task ${task.title}`}
                          aria-pressed={task.status === 'DONE'}
                          disabled={toggleTask.isPending}
                          onClick={() => toggleTask.mutate(task)}
                          className={`min-w-11 min-h-11 shrink-0 rounded-xl border flex items-center justify-center disabled:opacity-50 transition-colors ${
                            task.status === 'DONE'
                              ? 'bg-accent text-on-accent border-accent'
                              : 'border-border text-secondary hover:bg-surface-hover'
                          }`}
                        >
                          {task.status === 'DONE' ? (
                            <Check className="w-5 h-5" aria-hidden="true" />
                          ) : (
                            <Circle className="w-5 h-5" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={`Open task ${task.title}`}
                          onClick={() => openTask(task.id)}
                          className="min-w-0 flex-1 min-h-11 text-left rounded-lg py-1 hover:bg-surface-hover transition-colors"
                        >
                          <span
                            className={`text-sm break-words block font-medium ${
                              task.status === 'DONE' ? 'text-secondary line-through' : 'text-primary'
                            }`}
                          >
                            {task.title}
                          </span>
                          <span
                            className={`text-xs block mt-1 ${
                              overdue.has(task.id) ? 'text-danger-fg font-medium' : 'text-secondary'
                            }`}
                          >
                            {overdue.has(task.id) ? 'Overdue' : 'Today'} · {priorityLabel(task.priority)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p role="status" className="py-5 text-sm text-secondary">
                    {taskFilter === 'done' ? 'No completed tasks yet.' : 'No open tasks left today.'}
                  </p>
                )}
              </DashboardCard>
            )}

            {/* Recent Activity Feed */}
            {(data.activity || []).length > 0 && (
              <DashboardCard title="Your recent activity">
                <ActivityFeed activities={(data.activity || []).slice(0, 8)} />
              </DashboardCard>
            )}
          </div>

          {/* Right Column (Quick Capture, Projects, Habits, Goals) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 min-w-0">
            {/* Quick Capture Card */}
            <DashboardCard title="Quick Capture">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'task', label: 'Task', Icon: CheckSquare },
                  { id: 'note', label: 'Note', Icon: FileText },
                  { id: 'idea', label: 'Idea', Icon: Lightbulb },
                  { id: 'link', label: 'Link', Icon: Link2 },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={event => openCapture(event.currentTarget, item.id as 'task' | 'note' | 'idea' | 'link')}
                    className="insights-quick-pill bg-surface-hover/50 hover:bg-surface-hover border border-border/80 hover:border-border rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-left group"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent-subtle text-accent-fg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-150">
                      <item.Icon
                        className="w-4 h-4"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</span>
                  </button>
                ))}
              </div>
            </DashboardCard>

            {/* Projects Card */}
            <DashboardCard title="Projects" action={link('All projects', '/app/projects')}>
              <div className="space-y-3">
                {data.projects && data.projects.length > 0 ? (
                  data.projects.slice(0, 4).map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                      className="w-full text-left group block -mx-2 px-2 py-2 rounded-xl hover:bg-surface-hover/50 transition-colors"
                    >
                      <p className="text-sm font-semibold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {project.name}
                      </p>
                      <div className="flex items-center justify-between text-xs text-secondary mt-1">
                        <span>{project.status?.toLowerCase() || 'in progress'}</span>
                        <span>{project.progress ?? 0}% complete</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, Math.max(0, project.progress ?? 0))}%`,
                          }}
                        />
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-secondary py-2">Create a project to organize your tasks.</p>
                )}
              </div>
            </DashboardCard>

            {/* Habits Today Card */}
            {habits.length > 0 && (
              <DashboardCard title="Habits Today" action={link('All habits', '/app/habits')}>
                {habits.map((habit) => (
                  <HabitCheckoff key={habit.id} habit={habit} />
                ))}
              </DashboardCard>
            )}

            {/* Goal Progress Card */}
            {data.goals && data.goals.length > 0 && (
              <DashboardCard title="Goal Progress" action={link('All goals', '/app/goals')}>
                <div className="space-y-3">
                  {data.goals.slice(0, 4).map((goal) => (
                    <button
                      type="button"
                      key={goal.id}
                      onClick={() => navigate('/app/goals')}
                      className="w-full text-left group block -mx-2 px-2 py-2 rounded-xl hover:bg-surface-hover/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-primary font-medium truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {goal.title}
                        </span>
                        <span className="text-secondary shrink-0 font-semibold">{goal.progress ?? 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, Math.max(0, goal.progress ?? 0))}%`,
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </DashboardCard>
            )}
          </div>
        </div>

        {/* Quick Capture Modal Trigger */}
        {captureMode && (
          <QuickCaptureModal
            key={captureMode}
            open
            onClose={() => setCaptureMode(null)}
            defaultMode={captureMode}
          />
        )}
      </div>
    </div>
  );
}
