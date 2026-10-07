import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Target, Search, Filter, CheckCircle2, Sparkles, X, ArrowRight, ShieldCheck, ChevronUp, ChevronDown } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { PageHeader } from './ui/PageHeader';
import { LoadingState } from './ui/LoadingState';
import { ConfirmDeleteButton } from './ui/ConfirmDeleteButton';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ErrorState } from './ui/ErrorState';
import { useModalA11y } from '../hooks/useModalA11y';
import { IconPicker } from './ui/IconPicker';
import { resolveIcon } from '../lib/iconResolver';

function ProjectCreateModal({
 open,
 onClose,
 onSubmit,
 isSubmitting,
 goals = []
}: {
 open: boolean;
 onClose: () => void;
 onSubmit: (data: { name: string; problemStatement: string; status: string; targetDate: string; icon: string; goalId?: string | null }) => void;
 isSubmitting: boolean;
 goals?: any[];
}) {
 const [name, setName] = useState('');
 const [problemStatement, setProblemStatement] = useState('');
 const [status, setStatus] = useState('active');
 const [goalId, setGoalId] = useState('');
 const [targetDate, setTargetDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 60);
 return d.toISOString().split('T')[0];
 });
 const [icon, setIcon] = useState('FolderKanban');

 const modalRef = useModalA11y(open, () => { if (!isSubmitting) onClose(); });
 if (!open) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (isSubmitting || !name.trim()) return;
 onSubmit({ name: name.trim(), problemStatement: problemStatement.trim(), status, targetDate, icon, goalId: goalId || null });
 };

 return (
 <div
 onClick={() => { if (!isSubmitting) onClose(); }}
 className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
 >
 <div
 ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="new-project-title"
 onClick={e => e.stopPropagation()}
 className="krama-dialog w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[calc(100dvh-2rem)] overflow-y-auto text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/80 backdrop-blur-md">
 <div className="flex items-center gap-2.5">
 <IconPicker value={icon} onChange={setIcon} />
 <div>
 <h3 id="new-project-title" className="text-card text-primary mb-2 ">New Project</h3>
 <p className="text-caption text-secondary font-mono">Engineering portfolio tracking</p>
 </div>
 </div>
 <button
 onClick={onClose} disabled={isSubmitting} aria-label="Close new project"
 type="button"
 className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
 >
 <X className="w-4 h-4 stroke-[1.5]" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div>
          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Initiative Name <span className="text-danger-fg">*</span>
            </label>
            <input
              type="text" aria-label="Initiative Name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Autonomous Decision Engine v2"
              required
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all bg-surface"
            />
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Problem Statement / Technical Scope
            </label>
            <textarea aria-label="Problem Statement / Technical Scope"
              value={problemStatement}
              onChange={e => setProblemStatement(e.target.value)}
              placeholder="Briefly describe the objective, architectural constraints, and target outcomes..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none bg-surface"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Status
              </label>
              <select aria-label="Status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold cursor-pointer"
              >
                <option value="idea">💡 Idea / Discovery</option>
                <option value="active">⚡ Active Execution</option>
                <option value="paused">⏸️ Paused</option>
                <option value="shipped">🚀 Shipped / Live</option>
                <option value="completed">✅ Completed</option>
                <option value="archived">🗄️ Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Target Date
              </label>
              <input
                type="date" aria-label="Target Date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-accent stroke-[1.75]" />
                Linked Strategic Goal / OKR
              </span>
              <span className="text-secondary font-normal lowercase">(Optional)</span>
            </label>
            <select aria-label="Linked Strategic Goal / OKR"
              value={goalId}
              onChange={e => setGoalId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono cursor-pointer"
            >
              <option value="">No linked goal (Standalone initiative)</option>
              {goals.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.title} ({g.type} · {g.progress || 0}%)
                </option>
              ))}
            </select>
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


