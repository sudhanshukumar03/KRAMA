import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Target, Search, Filter, CheckCircle2, Sparkles, Trash2, X } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function ProjectCreateModal({
  open,
  onClose,
  onSubmit,
  isSubmitting
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; problemStatement: string; status: string; targetDate: string }) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [status, setStatus] = useState('active');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), problemStatement: problemStatement.trim(), status, targetDate });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white border border-[#E5E8EC] rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E8EC] bg-[#F8F9FB]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <FolderKanban className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-base font-medium text-[#111827]">Create New Project</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F8F9FB] hover:text-[#111827] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-[#6B7280] uppercase mb-1.5">
              Project Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Mobile Companion App v2"
              required
              autoFocus
              className="w-full px-3 py-2 border border-[#E5E8EC] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#6B7280] uppercase mb-1.5">
              Problem Statement / Scope
            </label>
            <textarea
              value={problemStatement}
              onChange={e => setProblemStatement(e.target.value)}
              placeholder="Briefly describe the objective and scope..."
              rows={3}
              className="w-full px-3 py-2 border border-[#E5E8EC] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-[#6B7280] uppercase mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E8EC] rounded-lg text-sm text-[#111827] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
              >
                <option value="idea">Idea / Discovery</option>
                <option value="active">Active Execution</option>
                <option value="paused">Paused</option>
                <option value="shipped">Shipped</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-[#6B7280] uppercase mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E8EC] rounded-lg text-sm text-[#111827] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E8EC] flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: pLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: pages = [], isLoading: docLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: sprints = [], isLoading: sLoading } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });

  const handleDeleteProject = async (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    try {
      const res = await api.projects.delete(project.id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`Deleted "${project.name}"`, {
        action: res?.snapshot ? {
          label: 'Undo',
          onClick: async () => {
            await api.projects.restore(res.snapshot);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success(`Restored "${project.name}"`);
          }
        } : undefined
      });
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; problemStatement: string; status: string; targetDate: string }) =>
      api.projects.create({
        name: data.name,
        problemStatement: data.problemStatement,
        status: data.status,
        progress: 0,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null
      }),
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCreateModalOpen(false);
      toast.success(`Created "${newProj?.name || 'Project'}"`, {
        description: 'Click project card to view roadmap and board.'
      });
      if (newProj?.id) navigate(`/app/projects/${newProj.id}`);
    },
    onError: () => {
      toast.error('Failed to create project');
    }
  });

  const handleCreateProject = () => {
    setCreateModalOpen(true);
  };

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
        <BaseButton onClick={handleCreateProject}>
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
                  const projectIssues = project.issues || issues.filter(i => i.projectId === project.id);
                  const totalDocs = project._count?.docs ?? (project.docs?.length || pages.filter(p => p.linkedProjectId === project.id).length);
                  const totalSprints = project._count?.sprints ?? (project.sprints?.length || sprints.filter(s => s.projectId === project.id).length);
                  
                  const completedIssues = projectIssues.filter((i: any) => i.status === 'done' || i.status === 'released').length;
                  const totalIssues = project._count?.issues ?? projectIssues.length;
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
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[10px] text-[#9CA3AF] bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-[#E5E8EC]">
                              {project.id.slice(0, 6).toUpperCase()}
                            </span>
                            <button
                              onClick={(e) => handleDeleteProject(e, project)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-red-50 rounded transition-all duration-150"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                        <span>{totalDocs} Docs</span>
                        <span>{totalSprints} Sprints</span>
                      </div>

                      {/* Health / Milestone Progress Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5 text-[10px] font-mono uppercase tracking-[0.02em] text-[#6B7280]">
                          <span className="font-medium text-[#111827]">Milestone {milestoneIndex}/4</span>
                          <span className="font-bold text-[#4F46E5]">{Math.round(progressPct)}%</span>
                        </div>
                        <div className="h-2 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/60">
                          <div 
                            className="h-full bg-[#4F46E5] transition-all duration-400 ease-out"
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

      <ProjectCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={(data) => createProjectMutation.mutate(data)}
        isSubmitting={createProjectMutation.isPending}
      />
    </div>
  );
}
