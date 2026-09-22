import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  FolderKanban,
  ArrowLeft,
  CheckCircle2,
  Check,
  Clock,
  Target,
  AlertCircle,
  XCircle,
  ArrowUpCircle,
  FileText,
  Sparkles,
  ArrowRight,
  X,
  Search,
  Bell,
  MoreHorizontal,
  Pencil,
  Plus,
  LayoutDashboard,
  KanbanSquare,
  Calendar,
  Settings,
  Zap,
  Info,
  User,
  Tag,
  ChevronDown,
  CheckSquare,
  LayoutGrid,
  Trash2,
  Folder,
  ExternalLink,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { IconPicker } from './ui/IconPicker';
import { cn } from '../lib/utils';
import { computeGoalPace } from '../lib/goalUtils';
import type { GoalWithRelations } from '../types/schema';

import { resolveIcon } from '../lib/iconResolver';
import { KanbanBoard, IssueCreateModal } from './KanbanBoard';

interface ProjectEditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; problemStatement: string; status: string; targetDate: string; icon?: string | null; goalId?: string | null }) => void;
  isSubmitting: boolean;
  initialData: any;
  goals?: any[];
}

function ProjectEditModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  goals = []
}: ProjectEditModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [problemStatement, setProblemStatement] = useState(initialData?.problemStatement || '');
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [goalId, setGoalId] = useState(initialData?.goalId || '');
  const [targetDate, setTargetDate] = useState(() => {
    if (initialData?.targetDate) return new Date(initialData.targetDate).toISOString().split('T')[0];
    return '';
  });
  const [icon, setIcon] = useState(initialData?.icon || 'FolderKanban');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setProblemStatement(initialData.problemStatement || '');
      setStatus(initialData.status || 'active');
      setGoalId(initialData.goalId || '');
      const tDate = initialData.targetDate || (initialData.metadata as any)?.targetDate;
      setTargetDate(tDate ? new Date(tDate).toISOString().split('T')[0] : '');
      setIcon(initialData.icon || 'FolderKanban');
    }
  }, [initialData]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      problemStatement: problemStatement.trim(),
      status,
      targetDate,
      icon,
      goalId: goalId || null,
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <IconPicker value={icon} onChange={setIcon} />
            <div>
              <h3 className="text-title text-primary mb-1 font-bold">Edit Initiative Settings</h3>
              <p className="text-caption text-secondary font-mono">Configure roadmap alignment and technical scope</p>
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
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Initiative Name <span className="text-danger-fg">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Krama OS Core"
              required
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all bg-surface font-sans"
            />
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Problem Statement / Technical Scope
            </label>
            <textarea
              value={problemStatement}
              onChange={e => setProblemStatement(e.target.value)}
              placeholder="Describe the objective, architectural constraints, and target outcomes..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none bg-surface font-sans"
            />
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Strategic OKR / Linked Goal
            </label>
            <select
              value={goalId}
              onChange={e => setGoalId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans cursor-pointer"
            >
              <option value="">None (Standalone Initiative)</option>
              {goals.map((g: any) => (
                <option key={g.id} value={g.id}>
                  🎯 {g.title} ({g.type?.toUpperCase() || 'OKR'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold cursor-pointer"
              >
                <option value="idea">💡 Idea / Discovery</option>
                <option value="active">⚡ Active Execution</option>
                <option value="paused">⏸️ Paused</option>
                <option value="shipped">🚀 Shipped / Live</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Initiative'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteInitiativeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  initiativeName: string;
}

function DeleteInitiativeModal({
  open,
  onClose,
  onConfirm,
  isDeleting,
  initiativeName
}: DeleteInitiativeModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border-strong rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden text-left p-6 space-y-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-danger-bg text-danger-fg border border-danger-border flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-section font-bold text-primary">Delete Initiative?</h3>
            <p className="text-caption text-secondary leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-primary font-mono font-bold">"{initiativeName}"</strong>? This will remove the initiative roadmap, dissociate linked directives, and cannot be undone.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end gap-2.5">
          <BaseButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </BaseButton>
          <BaseButton
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
          >
            Delete Initiative
          </BaseButton>
        </div>
      </div>
    </div>
  );
}

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

  const { data: projects = [], isLoading: pLoading, isError: pError } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading, isError: iError } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const { data: pages = [], isLoading: docsLoading } = useQuery({ queryKey: ['documents'], queryFn: api.documents.list });
  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });

  const project = projects.find(p => p.id === id);

  const editProjectMutation = useMutation({
    mutationFn: (data: { name: string; problemStatement: string; status: string; targetDate: string; icon?: string | null; goalId?: string | null; tags?: string[] }) => {
      if (!project) throw new Error('Project not loaded');
      return api.projects.update(project.id, {
        name: data.name,
        problemStatement: data.problemStatement,
        status: data.status,
        icon: data.icon,
        goalId: data.goalId || null,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        version: project.version,
        metadata: {
          ...((project.metadata as any) || {}),
          tags: data.tags !== undefined ? data.tags : ((project.metadata as any)?.tags || [])
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setEditModalOpen(false);
      toast.success('Initiative updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update initiative');
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => {
      if (!project) throw new Error('Project not loaded');
      return api.projects.delete(project.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteModalOpen(false);
      toast.success(`Deleted initiative "${project?.name}"`);
      navigate('/app/projects');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete initiative');
    }
  });

  const createDirectiveMutation = useMutation({
    mutationFn: (data: { title: string; description: string; status: any; priority: any; estimateMinutes?: number; blockedById?: string | null; projectId?: string; sprintId?: string | null }) =>
      api.tasks.create({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        estimateMinutes: data.estimateMinutes,
        assignee: 'me',
        projectId: project?.id,
        sprintId: data.sprintId || null,
        labels: [],
        blockedById: data.blockedById
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCreateDirectiveModalOpen(false);
      toast.success(`Created "${newIssue?.title || 'Directive'}"`, {
        description: 'Directive added to initiative backlog.'
      });
    },
    onError: () => {
      toast.error('Failed to create directive');
    }
  });

  if (pLoading || iLoading || docsLoading || goalsLoading) {
    return <LoadingState variant="project-detail" title="Loading Strategic Initiative..." description="Aggregating roadmap milestones, sprint tickets, and engineering documentation..." />;
  }

  if (pError || iError) {
    return (
      <div className="p-8 font-sans">
        <ErrorState
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

  const projectIssues = project.tasks || issues.filter(i => i.projectId === project.id);
  const projectDocs = pages.filter(p => p.linkedProjectId === project.id || p.projectId === project.id);
  const projectGoal = project.goal || (project.goalId ? goals.find(g => g.id === project.goalId) : null);

  const completedIssues = projectIssues.filter((i: any) => i.status === "DONE" || i.status === "REVIEW");
  const openIssues = projectIssues.filter((i: any) => i.status !== "DONE" && i.status !== "REVIEW");
  const progressPct = projectIssues.length > 0 ? Math.round((completedIssues.length / projectIssues.length) * 100) : 0;

  // Calculate days since last update
  const daysSinceUpdate = Math.max(0, Math.floor((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24)));

  // Real risk and deadline telemetry
  const urgentIssues = openIssues.filter((i: any) => i.priority === "URGENT" || i.priority === "HIGH");
  const projectTargetDate = project.targetDate || (project.metadata as any)?.targetDate;
  const daysRemaining = projectTargetDate ? Math.ceil((new Date(projectTargetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const isPastDue = daysRemaining !== null && daysRemaining < 0 && progressPct < 100;
  const isApproaching = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && progressPct < 80;
  const hasUrgentBlockers = urgentIssues.length > 0;

  let riskStatus = 'NOMINAL VELOCITY';
  let riskBadgeClass = 'bg-success-bg text-success-fg border-success-border';
  let riskMessage = `Execution velocity is tracking strongly at ${progressPct}%. Milestones and sprint deliverables are well balanced.`;

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
    riskMessage = `${urgentIssues.length} high/urgent priority ticket(s) currently open. Focus daily sprints on clearing these blockers first.`;
  } else if (projectIssues.length === 0) {
    riskStatus = 'SCOPE DEFINITION PHASE';
    riskBadgeClass = 'bg-accent-subtle text-accent-fg border-accent/20';
    riskMessage = 'No execution tickets created yet. Add tickets to Kanban or link Sprint directives to establish tracking.';
  }

  const handleRunDiagnostic = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      toast.success('AI Strategic Diagnostic Complete', {
        description: `Evaluated ${projectIssues.length} tickets and timeline. ${hasUrgentBlockers
            ? `Immediate priority: resolve "${urgentIssues[0].title}".`
            : progressPct === 100
              ? 'All milestone directives delivered. No blockers detected.'
              : 'Sprint velocity is on target. Maintain current ticket burn rate.'
          }`
      });
    }, 600);
  };

  const handleQuickStatusChange = (newStatus: string) => {
    setStatusDropdownOpen(false);
    editProjectMutation.mutate({
      name: project.name,
      problemStatement: project.problemStatement || '',
      status: newStatus,
      targetDate: project.targetDate ? new Date(project.targetDate).toISOString() : '',
      icon: project.icon,
      goalId: project.goalId || null,
      tags: (project.metadata as any)?.tags || []
    });
  };

  const projectTags: string[] = ((project.metadata as any)?.tags as string[]) || [];

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagText.trim()) return;
    const tag = newTagText.trim().toLowerCase();
    if (!projectTags.includes(tag)) {
      const updated = [...projectTags, tag];
      editProjectMutation.mutate({
        name: project.name,
        problemStatement: project.problemStatement || '',
        status: project.status,
        targetDate: project.targetDate ? new Date(project.targetDate).toISOString() : '',
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
      status: project.status,
      targetDate: project.targetDate ? new Date(project.targetDate).toISOString() : '',
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
        sprints={[]}
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

          <button
            onClick={() => navigate('/app/notifications')}
            className="w-8 h-8 rounded-full border border-border/70 bg-surface-hover/40 hover:bg-surface-hover text-secondary hover:text-primary flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

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
                      project.status === 'paused' ? "bg-danger-bg text-danger-fg border-danger-border" :
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
                      progressPct === 100 ? "bg-emerald-400" :
                      isPastDue ? "bg-rose-400" :
                      isApproaching || hasUrgentBlockers ? "bg-amber-400" : "bg-emerald-400"
                    )} />
                    <span className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      progressPct === 100 ? "bg-emerald-500" :
                      isPastDue ? "bg-rose-500" :
                      isApproaching || hasUrgentBlockers ? "bg-amber-500" : "bg-emerald-500"
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
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: null, shortcut: '1' },
            { id: 'board', label: 'Board', icon: KanbanSquare, count: projectIssues.length, shortcut: '2' },
            { id: 'docs', label: 'Docs', icon: FileText, count: projectDocs.length, shortcut: '3' },
            { id: 'timeline', label: 'Timeline', icon: Calendar, count: null, shortcut: '4' },
            { id: 'settings', label: 'Settings', icon: Settings, count: null, shortcut: '5' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

            {/* LEFT COLUMN (Wide 8-cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* CARD 1: AI Strategic Risk Sentinel Card */}
              <div className="krama-card p-5 border-emerald-500/25 dark:border-emerald-500/20 bg-emerald-500/[0.04] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-body font-bold text-primary flex flex-wrap items-center gap-2">
                      AI Strategic Risk Sentinel
                      <span className={cn("px-2 py-0.5 rounded text-badge font-mono font-bold uppercase border tracking-wider", riskBadgeClass)}>
                        {riskStatus}
                      </span>
                    </h3>
                    <p className="text-caption text-secondary font-sans mt-1 leading-relaxed max-w-xl">
                      {riskMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                  <BaseButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRunDiagnostic}
                    disabled={isAnalyzing}
                    className="gap-1.5 text-caption font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    {isAnalyzing ? 'Analyzing...' : 'Run AI Diagnostic'}
                  </BaseButton>
                  <BaseButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('board')}
                    className="gap-1.5 text-caption font-semibold"
                  >
                    Launch Kanban →
                  </BaseButton>
                </div>
              </div>

              {/* CARD 2: Problem Statement & Technical Scope */}
              <div className="krama-card p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface-hover text-accent border border-border flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <h3 className="text-body font-bold text-primary">
                      Problem Statement & Technical Scope
                    </h3>
                  </div>

                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditModalOpen(true)}
                    className="gap-1.5 text-caption"
                  >
                    <Pencil className="w-3 h-3 stroke-[2]" />
                    Edit
                  </BaseButton>
                </div>

                <p className="text-body text-secondary font-sans mt-3.5 leading-relaxed">
                  {project.problemStatement || "Central engineering initiative aligning directives, technical scope, and documentation."}
                </p>
              </div>

              {/* SUBGRID: Linked Knowledge Docs & Active Execution Tickets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Subcard A: Linked Knowledge Docs */}
                <div className="krama-card p-5 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-surface-hover text-cat-routines border border-border flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 stroke-[1.75]" />
                        </div>
                        <h4 className="text-body font-bold text-primary">Linked Knowledge Docs</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('docs')}
                        className="text-badge font-mono font-bold uppercase text-accent hover:underline cursor-pointer flex items-center gap-1"
                      >
                        VIEW ALL →
                      </button>
                    </div>

                    <div className="py-5">
                      {projectDocs.length === 0 ? (
                        <div className="text-center py-3">
                          <FileText className="w-8 h-8 text-muted stroke-[1.25] mx-auto mb-2 opacity-50" />
                          <h5 className="text-caption font-bold text-primary mb-1">No linked engineering knowledge documents</h5>
                          <p className="text-caption text-muted max-w-[240px] mx-auto leading-relaxed">
                            Link architecture docs, specs, or research here to keep everyone aligned.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectDocs.slice(0, 3).map((doc: any) => (
                            <div
                              key={doc.id}
                              onClick={() => navigate(`/app/brain?doc=${doc.id}`)}
                              className="p-2.5 rounded-xl hover:bg-surface-hover flex items-center gap-2.5 transition-colors cursor-pointer group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-surface-hover border border-border flex items-center justify-center shrink-0">
                                {React.createElement(resolveIcon(doc.icon), { className: "w-3.5 h-3.5 text-cat-routines" })}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-caption font-semibold text-primary truncate group-hover:text-accent transition-colors">{doc.title}</p>
                                <p className="text-badge font-mono text-muted tabular-nums">{new Date(doc.updatedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/app/brain?projectId=${project.id}`)}
                    className="w-full text-caption gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Link or Create Document
                  </BaseButton>
                </div>

                {/* Subcard B: Active Execution Tickets */}
                <div className="krama-card p-5 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-surface-hover text-success-fg border border-border flex items-center justify-center shrink-0">
                          <CheckSquare className="w-3.5 h-3.5 stroke-[1.75]" />
                        </div>
                        <h4 className="text-body font-bold text-primary">Active Execution Tickets</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('board')}
                        className="text-badge font-mono font-bold uppercase text-accent hover:underline cursor-pointer flex items-center gap-1"
                      >
                        VIEW ALL →
                      </button>
                    </div>

                    <div className="py-5">
                      {projectIssues.length === 0 ? (
                        <div className="text-center py-3">
                          <LayoutGrid className="w-8 h-8 text-muted stroke-[1.25] mx-auto mb-2 opacity-50" />
                          <h5 className="text-caption font-bold text-primary mb-1">No open execution tickets in initiative</h5>
                          <p className="text-caption text-muted max-w-[240px] mx-auto leading-relaxed">
                            Create tickets in Kanban or link Sprint directives to start tracking progress.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectIssues.slice(0, 3).map((issue: any) => (
                            <div
                              key={issue.id}
                              onClick={() => setActiveTab('board')}
                              className="p-2.5 rounded-xl hover:bg-surface-hover flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                            >
                              <span className="text-caption font-semibold text-primary truncate group-hover:text-accent transition-colors">{issue.title}</span>
                              <span className="text-badge font-mono font-bold px-2 py-0.5 rounded border border-border bg-surface-hover text-secondary uppercase shrink-0 tabular-nums">
                                {issue.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setCreateDirectiveModalOpen(true)}
                    className="w-full text-caption gap-1.5"
                    title="Create directive ticket (C)"
                  >
                    <Plus className="w-3 h-3" /> New Execution Ticket (C)
                  </BaseButton>
                </div>
              </div>

              {/* CARD 4: Delivered Milestones & Completed Directives */}
              <div className="krama-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-success-bg text-success-fg border border-success-border flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <h4 className="text-body font-bold text-primary">
                      Delivered Milestones & Completed Directives ({completedIssues.length})
                    </h4>
                  </div>
                  <span className="text-caption font-mono text-muted font-medium tabular-nums">
                    {progressPct}% Completed
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden mt-3 border border-border">
                  <div
                    className="h-full bg-success-fg transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {completedIssues.length > 0 && (
                  <div className="mt-4 divide-y divide-border/60">
                    {completedIssues.slice(0, 3).map((issue: any) => (
                      <div key={issue.id} className="py-2.5 flex items-center justify-between text-caption">
                        <span className="text-muted line-through truncate font-medium">{issue.title}</span>
                        <span className="text-badge font-mono text-success-fg font-bold bg-success-bg px-2 py-0.5 rounded border border-success-border tabular-nums">
                          Shipped
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OPTIONAL LINKED OKR BRIDGE */}
              {projectGoal && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-caption font-mono font-bold uppercase tracking-wider text-secondary">Strategic Goal Bridge (Linked OKR)</h3>
                  <CompactGoalCard goal={projectGoal} />
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (Sidebar 4-cols) */}
            <div className="lg:col-span-4 space-y-6">

              {/* SIDEBAR CARD 1: Quick Actions */}
              <div className="krama-card p-5 space-y-3">
                <div className="flex items-center gap-2 pb-1 text-primary">
                  <Zap className="w-4 h-4 text-accent stroke-[2]" />
                  <h3 className="text-body font-bold text-primary">Quick Actions</h3>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setCreateDirectiveModalOpen(true)}
                    className="w-full py-2 px-3.5 rounded-xl bg-surface-hover hover:bg-surface-hover/80 text-caption font-semibold text-primary flex items-center justify-start gap-2.5 border border-border transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5] text-accent" />
                    Create Execution Ticket
                    <kbd className="ml-auto text-badge font-mono opacity-50">C</kbd>
                  </button>

                  <button
                    onClick={() => navigate(`/app/brain?projectId=${project.id}`)}
                    className="w-full py-2 px-3.5 rounded-xl bg-surface-hover hover:bg-surface-hover/80 text-caption font-semibold text-primary flex items-center justify-start gap-2.5 border border-border transition-colors shadow-2xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 stroke-[1.75] text-cat-routines" />
                    Link Knowledge Doc
                  </button>

                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="w-full py-2 px-3.5 rounded-xl bg-surface-hover hover:bg-surface-hover/80 text-caption font-semibold text-primary flex items-center justify-start gap-2.5 border border-border transition-colors shadow-2xs cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5 stroke-[1.75] text-warning-fg" />
                    Set Milestone & Target
                    <kbd className="ml-auto text-badge font-mono opacity-50">E</kbd>
                  </button>
                </div>
              </div>

              {/* SIDEBAR CARD 2: Project Details */}
              <div className="krama-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Info className="w-4 h-4 text-accent stroke-[2]" />
                  <h3 className="text-body font-bold text-primary">Project Details</h3>
                </div>

                <div className="space-y-3.5 text-caption">
                  {/* Status row */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-secondary font-medium">
                      <Settings className="w-3.5 h-3.5 text-muted" />
                      Status
                    </span>

                    <div className="relative" ref={statusMenuRef}>
                      <button
                        onClick={() => setStatusDropdownOpen(prev => !prev)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-subtle text-accent-fg border border-accent/20 font-medium text-caption font-mono hover:bg-accent-subtle/80 transition-colors cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="capitalize">{project.status || 'Open'}</span>
                        <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
                      </button>

                      {statusDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption font-mono animate-in fade-in zoom-in-95 duration-100">
                          {['idea', 'active', 'paused', 'shipped'].map(st => (
                            <button
                              key={st}
                              onClick={() => handleQuickStatusChange(st)}
                              className="w-full px-3 py-1.5 text-left capitalize hover:bg-surface-hover flex items-center justify-between text-primary cursor-pointer text-caption"
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                  st === 'active' ? "bg-accent" :
                                  st === 'idea' ? "bg-warning-fg" :
                                  st === 'paused' ? "bg-danger-fg" : "bg-success-fg"
                                )} />
                                {st}
                              </div>
                              {project.status === st && (
                                <Check className="w-3.5 h-3.5 text-accent" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phase row */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-secondary font-medium">
                      <Folder className="w-3.5 h-3.5 text-muted" />
                      Phase
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-surface-hover text-secondary text-badge font-medium font-mono uppercase tabular-nums">
                      {project.status === 'active' ? 'Execution' : project.status || 'Idea'}
                    </span>
                  </div>

                  {/* Created row */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-secondary font-medium">
                      <Clock className="w-3.5 h-3.5 text-muted" />
                      Created
                    </span>
                    <span className="text-secondary font-mono text-caption tabular-nums">
                      {project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>

                  {/* Last Updated row */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-secondary font-medium">
                      <Clock className="w-3.5 h-3.5 text-muted" />
                      Last Updated
                    </span>
                    <span className="text-secondary font-mono text-caption tabular-nums">
                      {daysSinceUpdate} days ago
                    </span>
                  </div>

                  {/* Owner row */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-secondary font-medium">
                      <User className="w-3.5 h-3.5 text-muted" />
                      Owner
                    </span>
                    <span className="text-secondary font-mono text-caption">
                      Workspace Lead
                    </span>
                  </div>

                  {/* Tags row */}
                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="flex items-center gap-2 text-secondary font-medium pt-1">
                      <Tag className="w-3.5 h-3.5 text-muted" />
                      Tags
                    </span>

                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {projectTags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-surface-hover border border-border text-badge font-mono text-secondary flex items-center gap-1">
                          #{t}
                          <button onClick={() => handleRemoveTag(t)} className="hover:text-danger-fg cursor-pointer text-muted hover:text-danger-fg">×</button>
                        </span>
                      ))}

                      {tagInputOpen ? (
                        <form onSubmit={handleAddTag} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newTagText}
                            onChange={e => setNewTagText(e.target.value)}
                            placeholder="tag..."
                            autoFocus
                            className="w-20 px-2 py-0.5 text-badge font-mono bg-surface border border-accent rounded focus:outline-none text-primary"
                          />
                          <button type="submit" className="px-1.5 py-0.5 bg-accent text-on-accent rounded text-badge font-bold cursor-pointer" title="Add tag">✓</button>
                          <button type="button" onClick={() => { setTagInputOpen(false); setNewTagText(''); }} className="px-1 py-0.5 text-muted hover:text-primary rounded text-badge cursor-pointer" title="Cancel">✕</button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setTagInputOpen(true)}
                          className="px-2.5 py-1 rounded-lg border border-border/80 bg-surface-hover/50 hover:bg-surface-hover text-secondary hover:text-primary text-caption font-medium transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add tag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SIDEBAR CARD 3: Initiative Cadence & Velocity Monitor (Replaces Decorative Quote) */}
              <div className="krama-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Activity className="w-4 h-4 text-accent stroke-[2]" />
                    <h4 className="text-caption font-bold uppercase tracking-wider font-mono text-primary">
                      Cadence & Velocity
                    </h4>
                  </div>
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    progressPct === 100 ? "bg-emerald-500" :
                    isPastDue ? "bg-rose-500" :
                    hasUrgentBlockers ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-caption font-mono">
                  <div className="p-2 rounded-lg bg-surface-hover/60 border border-border/60">
                    <span className="text-muted block text-badge uppercase font-semibold">Clearance</span>
                    <span className="text-primary font-bold text-caption tabular-nums">
                      {progressPct}% ({completedIssues.length}/{projectIssues.length})
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-hover/60 border border-border/60">
                    <span className="text-muted block text-badge uppercase font-semibold">Blockers</span>
                    <span className={cn("font-bold text-caption tabular-nums", urgentIssues.length > 0 ? "text-warning-fg" : "text-success-fg")}>
                      {urgentIssues.length} High/Urgent
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-border/60 flex items-center justify-between text-caption font-mono text-muted">
                  <span>Telemetry Sync</span>
                  <span className="text-secondary font-medium tabular-nums">{daysSinceUpdate}d ago</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* BOARD TAB (Unified Execution Board locked to current initiative) */}
        {activeTab === 'board' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-150">
            <KanbanBoard lockedProjectId={project.id} hideHeader={true} />
          </div>
        )}

        {/* DOCS TAB */}
        {activeTab === 'docs' && (
          <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-150 font-sans mt-6">
            {projectDocs.map((doc: any) => (
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
                <h4 className="text-caption font-mono font-bold uppercase text-secondary">Milestone Directives ({projectIssues.length})</h4>
                {projectIssues.map((issue: any) => (
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
                  <p className="text-secondary text-caption leading-relaxed">Permanently remove this initiative and unassign associated execution tickets.</p>
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

// Strategic Goal Card Reused for Overview Tab
function CompactGoalCard({ goal }: { goal: GoalWithRelations }) {
  const navigate = useNavigate();
  const pace = computeGoalPace(goal);

  return (
    <div
      onClick={() => navigate('/app/goals')}
      className="krama-card border-success-border p-6 hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden group font-sans"
    >
      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-success-fg" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 pl-2">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-badge font-mono font-bold uppercase tracking-widest text-on-accent bg-success-fg px-2.5 py-0.5 rounded-md shadow-2xs">
              {goal.type} • STRATEGIC OKR
            </span>
            <h3 className="text-title text-primary mb-2 font-bold">{goal.title}</h3>
          </div>
          {goal.targetDate && (
            <div className="flex items-center gap-1.5 text-caption font-mono text-secondary font-bold tabular-nums">
              <Clock className="w-3.5 h-3.5 text-success-fg stroke-[1.5]" />
              Target Horizon: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className="text-right font-mono">
          <span className="text-3xl font-bold text-success-fg tabular-nums">{goal.progress}%</span>
          <span className="block text-caption text-secondary font-bold uppercase tracking-wider">OKR Progress</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border mb-4">
        <div
          className="h-full bg-success-fg transition-all duration-700 ease-out"
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      {/* Pace Telemetry Panel */}
      <div className="bg-surface-hover/80 border border-border rounded-xl p-3.5 flex flex-wrap gap-x-6 gap-y-2 items-center font-mono text-caption">
        <div className="flex items-center gap-1.5 font-bold">
          {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-danger-fg stroke-[1.5]" /> :
            pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-warning-fg stroke-[1.5]" /> :
              pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-success-fg stroke-[1.5]" /> :
                <CheckCircle2 className="w-4 h-4 text-success-fg stroke-[1.5]" />}
          <span className={cn("uppercase tracking-widest text-badge font-bold",
            ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-danger-fg" : "text-success-fg"
          )}>
            {pace.badge}
          </span>
        </div>

        <div className="flex items-center gap-4 text-secondary tabular-nums">
          <span>Req Pace: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(2)}%/day</span>
          <span>Actual: <strong className="text-primary font-bold">{pace.actualPace.toFixed(2)}%/day</strong></span>
        </div>

        <div className="text-badge uppercase tracking-wider font-bold text-primary ml-auto tabular-nums">
          {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
            <span className="text-danger-fg">Stalled — Intervention Required</span>
          ) : pace.projectedDate ? (
            <span>Est. Completion: {pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
