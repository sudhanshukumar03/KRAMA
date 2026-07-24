import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, ListTodo, AlertCircle, FolderKanban, Activity } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';


export function Dashboard() {
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  if (issuesLoading || projectsLoading) return <div className="p-8 text-[#6B7280]">Loading dashboard...</div>;

  const activeProjects = projects.filter(p => p.status === 'active');
  const todoIssues = issues.filter(i => ['todo', 'backlog'].includes(i.status));
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const doneIssues = issues.filter(i => i.status === 'done' || i.status === 'released');

  return (
    <div className="p-8 max-w-6xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150">
      <h1 className="text-3xl font-bold tracking-tight mb-8 text-[#0A0A0A]">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#0A0A0A]">{activeProjects.length}</div>
              <div className="text-sm text-[#6B7280] font-medium">Active Projects</div>
            </div>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#0A0A0A]">{todoIssues.length}</div>
              <div className="text-sm text-[#6B7280] font-medium">To Do</div>
            </div>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#0A0A0A]">{inProgressIssues.length}</div>
              <div className="text-sm text-[#6B7280] font-medium">In Progress</div>
            </div>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#0A0A0A]">{doneIssues.length}</div>
              <div className="text-sm text-[#6B7280] font-medium">Completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Projects List */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#FAFAFA]">
            <h2 className="font-bold text-[#0A0A0A]">Active Projects</h2>
          </div>
          <div className="divide-y divide-[#E5E7EB] flex-1">
            {activeProjects.map(project => (
              <div key={project.id} className="p-6 hover:bg-[#F3F4F6] transition-colors duration-100 cursor-pointer">
                <div className="font-bold text-lg text-[#0A0A0A] mb-1">{project.name}</div>
                <div className="text-sm text-[#6B7280] leading-relaxed">{project.problemStatement}</div>
              </div>
            ))}
            {activeProjects.length === 0 && (
              <div className="py-12">
                <EmptyState 
                  icon={FolderKanban}
                  description="No active projects"
                />
              </div>
            )}
          </div>
        </div>

        {/* Current Work */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#FAFAFA]">
            <h2 className="font-bold text-[#0A0A0A]">Current Work (In Progress)</h2>
          </div>
          <div className="divide-y divide-[#E5E7EB] flex-1">
            {inProgressIssues.map(issue => (
              <div key={issue.id} className="p-6 hover:bg-[#F3F4F6] transition-colors duration-100 cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-[#0A0A0A]">{issue.title}</div>
                  <span className="px-2 py-1 rounded bg-[#F3F4F6] text-[#6B7280] text-[10px] font-bold uppercase tracking-widest border border-[#E5E7EB]">
                    {issue.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <span className="font-medium">{issue.id}</span>
                  {issue.labels.map(l => (
                    <span key={l} className="bg-white border border-[#E5E7EB] px-1.5 py-0.5 rounded text-[#6B7280]">{l}</span>
                  ))}
                </div>
              </div>
            ))}
            {inProgressIssues.length === 0 && (
              <div className="py-12">
                <EmptyState 
                  icon={Activity}
                  description="Nothing currently in progress"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
