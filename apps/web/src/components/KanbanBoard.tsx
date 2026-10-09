import type { TaskUpdateInput } from '../types/schema';
import type {
    CollisionDetection,
    DragEndEvent,
    DragStartEvent
} from '@dnd-kit/core';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCorners,
    pointerWithin,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Archive,
    Calendar,
    ChevronDown,
    Clock,
    KanbanSquare,
    LayoutGrid, List,
    Plus,
    Search,
    X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api/client';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { cn, parseLocalDate } from '../lib/utils';
import type { IssueWithRelations, TaskPriority, TaskStatus } from '../types/schema';
import { CANCELED_COLUMN, STATUS_COLUMNS, STATUS_IDS, taskDay } from './kanban/boardConfig';
import { Column, PriorityBadge } from './kanban/BoardPrimitives';
import { IssueCreateModal } from './kanban/IssueCreateModal';
import { IssueEditModal } from './kanban/IssueEditModal';
import { ErrorState } from './ui/ErrorState';
import { LoadingState } from './ui/LoadingState';
import { PageHeader } from './ui/PageHeader';

export interface KanbanBoardProps {
  initialProjectId?: string;
  lockedProjectId?: string;
  hideHeader?: boolean;
}

export function KanbanBoard({
  initialProjectId,
  lockedProjectId,
  hideHeader = false,
}: KanbanBoardProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProject = searchParams.get('project') || searchParams.get('projectId');
  const effectiveInitialProject = lockedProjectId || initialProjectId || urlProject || 'all';

  const queryClient = useQueryClient();
  const { data: activeIssues = [], isLoading: isLoadingIssues, isError } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  // CANCELED tasks are excluded from the default /tasks response server-side, so
  // fetch them under a sub-key. invalidateQueries(['issues']) prefix-matches this
  // key too, so the archive stays in sync without extra invalidations.
  const { data: canceledIssues = [], isError: archiveError, isLoading: archiveLoading, refetch: retryArchive } = useQuery({ queryKey: ['issues', 'canceled'], queryFn: () => api.tasks.list({ status: 'CANCELED' }) });
  const issues = useMemo(() => [...activeIssues, ...canceledIssues], [activeIssues, canceledIssues]);
  const { data: projects = [], isError: projectsError, refetch: retryProjects } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  const [activeIssue, setActiveIssue] = useState<IssueWithRelations | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'list' | 'calendar'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | "URGENT" | "HIGH" | "MEDIUM" | "LOW">('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(effectiveInitialProject);
  const [sortBy, setSortBy] = useState<'manual' | 'priority' | 'date' | 'title'>('manual');
  const [showCanceledArchive, setShowCanceledArchive] = useState(false);

  const canceledCount = useMemo(() => issues.filter(i => i.status === "CANCELED").length, [issues]);
  const visibleColumns = useMemo(() => showCanceledArchive ? [...STATUS_COLUMNS, CANCELED_COLUMN] : STATUS_COLUMNS, [showCanceledArchive]);

  useEffect(() => {
    if (lockedProjectId) {
      setSelectedProjectId(lockedProjectId);
    } else if (urlProject) {
      setSelectedProjectId(urlProject);
    }
  }, [lockedProjectId, urlProject]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("BACKLOG");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueWithRelations | null>(null);

  const createIssueMutation = useMutation({
    mutationFn: (data: { title: string; description: string; status: TaskStatus; priority: TaskPriority; estimateMinutes?: number; blockedById?: string | null; projectId?: string; dueDate?: string | null; scheduledDate?: string | null }) =>
      api.tasks.create({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        estimateMinutes: data.estimateMinutes,
        projectId: lockedProjectId || data.projectId || null,
        blockedById: data.blockedById, dueDate: data.dueDate, scheduledDate: data.scheduledDate
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setCreateModalOpen(false);
      toast.success(`Created "${newIssue?.title || 'Directive'}"`, {
        description: `Added to ${(newIssue?.status || createStatus).replace('_', ' ')}.`
      });
    },
    onError: () => {
      toast.error('Failed to create directive');
    }
  });

  const updateIssueDetailMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdateInput }) =>
      api.tasks.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setEditModalOpen(false);
      setEditingIssue(null);
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true });
      toast.success(`Updated "${updated?.title || 'Directive'}"`);
    },
    onError: () => {
      toast.error('Failed to update directive details');
    }
  });

  const handleCreateIssue = useCallback((status: TaskStatus = "BACKLOG") => {
    createIssueMutation.reset();
    setCreateStatus(status);
    setCreateModalOpen(true);
  }, [createIssueMutation]);

  const isDraggingRef = useRef(false);

  const handleEditIssue = useCallback((issue: IssueWithRelations) => {
    if (isDraggingRef.current) return;
    updateIssueDetailMutation.reset();
    setEditingIssue(issue);
    setEditModalOpen(true);
  }, [updateIssueDetailMutation]);

  const requestedTaskId = searchParams.get('task');
  const openedTaskId = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedTaskId) { openedTaskId.current = null; return; }
    if (openedTaskId.current === requestedTaskId || isLoadingIssues || archiveLoading) return;
    const requested = issues.find(issue => issue.id === requestedTaskId);
    if (!requested && (isError || archiveError)) return;
    openedTaskId.current = requestedTaskId;
    if (requested) handleEditIssue(requested);
    else toast.error('This task is unavailable in this workspace.');
  }, [requestedTaskId, issues, isLoadingIssues, archiveLoading, isError, archiveError, handleEditIssue]);

  const handleDeleteIssue = useCallback(async (issue: IssueWithRelations) => {
    try {
      await api.tasks.delete(issue.id);
      // Remove from both the active list and the canceled archive cache so an
      // archived directive disappears immediately too (exact keys don't prefix-match).
      const removeFromCache = (key: readonly unknown[]) =>
        queryClient.setQueryData<IssueWithRelations[]>(key, old => old?.filter(i => i.id !== issue.id));
      removeFromCache(['issues']);
      removeFromCache(['issues', 'canceled']);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(`Deleted "${issue.title}"`, {
        description: 'Directive removed.',
        action: {
          label: 'Undo',
          onClick: async () => {
            try { await api.tasks.restore(issue.id);
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
            toast.success(`Restored "${issue.title}"`); } catch { toast.error("Could not restore directive. Please try again."); }
          }
        },
        duration: 5000,
      });
    } catch {
      toast.error("Failed to delete directive");
    }
  }, [queryClient]);

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: TaskUpdateInput }) => api.tasks.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] });
      const previousIssues = queryClient.getQueryData<IssueWithRelations[]>(['issues']);
      queryClient.setQueryData<IssueWithRelations[]>(['issues'], old =>
        old?.map(issue => issue.id === id ? { ...issue, ...data } : issue)
      );
      const previousCanceled = queryClient.getQueryData<IssueWithRelations[]>(["issues", "canceled"]);
      queryClient.setQueryData<IssueWithRelations[]>(["issues", "canceled"], old => old?.map(issue => issue.id === id ? { ...issue, ...data } : issue));
      return { previousIssues, previousCanceled };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['issues'], context?.previousIssues);
      queryClient.setQueryData(['issues', 'canceled'], context?.previousCanceled);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reducedMotion = useReducedMotion();

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (issue.parentTaskId && issues.some(parent => parent.id === issue.parentTaskId)) return false;
      // Keep canceled directives out of every view (board columns, list, calendar)
      // unless the archive toggle is on — matches the board's column visibility.
      if (issue.status === 'CANCELED' && !showCanceledArchive) return false;
      const q = searchQuery.toLowerCase().trim();
      const directiveCode = `kr-${issue.id.replace(/[^a-zA-Z0-9]/g, '').slice(-3).toLowerCase()}`;
      const matchesSearch = q === '' || 
        issue.title.toLowerCase().includes(q) || 
        directiveCode.includes(q) ||
        (issue.description && issue.description.toLowerCase().includes(q));
      const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
      const matchesProject = selectedProjectId === 'all' || (selectedProjectId === 'operations' ? !issue.projectId : issue.projectId === selectedProjectId);

      return matchesSearch && matchesPriority && matchesProject;
    }).sort((a, b) => {
      if (sortBy === 'manual') return a.position - b.position || a.id.localeCompare(b.id);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'date') {
        const dateA = a.dueDate ? Date.parse(taskDay(a.dueDate)) : Number.POSITIVE_INFINITY;
        const dateB = b.dueDate ? Date.parse(taskDay(b.dueDate)) : Number.POSITIVE_INFINITY;
        return dateA - dateB;
      }
      // Default: priority sort
      const priorityWeights: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return a.position - b.position;
    });
  }, [issues, searchQuery, priorityFilter, selectedProjectId, sortBy, showCanceledArchive]);

  const moveRelative = (issue: IssueWithRelations, direction: number) => {
    const siblings = filteredIssues.filter(item => item.status === issue.status); const from = siblings.findIndex(item => item.id === issue.id); const target = from + direction;
    if (target < 0 || target >= siblings.length || updateIssueMutation.isPending) return;
    const rest = siblings.filter(item => item.id !== issue.id); const before = rest[target - 1]; const after = rest[target];
    const position = before && after ? (before.position + after.position) / 2 : before ? before.position + 1000 : after.position - 1000;
    updateIssueMutation.mutate({ id: issue.id, data: { position, version: issue.version } }, { onError: () => toast.error('Could not reorder directive. The board has been refreshed.') });
  };

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const issueCollision = pointerCollisions.find(
        c => c.id !== args.active.id && !STATUS_IDS.includes(c.id as string)
      );
      if (issueCollision) {
        return [issueCollision];
      }
      const columnCollision = pointerCollisions.find(
        c => STATUS_IDS.includes(c.id as string)
      );
      if (columnCollision) {
        return [columnCollision];
      }
      return pointerCollisions;
    }
    return closestCorners(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    const { active } = event;
    setActiveIssue(issues.find(i => i.id === active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    const { active, over } = event;
    if (!over || updateIssueMutation.isPending) return;

    if (sortBy !== 'manual') { toast.info('Choose Manual order to arrange directives.'); return; }
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIssueData = issues.find(i => i.id === activeId);
    if (!activeIssueData) return;

    let newStatus = activeIssueData.status;
    const overIssueData = issues.find(i => i.id === overId);

    if (STATUS_IDS.includes(overId)) {
      newStatus = overId as TaskStatus;
    } else if (overIssueData) {
      newStatus = overIssueData.status as TaskStatus;
    }

    let newPosition = activeIssueData.position;

    if (activeId !== overId) {
      const statusIssues = issues
        .filter(i => !i.parentTaskId && i.status === newStatus)
        .sort((a, b) => a.position - b.position);

      if (STATUS_IDS.includes(overId)) {
        // Dropped on empty space or column header
        const otherIssues = statusIssues.filter(i => i.id !== activeId);
        const lastCard = otherIssues[otherIssues.length - 1];
        newPosition = (lastCard?.position ?? 0) + 1000;
      } else {
        const filtered = statusIssues.filter(i => i.id !== activeId);
        let insertIndex = filtered.findIndex(i => i.id === overId);

        if (insertIndex === -1) {
          const lastCard = filtered[filtered.length - 1];
          newPosition = (lastCard?.position ?? 0) + 1000;
        } else {
          const activeIndex = statusIssues.findIndex(i => i.id === activeId);
          if (activeIssueData.status === newStatus && activeIndex !== -1 && activeIndex < insertIndex) {
            insertIndex += 1;
          }

          if (insertIndex === 0) {
            const firstCard = filtered[0];
            newPosition = firstCard ? (firstCard.position > 0 ? firstCard.position / 2 : firstCard.position - 500) : 1000;
          } else if (insertIndex >= filtered.length) {
            const lastCard = filtered[filtered.length - 1];
            newPosition = (lastCard?.position ?? 0) + 1000;
          } else {
            const aboveCard = filtered[insertIndex - 1];
            const belowCard = filtered[insertIndex];
            newPosition = ((aboveCard?.position ?? 0) + (belowCard?.position ?? (aboveCard?.position ?? 0) + 1000)) / 2;
            if (newPosition === aboveCard?.position || newPosition === belowCard?.position) {
              newPosition = (aboveCard?.position ?? 0) + 1;
            }
          }
        }
      }
    }

    if (activeIssueData.status !== newStatus || activeIssueData.position !== newPosition) {
      // onMutate applies the optimistic move (and captures rollback state before it),
      // onSettled re-syncs from the server — no manual cache writes needed here.
      updateIssueMutation.mutate(
        { id: activeId, data: { status: newStatus, position: newPosition, version: activeIssueData.version } },
        { onError: () => toast.error('Failed to move directive') }
      );
    }
  };

  const columnIssuesMap = useMemo(() => {
    const map: Record<string, IssueWithRelations[]> = {};
    for (const col of [...STATUS_COLUMNS, CANCELED_COLUMN]) map[col.id] = [];
    for (const issue of filteredIssues) {
      (map[issue.status] ??= []).push(issue);
    }
    return map;
  }, [filteredIssues]);

  if (isLoadingIssues) return <LoadingState variant="kanban" title="Loading Execution Board..." description="Organizing directives and dependencies..." />;
  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Execution Board"
          message="Could not fetch directives from the server. Please verify your connection."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['issues'] })}
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col min-w-0 w-full bg-canvas select-none overflow-hidden animate-in fade-in duration-150">
      {/* Page Header */}
      {!hideHeader && (
        <PageHeader
          icon={KanbanSquare}
          title="Execution Board"
          description="Organize work, move tasks through each stage, and keep dependencies visible."
          className="mx-6 mt-4 mb-2"
        >
          {/* View Switcher */}
          <div className="flex items-center bg-surface-hover/80 p-0.5 rounded-lg border border-border/80 shadow-2xs">
            {(['board', 'list', 'calendar'] as const).map((view) => {
              const icons = { board: LayoutGrid, list: List, calendar: Calendar };
              const labels = { board: 'Board', list: 'List', calendar: 'Calendar' };
              const V = icons[view];
              return (
                <button
                  key={view}
                  aria-pressed={activeView === view} onClick={() => setActiveView(view)}
                  className={cn(
                    'min-h-11 px-2.5 py-1 rounded-md flex items-center gap-1.5 text-badge font-mono font-semibold transition-all cursor-pointer',
                    activeView === view
                      ? 'bg-surface text-primary shadow-2xs'
                      : 'text-secondary hover:text-primary',
                  )}
                >
                  <V className="w-3.5 h-3.5" /> {labels[view]}
                </button>
              );
            })}
          </div>

          {/* New Directive */}
          <button
            onClick={() => handleCreateIssue('BACKLOG')}
            className="krama-btn krama-btn-primary px-3.5 py-2 text-caption font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Directive
          </button>
        </PageHeader>
      )}

      {/* 3. Filter Bar */}
      <div className={cn("px-6 pb-3 shrink-0", hideHeader ? "pt-3" : "pt-1")}>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border/60 rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative min-w-0 max-w-sm flex-1 basis-full sm:basis-auto">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search directives" placeholder="Search tasks, directives, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-surface border border-border/80 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-muted text-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors cursor-pointer"
                aria-label="Clear search" title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* All Projects Dropdown */}
          {!lockedProjectId && (
            <div className="relative">
              <select
                aria-label="Filter by project" value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
              >
                <option value="all">All Projects</option>
                <option value="operations">⚡ General Operations</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>📁 {p.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}


          {/* All Priorities Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by priority" value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
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

        {/* Right Sort Dropdown & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort Priority */}
          <div className="relative">
            <select
              aria-label="Sort directives" value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-surface border border-border/80 rounded-lg text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer shadow-2xs transition-colors"
            >
              <option value="manual">Manual order</option>
              <option value="priority">Sort Priority</option>
              <option value="date">Sort Due Date</option>
              <option value="title">Sort Title</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Toggle Canceled Archive */}
          <button
            type="button"
            onClick={() => setShowCanceledArchive(prev => !prev)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
              showCanceledArchive
                ? "bg-accent-subtle text-accent-fg border-accent/30 font-semibold"
                : "bg-surface border border-border/80 text-secondary hover:text-primary"
            )}
            aria-pressed={showCanceledArchive} title="Toggle Canceled Directives Archive"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive{canceledCount > 0 ? ` (${canceledCount})` : ''}</span>
          </button>

          {/* Embedded View Switcher and Action Button when header is hidden */}
          {hideHeader && (
            <>
              <div className="flex items-center bg-surface-hover/80 p-0.5 rounded-lg border border-border/80 text-xs shadow-2xs ml-1">
                <button
                  onClick={() => setActiveView('board')}
                  className={cn(
                    "px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer",
                    activeView === 'board'
                      ? "bg-surface text-primary shadow-2xs font-semibold"
                      : "text-secondary hover:text-primary"
                  )}
                  title="Board View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveView('list')}
                  className={cn(
                    "px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer",
                    activeView === 'list'
                      ? "bg-surface text-primary shadow-2xs font-semibold"
                      : "text-secondary hover:text-primary"
                  )}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveView('calendar')}
                  className={cn(
                    "px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer",
                    activeView === 'calendar'
                      ? "bg-surface text-primary shadow-2xs font-semibold"
                      : "text-secondary hover:text-primary"
                  )}
                  title="Calendar View"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => handleCreateIssue("BACKLOG")}
                className="bg-accent hover:opacity-90 text-on-accent px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-sm hover:shadow cursor-pointer ml-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                New Directive
              </button>
          </>
          )}
        </div>
      </div>
      </div>

      {projectsError && <div className="mx-4"><ErrorState title="Could not load projects" onRetry={() => retryProjects()} /></div>}
      {showCanceledArchive && archiveLoading && <p role="status" className="px-4 text-secondary">Loading canceled tasks...</p>}
      {showCanceledArchive && archiveError && <div className="mx-4"><ErrorState title="Could not load canceled tasks" onRetry={() => retryArchive()} /></div>}
      {!filteredIssues.length && <p role="status" className="px-4 pb-3 text-sm text-secondary">No directives match this view. Clear the filters or create a directive.</p>}
      <p className="px-4 pb-2 text-xs text-secondary">Manual order supports dragging and Move up/down actions. Open a directive to change its status or dates.</p>
      {/* 4. Board Viewport - Fluid Notion-style responsive columns */}
      <div className="flex-1 min-h-0 min-w-0 w-full overflow-x-auto overflow-y-hidden px-4 md:px-6 pb-6 pt-1 select-none custom-scrollbar">
        {activeView === 'board' ? (
          <div className="h-full min-w-full w-max flex gap-4">
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => { setActiveIssue(null); isDraggingRef.current = false; }}
            >
              {visibleColumns.map((col) => {
                const columnIssues = columnIssuesMap[col.id] || [];
                return (
                  <div key={col.id} className="w-[280px] lg:w-[310px] shrink-0 h-full flex flex-col">
                    <Column
                      col={col}
                      issues={columnIssues}
                      onDelete={handleDeleteIssue}
                      onMove={sortBy === "manual" && !updateIssueMutation.isPending ? moveRelative : undefined}
                      onCreate={handleCreateIssue}
                      onClick={handleEditIssue}
                    />
                  </div>
                );
              })}

              <DragOverlay dropAnimation={{
                duration: reducedMotion ? 0 : 150,
                easing: 'ease-out'
              }}>
                {activeIssue ? <div className="p-4 rounded-xl bg-surface border border-accent shadow-xl"><p className="text-primary font-semibold">{activeIssue.title}</p><PriorityBadge priority={activeIssue.priority} /></div> : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : activeView === 'list' ? (
          /* List View Alternative */
          <div className="bg-surface rounded-2xl border border-border/80 overflow-y-auto max-h-full p-4 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted uppercase font-mono">
                  <th className="pb-3 font-semibold">Directive</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Project</th>
                  <th className="pb-3 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredIssues.map((issue) => (
                  <tr 
                    key={issue.id} 
                    onClick={() => handleEditIssue(issue)}
                    className="hover:bg-surface-hover/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-semibold text-primary"><button type="button" onClick={() => handleEditIssue(issue)} className="min-h-11 text-left break-words">{issue.title}</button></td>
                    <td className="py-3">
                      <span className="font-mono text-[11px] font-bold text-secondary">
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3"><PriorityBadge priority={issue.priority} /></td>
                    <td className="py-3 text-secondary">{issue.project?.name || 'General'}</td>
                    <td className="py-3 text-muted">{issue.dueDate ? format(parseLocalDate(taskDay(issue.dueDate))!, 'MMM d') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Calendar View Alternative */
          <div className="bg-surface rounded-2xl border border-border/80 overflow-y-auto max-h-full p-6 shadow-xs text-center">
            <Calendar className="w-8 h-8 text-accent mx-auto mb-2 stroke-[1.5]" />
            <h3 className="font-bold text-sm text-primary mb-1">Calendar Timeline</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto mb-4">
              Dated directives in chronological order; undated work appears last.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
              {[...filteredIssues].sort((a, b) => (taskDay(a.dueDate || a.scheduledDate) || "9999").localeCompare(taskDay(b.dueDate || b.scheduledDate) || "9999")).map((issue) => (
                <button type="button"
                  key={issue.id} 
                  onClick={() => handleEditIssue(issue)}
                  className="p-3 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-primary">{issue.title}</span>
                    <PriorityBadge priority={issue.priority} />
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {issue.dueDate || issue.scheduledDate ? format(parseLocalDate(taskDay(issue.dueDate || issue.scheduledDate))!, 'MMM d, yyyy') : 'No target date'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <IssueCreateModal
        error={createIssueMutation.error?.message}
        open={createModalOpen}
        initialStatus={createStatus}
        defaultProjectId={!['all', 'operations'].includes(selectedProjectId) ? selectedProjectId : undefined}
        allIssues={issues}
        projects={projects}
        onClose={() => { if (!createIssueMutation.isPending) setCreateModalOpen(false); }}
        onSubmit={(data) => createIssueMutation.mutate(data)}
        isSubmitting={createIssueMutation.isPending}
      />

      {/* Detail / Edit Modal */}
      <IssueEditModal
        error={updateIssueDetailMutation.error?.message}
        open={editModalOpen}
        issue={editingIssue}
        onOpenTask={handleEditIssue}
        allIssues={issues}
        projects={projects}
        onClose={() => { if (!updateIssueDetailMutation.isPending) { setEditModalOpen(false); setEditingIssue(null); setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true }); } }}
        onSubmit={(id, data) => updateIssueDetailMutation.mutate({ id, data })}
        isSubmitting={updateIssueDetailMutation.isPending}
      />
    </div>
  );
}

export { IssueCreateModal } from './kanban/IssueCreateModal';
export { IssueEditModal } from './kanban/IssueEditModal';
