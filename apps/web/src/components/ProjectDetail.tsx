import { ProjectOverview } from './projects/ProjectOverview';
import type { ProjectStatus } from '../types/schema';
import { projectStatus, projectMetadata, errorMessage } from '../lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, Clock, ExternalLink, FileText, Folder, FolderKanban, KanbanSquare, LayoutDashboard, LayoutGrid, MoreHorizontal, Pencil, Search, Settings, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { DeleteInitiativeModal, ProjectEditModal } from './projects/ProjectDialogs';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';
import { LoadingState } from './ui/LoadingState';

import { resolveIcon } from '../lib/iconResolver';
import { IssueCreateModal, KanbanBoard } from './KanbanBoard';
import type { TaskCreateInput } from '../types/schema';

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
      const target = e.target as HTMLElement | null;
      const isEditing = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      if (isEditing || editModalOpen || deleteModalOpen || createDirectiveModalOpen) return;

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
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEditModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editModalOpen, deleteModalOpen, createDirectiveModalOpen]);

  const { data: projects = [], isLoading: pLoading, isError: pError, refetch: retryProjects } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
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
      toast.success('Initiative updated successfully');
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to update initiative'));
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
      toast.success(`Deleted initiative "${project?.name}"`, {
        action: { label: 'Undo', onClick: async () => {
          try {
            await api.projects.restore(deletedProjectId);
            for (const queryKey of [['projects'], ['project', deletedProjectId], ['issues'], ['tasks'], ['planner'], ['goals']]) queryClient.invalidateQueries({ queryKey });
            toast.success('Initiative restored');
          } catch { toast.error('Could not restore initiative'); }
        } },
      });
      navigate('/app/projects');
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to delete initiative'));
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
        description: 'Directive added to initiative backlog.'
      });
    },
    onError: () => {
      toast.error('Failed to create directive');
    }
  });

  if (pLoading || iLoading || docsLoading || goalsLoading || projectLoading) {
    return <LoadingState variant="project-detail" title="Loading Strategic Initiative..." description="Aggregating roadmap milestones, execution tickets, and engineering documentation..." />;
  }

  if (pError || iError || docsError || goalsError || (projectError && ('status' in projectError ? projectError.status : undefined) !== 404)) {
    return (
      <div className="p-8 font-sans">
        <ErrorState
          onRetry={() => { retryProjects(); retryIssues(); retryDocs(); retryGoals(); retryProject(); }}
          title="Failed to Load Initiative Telemetry"
          message="Could not retrieve initiative data from the server. Please verify network connectivity."
        />
      </div>
    );
  }

  if (!project) return (
    <div className="p-12 font-sans">
      <EmptyState icon={FolderKanban} description="Strategic initiative not found in workspace" />
      <div className="mt-6 flex justify-center">
        <BaseButton onClick={() => navigate('/app/projects')}>Return to Initiatives</BaseButton>
      </div>
    </div>
  );

  const projectMilestones = project.milestones || [];
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
  const daysRemaining = projectTargetDate ? Math.ceil((new Date(projectTargetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const isPastDue = daysRemaining !== null && daysRemaining < 0 && progressPct < 100;
  const isApproaching = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && progressPct < 80;
  const hasUrgentBlockers = urgentIssues.length > 0;

  let riskStatus = 'NOMINAL VELOCITY';
  let riskBadgeClass = 'bg-success-bg text-success-fg border-success-border';
  let riskMessage = `Execution velocity is tracking strongly at ${progressPct}%. Milestones and execution deliverables are well balanced.`;

  if (progressPct === 100) {
    riskStatus = 'DELIVERED & COMPLETE';
    riskBadgeClass = 'bg-success-bg text-success-fg border-success-border';
    riskMessage = 'Initiative fully executed (100% completion). All directives shipped.';
  } else if (isPastDue) {
    riskStatus = 'CRITICAL: OVERDUE';
    riskBadgeClass = 'bg-danger-bg text-danger-fg border-danger-border';
    riskMessage = `Target horizon elapsed ${Math.abs(daysRemaining!)} days ago with ${openIssues.length} open tickets remaining. Immediate intervention required.`;
  } else if (isApproaching) {
    riskStatus = 'HIGH RISK: APPROACHING DEADLINE';
    riskBadgeClass = 'bg-warning-bg text-warning-fg border-warning-border';
    riskMessage = `Target delivery date is in ${daysRemaining} days with ${progressPct}% completed. Requires acceleration of ${openIssues.length} remaining tickets.`;
  } else if (hasUrgentBlockers) {
    riskStatus = 'ATTENTION: BLOCKERS DETECTED';
    riskBadgeClass = 'bg-warning-bg text-warning-fg border-warning-border';
    riskMessage = `${urgentIssues.length} high/urgent priority ticket(s) currently open. Focus daily execution on clearing these blockers first.`;
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
    <div className={cn("flex flex-col h-full bg-canvas animate-in fade-in duration-150 font-sans text-primary", activeTab === 'board' ? "overflow-hidden" : "overflow-y-auto pb-24")}>

      {/* MODALS */}
      <ProjectEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={(data) => editProjectMutation.mutate(data)}
        isSubmitting={editProjectMutation.isPending}
        initialData={project}
        goals={goals}
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
            title="Return to Initiatives"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
          </Link>
          <Link to="/app/projects" className="text-secondary hover:text-primary transition-colors text-caption font-semibold uppercase tracking-wider font-mono">
            Initiatives
          </Link>
          <span className="text-muted/60 text-caption">›</span>
          <span className="font-bold text-primary tracking-tight text-body uppercase font-mono">{project.name}</span>
        </div>

        {/* Right: Search, Notifications, More, Edit Initiative */}
        <div className="flex items-center gap-3">
          <div className="relative w-56 sm:w-64 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search initiatives... (press /)"
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
            />
            {searchDropdownOpen && initiativeSearch && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption max-h-48 overflow-y-auto">
                {filteredInitiatives.map((p, idx) => (
                  <div
                    key={p.id}
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
                  <div className="p-3 text-center text-muted font-mono text-caption">No other initiatives match</div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(prev => !prev)}
              className="w-8 h-8 rounded-full border border-border/70 bg-surface-hover/40 hover:bg-surface-hover text-secondary hover:text-primary flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setEditModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-primary cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted" /> Edit Settings (E)
                </button>
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Initiative link copied to clipboard');
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-primary cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted" /> Copy Link
                </button>
                <div className="my-1 border-t border-border/60" />
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setDeleteModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-danger-fg hover:bg-danger-bg flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Initiative
                </button>
              </div>
            )}
          </div>

          <BaseButton
            variant="primary"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="gap-2 text-caption"
            title="Edit Initiative (E)"
          >
            <Pencil className="w-3.5 h-3.5 stroke-[2]" />
            Edit Initiative
          </BaseButton>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <div className={cn("px-6 md:px-8 pt-6 pb-2", activeTab === 'board' && "flex-1 min-h-0 flex flex-col p-0")}>

        {/* HERO BANNER CARD (High-Torque Cockpit Telemetry Console) */}
        {activeTab !== 'board' && (
          <div className="krama-card p-6 md:p-7 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left Column: Icon + Name + Description + Telemetry */}
              <div className="flex items-start gap-4 md:gap-5">
                <div
                  onClick={() => setEditModalOpen(true)}
                  title="Click to edit initiative settings (E)"
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
                    {project.problemStatement || "Central engineering initiative aligning directives, technical scope, and documentation."}
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
                      <LayoutGrid className="w-3.5 h-3.5 text-muted stroke-[1.75]" />
                      <span className="font-semibold text-primary tabular-nums">{projectIssues.length} Issues</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cat-routines stroke-[1.75]" />
                      <span className="font-semibold text-primary tabular-nums">{projectDocs.length} Linked Docs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-warning-fg stroke-[1.75]" />
                      <span>Updated <strong className="text-primary font-semibold tabular-nums">{daysSinceUpdate}</strong> days ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Cockpit Velocity Telemetry Panel */}
              <div className="hidden lg:flex flex-col items-end border-l border-border/70 pl-6 shrink-0 min-w-[240px]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      progressPct === 100 ? "bg-success-fg" :
                      isPastDue ? "bg-danger-fg" :
                      isApproaching || hasUrgentBlockers ? "bg-warning-fg" : "bg-success-fg"
                    )} />
                    <span className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      progressPct === 100 ? "bg-success-fg" :
                      isPastDue ? "bg-danger-fg" :
                      isApproaching || hasUrgentBlockers ? "bg-warning-fg" : "bg-success-fg"
                    )} />
                  </span>
                  <span className={cn(
                    "text-badge font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                    riskBadgeClass
                  )}>
                    {riskStatus}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-primary tabular-nums tracking-tight">
                    {progressPct}%
                  </span>
                  <span className="text-caption font-mono uppercase text-muted font-semibold tracking-wider">
                    Velocity Pace
                  </span>
                </div>

                {/* Telemetry Horizon & Clearance Bar */}
                <div className="w-full mt-2.5">
                  <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border/40">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 ease-out",
                        progressPct === 100 ? "bg-success-fg" :
                        isPastDue ? "bg-danger-fg" :
                        isApproaching ? "bg-warning-fg" : "bg-accent"
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-caption font-mono text-muted mt-1.5">
                    <span className="tabular-nums">{completedIssues.length}/{projectIssues.length} Directives</span>
                    <span className="tabular-nums font-medium text-secondary">
                      {daysRemaining !== null
                        ? daysRemaining < 0
                          ? `${Math.abs(daysRemaining)}d overdue`
                          : `${daysRemaining}d horizon`
                        : 'No horizon set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. TABS BAR */}
        <div className={cn("flex items-center gap-2 sm:gap-6 border-b border-border px-1 font-sans", activeTab !== 'board' && "mt-6")}>
          {([
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: null, shortcut: '1' },
            { id: 'board', label: 'Board', icon: KanbanSquare, count: projectIssues.length, shortcut: '2' },
            { id: 'docs', label: 'Docs', icon: FileText, count: projectDocs.length, shortcut: '3' },
            { id: 'timeline', label: 'Timeline', icon: Calendar, count: null, shortcut: '4' },
            { id: 'settings', label: 'Settings', icon: Settings, count: null, shortcut: '5' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-3 text-caption font-semibold transition-all cursor-pointer -mb-px relative",
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
              <kbd className="hidden md:inline-flex opacity-50 hover:opacity-100 text-badge font-mono ml-1">
                {tab.shortcut}
              </kbd>
            </button>
          ))}
        </div>

        {/* 4. TAB CONTENTS */}

        {/* OVERVIEW TAB (2-Column Grid) */}
        {activeTab === 'overview' && <ProjectOverview
          isPastDue={isPastDue}
          hasUrgentBlockers={hasUrgentBlockers}
          project={project}
          projectDocs={projectDocs}
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
          setEditModalOpen={setEditModalOpen}
          setCreateDirectiveModalOpen={setCreateDirectiveModalOpen}
          statusMenuRef={statusMenuRef}
          statusDropdownOpen={statusDropdownOpen}
          setStatusDropdownOpen={setStatusDropdownOpen}
          handleQuickStatusChange={handleQuickStatusChange}
          daysSinceUpdate={daysSinceUpdate}
          projectTags={projectTags}
          tagInputOpen={tagInputOpen}
          handleAddTag={handleAddTag}
          newTagText={newTagText}
          setNewTagText={setNewTagText}
          setTagInputOpen={setTagInputOpen}
          handleRemoveTag={handleRemoveTag}
          urgentIssues={urgentIssues}
        />}

        {/* BOARD TAB (Unified Execution Board locked to current initiative) */}
        {activeTab === 'board' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-150">
            <KanbanBoard lockedProjectId={project.id} hideHeader={true} />
          </div>
        )}

        {/* DOCS TAB */}
        {activeTab === 'docs' && (
          <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-150 font-sans mt-6">
            {projectDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/app/brain?doc=${doc.id}`)}
                className="krama-card p-6 hover:border-cat-routines transition-all cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-md min-h-[180px] gap-5 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cat-routines opacity-0 group-hover:opacity-100 transition-opacity" />
                <div>
                  <div className="mb-4 group-hover:scale-105 transition-transform w-fit p-2.5 rounded-xl bg-surface-hover border border-border">
                    {React.createElement(resolveIcon(doc.icon), { className: "w-6 h-6 text-cat-routines" })}
                  </div>
                  <div className="font-bold text-title text-primary leading-snug group-hover:text-cat-routines transition-colors">{doc.title}</div>
                </div>
                <div className="pt-3.5 border-t border-border/60 flex items-center justify-between text-caption font-mono text-secondary">
                  <span className="tabular-nums">Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  <span className="text-cat-routines font-bold group-hover:underline flex items-center gap-1">Open Doc <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" /></span>
                </div>
              </div>
            ))}
            {projectDocs.length === 0 && (
              <div className="col-span-full py-16 bg-surface/50 rounded-2xl border border-border border-dashed flex flex-col items-center justify-center gap-3">
                <EmptyState icon={FolderKanban} description="No engineering knowledge documents linked to this initiative" />
                <BaseButton
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/app/brain?projectId=${project.id}`)}
                >
                  Create Document in Brain
                </BaseButton>
              </div>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="max-w-5xl space-y-6 animate-in fade-in duration-150 font-sans mt-6">
            <div className="krama-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-hover text-accent border border-border flex items-center justify-center">
                    <Calendar className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-body font-bold text-primary">Initiative Horizon Timeline</h3>
                    <p className="text-caption text-secondary font-mono">
                      Target deadline: {projectTargetDate ? new Date(projectTargetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No target date set'}
                    </p>
                  </div>
                </div>
                {daysRemaining !== null && (
                  <span className={cn("px-3 py-1 rounded-lg text-badge font-mono font-bold border tabular-nums",
                    daysRemaining < 0 ? "bg-danger-bg text-danger-fg border-danger-border" : "bg-success-bg text-success-fg border-success-border"
                  )}>
                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days remaining`}
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-border/60">
                <h4 className="text-caption font-mono font-bold uppercase text-secondary">Project Milestones ({projectMilestones.length})</h4>
                {projectMilestones.map(milestone => (
                  <div key={milestone.id} className="p-3.5 rounded-xl border border-border bg-surface-hover/30 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-caption font-semibold text-primary">{milestone.title}</span>
                    <span className="text-caption text-secondary">{new Date(milestone.date).toLocaleDateString()} · {milestone.completed ? 'Completed' : 'Upcoming'}</span>
                  </div>
                ))}
                {projectMilestones.length === 0 && <p className="text-caption text-muted py-3">No project milestones yet. Add a milestone in Planner and link it to this project.</p>}
                <h4 className="text-caption font-mono font-bold uppercase text-secondary">Task Deadlines ({projectIssues.length})</h4>
                {projectIssues.map((issue) => (
                  <div key={issue.id} className="p-3.5 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={cn("w-2 h-2 rounded-full",
                        issue.status === "DONE" ? "bg-success-fg" :
                        issue.status === "IN_PROGRESS" ? "bg-accent" : "bg-muted"
                      )} />
                      <span className="text-caption font-semibold text-primary">{issue.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-caption font-mono text-muted tabular-nums">
                      <span>{issue.dueDate ? `Due ${new Date(issue.dueDate).toLocaleDateString()}` : 'No due date'}</span>
                      <span className="uppercase px-2 py-0.5 rounded bg-surface border border-border font-bold text-secondary text-badge">{issue.status}</span>
                    </div>
                  </div>
                ))}
                {projectIssues.length === 0 && (
                  <p className="text-caption text-muted font-mono italic text-center py-6">No directives scheduled for this initiative yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-6 animate-in fade-in duration-150 font-sans mt-6">
            <div className="krama-card p-6 space-y-6">
              <div>
                <h3 className="text-section font-bold text-primary">Initiative Settings & Metadata</h3>
                <p className="text-caption text-secondary font-mono mt-0.5">Manage identity, scope definitions, OKRs, and deletion lifecycle.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/60 text-caption">
                <div className="p-4 rounded-xl border border-border bg-surface-hover/30 space-y-2">
                  <span className="font-bold text-primary">Edit Scope & Details</span>
                  <p className="text-secondary text-caption leading-relaxed">Modify initiative name, problem statement, OKR bridge, and target horizon date.</p>
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
                  <p className="text-secondary text-caption leading-relaxed">Hide this initiative and its tasks and milestones. Undo restores the deleted project.</p>
                  <BaseButton
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteModalOpen(true)}
                    className="mt-2 text-caption"
                  >
                    Delete Initiative
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
