import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Target } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';

export function Projects() {
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading projects...</div>;

  const statuses = ['active', 'idea', 'paused', 'shipped'];

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex flex-col h-full bg-white animate-in fade-in duration-150">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#0A0A0A]">Projects</h1>
          <p className="text-[#6B7280]">Track and manage all your initiatives.</p>
        </div>
        <BaseButton>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </BaseButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statuses.map(status => {
          const statusProjects = projects.filter(p => p.status === status);
          return (
            <div key={status} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#6B7280] font-bold text-[10px] uppercase tracking-wider px-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  status === 'active' ? 'bg-[#0A0A0A]' : 
                  status === 'idea' ? 'bg-amber-500' :
                  status === 'shipped' ? 'bg-green-500' : 'bg-[#9CA3AF]'
                )} />
                {status}
                <span className="ml-auto bg-[#F3F4F6] px-2 py-0.5 rounded text-xs">
                  {statusProjects.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3">
                {statusProjects.map(project => (
                  <div 
                    key={project.id} 
                    className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-5 hover:border-[#D1D5DB] hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-[#0A0A0A] group-hover:text-black transition-colors">
                        {project.name}
                      </h3>
                      <FolderKanban className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                    
                    {project.problemStatement && (
                      <p className="text-sm text-[#6B7280] mb-4 line-clamp-2 leading-relaxed">
                        {project.problemStatement}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mt-auto">
                      {project.goalId && (
                        <div className="flex items-center gap-1 bg-[#F3F4F6] px-2 py-1 rounded-md text-[#6B7280]">
                          <Target className="w-3 h-3" /> Goal Link
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto text-[#6B7280]">
                        <Clock className="w-3 h-3" /> 
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}

                {statusProjects.length === 0 && (
                  <div className="border border-[#E5E7EB] border-dashed rounded-xl bg-[#FAFAFA] h-32 flex items-center justify-center p-4 text-center">
                    <span className="text-xs text-[#9CA3AF] font-medium">No {status} projects</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
