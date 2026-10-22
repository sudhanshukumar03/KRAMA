import { format } from 'date-fns';
import { Clock } from 'lucide-react';
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
      <div className="bg-surface rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/70 bg-surface-hover/40 text-secondary uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-semibold">Task</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Priority</th>
              <th className="py-3 px-4 font-semibold">Project</th>
              <th className="py-3 px-4 font-semibold">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {visible.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => onOpen(issue)}
                className="hover:bg-surface-hover/50 cursor-pointer transition-colors group"
              >
                <td className="py-3 px-4 font-semibold text-primary group-hover:text-accent-fg transition-colors">
                  <button type="button" onClick={() => onOpen(issue)} className="min-h-11 text-left break-words">
                    {issue.title}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-medium text-secondary capitalize">
                    {issue.status.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4"><PriorityBadge priority={issue.priority} /></td>
                <td className="py-3 px-4 text-secondary">{issue.project?.name || '—'}</td>
                <td className="py-3 px-4 text-secondary font-medium">{issue.dueDate ? format(parseLocalDate(taskDay(issue.dueDate))!, 'MMM d, yyyy') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="bg-surface rounded-2xl border border-border/80 p-5 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
          {visible.map((issue) => (
            <button
              type="button"
              key={issue.id}
              onClick={() => onOpen(issue)}
              className="p-3.5 rounded-xl border border-border/80 bg-surface hover:bg-surface-hover/60 hover:border-border-strong hover:shadow-2xs transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-primary group-hover:text-accent-fg transition-colors truncate">{issue.title}</span>
                <PriorityBadge priority={issue.priority} />
              </div>
              <div className="text-[11px] text-secondary flex items-center gap-1.5 font-medium">
                <Clock className="w-3 h-3 text-muted" />
                <span>{issue.dueDate || issue.scheduledDate ? format(parseLocalDate(taskDay(issue.dueDate || issue.scheduledDate))!, 'MMM d, yyyy') : 'No target date'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )}
  </PaginatedItems>;
}
