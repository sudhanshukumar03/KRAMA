import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Target, Search, Filter, CheckCircle2, Sparkles, Trash2, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
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
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/10 dark:bg-[#818CF8]/10 text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center border border-[#4F46E5]/20 dark:border-[#818CF8]/20">
              <FolderKanban className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Initialize Strategic Initiative</h3>
              <p className="text-xs text-secondary font-mono">Engineering portfolio tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Initiative Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Autonomous Decision Engine v2"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-all bg-surface"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Problem Statement / Technical Scope
            </label>
            <textarea
              value={problemStatement}
              onChange={e => setProblemStatement(e.target.value)}
              placeholder="Briefly describe the objective, architectural constraints, and target outcomes..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-all resize-none bg-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-all font-mono font-bold cursor-pointer"
              >
                <option value="idea">💡 Idea / Discovery</option>
                <option value="active">⚡ Active Execution</option>
                <option value="paused">⏸️ Paused</option>
                <option value="shipped">🚀 Shipped / Live</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-primary bg-surface focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Launch Initiative'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper to generate ASCII progress bar blocks
function renderAsciiProgress(pct: number) {
  const totalBlocks = 10;
  const filledBlocks = Math.round((pct / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
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
      toast.success(`Deleted initiative "${project.name}"`, {
        action: res?.snapshot ? {
          label: 'Undo',
          onClick: async () => {
            await api.projects.restore(res.snapshot);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success(`Restored initiative "${project.name}"`);
          }
        } : undefined
      });
    } catch (err) {
      toast.error('Failed to delete initiative');
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
      toast.success(`Created strategic initiative "${newProj?.name || 'Project'}"`, {
        description: 'Click initiative card to access engineering mission control.'
      });
      if (newProj?.id) navigate(`/app/projects/${newProj.id}`);
    },
    onError: () => {
      toast.error('Failed to initialize project');
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

  if (pLoading || iLoading || docLoading || sLoading) return <LoadingState title="Loading Strategic Portfolio..." description="Aggregating initiative milestones, engineering telemetry, and AI risk analysis..." />;

  const statuses = statusFilter === 'all' ? ['active', 'idea', 'paused', 'shipped'] : [statusFilter];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col h-full bg-canvas animate-in fade-in duration-150 gap-6 pb-24 font-sans text-primary">
      
      {/* COMMAND CENTER PORTFOLIO HEADER (Indigo #4F46E5 Identity) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-surface border border-border p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] dark:bg-[#818CF8] text-white dark:text-[#050811] flex items-center justify-center shrink-0 shadow-sm border border-[#4F46E5]/20">
            <FolderKanban className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-h2 font-bold tracking-tight text-primary leading-none">Project Portfolio</h1>
              <span className="bg-surface-hover text-secondary border border-border px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8] stroke-[1.5]" /> {projects.length} Initiatives Tracked
              </span>
            </div>
            <p className="text-xs text-secondary font-mono">Engineering command center for multi-phase roadmaps, sprints, and strategic OKRs.</p>
          </div>
        </div>
        <BaseButton onClick={handleCreateProject} className="shrink-0 cursor-pointer">
          <Plus className="w-4 h-4 mr-1.5 stroke-[1.5]" />
          New Initiative
        </BaseButton>
      </div>

      {/* STRATEGIC HEALTH FILTER & SEARCH BAR */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search initiatives by title or technical scope..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] focus:bg-surface transition-all placeholder:text-muted text-primary font-sans font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono">
          <span className="text-[11px] font-bold text-secondary flex items-center gap-1 mr-1 shrink-0 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 stroke-[1.5]" /> Status:
          </span>
          {(['all', 'active', 'idea', 'paused', 'shipped'] as const).map((stat) => (
            <button
              key={stat}
              onClick={() => setStatusFilter(stat)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer",
                statusFilter === stat 
                  ? "bg-primary text-surface shadow-2xs" 
                  : "bg-surface-hover text-secondary hover:text-primary border border-border/60"
              )}
            >
              {stat} {stat !== 'all' && `(${projects.filter(p => p.status === stat).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* LUXURY LARGE CARDS LIST / GRID */}
      <div className="flex flex-col gap-8">
        {statuses.map(status => {
          const statusProjects = filteredProjects.filter(p => p.status === status);
          if (statusProjects.length === 0 && statusFilter !== 'all') {
            return (
              <div key={status} className="border border-border border-dashed rounded-2xl bg-surface-hover/30 p-12 flex flex-col items-center justify-center text-center">
                <FolderKanban className="w-8 h-8 text-secondary mb-2 stroke-[1.5]" />
                <span className="text-xs font-mono font-bold text-primary uppercase">No {status} initiatives match current filter</span>
              </div>
            );
          }
          if (statusProjects.length === 0) return null;

          return (
            <div key={status} className="flex flex-col gap-4">
              {/* Category Status Ribbon */}
              <div className="flex items-center gap-2 text-secondary font-mono font-bold text-xs uppercase tracking-wider px-1">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full shadow-2xs",
                  status === 'active' ? 'bg-[#2563EB] dark:bg-[#00E5FF] animate-pulse' : 
                  status === 'idea' ? 'bg-[#F59E0B]' :
                  status === 'shipped' ? 'bg-[#109868]' : 'bg-secondary'
                )} />
                <span>{status} INITIATIVES</span>
                <span className="ml-auto bg-surface border border-border px-2.5 py-0.5 rounded-md font-mono text-xs font-bold text-primary shadow-2xs">
                  {statusProjects.length} Tracked
                </span>
              </div>
              
              <div className="flex flex-col gap-4">
                {statusProjects.map(project => {
                  const projectIssues = project.issues || issues.filter(i => i.projectId === project.id);
                  const totalDocs = project._count?.docs ?? (project.docs?.length || pages.filter(p => p.linkedProjectId === project.id).length);
                  const totalSprints = project._count?.sprints ?? (project.sprints?.length || sprints.filter(s => s.projectId === project.id).length);
                  
                  const completedIssues = projectIssues.filter((i: any) => i.status === 'done' || i.status === 'released').length;
                  const totalIssues = project._count?.issues ?? projectIssues.length;
                  const progressPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

                  // Compute hours since last active
                  const hoursSinceUpdate = Math.max(1, Math.round((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600)));
                  const lastActiveLabel = hoursSinceUpdate < 24 ? `${hoursSinceUpdate}h ago` : `${Math.round(hoursSinceUpdate / 24)}d ago`;

                  return (
                    <div 
                      key={project.id} 
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                      className="bg-surface border border-border rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] hover:border-[#4F46E5] dark:hover:border-[#818CF8] cursor-pointer group/card flex flex-col justify-between gap-5 relative overflow-hidden"
                    >
                      {/* Left color glow bar on hover */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#4F46E5] dark:bg-[#818CF8] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                      {/* Top Row: Title, ID, Problem Statement & Actions */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border/60">
                              {project.id.slice(0, 6).toUpperCase()}
                            </span>
                            <h3 className="font-bold text-lg md:text-xl text-primary truncate group-hover/card:text-[#4F46E5] dark:group-hover/card:text-[#818CF8] transition-colors">
                              {project.name}
                            </h3>
                            {project.goalId && (
                              <span className="bg-[#109868]/10 text-[#109868] border border-[#109868]/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                                <Target className="w-3 h-3 stroke-[1.5]" /> OKR LINKED
                              </span>
                            )}
                          </div>
                          
                          {project.problemStatement && (
                            <p className="text-xs md:text-sm text-secondary font-normal line-clamp-2 leading-relaxed max-w-4xl">
                              {project.problemStatement}
                            </p>
                          )}
                        </div>

                        {/* Right Quick Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                          <button
                            onClick={(e) => handleDeleteProject(e, project)}
                            className="opacity-0 group-hover/card:opacity-100 p-2 text-muted hover:text-[#DC2626] hover:bg-red-500/10 rounded-lg transition-all duration-150 cursor-pointer"
                            title="Delete initiative"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.5]" />
                          </button>
                          <div className="px-3.5 py-1.5 rounded-xl bg-surface-hover group-hover/card:bg-[#4F46E5] dark:group-hover/card:bg-[#818CF8] text-secondary group-hover/card:text-white dark:group-hover/card:text-[#050811] font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs">
                            <span>Open Initiative</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[1.5] group-hover/card:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Large Luxury Schematic Progress Bar (Krama OS ██████████ 82% Sprint 4 4 Issues Last Active 2h ago) */}
                      <div className="bg-surface-hover/80 border border-border/80 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono">
                        
                        {/* Left: ASCII Progress Block + Percentage */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-xs font-bold text-primary tracking-widest bg-surface px-2.5 py-1 rounded border border-border/60 shadow-2xs shrink-0 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#4F46E5] dark:bg-[#818CF8]" /> KRAMA OS
                          </div>
                          <div className="text-xs text-[#4F46E5] dark:text-[#818CF8] font-bold tracking-tighter shrink-0 select-none">
                            {renderAsciiProgress(progressPct)}
                          </div>
                          <div className="text-base font-bold text-primary shrink-0">
                            {progressPct}%
                          </div>
                        </div>

                        {/* Center/Right: Sprints, Issues, Docs & Last Active Telemetry */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-secondary justify-end">
                          <span className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded border border-border/60 text-primary font-bold">
                            <Zap className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#00E5FF] stroke-[1.5]" />
                            {totalSprints} {totalSprints === 1 ? 'Sprint' : 'Sprints'}
                          </span>
                          <span className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded border border-border/60 text-primary font-bold">
                            <FolderKanban className="w-3.5 h-3.5 text-[#7C3AED] dark:text-[#A78BFA] stroke-[1.5]" />
                            {totalDocs} {totalDocs === 1 ? 'Doc' : 'Docs'}
                          </span>
                          <span className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded border border-border/60 text-primary font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" />
                            {completedIssues}/{totalIssues} Issues
                          </span>
                          <span className="flex items-center gap-1 text-muted">
                            <Clock className="w-3.5 h-3.5 stroke-[1.5]" />
                            Last Active {lastActiveLabel}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Progress Bar + Invisible AI Risk Analysis (Revealed on Hover) */}
                      <div className="space-y-2.5">
                        <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden border border-border/60">
                          <div 
                            className="h-full bg-gradient-to-r from-[#4F46E5] to-[#818CF8] dark:from-[#818CF8] dark:to-[#00E5FF] transition-all duration-700 ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        {/* Invisible AI Risk Analysis Bar (Reveals on card hover) */}
                        <div className="opacity-0 group-hover/card:opacity-100 max-h-0 group-hover/card:max-h-16 transition-all duration-300 overflow-hidden pt-1">
                          <div className="text-[11px] font-mono bg-[#7C3AED]/10 dark:bg-[#A78BFA]/10 border border-[#7C3AED]/20 dark:border-[#A78BFA]/20 text-primary px-3 py-1.5 rounded-lg flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-bold text-[#7C3AED] dark:text-[#A78BFA]">
                              <Sparkles className="w-3.5 h-3.5 stroke-[1.5] shrink-0" /> AI Risk Sentinel:
                            </span>
                            <span className="truncate flex-1 text-secondary">
                              {progressPct === 100 
                                ? "Initiative completed. Ready for quarterly archive and post-mortem review." 
                                : progressPct > 60 
                                ? "Velocity nominal (94% probability of achieving target horizon on schedule)."
                                : "Early execution phase. AI recommends scheduling deep-work sprint sessions."}
                            </span>
                            <span className="font-bold text-primary flex items-center gap-1 shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" /> Nominal
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
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
