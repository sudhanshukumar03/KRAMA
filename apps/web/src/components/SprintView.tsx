import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Clock, Play, Pause, CheckCircle2, CircleDashed, Check, 
  ChevronRight, ArrowRight, Plus, MoreVertical, Search, Bell, 
  ChevronDown, Folder, Trash2, Edit2, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { IssueCreateModal, IssueEditModal } from './KanbanBoard';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { BaseButton } from './ui/BaseButton';
import type { IssueWithRelations, TaskStatus, TaskPriority } from '../types/schema';

export function SprintView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Queries
  const { data: sprints = [], isLoading: sprintsLoading, isError: sprintsError } = useQuery({ 
    queryKey: ['sprints'], 
    queryFn: api.sprints.list 
  });
  const { data: issues = [], isLoading: issuesLoading, isError: issuesError } = useQuery({ 
    queryKey: ['issues'], 
    queryFn: api.tasks.list 
  });
  const { data: projects = [] } = useQuery({ 
    queryKey: ['projects'], 
    queryFn: api.projects.list 
  });

  // Active Sprint
  const activeSprint = useMemo(() => {
    return sprints.find(s => s.status === 'active') || sprints[0] || null;
  }, [sprints]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskStatus>('TODO');
  const [editingIssue, setEditingIssue] = useState<IssueWithRelations | null>(null);
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);
  const [editSprintModalOpen, setEditSprintModalOpen] = useState(false);
  const sprintMenuRef = useRef<HTMLDivElement>(null);

  // Edit Sprint Form State
  const [editSprintName, setEditSprintName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  useEffect(() => {
    if (activeSprint) {
      setEditSprintName(activeSprint.name);
      try {
        setEditStartDate(activeSprint.startDate ? new Date(activeSprint.startDate).toISOString().substring(0, 10) : '');
        setEditEndDate(activeSprint.endDate ? new Date(activeSprint.endDate).toISOString().substring(0, 10) : '');
      } catch {
        setEditStartDate('');
        setEditEndDate('');
      }
    }
  }, [activeSprint]);

  // Click outside sprint menu
  useEffect(() => {
    if (!sprintMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sprintMenuRef.current && !sprintMenuRef.current.contains(e.target as Node)) {
        setSprintMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sprintMenuOpen]);

  // Mutations
  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IssueWithRelations> & { blockedById?: string | null } }) =>
      api.tasks.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setEditingIssue(null);
      toast.success(`Updated "${updated?.title || 'Directive'}"`);
    },
    onError: () => toast.error('Failed to update directive')
  });

  const createIssueMutation = useMutation({
    mutationFn: (data: any) =>
      api.tasks.create({
        ...data,
        assignee: 'me',
        sprintId: activeSprint?.id || null,
        labels: []
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      setCreateModalOpen(false);
      toast.success(`Created "${newIssue?.title || 'Directive'}" in sprint`);
    },
    onError: () => toast.error('Failed to create directive')
  });

  const handleDeleteIssue = async (issue: IssueWithRelations) => {
    try {
      await api.tasks.delete(issue.id);
      queryClient.setQueryData<IssueWithRelations[]>(['issues'], old => old?.filter(i => i.id !== issue.id));
      toast.success(`Deleted "${issue.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.tasks.restore(issue.id);
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            toast.success(`Restored "${issue.title}"`);
          }
        },
        duration: 5000,
      });
    } catch {
      toast.error('Failed to delete directive');
    }
  };

  // Quick 1-click status toggle between IN_PROGRESS and DONE
  const handleToggleComplete = async (issue: IssueWithRelations) => {
    const isDone = issue.status === 'DONE';
    const nextStatus = isDone ? 'IN_PROGRESS' : 'DONE';
    try {
      await api.tasks.update(issue.id, { status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success(isDone ? `Reopened "${issue.title}"` : `Marked "${issue.title}" as Done!`);
    } catch {
      toast.error('Failed to update directive status');
    }
  };

  // Start or create sprint
  const handleStartSprint = async () => {
    try {
      if (projects.length === 0) {
        toast.error('No project found. Create a project first!');
        return;
      }
      const now = new Date();
      const end = new Date(now.getTime() + 14 * 86400000);
      const startMonth = format(now, 'MMM d');
      const endMonth = format(end, 'MMM d');
      await api.sprints.create({
        name: `Sprint ${startMonth} – ${endMonth}`,
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        status: 'active',
        projectId: projects[0].id,
        goals: 'Focused execution cycle for strategic engineering milestones.'
      });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Started new 14-day sprint!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start sprint');
    }
  };

  // Pause / Resume sprint
  const handleToggleSprintPause = async () => {
    if (!activeSprint) return;
    try {
      const newStatus = activeSprint.status === 'active' ? 'planning' : 'active';
      await api.sprints.update(activeSprint.id, {
        version: activeSprint.version,
        status: newStatus
      });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success(newStatus === 'active' ? 'Sprint resumed' : 'Sprint paused');
      setSprintMenuOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update sprint status');
    }
  };

  // Complete sprint
  const handleCompleteSprint = async () => {
    if (!activeSprint) return;
    try {
      await api.sprints.update(activeSprint.id, {
        version: activeSprint.version,
        status: 'completed'
      });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success(`Completed sprint "${activeSprint.name}"`);
      setSprintMenuOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete sprint');
    }
  };

  // Update Sprint metadata (name & dates)
  const handleSaveSprintDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSprint) return;
    try {
      await api.sprints.update(activeSprint.id, {
        version: activeSprint.version,
        name: editSprintName.trim() || activeSprint.name,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : activeSprint.startDate,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : activeSprint.endDate,
      });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      setEditSprintModalOpen(false);
      toast.success('Sprint settings updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update sprint');
    }
  };

  // Delete Sprint
  const handleDeleteSprint = async () => {
    if (!activeSprint) return;
    if (!window.confirm(`Are you sure you want to archive "${activeSprint.name}"?`)) return;
    try {
      await api.sprints.delete(activeSprint.id);
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint archived');
      setSprintMenuOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete sprint');
    }
  };

  // Sprint Date Calculations
  const sprintDates = useMemo(() => {
    const startDate = activeSprint ? new Date(activeSprint.startDate) : new Date();
    const endDate = activeSprint ? new Date(activeSprint.endDate) : new Date(Date.now() + 14 * 86400000);
    const now = new Date();

    const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24)));
    const elapsedDays = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
    const dayOfSprint = Math.min(totalDays, elapsedDays + 1);

    const formattedStart = format(startDate, 'MMM d');
    const formattedEnd = format(endDate, 'MMM d');
    const label = `Sprint ${formattedStart} – ${formattedEnd}`;

    return {
      startDate,
      endDate,
      totalDays,
      daysRemaining,
      dayOfSprint,
      label
    };
  }, [activeSprint]);

  // Sprint Directives Filter & Grouping
  const sprintDirectives = useMemo(() => {
    if (!activeSprint) return [];
    // Only tasks assigned to the active sprint
    const assigned = issues.filter(i => i.sprintId === activeSprint.id && !i.parentTaskId);
    // If no tasks have sprintId set yet, fallback to active tasks if only 1 sprint exists to prevent empty UI
    if (assigned.length === 0 && sprints.length === 1 && issues.length > 0) {
      return issues.filter(i => !i.parentTaskId);
    }
    return assigned;
  }, [issues, activeSprint, sprints]);

  // 1. Current Focus: IN_PROGRESS or REVIEW
  const currentFocusDirectives = useMemo(() => {
    return sprintDirectives.filter(i => i.status === 'IN_PROGRESS' || i.status === 'REVIEW');
  }, [sprintDirectives]);

  // 2. Up Next: TODO or BACKLOG
  const upNextDirectives = useMemo(() => {
    return sprintDirectives.filter(i => i.status === 'BACKLOG' || i.status === 'TODO');
  }, [sprintDirectives]);

  // 3. Completed: DONE
  const completedDirectives = useMemo(() => {
    return sprintDirectives.filter(i => i.status === 'DONE');
  }, [sprintDirectives]);

  // Progress Percentage based strictly on work completion
  const totalCount = sprintDirectives.length;
  const doneCount = completedDirectives.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (sprintsLoading || issuesLoading) {
    return <LoadingState variant="kanban" title="Loading Sprint Execution..." description="Aligning sprint directives and milestones..." />;
  }

  if (sprintsError || issuesError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Sprint Execution"
          message="Could not retrieve sprint data from the server."
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
            queryClient.invalidateQueries({ queryKey: ['issues'] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0 w-full bg-canvas select-none overflow-hidden animate-in fade-in duration-150">
      {/* 1. Top Header */}
      <div className="border-b border-border/70 px-6 py-2.5 flex items-center justify-between shrink-0 bg-surface/60 backdrop-blur-md">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/app')}>Execution</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted/70" />
          <span className="text-primary font-semibold">Sprint</span>
        </div>

        {/* Right: Quick Search, Notifications, User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-cmdk'))}
            className="flex items-center gap-2 bg-surface-hover/80 hover:bg-surface-hover border border-border/80 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition-all cursor-pointer shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search anything...</span>
            <kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-secondary">Ctrl K</kbd>
          </button>

          <button
            title="Notifications"
            className="relative p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover border border-transparent hover:border-border/80 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-surface" />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-border/70 cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'SP'}
            </div>
            <span className="text-xs font-semibold text-primary group-hover:text-accent transition-colors">
              {user?.name || 'Sudhanshu'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
        {/* 2. SPRINT HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Icon + Title + Tag + Subtitle */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-xl font-bold text-primary tracking-tight">
                  Sprint Execution
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
                  {sprintDates.label}
                </span>
              </div>
              <p className="text-xs text-secondary font-normal">
                Focused execution cycle for strategic engineering milestones.
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {activeSprint?.status === 'active' ? (
              <BaseButton
                onClick={handleToggleSprintPause}
                variant="secondary"
                className="flex items-center gap-2 text-xs font-semibold py-2 px-4 cursor-pointer shadow-2xs"
              >
                <Pause className="w-3.5 h-3.5 stroke-[2.5]" />
                Pause Sprint
              </BaseButton>
            ) : (
              <BaseButton
                onClick={activeSprint ? handleToggleSprintPause : handleStartSprint}
                variant="primary"
                className="flex items-center gap-2 text-xs font-semibold py-2 px-4 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current stroke-[1.5]" />
                {activeSprint?.status === 'planning' ? 'Resume Sprint' : 'Start Sprint'}
              </BaseButton>
            )}

            {/* Three-Dot Menu */}
            <div ref={sprintMenuRef} className="relative">
              <button
                onClick={() => setSprintMenuOpen(prev => !prev)}
                title="Sprint options"
                className="p-2 rounded-xl bg-surface border border-border/80 text-secondary hover:text-primary hover:bg-surface-hover transition-colors shadow-2xs cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {sprintMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  {activeSprint && (
                    <>
                      <button
                        onClick={() => {
                          setEditSprintModalOpen(true);
                          setSprintMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-muted" /> Edit Sprint
                      </button>
                      <button
                        onClick={handleCompleteSprint}
                        className="w-full px-3.5 py-2 text-left text-emerald-600 dark:text-emerald-400 hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Complete Sprint
                      </button>
                      <div className="border-t border-border/60 my-1" />
                      <button
                        onClick={handleDeleteSprint}
                        className="w-full px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" /> Archive Sprint
                      </button>
                    </>
                  )}
                  {!activeSprint && (
                    <button
                      onClick={() => {
                        handleStartSprint();
                        setSprintMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-accent" /> Initialize Sprint
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. SPRINT PROGRESS CARD */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs transition-all">
          {/* Top Row: Badge | Day & Remaining | Percentage Complete */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider border shadow-2xs",
                activeSprint?.status === 'active'
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-surface-hover text-secondary border-border/80"
              )}>
                {activeSprint?.status === 'active' ? 'ACTIVE SPRINT' : (activeSprint?.status ? activeSprint.status.toUpperCase() : 'PLANNING')}
              </span>
              <span className="font-mono text-secondary font-medium">
                Day {sprintDates.dayOfSprint} of {sprintDates.totalDays} ({sprintDates.daysRemaining} days remaining)
              </span>
            </div>
            <div className="font-mono font-bold text-sm text-primary">
              {progressPct}% <span className="text-xs font-normal text-secondary">complete</span>
            </div>
          </div>

          {/* Progress Bar Track & Fill */}
          <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden border border-border/40 my-3.5">
            <div 
              className="h-full bg-accent transition-all duration-500 ease-out rounded-full" 
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Bottom Row: Directives Count | Days Remaining */}
          <div className="flex items-center justify-between text-xs font-mono text-secondary">
            <span className="font-medium">
              <strong className="text-primary">{doneCount}</strong> / {totalCount} directives
            </span>
            <span>
              {sprintDates.daysRemaining} days remaining
            </span>
          </div>
        </div>

        {/* 4. SPRINT WORK SECTION */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-primary tracking-tight">
                Sprint Work
              </h2>
              <p className="text-xs text-secondary">
                Directives planned for this sprint.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setCreateInitialStatus('TODO');
                  setCreateModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-primary transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
                Add Directive
              </button>

              <button
                onClick={() => navigate('/app/board')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border/80 bg-surface hover:bg-surface-hover text-xs font-semibold text-accent transition-all shadow-2xs cursor-pointer"
              >
                <span>View Board</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* If No Directives At All in Sprint */}
          {totalCount === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-surface/40 my-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-sm text-primary mb-1">No directives in this sprint yet.</h3>
              <p className="text-xs text-secondary max-w-sm mb-4">
                Add work to start planning this sprint and track progress against sprint milestones.
              </p>
              <BaseButton
                onClick={() => {
                  setCreateInitialStatus('TODO');
                  setCreateModalOpen(true);
                }}
                variant="primary"
                className="flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" /> Add Directive
              </BaseButton>
            </div>
          ) : (
            /* Three Sprint Work Columns */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {/* Column 1: CURRENT FOCUS */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.02] p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <CircleDashed className="w-4 h-4 text-amber-500 stroke-[2.5] animate-spin-slow" />
                    <div>
                      <h3 className="font-bold text-xs text-primary">Current Focus</h3>
                      <p className="text-[10px] text-secondary">Actively being worked on</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {currentFocusDirectives.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentFocusDirectives.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted border border-dashed border-border/60 rounded-xl bg-surface/30">
                      No active focus directives.
                    </div>
                  ) : (
                    currentFocusDirectives.map(issue => (
                      <SprintTaskCard
                        key={issue.id}
                        issue={issue}
                        onClick={() => setEditingIssue(issue)}
                        onDelete={() => handleDeleteIssue(issue)}
                        onToggleComplete={() => handleToggleComplete(issue)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: UP NEXT */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.03] dark:bg-purple-500/[0.02] p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500 stroke-[2]" />
                    <div>
                      <h3 className="font-bold text-xs text-primary">Up Next</h3>
                      <p className="text-[10px] text-secondary">In backlog for this sprint</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                    {upNextDirectives.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {upNextDirectives.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted border border-dashed border-border/60 rounded-xl bg-surface/30">
                      No queued directives in sprint backlog.
                    </div>
                  ) : (
                    upNextDirectives.map(issue => (
                      <SprintTaskCard
                        key={issue.id}
                        issue={issue}
                        onClick={() => setEditingIssue(issue)}
                        onDelete={() => handleDeleteIssue(issue)}
                        onToggleComplete={() => handleToggleComplete(issue)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: COMPLETED */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[2]" />
                    <div>
                      <h3 className="font-bold text-xs text-primary">Completed</h3>
                      <p className="text-[10px] text-secondary">Finished in this sprint</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {completedDirectives.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {completedDirectives.length === 0 ? (
                    /* Subtle Empty State matching design */
                    <div className="py-10 px-4 text-center flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface/40 my-1">
                      <div className="w-8 h-8 rounded-full bg-surface border border-border/80 flex items-center justify-center text-muted mb-2.5 shadow-2xs">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <h4 className="font-semibold text-xs text-primary mb-1">No completed directives yet.</h4>
                      <p className="text-[11px] text-muted max-w-[200px] leading-relaxed">
                        Completed work will appear here as you finish tasks in this sprint.
                      </p>
                    </div>
                  ) : (
                    /* Compact Completed Cards */
                    completedDirectives.map(issue => (
                      <div
                        key={issue.id}
                        onClick={() => setEditingIssue(issue)}
                        className="p-3 rounded-xl bg-surface border border-border/80 shadow-2xs hover:border-accent/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComplete(issue);
                            }}
                            title="Click to reopen (move back to Current Focus)"
                            className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-500 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="text-xs font-medium text-secondary line-through group-hover:text-primary truncate transition-colors">
                            {issue.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-muted shrink-0">
                          {formatDueDate(issue.updatedAt || issue.dueDate)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Directive Modal */}
      {editingIssue && (
        <IssueEditModal
          open={Boolean(editingIssue)}
          issue={editingIssue}
          allIssues={issues}
          onClose={() => setEditingIssue(null)}
          onSubmit={(id, data) => updateIssueMutation.mutate({ id, data })}
          isSubmitting={updateIssueMutation.isPending}
        />
      )}

      {/* Create Directive Modal */}
      {createModalOpen && (
        <IssueCreateModal
          open={createModalOpen}
          initialStatus={createInitialStatus}
          allIssues={issues}
          projects={projects}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={(data) => createIssueMutation.mutate(data)}
          isSubmitting={createIssueMutation.isPending}
        />
      )}

      {/* Edit Sprint Settings Modal */}
      {editSprintModalOpen && activeSprint && (
        <div 
          onClick={() => setEditSprintModalOpen(false)}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="v4-card w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-hover/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-sm text-primary">Edit Sprint Settings</h3>
              </div>
              <button onClick={() => setEditSprintModalOpen(false)} className="text-secondary hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSprintDetails} className="p-5 space-y-4">
              <div>
                <label className="block text-caption font-mono uppercase text-muted mb-1 font-medium">Sprint Name</label>
                <input
                  type="text"
                  required
                  value={editSprintName}
                  onChange={e => setEditSprintName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-mono uppercase text-muted mb-1 font-medium">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-caption font-mono uppercase text-muted mb-1 font-medium">End Date</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={e => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-hover border border-border rounded-lg text-primary focus:outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setEditSprintModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-secondary hover:text-primary rounded-lg border border-border"
                >
                  Cancel
                </button>
                <BaseButton type="submit" variant="primary" className="text-xs py-1.5 px-4">
                  Save Changes
                </BaseButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact Sprint Task Card matching reference design
function SprintTaskCard({
  issue,
  onClick,
  onDelete,
  onToggleComplete
}: {
  issue: IssueWithRelations;
  onClick: () => void;
  onDelete: () => void;
  onToggleComplete?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const formattedDate = formatDueDate(issue.dueDate || issue.scheduledDate);

  return (
    <div
      onClick={onClick}
      className="p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs hover:shadow-md hover:border-accent/40 transition-all duration-150 cursor-pointer group relative flex flex-col gap-2 w-full box-border"
    >
      {/* Top Line: Quick Complete Toggle + Priority Badge + Three-Dot Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleComplete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete();
              }}
              title="Mark as Done"
              className="w-4 h-4 rounded-full border-2 border-border/80 hover:border-emerald-500 hover:bg-emerald-500/15 text-transparent hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          )}
          {getPriorityBadge(issue.priority)}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Three-Dot Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(prev => !prev);
              }}
              title="Directive options"
              className="p-1 rounded text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div 
                onClick={e => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                {onToggleComplete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleComplete();
                    }}
                    className="w-full px-3 py-1.5 text-left text-emerald-600 dark:text-emerald-400 hover:bg-surface-hover flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Mark as Done
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onClick();
                  }}
                  className="w-full px-3 py-1.5 text-left text-primary hover:bg-surface-hover flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-muted" /> Edit
                </button>
                <div className="border-t border-border/60 my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-surface-hover flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-red-500" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div 
        className="font-bold text-sm text-primary group-hover:text-accent transition-colors leading-snug tracking-tight min-w-0"
        style={{ overflowWrap: 'anywhere' }}
      >
        {issue.title}
      </div>

      {/* Description Preview */}
      {issue.description && (
        <p 
          className="text-xs text-secondary line-clamp-2 leading-relaxed min-w-0"
          style={{ overflowWrap: 'anywhere' }}
        >
          {issue.description}
        </p>
      )}

      {/* Bottom Metadata: Project Folder + Assignee Avatar + Due Date */}
      <div className="flex items-center justify-between text-xs text-secondary font-mono pt-1.5 border-t border-border/40">
        <div className="flex items-center gap-1 min-w-0">
          <Folder className="w-3 h-3 shrink-0 text-muted" />
          <span className="truncate max-w-[110px] text-[11px]">
            {issue.project?.name || 'General'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div 
            title={issue.assignee?.name || 'Unassigned'}
            className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-[10px] font-bold shadow-2xs"
          >
            {issue.assignee?.name ? issue.assignee.name.substring(0, 2).toUpperCase() : 'SP'}
          </div>

          {formattedDate ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted font-medium">
              <Clock className="w-3 h-3 text-muted" />
              {formattedDate}
            </span>
          ) : issue.estimateMinutes ? (
            <span className="inline-flex items-center gap-1 text-[10px] bg-surface-hover px-1.5 py-0.5 rounded-md border border-border/80 text-primary font-bold">
              <Clock className="w-2.5 h-2.5 text-muted" />
              {issue.estimateMinutes}h
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Helpers
function formatDueDate(date?: string | Date | null) {
  if (!date) return null;
  try {
    return format(new Date(date), 'MMM d');
  } catch {
    return null;
  }
}

function getPriorityBadge(priority: TaskPriority) {
  switch (priority) {
    case 'URGENT':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          URGENT
        </span>
      );
    case 'HIGH':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          MEDIUM
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          LOW
        </span>
      );
  }
}
