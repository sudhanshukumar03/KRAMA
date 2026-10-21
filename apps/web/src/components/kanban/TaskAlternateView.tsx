import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import type { IssueWithRelations } from '../../types/schema';
import { parseLocalDate } from '../../lib/utils';
import { PriorityBadge } from './BoardPrimitives';
import { taskDay } from './boardConfig';
import { PaginatedItems } from '../ui/PaginatedItems';

export function TaskAlternateView({ issues, mode, onOpen }: {
  issues: IssueWithRelations[]; mode: 'list' | 'calendar'; onOpen: (issue: IssueWithRelations) => void;
}) {
  const ordered = mode === 'calendar' ? [...issues].sort((a, b) => (taskDay(a.dueDate || a.scheduledDate) || '9999').localeCompare(taskDay(b.dueDate || b.scheduledDate) || '9999')) : issues;
  return <PaginatedItems key={mode} items={ordered} scrollable label={mode === 'list' ? 'task list' : 'task dates'}>
    {visible => mode === 'list' ? (
          <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted uppercase font-mono">
                  <th className="pb-3 font-semibold">Task</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Project</th>
                  <th className="pb-3 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => onOpen(issue)}
                    className="hover:bg-surface-hover/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-semibold text-primary"><button type="button" onClick={() => onOpen(issue)} className="min-h-11 text-left break-words">{issue.title}</button></td>
                    <td className="py-3">
                      <span className="font-mono text-[11px] font-bold text-secondary">
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3"><PriorityBadge priority={issue.priority} /></td>
                    <td className="py-3 text-secondary">{issue.project?.name || 'General'}</td>
                    <td className="py-3 text-muted">{issue.dueDate ? format(parseLocalDate(taskDay(issue.dueDate))!, 'MMM d') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
    ) : (
          <div className="bg-surface rounded-2xl border border-border/80 p-6 shadow-xs text-center">
            <Calendar className="w-8 h-8 text-accent mx-auto mb-2 stroke-[1.5]" />
            <h3 className="font-bold text-sm text-primary mb-1">Calendar Timeline</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto mb-4">
              Dated directives in chronological order; undated work appears last.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
              {visible.map((issue) => (
                <button type="button"
                  key={issue.id}
                  onClick={() => onOpen(issue)}
                  className="p-3 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-primary">{issue.title}</span>
                    <PriorityBadge priority={issue.priority} />
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {issue.dueDate || issue.scheduledDate ? format(parseLocalDate(taskDay(issue.dueDate || issue.scheduledDate))!, 'MMM d, yyyy') : 'No target date'}
                  </div>
                </button>
              ))}
            </div>
          </div>    )}
  </PaginatedItems>;
}