export function Projects() {
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const { data: projects = [], isLoading: pLoading, isError: pError, refetch: retryProjects } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
 const { data: issues = [], isLoading: iLoading, isError: iError, refetch: retryIssues } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
 const { data: pages = [], isLoading: docLoading, isError: docError, refetch: retryDocs } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() });
 const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: retryGoals } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });

 const handleDeleteProject = async (e: React.MouseEvent, project: any) => {
 e.stopPropagation();
 try {
 await api.projects.delete(project.id);
 for (const queryKey of [['projects'], ['project', project.id], ['goals'], ['issues'], ['tasks'], ['planner']]) queryClient.invalidateQueries({ queryKey });
 toast.success(`Deleted initiative "${project.name}"`, {
 action: {
 label: 'Undo',
 onClick: async () => {
 try {
 await api.projects.restore(project.id);
 for (const queryKey of [['projects'], ['project', project.id], ['goals'], ['issues'], ['tasks'], ['planner']]) queryClient.invalidateQueries({ queryKey });
 toast.success(`Restored initiative "${project.name}"`);
 } catch { toast.error('Could not restore initiative'); }
 }
 }
 });
 } catch {
 toast.error('Failed to delete initiative');
 }
 };

 const [createModalOpen, setCreateModalOpen] = useState(false);
 const createProjectMutation = useMutation({
 mutationFn: (data: { name: string; problemStatement: string; status: string; targetDate: string; icon: string; goalId?: string | null }) =>
 api.projects.create({
 name: data.name,
 problemStatement: data.problemStatement,
 status: data.status,
 progress: 0,
 icon: data.icon,
 goalId: data.goalId || null,
 targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null
 }),
 onSuccess: (newProj) => {
 queryClient.invalidateQueries({ queryKey: ['projects'] });
 queryClient.invalidateQueries({ queryKey: ['goals'] });
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

 // Persist manual ordering via PATCH /projects/:id/reorder. Positions are global
 // floats (listProjects orders by position asc); moving a card computes a midpoint
 // between its same-status neighbours so only one row is written. Optimistic so the
 // card doesn't snap back before the refetch; rolled back on error.
 const reorderMutation = useMutation({
 mutationFn: (vars: { id: string; position: number; version: number }) =>
 api.projects.reorder(vars.id, { position: vars.position, version: vars.version }),
 onMutate: async (vars) => {
 await queryClient.cancelQueries({ queryKey: ['projects'] });
 const prev = queryClient.getQueryData<any[]>(['projects']);
 queryClient.setQueryData<any[]>(['projects'], (old) =>
 old
 ? old
 .map((p) => (p.id === vars.id ? { ...p, position: vars.position, version: p.version + 1 } : p))
 .sort((a, b) => a.position - b.position)
 : old
 );
 return { prev };
 },
 onError: (_err, _vars, ctx) => {
 if (ctx?.prev) queryClient.setQueryData(['projects'], ctx.prev);
 toast.error('Failed to reorder initiative');
 },
 onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
 });

 const handleMove = (e: React.MouseEvent, project: any, direction: 'up' | 'down') => {
 e.stopPropagation();
 // Same-status siblings in their current (position-asc) order.
 const siblings = projects
 .filter((p) => p.status === project.status)
 .sort((a, b) => a.position - b.position);
 const idx = siblings.findIndex((p) => p.id === project.id);
 if (idx === -1) return;

 let newPosition: number;
 if (direction === 'up') {
 if (idx === 0) return; // already first
 const prev = siblings[idx - 1];
 const prevPrev = siblings[idx - 2];
 newPosition = prevPrev
 ? (prevPrev.position + prev.position) / 2
 : prev.position > 0
 ? prev.position / 2
 : prev.position - 500;
 } else {
 if (idx === siblings.length - 1) return; // already last
 const next = siblings[idx + 1];
 const nextNext = siblings[idx + 2];
 newPosition = nextNext ? (next.position + nextNext.position) / 2 : next.position + 1000;
 }

 if (newPosition === project.position) return;
 reorderMutation.mutate({ id: project.id, position: newPosition, version: project.version });
 };

 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idea' | 'paused' | 'shipped' | 'completed' | 'archived'>('all');

 const filteredProjects = useMemo(() => {
 return projects.filter(p => {
 const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.problemStatement && p.problemStatement.toLowerCase().includes(searchQuery.toLowerCase()));
 const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
 return matchesSearch && matchesStatus;
 });
 }, [projects, searchQuery, statusFilter]);

 if (pLoading || iLoading || docLoading || goalsLoading) return <LoadingState title="Loading Projects..." description="Loading projects, tasks and linked documents..." />;

 if (pError || iError || docError || goalsError) return <div className="p-6"><ErrorState title="Could not load projects" onRetry={() => { retryProjects(); retryIssues(); retryDocs(); retryGoals(); }} /></div>;
 const statuses = statusFilter === 'all' ? ['active', 'idea', 'paused', 'shipped', 'completed', 'archived'] : [statusFilter];

 return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-canvas overflow-y-auto min-w-0 animate-in fade-in duration-150 gap-5 pb-24 font-sans text-primary">
      <PageHeader
        icon={FolderKanban}
        title="Projects & Strategic Initiatives"
        description="Engineering command center for multi-phase roadmaps, technical milestones, and high-impact deliverables."
        primaryAction={{
          label: 'New Initiative',
          icon: Plus,
          onClick: handleCreateProject,
        }}
        className="mb-0"
      />

      {/* STRATEGIC HEALTH FILTER & SEARCH BAR */}
      <div className="bg-surface/80 border border-border/80 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
          <input
            type="text"
            aria-label="Search projects" placeholder="Search initiatives by title or technical scope..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-hover/80 border border-border/70 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent focus:bg-surface transition-all placeholder:text-muted text-primary font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] font-bold text-secondary flex items-center gap-1 mr-1 shrink-0 uppercase tracking-wider font-mono">
            <Filter className="w-3.5 h-3.5 stroke-[1.5]" /> Status:
          </span>
          {(['all', 'active', 'idea', 'paused', 'shipped', 'completed', 'archived'] as const).map((stat) => (
            <button
              key={stat}
              onClick={() => setStatusFilter(stat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shrink-0 cursor-pointer",
                statusFilter === stat 
                  ? "bg-primary text-text-inverse shadow-xs ring-1 ring-primary/20" 
                  : "bg-surface-hover/60 text-secondary hover:text-primary border border-border/60 hover:bg-surface-hover"
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
 <span className="text-caption font-mono font-bold text-primary uppercase">No {status} initiatives match current filter</span>
 </div>
 );
 }
 if (statusProjects.length === 0) return null;

 return (
 <div key={status} className="flex flex-col gap-4">
 {/* Category Status Ribbon */}
 <div className="flex items-center gap-2 text-secondary font-mono font-bold text-caption uppercase tracking-wider px-1">
 <span className={cn("w-2.5 h-2.5 rounded-full shadow-2xs",
 status === 'active' ? 'bg-accent animate-pulse' :
 status === 'idea' ? 'bg-warning-fg' :
 status === 'shipped' ? 'bg-success-fg' :
 status === 'completed' ? 'bg-cat-tasks' :
 status === 'archived' ? 'bg-secondary/50' : 'bg-secondary'
 )} />
 <span>{status} INITIATIVES</span>
 <span className="ml-auto bg-surface border border-border px-2.5 py-0.5 rounded-md font-mono text-caption font-bold text-primary shadow-2xs">
 {statusProjects.length} Tracked
 </span>
 </div>
 
 <div className="flex flex-col gap-4">
 {statusProjects.map((project, groupIdx) => {
 const projectIssues = project.tasks || issues.filter(i => i.projectId === project.id);
 const totalDocs = pages.filter(p => p.linkedProjectId === project.id || p.projectId === project.id).length;

 const completedIssues = projectIssues.filter((i: any) => i.status === "DONE").length;
 const totalIssues = project._count?.tasks ?? projectIssues.length;
 const progressPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

 // Compute hours since last active
 const hoursSinceUpdate = Math.max(1, Math.round((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600)));
 const lastActiveLabel = hoursSinceUpdate < 24 ? `${hoursSinceUpdate}h ago` : `${Math.round(hoursSinceUpdate / 24)}d ago`;

 return (
          <div 
            key={project.id} 
            onClick={() => navigate(`/app/projects/${project.id}`)}
            className="v4-card p-6 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] hover:border-accent cursor-pointer group/card flex flex-col justify-between gap-5 relative overflow-hidden"
          >
            {/* Left color glow bar on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent opacity-100 transition-opacity duration-300" />

            {/* Top Row: Title, Problem Statement & Actions */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-cat-projects-bg border border-cat-projects/20 text-cat-projects flex items-center justify-center shrink-0">
                    {React.createElement(resolveIcon(project.icon || 'FolderKanban'), { className: "w-4 h-4 stroke-[1.75]" })}
                  </div>
                  <h3 className="text-base font-bold text-primary truncate group-hover/card:text-accent transition-colors tracking-tight">
                    {project.name}
                  </h3>
                  {project.goalId && (() => {
                    const linkedGoal = goals.find((g: any) => g.id === project.goalId);
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/app/goals');
                        }}
                        className="bg-cat-projects-bg text-cat-projects border border-cat-projects/25 hover:bg-cat-projects-bg/80 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={linkedGoal ? `Working toward goal: ${linkedGoal.title}` : 'Linked to Goal'}
                      >
                        <Target className="w-3 h-3 stroke-[2]" />
                        <span className="truncate max-w-[320px]">{linkedGoal ? `Goal: ${linkedGoal.title}` : 'OKR Linked'}</span>
                      </button>
                    );
                  })()}
                </div>
                
                {project.problemStatement && (
                  <p className="text-caption md:text-body text-secondary font-normal line-clamp-2 leading-relaxed max-w-4xl">
                    {project.problemStatement}
                  </p>
                )}
              </div>

              {/* Right Quick Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                <div className="flex items-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label="Move initiative up"
                    disabled={groupIdx === 0 || reorderMutation.isPending}
                    onClick={(e) => handleMove(e, project, 'up')}
                    className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4 stroke-[1.5]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move initiative down"
                    disabled={groupIdx === statusProjects.length - 1 || reorderMutation.isPending}
                    onClick={(e) => handleMove(e, project, 'down')}
                    className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4 stroke-[1.5]" />
                  </button>
                </div>
                <ConfirmDeleteButton
                  onConfirm={(e) => handleDeleteProject(e, project)}
                  className="p-2"
                  iconClassName="w-4 h-4 stroke-[1.5]"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/projects/${project.id}`);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-hover hover:bg-accent/15 text-secondary hover:text-accent font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer border border-border/70"
                >
                  <span>Open Initiative</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2] group-hover/card:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Middle Row: Unified High-Precision Progress & Telemetry */}
            <div className="bg-surface-hover/50 border border-border/70 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-secondary">Completion</span>
                  <span className="text-sm font-bold text-primary font-mono tabular-nums">{progressPct}%</span>
                </div>
                <div className="w-36 bg-border/40 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cat-projects to-accent rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Telemetry chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cat-projects-bg border border-cat-projects/20 text-cat-projects font-semibold text-[11px]">
                  <FolderKanban className="w-3.5 h-3.5" />
                  {totalDocs} {totalDocs === 1 ? 'Doc' : 'Docs'}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-success-bg border border-success-border text-success-fg font-semibold text-[11px] font-mono tabular-nums">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedIssues}/{totalIssues} Issues
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Active {lastActiveLabel}
                </span>
              </div>
            </div>

              {/* Invisible AI Risk Analysis Bar (Reveals on card hover) */}
              <div className="opacity-0 group-hover/card:opacity-100 max-h-0 group-hover/card:max-h-16 transition-all duration-300 overflow-hidden pt-1">
                <div className="text-badge font-mono bg-accent-subtle border border-accent/20 text-primary px-3 py-1.5 rounded-lg flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-accent-fg">
                    <Sparkles className="w-3.5 h-3.5 stroke-[1.5] shrink-0" /> Progress guidance:
                  </span>
                  <span className="truncate flex-1 text-secondary">
                    {progressPct === 100 
                      ? "Initiative completed. Ready for quarterly archive and post-mortem review." 
                      : progressPct > 60 
                      ? "More than 60% of tracked tasks are complete. Review the remaining work against the target date."
                      : "Early execution phase. Consider scheduling focus sessions for the remaining tasks."}
                  </span>
                  <span className="font-bold text-primary flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-success-fg stroke-[1.5]" /> Tracked
                  </span>
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

 {createModalOpen && <ProjectCreateModal
 open={createModalOpen}
 onClose={() => setCreateModalOpen(false)}
 onSubmit={(data) => createProjectMutation.mutate(data)}
 isSubmitting={createProjectMutation.isPending}
 goals={goals}
 />}
 </div>
 );
}
