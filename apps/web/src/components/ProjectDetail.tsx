import { ProjectDocuments, ProjectTimeline } from './projects/ProjectSupportingViews';
import { ProjectOverview } from './projects/ProjectOverview';
import type { ProjectStatus } from '../types/schema';
import { projectStatus, projectMetadata, errorMessage, parseLocalDate } from '../lib/utils';
import { differenceInCalendarDays } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, CheckCircle2, Clock, ExternalLink, FileText, Folder, FolderKanban, KanbanSquare, LayoutDashboard, MoreHorizontal, Pencil, Search, Settings, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { canHandlePageShortcut } from '../lib/keyboardShortcuts';
import { DeleteInitiativeModal, ProjectEditModal } from './projects/ProjectDialogs';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';
import { LoadingState } from './ui/LoadingState';

import { resolveIcon } from '../lib/iconResolver';
import { IssueCreateModal, KanbanBoard } from './KanbanBoard';
import type { TaskCreateInput } from '../types/schema';

/**
 * Own project queries and mutations shared by Overview, Board, Brain and Timeline.
 * Pass derived values and actions to the overview so every tab uses the same data.
 */
export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'docs' | 'timeline' | 'settings'>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [createDirectiveModalOpen, setCreateDirectiveModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Top header search & more menu
  const [initiativeSearch, setInitiativeSearch] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Tag editing state
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  // Status dropdown in Project Details
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canHandlePageShortcut(e) || editModalOpen || deleteModalOpen || createDirectiveModalOpen) return;

      if (e.key === '1' || e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setActiveTab('overview');
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setActiveTab('board');
      } else if (e.key === '3' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setActiveTab('docs');
      } else if (e.key === '4' || e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setActiveTab('timeline');
      } else if (e.key === '5' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setActiveTab('settings');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setCreateDirectiveModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editModalOpen, deleteModalOpen, createDirectiveModalOpen]);

  const { data: projects = [], isError: pError, refetch: retryProjects } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading, isError: iError, refetch: retryIssues } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const { data: pages = [], isLoading: docsLoading, isError: docsError, refetch: retryDocs } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() });
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: retryGoals } = useQuery({ queryKey: ['goals', 'lite'], queryFn: api.goals.listLite });

  // The workspace-scoped detail request is authoritative, including milestones.
  // Its loading, error and not-found states must not be masked by an older list.
  const { data: fetchedProject, isLoading: projectLoading, error: projectError, refetch: retryProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id!),
    enabled: !!id,
    retry: false,
  });

  const project = fetchedProject;

  const editProjectMutation = useMutation({
    mutationFn: (data: { name: string; problemStatement: string; status: ProjectStatus; targetDate: string; icon?: string | null; goalId?: string | null; tags?: string[]; version?: number }) => {
      if (!project) throw new Error('Project not loaded');
      return api.projects.update(project.id, {
        name: data.name,
        problemStatement: data.problemStatement,
        status: data.status,
        icon: data.icon ?? undefined,
        goalId: data.goalId || null,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        version: data.version ?? project.version,
        metadata: {
          ...projectMetadata(project.metadata),
          tags: data.tags !== undefined ? data.tags : (projectMetadata(project.metadata).tags || [])
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setEditModalOpen(false);
      toast.success('Project updated successfully');
    },
    onError: (err) => {
      if ('status' in err && err.status === 409) {
        // Refresh the server version without resetting the open editor's draft.
        void queryClient.invalidateQueries({ queryKey: ['project', id] });
        void queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
      toast.error(errorMessage(err, 'Failed to update project'));
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => {
      if (!project) throw new Error('Project not loaded');
      return api.projects.delete(project.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      setDeleteModalOpen(false);
      const deletedProjectId = project!.id;
      toast.success(`Deleted project "${project?.name}"`, {
        action: { label: 'Undo', onClick: async () => {
          try {
            await api.projects.restore(deletedProjectId);
            for (const queryKey of [['projects'], ['project', deletedProjectId], ['issues'], ['tasks'], ['planner'], ['goals']]) queryClient.invalidateQueries({ queryKey });
            toast.success('Project restored');
          } catch { toast.error('Could not restore project'); }
        } },
      });
      navigate('/app/projects');
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to delete project'));
    }
  });

  const createDirectiveMutation = useMutation({
    mutationFn: (data: TaskCreateInput) =>
      api.tasks.create({
        ...data,
        projectId: project?.id,
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setCreateDirectiveModalOpen(false);
      toast.success(`Created "${newIssue?.title || 'Directive'}"`, {
        description: 'Directive added to project backlog.'
      });
    },
    onError: () => {
      toast.error('Failed to create directive');
    }
  });

  if (projectLoading) {
    return <LoadingState variant="project-detail" title="Loading Strategic Project..." description="Aggregating roadmap milestones, execution tickets, and engineering documentation..." />;
  }

  if (projectError && ('status' in projectError ? projectError.status : undefined) !== 404) {
    return (
      <div className="p-8 font-sans">
        <ErrorState
          onRetry={() => { retryProjects(); retryIssues(); retryDocs(); retryGoals(); retryProject(); }}
          title="Failed to Load Project Telemetry"
          message="Could not retrieve project data from the server. Please verify network connectivity."
        />
      </div>
    );
  }

  if (!project) return (
    <div className="p-12 font-sans">
      <EmptyState icon={FolderKanban} description="Strategic project not found in workspace" />
      <div className="mt-6 flex justify-center">
        <BaseButton onClick={() => navigate('/app/projects')}>Return to Projects</BaseButton>
      </div>
    </div>
  );

  const projectMilestones = project.milestones || [];
  const tasksAvailable = !iError && !iLoading;
  const projectIssues = project.tasks || issues.filter(i => i.projectId === project.id);
  const projectDocs = pages.filter(p => p.linkedProjectId === project.id || p.projectId === project.id);
  const projectGoal = project.goal || (project.goalId ? goals.find(g => g.id === project.goalId) : null);

  const completedIssues = projectIssues.filter((i) => i.status === "DONE");
  const openIssues = projectIssues.filter((i) => i.status !== "DONE");
  const progressPct = projectIssues.length > 0 ? Math.round((completedIssues.length / projectIssues.length) * 100) : 0;

  // Calculate days since last update
  const daysSinceUpdate = Math.max(0, Math.floor((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24)));

  // Real risk and deadline telemetry
  const urgentIssues = openIssues.filter((i) => i.priority === "URGENT" || i.priority === "HIGH");
  const projectTargetDate = project.targetDate || projectMetadata(project.metadata).targetDate;
  const targetDay = parseLocalDate(projectTargetDate);
  const daysRemaining = targetDay ? differenceInCalendarDays(targetDay, new Date()) : null;

  const isPastDue = daysRemaining !== null && daysRemaining < 0 && progressPct < 100;
  const isApproaching = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && progressPct < 80;
  const blockedIssues = openIssues.filter(issue => {
    const blocker = issues.find(task => task.id === issue.blockedById);
    return blocker && !blocker.deletedAt && !['DONE', 'CANCELED'].includes(blocker.status);
  });
  const hasBlockers = blockedIssues.length > 0;

  let riskStatus = 'ON TRACK';
  let riskBadgeClass = 'bg-success-bg text-success-fg border-success-border';
  let riskMessage = `${progressPct}% of tasks completed. No overdue deadline or blocked tasks detected.`;

  if (progressPct === 100) {
    riskStatus = 'DELIVERED & COMPLETE';
    riskBadgeClass = 'bg-success-bg text-success-fg border-success-border';
    riskMessage = 'All project tasks are complete.';
  } else if (isPastDue) {
    riskStatus = 'OVERDUE';
    riskBadgeClass = 'bg-danger-bg text-danger-fg border-danger-border';
    riskMessage = `The target date passed ${Math.abs(daysRemaining!)} days ago. ${openIssues.length} tasks remain.`;
  } else if (isApproaching) {
    riskStatus = 'HIGH RISK: APPROACHING DEADLINE';
    riskBadgeClass = 'bg-warning-bg text-warning-fg border-warning-border';
    riskMessage = `Target delivery date is in ${daysRemaining} days with ${progressPct}% completed. Requires acceleration of ${openIssues.length} remaining tickets.`;
  } else if (hasBlockers) {
    riskStatus = 'ATTENTION: BLOCKERS DETECTED';
    riskBadgeClass = 'bg-warning-bg text-warning-fg border-warning-border';
    riskMessage = `${blockedIssues.length} task(s) are waiting for another unfinished task. Open Tasks to review their dependencies.`;
  } else if (projectIssues.length === 0) {
    riskStatus = 'SCOPE DEFINITION PHASE';
    riskBadgeClass = 'bg-accent-subtle text-accent-fg border-accent/20';
    riskMessage = 'No execution tickets created yet. Add tickets to Kanban or link milestones to establish tracking.';
  }

  const handleRunDiagnostic = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Run a strategic diagnostic for project "${project.name}". Status: ${project.status}. Problem Statement: ${project.problemStatement || 'N/A'}. Tickets: ${projectIssues.length} tickets (${urgentIssues.length} urgent/high priority). Progress: ${progressPct}%. Provide a concise strategic assessment and recommended next actions.`;
      const result = await api.ai.complete({
        message: prompt,
      });
      const summary = result.answer || 'Strategic assessment completed successfully.';
      toast.success('AI Strategic Diagnostic Complete', {
        description: summary,
      });
    } catch (err) {
      toast.error('Diagnostic failed', {
        description: errorMessage(err, 'Please try again.'),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickStatusChange = (newStatus: ProjectStatus) => {
    setStatusDropdownOpen(false);
    editProjectMutation.mutate({
      name: project.name,
      problemStatement: project.problemStatement || '',
      status: newStatus,
      targetDate: (() => { const d = project.targetDate || projectMetadata(project.metadata).targetDate; return d ? new Date(d).toISOString() : ''; })(),
      icon: project.icon,
      goalId: project.goalId || null,
      tags: projectMetadata(project.metadata).tags || []
    });
  };

  const projectTags = projectMetadata(project.metadata).tags;

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagText.trim()) return;
    const tag = newTagText.trim().toLowerCase();
    if (!projectTags.includes(tag)) {
      const updated = [...projectTags, tag];
      editProjectMutation.mutate({
        name: project.name,
        problemStatement: project.problemStatement || '',
        status: projectStatus(project.status),
        targetDate: (() => { const d = project.targetDate || projectMetadata(project.metadata).targetDate; return d ? new Date(d).toISOString() : ''; })(),
        icon: project.icon,
        goalId: project.goalId || null,
        tags: updated
      });
    }
    setNewTagText('');
    setTagInputOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = projectTags.filter(t => t !== tagToRemove);
    editProjectMutation.mutate({
      name: project.name,
      problemStatement: project.problemStatement || '',
      status: projectStatus(project.status),
      targetDate: (() => { const d = project.targetDate || projectMetadata(project.metadata).targetDate; return d ? new Date(d).toISOString() : ''; })(),
      icon: project.icon,
      goalId: project.goalId || null,
      tags: updated
    });
  };

  const filteredInitiatives = projects.filter(p =>
    p.id !== project.id && p.name.toLowerCase().includes(initiativeSearch.toLowerCase())
  );

  return (
    <div className={cn("workspace-project-detail flex flex-col h-full bg-canvas animate-in fade-in duration-150 font-sans text-primary", activeTab === 'board' ? "overflow-hidden" : "overflow-y-auto pb-24")}>

      {/* MODALS */}
      {(pError || iError || docsError || goalsError) && <ErrorState title="Some linked details are unavailable" message="This project remains available. Retry to load its navigation list, tasks, documents or goal links." onRetry={() => { if (pError) retryProjects(); if (iError) retryIssues(); if (docsError) retryDocs(); if (goalsError) retryGoals(); }} />}
      <ProjectEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={(data) => editProjectMutation.mutate(data)}
        isSubmitting={editProjectMutation.isPending}
        initialData={project}
        goals={goals}
        goalsUnavailable={goalsError || goalsLoading}
      />

      <DeleteInitiativeModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => deleteProjectMutation.mutate()}
        isDeleting={deleteProjectMutation.isPending}
        initiativeName={project.name}
      />

      <IssueCreateModal
        open={createDirectiveModalOpen}
        initialStatus="BACKLOG"
        defaultProjectId={project.id}
        allIssues={issues}
        projects={projects}
        onClose={() => setCreateDirectiveModalOpen(false)}
        onSubmit={(data) => createDirectiveMutation.mutate(data)}
        isSubmitting={createDirectiveMutation.isPending}
      />

      {/* 1. TOP BREADCRUMB & UTILITY HEADER */}
      <header className="flex items-center justify-between px-6 md:px-8 py-3.5 border-b border-border bg-surface shrink-0">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2.5 text-caption font-medium">
          <Link
            to="/app/projects"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
            title="Return to Projects"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
          </Link>
          <Link to="/app/projects" className="text-secondary hover:text-primary transition-colors text-caption font-semibold uppercase tracking-wider font-mono">
            Projects
          </Link>
          <span className="text-muted/60 text-caption">›</span>
          <span className="font-bold text-primary tracking-tight text-body uppercase font-mono">{project.name}</span>
        </div>

        {/* Right: Search, Notifications, More, Edit Project */}
        <div className="flex items-center gap-3">
          <div className="relative w-56 sm:w-64 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="project-project-search"
              name="initiativeSearch"
              aria-label="Search projects"
              type="text"
              placeholder="Search projects... (press /)"
              value={initiativeSearch}
              onChange={(e) => {
                setInitiativeSearch(e.target.value);
                setSearchDropdownOpen(Boolean(e.target.value));
                setSearchSelectedIndex(0);
              }}
              onFocus={() => {
                if (initiativeSearch) setSearchDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (!searchDropdownOpen || filteredInitiatives.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSearchSelectedIndex(prev => (prev + 1) % filteredInitiatives.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSearchSelectedIndex(prev => (prev - 1 + filteredInitiatives.length) % filteredInitiatives.length);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const selected = filteredInitiatives[searchSelectedIndex];
                  if (selected) {
                    setInitiativeSearch('');
                    setSearchDropdownOpen(false);
                    navigate(`/app/projects/${selected.id}`);
                  }
                } else if (e.key === 'Escape') {
                  setSearchDropdownOpen(false);
                }
              }}
              className="w-full pl-8 pr-3 py-1.5 text-caption bg-surface-hover/60 border border-border/70 rounded-full focus:outline-none focus:border-accent focus:bg-surface transition-all placeholder:text-muted text-primary"
              aria-autocomplete="list"
              aria-expanded={searchDropdownOpen && Boolean(initiativeSearch)}
              aria-controls="project-search-listbox"
            />
            {searchDropdownOpen && initiativeSearch && (
              <div
                id="project-search-listbox"
                role="listbox"
                aria-label="Matching projects"
                className="absolute right-0 top-full mt-1.5 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption max-h-48 overflow-y-auto"
              >
                {filteredInitiatives.map((p, idx) => (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected={idx === searchSelectedIndex}
                    onClick={() => {
                      setInitiativeSearch('');
                      setSearchDropdownOpen(false);
                      navigate(`/app/projects/${p.id}`);
                    }}
                    className={cn(
                      "px-3.5 py-2 cursor-pointer flex items-center justify-between text-primary truncate transition-colors",
                      idx === searchSelectedIndex ? "bg-surface-hover text-accent font-semibold" : "hover:bg-surface-hover"
                    )}
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-badge font-mono text-muted uppercase tabular-nums">{p.status}</span>
                  </div>
                ))}
                {filteredInitiatives.length === 0 && (
                  <div className="p-3 text-center text-muted font-mono text-caption">No other projects match</div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(prev => !prev)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              className="w-8 h-8 rounded-full border border-border/70 bg-surface-hover/40 hover:bg-surface-hover text-secondary hover:text-primary flex items-center justify-center transition-colors shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {moreMenuOpen && (
              <div role="menu" aria-label="More project actions" className="absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption animate-in fade-in zoom-in-95 duration-100">

                <button
                  role="menuitem"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Project link copied to clipboard');
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-primary cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted" /> Copy Link
                </button>
                <div className="my-1 border-t border-border/60" />
                <button
                  role="menuitem"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setDeleteModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-danger-fg hover:bg-danger-bg flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                </button>
              </div>
            )}
          </div>

          <BaseButton
            variant="primary"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="gap-2 text-caption"
            title="Edit Project"
          >
            <Pencil className="w-3.5 h-3.5 stroke-[2]" />
            Edit Project
          </BaseButton>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <div className={cn("workspace-project-content px-6 md:px-8 pt-6 pb-2", activeTab === 'board' && "flex-1 min-h-0 flex flex-col p-0")}>

        {/* HERO BANNER CARD (High-Torque Cockpit Telemetry Console) */}
        {activeTab !== 'board' && (
          <div className="krama-card p-6 md:p-7 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left Column: Icon + Name + Description + Telemetry */}
              <div className="flex items-start gap-4 md:gap-5">
                <div
                  onClick={() => setEditModalOpen(true)}
                  title="Click to edit project settings (E)"
                  className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-accent-subtle text-accent-fg border border-accent/25 flex items-center justify-center shrink-0 shadow-resting cursor-pointer hover:border-accent/50 hover:bg-accent-subtle/80 active:scale-[0.98] transition-all"
                >
                  {React.createElement(resolveIcon(project.icon || 'FolderKanban'), { className: "w-7 h-7 stroke-[1.75]" })}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-display font-bold text-primary tracking-tight font-sans uppercase">
                      {project.name}
                    </h1>
                    <span className={cn(
                      "font-mono text-badge font-bold px-2 py-0.5 rounded uppercase tracking-wider border",
                      project.status === 'active' ? "bg-accent-subtle text-accent-fg border-accent/30" :
                      project.status === 'shipped' ? "bg-success-bg text-success-fg border-success-border" :
                      project.status === 'completed' ? "bg-success-bg text-success-fg border-success-border" :
                      project.status === 'paused' ? "bg-danger-bg text-danger-fg border-danger-border" :
                      project.status === 'archived' ? "bg-surface-hover text-secondary border-border" :
                      "bg-warning-bg text-warning-fg border-warning-border"
                    )}>
                      {project.status || 'IDEA'}
                    </span>
                  </div>

                  <p className="text-body text-secondary font-sans leading-relaxed max-w-2xl">
                    {project.problemStatement || "Bring the tasks, notes, and milestones for this outcome together."}
                  </p>

                  {/* Telemetry Row */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-caption font-mono text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-accent stroke-[1.75]" />
                      <span className="font-semibold text-primary tabular-nums">{openIssues.length > 0 ? `${openIssues.length} Open` : '0 Open'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success-fg stroke-[2]" />
                      <span className="font-semibold text-primary tabular-nums">{completedIssues.length} Done</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-warning-fg stroke-[1.75]" />
                      <span>{daysSinceUpdate === 0 ? 'Updated today' : <>Updated <strong className="text-primary font-semibold tabular-nums">{daysSinceUpdate}</strong> {daysSinceUpdate === 1 ? 'day' : 'days'} ago</>}</span>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          </div>
        )}

        {/* 3. TABS BAR */}
        <div
          role="tablist"
          aria-label="Project views"
          className={cn("flex items-center gap-2 sm:gap-6 border-b border-border px-1 font-sans", activeTab !== 'board' && "mt-6")}
          onKeyDown={(e) => {
            const tabsList = [
              { id: 'overview', label: 'Overview' },
              { id: 'board', label: 'Board' },
              { id: 'docs', label: 'Docs' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'settings', label: 'Settings' }
            ] as const;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const currentIndex = tabsList.findIndex(t => t.id === activeTab);
              const nextIndex = e.key === 'ArrowRight'
                ? (currentIndex + 1) % tabsList.length
                : (currentIndex - 1 + tabsList.length) % tabsList.length;
              const nextTab = tabsList[nextIndex];
              if (nextTab) {
                setActiveTab(nextTab.id);
                const el = document.getElementById(`project-tab-${nextTab.id}`);
                el?.focus();
              }
            }
          }}
        >
          {([
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: null, shortcut: '1' },
            { id: 'board', label: 'Board', icon: KanbanSquare, count: tasksAvailable ? projectIssues.length : undefined, shortcut: '2' },
            { id: 'docs', label: 'Docs', icon: FileText, count: docsError || docsLoading ? undefined : projectDocs.length, shortcut: '3' },
            { id: 'timeline', label: 'Timeline', icon: Calendar, count: null, shortcut: '4' },
            { id: 'settings', label: 'Settings', icon: Settings, count: null, shortcut: '5' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              id={`project-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`project-tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-3 text-caption font-semibold transition-all cursor-pointer -mb-px relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-t",
                activeTab === tab.id
                  ? "border-b-2 border-accent text-primary font-bold"
                  : "text-secondary hover:text-primary"
              )}
              title={`Switch to ${tab.label} (Press ${tab.shortcut})`}
            >
              <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-accent" : "text-muted")} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-secondary border border-border text-badge font-mono font-medium tabular-nums">
                  {tab.count}
                </span>
              )}

            </button>
          ))}
        </div>

        {/* 4. TAB CONTENTS */}

        {/* OVERVIEW TAB (2-Column Grid) */}
        {!tasksAvailable && ['overview', 'board', 'timeline'].includes(activeTab) && (iLoading ? <LoadingState title="Loading project tasks..." /> : <ErrorState title="Project tasks are unavailable" message="You can still edit the project or use its documents and settings." onRetry={() => { void retryIssues(); }} />)}
        {activeTab === 'overview' && tasksAvailable && (
          <div role="tabpanel" id="project-tabpanel-overview" aria-labelledby="project-tab-overview" tabIndex={0} className="focus:outline-none">
            <ProjectOverview
              project={project}
              projectDocs={projectDocs}
              documentsAvailable={!docsError && !docsLoading}
              projectIssues={projectIssues}
              completedIssues={completedIssues}
              progressPct={progressPct}
              projectGoal={projectGoal}
              riskStatus={riskStatus}
              riskBadgeClass={riskBadgeClass}
              riskMessage={riskMessage}
              handleRunDiagnostic={handleRunDiagnostic}
              isAnalyzing={isAnalyzing}
              setActiveTab={setActiveTab}
              setCreateDirectiveModalOpen={setCreateDirectiveModalOpen}
              statusMenuRef={statusMenuRef}
              statusDropdownOpen={statusDropdownOpen}
              setStatusDropdownOpen={setStatusDropdownOpen}
              handleQuickStatusChange={handleQuickStatusChange}
              projectTags={projectTags}
              tagInputOpen={tagInputOpen}
              handleAddTag={handleAddTag}
              newTagText={newTagText}
              setNewTagText={setNewTagText}
              setTagInputOpen={setTagInputOpen}
              handleRemoveTag={handleRemoveTag}
              urgentIssues={urgentIssues}
            />
          </div>
        )}

        {/* BOARD TAB (Unified Execution Board locked to current project) */}
        {activeTab === 'board' && tasksAvailable && (
          <div role="tabpanel" id="project-tabpanel-board" aria-labelledby="project-tab-board" tabIndex={0} className="flex-1 h-full min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-150 focus:outline-none">
            <KanbanBoard lockedProjectId={project.id} hideHeader={true} />
          </div>
        )}

        {activeTab === 'docs' && (
          <div role="tabpanel" id="project-tabpanel-docs" aria-labelledby="project-tab-docs" tabIndex={0} className="focus:outline-none">
            {docsLoading ? <p role="status">Loading documents...</p> : docsError ? <ErrorState title="Could not load project documents" onRetry={() => { void retryDocs(); }} /> : <ProjectDocuments documents={projectDocs} projectId={project.id} />}
          </div>
        )}

        {activeTab === 'timeline' && tasksAvailable && (
          <div role="tabpanel" id="project-tabpanel-timeline" aria-labelledby="project-tab-timeline" tabIndex={0} className="focus:outline-none">
            <ProjectTimeline projectTargetDate={projectTargetDate} daysRemaining={daysRemaining} projectMilestones={projectMilestones} projectIssues={projectIssues} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div role="tabpanel" id="project-tabpanel-settings" aria-labelledby="project-tab-settings" tabIndex={0} className="max-w-4xl space-y-6 animate-in fade-in duration-150 font-sans mt-6 focus:outline-none">
            <div className="krama-card p-6 space-y-6">
              <div>
                <h3 className="text-section font-bold text-primary">Project Settings & Metadata</h3>
                <p className="text-sm text-secondary leading-relaxed mt-2">Update this project’s details, dates and linked goal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/60 text-caption">
                <div className="p-4 rounded-xl border border-border bg-surface-hover/30 space-y-2">
                  <span className="font-bold text-primary">Edit Scope & Details</span>
                  <p className="text-secondary text-caption leading-relaxed">Modify project name, problem statement, OKR bridge, and target horizon date.</p>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditModalOpen(true)}
                    className="mt-2 text-caption"
                  >
                    Open Settings Editor
                  </BaseButton>
                </div>

                <div className="p-4 rounded-xl border border-danger-border bg-danger-bg/20 space-y-2">
                  <span className="font-bold text-danger-fg">Danger Zone</span>
                  <p className="text-secondary text-caption leading-relaxed">Hide this project and its tasks and milestones. Undo restores the deleted project.</p>
                  <BaseButton
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteModalOpen(true)}
                    className="mt-2 text-caption"
                  >
                    Delete Project
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
