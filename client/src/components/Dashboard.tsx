import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, ListTodo, AlertCircle } from 'lucide-react';

export function Dashboard() {
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  if (issuesLoading || projectsLoading) return <div className="p-8 text-zinc-500">Loading dashboard...</div>;

  const activeProjects = projects.filter(p => p.status === 'active');
  const todoIssues = issues.filter(i => ['todo', 'backlog'].includes(i.status));
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const doneIssues = issues.filter(i => i.status === 'done' || i.status === 'released');

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg text-accent">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeProjects.length}</div>
              <div className="text-sm text-zinc-400 font-medium">Active Projects</div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-800 rounded-lg text-zinc-300">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{todoIssues.length}</div>
              <div className="text-sm text-zinc-400 font-medium">To Do</div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{inProgressIssues.length}</div>
              <div className="text-sm text-zinc-400 font-medium">In Progress</div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{doneIssues.length}</div>
              <div className="text-sm text-zinc-400 font-medium">Completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Projects List */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
            <h2 className="font-semibold text-zinc-200">Active Projects</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {activeProjects.map(project => (
              <div key={project.id} className="p-6 hover:bg-zinc-900/50 transition-colors">
                <div className="font-medium text-lg text-zinc-200 mb-1">{project.name}</div>
                <div className="text-sm text-zinc-400">{project.problemStatement}</div>
              </div>
            ))}
            {activeProjects.length === 0 && (
              <div className="p-6 text-zinc-500 text-center">No active projects</div>
            )}
          </div>
        </div>

        {/* Current Work */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
            <h2 className="font-semibold text-zinc-200">Current Work (In Progress)</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {inProgressIssues.map(issue => (
              <div key={issue.id} className="p-6 hover:bg-zinc-900/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-zinc-200">{issue.title}</div>
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-xs font-medium">
                    {issue.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{issue.id}</span>
                  {issue.labels.map(l => (
                    <span key={l} className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{l}</span>
                  ))}
                </div>
              </div>
            ))}
            {inProgressIssues.length === 0 && (
              <div className="p-6 text-zinc-500 text-center">Nothing currently in progress</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
