import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Target } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function Projects() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: pLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: pages = [], isLoading: docLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: sprints = [], isLoading: sLoading } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });

  if (pLoading || iLoading || docLoading || sLoading) return <div className="p-8 text-[#6B7280]">Loading projects...</div>;

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
                {statusProjects.map(project => {
                  const projectIssues = issues.filter(i => i.projectId === project.id);
                  const projectDocs = pages.filter(p => p.linkedProjectId === project.id);
                  const projectSprints = sprints.filter(s => s.projectId === project.id);
                  
                  const completedIssues = projectIssues.filter(i => i.status === 'done' || i.status === 'released').length;
                  const totalIssues = projectIssues.length;
                  const progressPct = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;

                  return (
                    <div 
                      key={project.id} 
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                      className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:bg-[#F3F4F6] transition-colors cursor-pointer group flex flex-col h-[280px]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-[#0A0A0A] line-clamp-1">
                          {project.name}
                        </h3>
                        <FolderKanban className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                      </div>
                      
                      {project.problemStatement && (
                        <p className="text-sm text-[#6B7280] mb-3 line-clamp-2 leading-relaxed">
                          {project.problemStatement}
                        </p>
                      )}
                      
                      {/* Compact Stat Row */}
                      <div className="text-xs font-bold text-[#6B7280] mb-auto flex items-center gap-2">
                        <span>{projectIssues.length} Issues</span>
                        <span className="text-[#E5E7EB] font-light">|</span>
                        <span>{projectDocs.length} Docs</span>
                        <span className="text-[#E5E7EB] font-light">|</span>
                        <span>{projectSprints.length} Sprint{projectSprints.length !== 1 && 's'}</span>
                      </div>

                      {/* Health / Progress Bar */}
                      <div className="mt-4 mb-4">
                        <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                          <span>Health</span>
                          <span>{Math.round(progressPct)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#0A0A0A] transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] pt-2 border-t border-[#E5E7EB] border-dashed">
                        {project.goalId && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); navigate('/app/goals'); }}
                            className="flex items-center gap-1 bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors px-2 py-1 rounded text-[#0A0A0A] cursor-pointer"
                          >
                            <Target className="w-3 h-3" /> Goal Link
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto text-[#6B7280]">
                          <Clock className="w-3 h-3" /> 
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}

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
