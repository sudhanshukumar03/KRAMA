import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Clock, Play, ListTodo } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';

export function SprintView() {
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });

  if (sprintsLoading || issuesLoading) return <div className="p-8 text-[#6B7280]">Loading sprint view...</div>;

  const activeSprint = sprints[0]; // mock: just grab the first one

  if (!activeSprint) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full flex items-center justify-center bg-white animate-in fade-in duration-150">
        <EmptyState 
          icon={Clock}
          title="No Active Sprint"
          description="Plan a sprint to focus your execution."
          actionLabel="Start Sprint"
          onAction={() => alert('Start sprint')}
        />
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
    <div className="p-8 max-w-5xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150">
      <div className="mb-8 bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-8 relative overflow-hidden">
        {/* Progress Background */}
        <div className="absolute top-0 left-0 h-1 bg-[#E5E7EB] w-full" />
        <div className="absolute top-0 left-0 h-1 bg-[#0A0A0A] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#0A0A0A] text-white px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase">
                Active Sprint
              </span>
              <span className="text-[#6B7280] text-sm font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {daysRemaining} days remaining
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[#0A0A0A]">{activeSprint.name}</h1>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-[#0A0A0A] mb-1">{progress}%</div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">completed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* To Do / In Progress */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#0A0A0A] flex items-center gap-2">
            <Play className="w-5 h-5 text-[#0A0A0A]" /> Current Focus
          </h2>
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#E5E7EB]">
            {sprintIssues.map(issue => (
              <div key={issue.id} className="p-4 hover:bg-[#F3F4F6] transition-colors duration-100 flex gap-4 items-start cursor-pointer group">
                <div className="mt-0.5">
                  <div className="w-4 h-4 rounded border-2 border-[#D1D5DB] group-hover:border-[#0A0A0A] transition-colors" />
                </div>
                <div>
                  <div className="font-bold text-[#0A0A0A] mb-1 leading-none">{issue.title}</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    <span className="text-[#6B7280]">{issue.status.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[#6B7280] border border-[#E5E7EB]">{issue.priority}</span>
                  </div>
                </div>
              </div>
            ))}
            {sprintIssues.length === 0 && (
              <div className="h-48">
                <EmptyState 
                  icon={Play}
                  description="No active issues in this sprint."
                />
              </div>
            )}
          </div>
        </div>

        {/* Done */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#0A0A0A] flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#0A0A0A]" /> Completed
          </h2>
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#E5E7EB] opacity-70">
            {doneIssues.map(issue => (
              <div key={issue.id} className="p-4 flex gap-4 items-start line-through text-[#9CA3AF]">
                <div className="mt-0.5">
                  <div className="w-4 h-4 rounded border-2 border-[#0A0A0A] bg-[#0A0A0A]" />
                </div>
                <div>
                  <div className="font-bold mb-1 leading-none">{issue.title}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider">Done</div>
                </div>
              </div>
            ))}
            {doneIssues.length === 0 && (
              <div className="h-48">
                <EmptyState 
                  icon={ListTodo}
                  description="No completed issues yet."
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
