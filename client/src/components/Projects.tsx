import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Target, Search, Filter, CheckCircle2, Sparkles } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function Projects() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: pLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: pages = [], isLoading: docLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: sprints = [], isLoading: sLoading } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idea' | 'paused' | 'shipped'>('all');

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.problemStatement && p.problemStatement.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  if (pLoading || iLoading || docLoading || sLoading) return <LoadingState title="Loading Projects..." description="Retrieving engineering milestones and linked docs..." />;

  const statuses = statusFilter === 'all' ? ['active', 'idea', 'paused', 'shipped'] : [statusFilter];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full flex flex-col h-full bg-canvas animate-in fade-in duration-150 gap-6 pb-20">
      
      {/* Header with Category Tile (#4F46E5 Indigo) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-sm">
            <FolderKanban className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Projects</h1>
              <span className="bg-[#F8F9FB] text-[#6B7280] border border-[#E5E8EC] px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-[0.02em] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#111827] stroke-[2]" /> {projects.length} initiatives
              </span>
            </div>
            <p className="text-[13px] text-[#6B7280]">Track initiatives, milestones, and linked quarterly OKRs.</p>
          </div>
        </div>
        <BaseButton onClick={() => alert('New Project')}>
          <Plus className="w-4 h-4 mr-1.5 stroke-[2]" />
          New Project
        </BaseButton>
      </div>

      {/* NEW: Project Health Filter & Search Bar */}
      <div className="bg-white border border-[#E5E8EC] rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.75]" />
          <input
            type="text"
            placeholder="Search projects by name or problem statement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F8F9FB] border border-[#E5E8EC] rounded-lg focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-all placeholder:text-[#9CA3AF] text-[#111827]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-medium text-[#6B7280] flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5 stroke-[1.75]" /> Status:
          </span>
          {(['all', 'active', 'idea', 'paused', 'shipped'] as const).map((stat) => (
            <button
              key={stat}
              onClick={() => setStatusFilter(stat)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all shrink-0 cursor-pointer",
                statusFilter === stat 
                  ? "bg-[#111827] text-white shadow-2xs" 
                  : "bg-[#F8F9FB] text-[#6B7280] hover:text-[#111827] border border-[#E5E8EC]"
              )}
            >
              {stat} {stat !== 'all' && `(${projects.filter(p => p.status === stat).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className={cn("grid gap-6", statusFilter === 'all' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
        {statuses.map(status => {
          const statusProjects = filteredProjects.filter(p => p.status === status);
          return (
            <div key={status} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#6B7280] font-medium text-xs uppercase tracking-[0.02em] px-1">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  status === 'active' ? 'bg-[#2563EB]' : 
                  status === 'idea' ? 'bg-amber-500' :
                  status === 'shipped' ? 'bg-green-500' : 'bg-[#9CA3AF]'
                )} />
                {status}
                <span className="ml-auto bg-white border border-[#E5E8EC] px-2 py-0.2 rounded font-mono text-xs shadow-2xs">
                  {statusProjects.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-4">
                {statusProjects.map(project => {
                  const projectIssues = issues.filter(i => i.projectId === project.id);
                  const projectDocs = pages.filter(p => p.linkedProjectId === project.id);
                  const projectSprints = sprints.filter(s => s.projectId === project.id);
                  
                  const completedIssues = projectIssues.filter(i => i.status === 'done' || i.status === 'released').length;
                  const totalIssues = projectIssues.length;
                  const progressPct = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;

                  // Milestone computation
                  const milestoneIndex = Math.min(4, Math.floor(progressPct / 25) + 1);

                  return (
                    <div 
                      key={project.id} 
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                      className="bg-white border border-[#E5E8EC] rounded-xl p-5 hover:border-[#4F46E5] transition-all cursor-pointer group flex flex-col justify-between shadow-sm hover:shadow-md min-h-[300px] gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <h3 className="font-medium text-[16px] text-[#111827] line-clamp-1 group-hover:text-[#4F46E5] transition-colors">
                            {project.name}
                          </h3>
                          <span className="font-mono text-[10px] text-[#9CA3AF] shrink-0 bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-[#E5E8EC]">
                            {project.id.slice(0, 6).toUpperCase()}
                          </span>
                        </div>
                        
                        {project.problemStatement && (
                          <p className="text-xs text-[#6B7280] mb-3 line-clamp-2 leading-relaxed">
                            {project.problemStatement}
                          </p>
                        )}
                      </div>

                      {/* Compact Stat Row */}
                      <div className="text-xs font-mono text-[#6B7280] bg-[#F8F9FB] p-2.5 rounded-lg border border-[#E5E8EC]/60 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-[#111827]"><CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] stroke-[2]" /> {completedIssues}/{totalIssues} Issues</span>
                        <span>{projectDocs.length} Docs</span>
                        <span>{projectSprints.length} Sprints</span>
                      </div>

                      {/* Health / Milestone Progress Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5 text-[10px] font-mono uppercase tracking-[0.02em] text-[#6B7280]">
                          <span className="font-medium text-[#111827]">Milestone {milestoneIndex}/4</span>
                          <span className="font-bold text-[#4F46E5]">{Math.round(progressPct)}%</span>
                        </div>
                        <div className="h-2 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/60">
                          <div 
                            className="h-full bg-[#4F46E5] transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        
                        {/* Step indicators */}
                        <div className="grid grid-cols-4 gap-1 mt-1.5">
                          {[1, 2, 3, 4].map((step) => (
                            <div 
                              key={step} 
                              className={cn(
                                "h-1 rounded-full transition-colors",
                                step <= milestoneIndex ? "bg-[#4F46E5]/40" : "bg-[#E5E8EC]/60"
                              )} 
                            />
                          ))}
                        </div>
                      </div>

                      {/* Footer with Linked OKR Badge */}
                      <div className="flex items-center justify-between text-[11px] pt-3 border-t border-[#E5E8EC]/60">
                        {project.goalId ? (
                          <div 
                            onClick={(e) => { e.stopPropagation(); navigate('/app/goals'); }}
                            className="flex items-center gap-1 bg-[#0D9488]/10 hover:bg-[#0D9488]/20 border border-[#0D9488]/30 transition-colors px-2 py-0.5 rounded text-[#0D9488] font-mono font-medium text-[10px] cursor-pointer"
                          >
                            <Target className="w-3 h-3 text-[#0D9488] stroke-[1.75]" /> OKR Linked
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF] font-mono">No OKR linked</span>
                        )}
                        <div className="flex items-center gap-1 text-[#6B7280] font-mono text-[10px]">
                          <Clock className="w-3 h-3 stroke-[1.5]" /> 
                          {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                    </div>
                  );
                })}

                {statusProjects.length === 0 && (
                  <div className="border border-[#E5E8EC] border-dashed rounded-xl bg-white h-32 flex items-center justify-center p-4 text-center shadow-2xs">
                    <span className="text-xs text-[#9CA3AF] font-medium">No {status} projects match filter</span>
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
