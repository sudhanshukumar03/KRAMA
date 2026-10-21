import { WorkspaceSearchField } from './ui/WorkspaceSearchField';
import type { ProjectStatus, ProjectWithRelations } from '../types/schema';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Filter, CheckCircle2, ArrowRight, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { GoalIcon } from './ui/GoalIcon';
import { PageHeader } from './ui/PageHeader';
import { LoadingState } from './ui/LoadingState';
import { BaseButton } from './ui/BaseButton';
import { ConfirmDeleteButton } from './ui/ConfirmDeleteButton';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ErrorState } from './ui/ErrorState';
import { ProjectCreateModal } from './projects/ProjectDialogs';
import { resolveIcon } from '../lib/iconResolver';

export function Projects() {
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const { data: projects = [], isLoading: pLoading, isError: pError, refetch: retryProjects } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
 const { data: issues = [], isLoading: iLoading, isError: iError, refetch: retryIssues } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
 const { data: pages = [], isLoading: docLoading, isError: docError, refetch: retryDocs } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() });
 const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: retryGoals } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });

 const handleDeleteProject = async (e: React.MouseEvent, project: ProjectWithRelations) => {
 e.stopPropagation();
 try {
 await api.projects.delete(project.id);
 for (const queryKey of [['projects'], ['project', project.id], ['goals'], ['issues'], ['tasks'], ['planner']]) queryClient.invalidateQueries({ queryKey });
 toast.success(`Deleted project "${project.name}"`, {
 action: {
 label: 'Undo',
 onClick: async () => {
 try {
 await api.projects.restore(project.id);
 for (const queryKey of [['projects'], ['project', project.id], ['goals'], ['issues'], ['tasks'], ['planner']]) queryClient.invalidateQueries({ queryKey });
 toast.success(`Restored project "${project.name}"`);
 } catch { toast.error('Could not restore project'); }
 }
 }
 });
 } catch {
 toast.error('Failed to delete project');
 }
 };

 const [createModalOpen, setCreateModalOpen] = useState(false);
 const createProjectMutation = useMutation({
 mutationFn: (data: { name: string; problemStatement: string; status: ProjectStatus; targetDate: string; icon: string; goalId?: string | null }) =>
 api.projects.create({
 name: data.name,
 problemStatement: data.problemStatement,
 status: data.status,
 progress: 0,
 icon: data.icon ?? undefined,
 goalId: data.goalId || null,
 targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null
 }),
 onSuccess: (newProj) => {
 queryClient.invalidateQueries({ queryKey: ['projects'] });
 queryClient.invalidateQueries({ queryKey: ['goals'] });
 setCreateModalOpen(false);
 toast.success(`Created strategic project "${newProj?.name || 'Project'}"`, {
 description: 'Open a project to plan its tasks and milestones.'
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
 const prev = queryClient.getQueryData<ProjectWithRelations[]>(['projects']);
 queryClient.setQueryData<ProjectWithRelations[]>(['projects'], (old) =>
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
 toast.error('Failed to reorder project');
 },
 onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
 });

 const handleMove = (e: React.MouseEvent, project: ProjectWithRelations, direction: 'up' | 'down') => {
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

 if (pLoading) return <LoadingState title="Loading Projects..." description="Loading projects..." />;

 if (pError && projects.length === 0) return <div className="p-6"><ErrorState title="Could not load projects" onRetry={() => { retryProjects(); }} /></div>;
 const statuses = statusFilter === 'all' ? ['active', 'idea', 'paused', 'shipped', 'completed', 'archived'] : [statusFilter];

 return (
    <div className="workspace-page workspace-projects p-6 md:p-8 flex flex-col h-full bg-canvas overflow-y-auto min-w-0 animate-in fade-in duration-150 gap-5 pb-24 font-sans text-primary">
      <PageHeader
        icon={FolderKanban}
        title="Projects"
        description="Keep the tasks and notes for each project together, with a clear view of what comes next."
        primaryAction={{
          label: 'New Project',
          icon: Plus,
          onClick: handleCreateProject,
        }}
        className="mb-0"
      />

      {(pError || iError || docError || goalsError) && <ErrorState title="Some project details are unavailable" message="Your available projects remain usable. Retry to refresh missing tasks, documents or goal links." onRetry={() => { if (pError) retryProjects(); if (iError) retryIssues(); if (docError) retryDocs(); if (goalsError) retryGoals(); }} />}
      {/* STRATEGIC HEALTH FILTER & SEARCH BAR */}
      <div className="workspace-toolbar">
        <WorkspaceSearchField id="projects-search-input" value={searchQuery} onChange={setSearchQuery} label="Search projects" placeholder="Search projects..." />

        <div role="tablist" aria-label="Filter projects by status" className="workspace-project-status">
          <span className="text-xs font-bold text-secondary flex items-center gap-1 mr-1 shrink-0 uppercase tracking-wider font-mono">
            <Filter className="w-3.5 h-3.5 stroke-[1.5]" /> Status:
          </span>
          {(['all', 'active', 'idea', 'paused', 'shipped', 'completed', 'archived'] as const).map((stat) => (
            <button
              key={stat}
              type="button"
              role="tab"
              aria-selected={statusFilter === stat}
              onClick={() => setStatusFilter(stat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shrink-0 cursor-pointer font-mono",
                statusFilter === stat
                  ? "bg-card text-primary font-bold border border-border shadow-2xs"
                  : "bg-surface-hover/60 text-secondary hover:text-primary border border-border/60 hover:bg-surface-hover"
              )}
            >
              {stat} {stat !== 'all' && `(${projects.filter(p => p.status === stat).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ZERO PROJECTS IN WORKSPACE */}
      {projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cat-projects-bg border border-cat-projects/20 text-cat-projects flex items-center justify-center shadow-xs">
            <FolderKanban className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-bold text-primary">No projects yet</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Bring related tasks, notes, and milestones together around one outcome.
            </p>
          </div>
          <BaseButton
            variant="primary"
            size="sm"
            onClick={handleCreateProject}
            className="gap-2 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Project
          </BaseButton>
        </div>
      )}

      {/* FILTERED EMPTY STATE */}
      {projects.length > 0 && filteredProjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center flex flex-col items-center justify-center gap-3">
          <FolderKanban className="w-8 h-8 text-muted stroke-[1.5]" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-primary">No Matching Projects Found</h3>
            <p className="text-xs text-secondary">
              {searchQuery
                ? `No projects match "${searchQuery}" with status "${statusFilter}".`
                : `No projects found with status "${statusFilter}".`}
            </p>
          </div>
          <BaseButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="gap-1.5 text-xs font-semibold mt-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </BaseButton>
        </div>
      )}

      {/* LUXURY LARGE CARDS LIST / GRID */}
      <div className="workspace-project-groups flex flex-col gap-8">
        {statuses.map(status => {
          const statusProjects = filteredProjects.filter(p => p.status === status);
 if (statusProjects.length === 0 && statusFilter !== 'all') {
 return (
 <div key={status} className="border border-border border-dashed rounded-2xl bg-surface-hover/30 p-12 flex flex-col items-center justify-center text-center">
 <FolderKanban className="w-8 h-8 text-secondary mb-2 stroke-[1.5]" />
 <span className="text-caption font-mono font-bold text-primary uppercase">No {status} projects match current filter</span>
 </div>
 );
 }
 if (statusProjects.length === 0) return null;

 return (
 <div key={status} className="workspace-project-section flex flex-col gap-4">
 {/* Category Status Ribbon */}
 <div className="workspace-project-section-heading flex items-center gap-2 text-secondary px-1">
 <span className={cn("w-2.5 h-2.5 rounded-full shadow-2xs",
 status === 'active' ? 'bg-accent animate-pulse' :
 status === 'idea' ? 'bg-warning-fg' :
 status === 'shipped' ? 'bg-success-fg' :
 status === 'completed' ? 'bg-cat-tasks' :
 status === 'archived' ? 'bg-secondary/50' : 'bg-secondary'
 )} />
 <h2>{status === 'idea' ? 'Project ideas' : `${status.charAt(0).toUpperCase()}${status.slice(1)} projects`}</h2>
 <span className="ml-auto bg-surface border border-border px-2.5 py-0.5 rounded-md font-mono text-caption font-bold text-primary shadow-2xs">
 {statusProjects.length} {statusProjects.length === 1 ? 'project' : 'projects'}
 </span>
 </div>

 <div className="flex flex-col gap-4">
 {statusProjects.map((project, groupIdx) => {
 const projectIssues = project.tasks || issues.filter(i => i.projectId === project.id);
 const totalDocs = pages.filter(p => p.linkedProjectId === project.id || p.projectId === project.id).length;

 const completedIssues = projectIssues.filter((i) => i.status === "DONE").length;
 const totalIssues = project._count?.tasks ?? projectIssues.length;
 const progressPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

 // Compute hours since last active
 const hoursSinceUpdate = Math.max(1, Math.round((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600)));
 const lastActiveLabel = hoursSinceUpdate < 24 ? `${hoursSinceUpdate}h ago` : `${Math.round(hoursSinceUpdate / 24)}d ago`;

 return (
          <div
            key={project.id}
            onClick={() => navigate(`/app/projects/${project.id}`)}
            className="workspace-project-card v4-card p-6 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] hover:border-accent cursor-pointer group/card flex flex-col justify-between gap-5 relative overflow-hidden"
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
                    const linkedGoal = goals.find((g) => g.id === project.goalId);
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/app/goals');
                        }}
                        className="bg-cat-projects-bg text-cat-projects border border-cat-projects/25 hover:bg-cat-projects-bg/80 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={linkedGoal ? `Working toward goal: ${linkedGoal.title}` : 'Linked to Goal'}
                      >
                        <GoalIcon className="w-3 h-3 stroke-[2]" />
                        <span className="truncate max-w-[320px]">{linkedGoal ? `Goal: ${linkedGoal.title}` : 'Linked goal'}</span>
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
                <div className="flex items-center opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label="Move project up"
                    disabled={groupIdx === 0 || reorderMutation.isPending}
                    onClick={(e) => handleMove(e, project, 'up')}
                    className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4 stroke-[1.5]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move project down"
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
                  <span>Open Project</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2] group-hover/card:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Middle Row: Unified High-Precision Progress & Telemetry */}
            <div className="workspace-project-facts bg-surface-hover/50 border border-border/70 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-secondary">Completion</span>
                  <span className="text-sm font-bold text-primary font-mono tabular-nums">{iError || iLoading ? 'Unavailable' : `${progressPct}%`}</span>
                </div>
                <div className="w-36 bg-border/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cat-projects to-accent rounded-full transition-all duration-500 ease-out"
                    style={{ width: iError || iLoading ? '0%' : `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Telemetry chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cat-projects-bg border border-cat-projects/20 text-cat-projects font-semibold text-xs">
                  <FolderKanban className="w-3.5 h-3.5" />
                  {docError || docLoading ? 'Docs unavailable' : `${totalDocs} ${totalDocs === 1 ? 'Doc' : 'Docs'}`}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-success-bg border border-success-border text-success-fg font-semibold text-xs font-mono tabular-nums">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {iError || iLoading ? 'Tasks unavailable' : `${completedIssues}/${totalIssues} Tasks`}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Active {lastActiveLabel}
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
 goalsUnavailable={goalsError || goalsLoading}
 />}
 </div>
 );
}
