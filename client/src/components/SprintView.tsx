import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Clock, Play, ListTodo } from 'lucide-react';
import { cn } from '../lib/utils';

export function SprintView() {
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });

  if (sprintsLoading || issuesLoading) return <div className="p-8 text-zinc-500">Loading sprint view...</div>;

  const activeSprint = sprints[0]; // mock: just grab the first one

  if (!activeSprint) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-300 mb-2">No Active Sprint</h2>
          <p className="text-zinc-500 mb-6">Plan a sprint to focus your execution.</p>
          <button className="bg-accent text-white px-4 py-2 rounded-md font-medium hover:bg-accent/90 transition-colors">
            Start Sprint
          </button>
        </div>
      </div>
    );
  }

  // Calculate days remaining
  const end = new Date(activeSprint.endDate);
  const now = new Date();
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));

  // In a real app we'd filter by `issue.sprintId === activeSprint.id`.
  // For the mock, we'll just treat 'todo', 'in_progress', 'review' as sprint backlog.
  const sprintIssues = issues.filter(i => ['todo', 'in_progress', 'review'].includes(i.status));
  const doneIssues = issues.filter(i => ['done', 'testing', 'released'].includes(i.status));
  
  const totalIssues = sprintIssues.length + doneIssues.length;
  const progress = totalIssues === 0 ? 0 : Math.round((doneIssues.length / totalIssues) * 100);

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden">
        {/* Progress Background */}
        <div className="absolute top-0 left-0 h-1 bg-accent/20 w-full" />
        <div className="absolute top-0 left-0 h-1 bg-accent transition-all duration-1000" style={{ width: `${progress}%` }} />

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-accent/20 text-accent px-2.5 py-1 rounded-md text-xs font-bold tracking-widest uppercase">
                Active Sprint
              </span>
              <span className="text-zinc-500 text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {daysRemaining} days remaining
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">{activeSprint.name}</h1>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-accent mb-1">{progress}%</div>
            <div className="text-sm font-medium text-zinc-500">completed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* To Do / In Progress */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <Play className="w-5 h-5 text-amber-500" /> Current Focus
          </h2>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
            {sprintIssues.map(issue => (
              <div key={issue.id} className="p-4 hover:bg-zinc-900/50 transition-colors flex gap-4 items-start">
                <div className="mt-0.5">
                  <div className="w-4 h-4 rounded border-2 border-zinc-600" />
                </div>
                <div>
                  <div className="font-medium text-zinc-200 mb-1 leading-none">{issue.title}</div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="uppercase font-semibold tracking-wider text-amber-500/70">{issue.status.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{issue.priority}</span>
                  </div>
                </div>
              </div>
            ))}
            {sprintIssues.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No active issues in this sprint.
              </div>
            )}
          </div>
        </div>

        {/* Done */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-green-500" /> Completed
          </h2>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/50 opacity-60">
            {doneIssues.map(issue => (
              <div key={issue.id} className="p-4 flex gap-4 items-start line-through text-zinc-500">
                <div className="mt-0.5">
                  <div className="w-4 h-4 rounded border-2 border-green-500/50 bg-green-500/20" />
                </div>
                <div>
                  <div className="font-medium mb-1 leading-none">{issue.title}</div>
                  <div className="text-xs">Done</div>
                </div>
              </div>
            ))}
            {doneIssues.length === 0 && (
              <div className="p-8 text-center text-zinc-600 text-sm">
                No completed issues yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
