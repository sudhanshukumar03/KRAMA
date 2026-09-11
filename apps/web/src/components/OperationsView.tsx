import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap, Clock, Plus, Search, Bell,
  ChevronDown, Trash2, Edit2, Check, ArrowRight,
  Calendar, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { IssueCreateModal, IssueEditModal } from './KanbanBoard';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { BaseButton } from './ui/BaseButton';
import type { IssueWithRelations, TaskStatus, TaskPriority } from '../types/schema';

export function OperationsView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueWithRelations | null>(null);

  // Fetch issues, projects, sprints
  const { data: issues = [], isLoading: issuesLoading, isError: issuesError } = useQuery({
    queryKey: ['issues'],
    queryFn: api.tasks.list
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list
  });
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints'],
    queryFn: api.sprints.list
  });

  // Filter only operations tasks (tasks without a project)
  const operationsTasks = useMemo(() => {
    return issues.filter(i => !i.projectId && !i.parentTaskId);
  }, [issues]);

  const activeTasks = useMemo(() => {
    return operationsTasks.filter(i => i.status !== 'DONE');
  }, [operationsTasks]);

  const completedTasks = useMemo(() => {
    return operationsTasks.filter(i => i.status === 'DONE');
  }, [operationsTasks]);

  // Filtered by search & priority
  const filteredTasks = useMemo(() => {
    const list = activeTab === 'active' ? activeTasks : completedTasks;
    return list.filter(item => {
      const matchesSearch = !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [activeTab, activeTasks, completedTasks, searchQuery, priorityFilter]);

  // Telemetry stats
  const totalCount = operationsTasks.length;
  const completedCount = completedTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalEstimatedHours = useMemo(() => {
    return operationsTasks.reduce((acc, curr) => acc + (curr.estimateMinutes ? curr.estimateMinutes / 60 : 0), 0);
  }, [operationsTasks]);

  // Mutations
  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IssueWithRelations> }) =>
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
        projectId: null, // Always unassigned to project for operations
        labels: []
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setCreateModalOpen(false);
      toast.success(`Created operational directive "${newIssue?.title || 'Directive'}"`);
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

  const handleToggleComplete = async (issue: IssueWithRelations) => {
    const isDone = issue.status === 'DONE';
    const nextStatus: TaskStatus = isDone ? 'IN_PROGRESS' : 'DONE';
    try {
      await api.tasks.update(issue.id, { status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success(isDone ? `Reopened "${issue.title}"` : `Completed "${issue.title}"!`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (issuesLoading) {
    return <LoadingState variant="kanban" title="Loading Operations & Tasks..." description="Gathering workspace maintenance and ad-hoc directives..." />;
  }

  if (issuesError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to Load Operations"
          message="Could not retrieve operational directives from the server."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['issues'] })}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0 w-full bg-canvas select-none overflow-hidden animate-in fade-in duration-150 font-sans">
      {/* 1. Top Header */}
      <div className="border-b border-border/70 px-6 py-2.5 flex items-center justify-between shrink-0 bg-surface/60 backdrop-blur-md">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/app')}>Execution</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted/70" />
          <span className="text-primary font-semibold">Operations & Tasks</span>
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
            <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
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
        {/* 2. Page Title Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs">
              <Zap className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl font-bold text-primary tracking-tight">
                  Operations & Tasks
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                  {activeTasks.length} Active / {completedTasks.length} Shipped
                </span>
              </div>
              <p className="text-xs text-secondary font-normal">
                Dedicated workspace for non-project work, system maintenance, ad-hoc chores, and routine engineering tasks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <BaseButton
              onClick={() => setCreateModalOpen(true)}
              variant="primary"
              className="flex items-center gap-2 text-xs font-semibold py-2 px-4 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              New Operational Directive
            </BaseButton>

            <button
              onClick={() => navigate('/app/board')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-secondary hover:text-primary transition-all shadow-2xs cursor-pointer"
            >
              <span>Board View</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* 3. Operational Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
            <div className="text-xs font-mono font-medium text-secondary mb-1">Active Directives</div>
            <div className="text-2xl font-bold text-primary font-mono">{activeTasks.length}</div>
            <div className="text-[11px] text-muted mt-1 font-mono">Needs execution</div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
            <div className="text-xs font-mono font-medium text-secondary mb-1">Completed / Shipped</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{completedCount}</div>
            <div className="text-[11px] text-muted mt-1 font-mono">{progressPct}% completion rate</div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
            <div className="text-xs font-mono font-medium text-secondary mb-1">Est. Effort Required</div>
            <div className="text-2xl font-bold text-primary font-mono">{totalEstimatedHours.toFixed(1)}h</div>
            <div className="text-[11px] text-muted mt-1 font-mono">Cumulative bandwidth</div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
            <div className="text-xs font-mono font-medium text-secondary mb-1">Project Isolation</div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-1">100% Clean</div>
            <div className="text-[11px] text-muted mt-1">Keeps product roadmaps focused</div>
          </div>
        </div>

        {/* 4. Controls & Tabs Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-hover/80 border border-border/80 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('active')}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                activeTab === 'active'
                  ? "bg-surface text-primary shadow-xs"
                  : "text-secondary hover:text-primary"
              )}
            >
              Active Operations ({activeTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                activeTab === 'completed'
                  ? "bg-surface text-primary shadow-xs"
                  : "text-secondary hover:text-primary"
              )}
            >
              Completed Archive ({completedTasks.length})
            </button>
          </div>

          {/* Search & Priority Filters */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter operations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-primary focus:outline-none focus:border-accent shadow-2xs"
              />
            </div>

            <div className="relative">
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs"
              >
                <option value="all">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 5. Directives List */}
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-surface/40 my-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-sm text-primary mb-1">
                {activeTab === 'active' ? 'No active operational tasks' : 'No completed operational tasks'}
              </h3>
              <p className="text-xs text-secondary max-w-sm mb-4">
                {activeTab === 'active'
                  ? 'All maintenance chores, quick fixes, and non-project tasks are complete!'
                  : 'Completed tasks outside projects will archive here to celebrate your operational momentum.'}
              </p>
              {activeTab === 'active' && (
                <BaseButton
                  onClick={() => setCreateModalOpen(true)}
                  variant="primary"
                  className="flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2]" /> Add Operational Task
                </BaseButton>
              )}
            </div>
          ) : (
            filteredTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setEditingIssue(task)}
                className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4"
              >
                {/* Left: Complete Checkbox + Title + Description */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(task);
                    }}
                    title={task.status === 'DONE' ? 'Reopen task' : 'Mark as Done'}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
                      task.status === 'DONE'
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-border/80 hover:border-emerald-500 hover:bg-emerald-500/15 text-transparent hover:text-emerald-600"
                    )}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getPriorityBadge(task.priority)}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border",
                        task.status === 'DONE'
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-surface-hover text-secondary border-border"
                      )}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.sprint && (
                        <span className="text-[10px] font-mono text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border/60">
                          {task.sprint.name}
                        </span>
                      )}
                    </div>
                    <div className={cn(
                      "font-semibold text-sm text-primary group-hover:text-accent transition-colors truncate",
                      task.status === 'DONE' && "line-through text-secondary"
                    )}>
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-xs text-secondary line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Estimate + Date + Actions */}
                <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-secondary">
                  {task.estimateMinutes ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-surface-hover px-2 py-0.5 rounded border border-border text-primary font-medium">
                      <Clock className="w-3 h-3 text-muted" />
                      {task.estimateMinutes}h
                    </span>
                  ) : null}

                  {task.dueDate ? (
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted" />
                      {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted">
                      {format(new Date(task.updatedAt), 'MMM d')}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIssue(task);
                      }}
                      className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                      title="Edit directive"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIssue(task);
                      }}
                      className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete directive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {createModalOpen && (
        <IssueCreateModal
          open={createModalOpen}
          initialStatus="BACKLOG"
          allIssues={issues}
          projects={projects}
          sprints={sprints}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={(data) => createIssueMutation.mutate(data)}
          isSubmitting={createIssueMutation.isPending}
        />
      )}

      {editingIssue && (
        <IssueEditModal
          open={Boolean(editingIssue)}
          issue={editingIssue}
          allIssues={issues}
          projects={projects}
          sprints={sprints}
          onClose={() => setEditingIssue(null)}
          onSubmit={(id, data) => updateIssueMutation.mutate({ id, data })}
          isSubmitting={updateIssueMutation.isPending}
        />
      )}
    </div>
  );
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
