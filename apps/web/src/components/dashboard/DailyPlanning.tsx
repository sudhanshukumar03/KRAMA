import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../../api/client';
import { usePersonalDay } from '../../hooks/usePersonalDay';
import { taskBlocker, taskNeedsReview, personalButton } from '../../lib/personalTasks';
import { openFocusTab } from '../../lib/focusNavigation';
import { errorMessage } from '../../lib/utils';
import type { IssueWithRelations } from '../../types/schema';

export function DailyPlanning({ date, tasks, focusTaskId }: { date: string; tasks: IssueWithRelations[]; focusTaskId?: string }) {
  const query = usePersonalDay(date);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [reviewOpen, setReviewOpen] = useState(false);
  const ids = (query.data?.taskIds || []).filter(id => tasks.some(task => task.id === id && !['CANCELED'].includes(task.status)));
  const chosen = ids.map(id => tasks.find(task => task.id === id)).filter((task): task is IssueWithRelations => Boolean(task && !['CANCELED'].includes(task.status)));
  const pendingReview = tasks.filter(task => (taskNeedsReview(task, date) || ids.includes(task.id)) && !['DONE', 'CANCELED'].includes(task.status) && !query.data?.decisions?.[task.id]);
  const candidates = tasks.filter(task => !ids.includes(task.id) && !['DONE', 'CANCELED'].includes(task.status));
  const save = useMutation({
    mutationFn: async (input: Parameters<typeof api.dashboard.saveDayPlan>[1]) => {
      const current = await api.dashboard.get();
      if (current.dateKey !== date) throw new Error('The day changed. Your dashboard is refreshing; choose again for today.');
      return api.dashboard.saveDayPlan(date, { ...input, ...(input.taskIds ? { expectedRevision: query.data?.revision || 0 } : {}) });
    },
    onSuccess: async () => {
      await Promise.all(['day-plan', 'issues', 'tasks', 'task', 'dashboard', 'planner', 'focus-schedule', 'project', 'projects', 'goal', 'goals'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success('Daily plan saved');
    },
    onError: (error) => { toast.error(errorMessage(error, 'Could not save your plan.')); queryClient.invalidateQueries({ queryKey: ['issues'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); query.refetch(); },
  });
  const busy = save.isPending || query.isFetching;
  return (
    <section
      aria-label="Daily planning"
      className="dashboard-priorities krama-card rounded-2xl p-5 sm:p-6 space-y-4"
      aria-busy={save.isPending}
      data-state={save.isPending ? 'pending' : save.isError ? 'error' : 'idle'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">Your top three today</h2>
          <p className="text-sm text-secondary mt-1">Pick up to three tasks to focus on today. They stay in your plan when you finish them.</p>
        </div>
        <button
          type="button"
          className={personalButton}
          aria-expanded={reviewOpen}
          onClick={() => setReviewOpen(value => !value)}
        >
          Review unfinished work
        </button>
      </div>
      {query.isError ? (
        <p role="alert" className="text-sm text-danger-fg">
          Your daily plan could not load. <button className={personalButton} onClick={() => query.refetch()}>Retry</button>
        </p>
      ) : (
        <>
          {chosen.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {chosen.map((task, index) => {
                const blocker = taskBlocker(task, tasks);
                return (
                  <li key={task.id} className="flex flex-wrap items-center gap-3 py-3 px-2.5 rounded-xl hover:bg-surface-hover/40 transition-colors group">
                    <span className="priority-number-badge" aria-hidden="true">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        className="text-left text-sm font-semibold text-primary break-words min-h-11 hover:text-accent-fg transition-colors"
                        onClick={() => navigate(`/app/board?task=${task.id}`)}
                      >
                        {task.title}
                      </button>
                      {task.status === 'DONE' ? (
                        <p className="text-xs text-success-fg flex items-center gap-1 font-medium mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Completed
                        </p>
                      ) : blocker ? (
                        <p className="text-xs text-warning-fg flex items-center gap-1 font-medium mt-0.5">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          Waiting for {blocker.title}
                        </p>
                      ) : null}
                    </div>
                    {task.id === focusTaskId && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-subtle text-accent-fg border border-accent/20">
                        Current focus
                      </span>
                    )}
                    {task.status !== 'DONE' && task.id !== focusTaskId && (
                      <button
                        type="button"
                        className={personalButton}
                        disabled={busy || Boolean(blocker)}
                        onClick={() => openFocusTab(new URLSearchParams({ task: task.id, date }))}
                        aria-label={`Start Focus for ${task.title}`}
                      >
                        Start Focus
                      </button>
                    )}
                    <button
                      type="button"
                      className={personalButton}
                      disabled={busy}
                      aria-label={`Remove priority ${task.title}`}
                      onClick={() => save.mutate({ taskIds: ids.filter(id => id !== task.id) })}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-surface-hover/20 px-4 py-3 text-sm text-secondary">
              <p>No priorities chosen yet. Add a task below or capture one in Inbox.</p>
            </div>
          )}
          <div className="pt-2">
            <label className="block text-sm font-medium text-secondary mb-1.5" htmlFor="daily-priority">
              {chosen.length}/3 priorities chosen
            </label>
            <div className="priority-select-control">
              <select
                id="daily-priority"
                value=""
                disabled={busy || ids.length >= 3}
                onChange={event => {
                  if (event.target.value) save.mutate({ taskIds: [...ids, event.target.value] });
                }}
              >
                <option value="">{ids.length >= 3 ? 'Remove a priority to choose another' : 'Add a priority...'}</option>
                {candidates.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="priority-select-chevron w-4 h-4" aria-hidden="true" />
            </div>
          </div>
        </>
      )}
      {reviewOpen && (
        <div className="border-t border-border pt-4 space-y-3">
          <h3 className="font-semibold text-primary">Close your day</h3>
          <p className="text-sm text-secondary">
            Decide what to do with the work you did not finish. To change a deadline or time block, open Planner.
          </p>
          {pendingReview.length ? (
            <ul className="divide-y divide-border/60">
              {pendingReview.map(task => (
                <li key={task.id} className="py-3 space-y-2">
                  <p className="text-sm font-medium text-primary break-words">{task.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {(['tomorrow', 'backlog', 'cancel'] as const).map(action => (
                      <button
                        type="button"
                        key={action}
                        className={personalButton}
                        disabled={busy || query.isError}
                        aria-label={`${action === 'tomorrow' ? 'Do tomorrow' : action === 'backlog' ? 'Return to backlog' : 'Cancel task'}: ${task.title}`}
                        onClick={() => save.mutate({ review: { taskId: task.id, version: task.version, action } })}
                      >
                        {action === 'tomorrow' ? 'Do tomorrow' : action === 'backlog' ? 'Return to backlog' : 'Cancel task'}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="text-sm text-success-fg font-medium">
              Nothing left to review today. Your plan is saved.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
