import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Target, Plus, Search, X, LayoutGrid, ListTree
} from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import type { GoalWithRelations } from '../types/schema';
import { toast } from 'sonner';

// Subcomponents & Constants
import { GoalKpiStrip } from './goals/GoalKpiStrip';
import { GoalCard } from './goals/GoalCard';
import { GoalPillarBoard } from './goals/GoalPillarBoard';
import { GoalDetailDrawer } from './goals/GoalDetailDrawer';
import { GoalFormModal } from './goals/GoalFormModal';
import { LIFE_PILLARS, getPillar, type GoalStatus } from './goals/goalConstants';

export type { GoalStatus, LifePillarId } from './goals/goalConstants';
export { GoalCard } from './goals/GoalCard';
export { GoalKpiStrip } from './goals/GoalKpiStrip';
export { GoalPillarBoard } from './goals/GoalPillarBoard';
export { GoalDetailDrawer } from './goals/GoalDetailDrawer';
export { GoalFormModal } from './goals/GoalFormModal';

export function Goals() {
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: retryGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: api.goals.list,
  });

  const { data: projects = [], isLoading: projectsLoading, isError: projectsError, refetch: retryProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  });

  const { data: allHabits = [], isLoading: habitsLoading, isError: habitsError, refetch: retryHabits } = useQuery({
    queryKey: ['habits'],
    queryFn: api.habits.list,
  });

  // Filters & State
  const [viewMode, setViewMode] = useState<'tree' | 'board'>('tree');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [selectedHorizon, setSelectedHorizon] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'deadline' | 'progress_desc' | 'progress_asc'>('created');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [defaultPillarForModal, setDefaultPillarForModal] = useState<string>('health');
  const [parentGoalForModal, setParentGoalForModal] = useState<{ id: string; title: string } | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalWithRelations | null>(null);
  const [detailGoal, setDetailGoal] = useState<GoalWithRelations | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedGoalId = searchParams.get('goal');
  useEffect(() => {
    if (!requestedGoalId || goalsLoading || goalsError) return;
    const selected = goals.find((goal: GoalWithRelations) => goal.id === requestedGoalId);
    if (selected) setDetailGoal(selected);
    else {
      setDetailGoal(null);
      toast.error('This goal is no longer available in this workspace');
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('goal'); return next; }, { replace: true });
    }
  }, [requestedGoalId, goals, goalsLoading, goalsError, setSearchParams]);

  const openGoal = useCallback((goal: GoalWithRelations) => {
    setDetailGoal(goal);
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('goal', goal.id); return next; });
  }, [setSearchParams]);

  // Mutations
  const createGoalMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      type: string;
      progress?: number;
      status?: string;
      targetDate: string;
      icon?: string;
      parentGoalId?: string | null;
      metadata?: Record<string, any>;
      selectedProjectIds?: string[];
      selectedHabitIds?: string[];
    }) => {
      const linkResults: PromiseSettledResult<unknown>[] = [];
      const newGoal = await api.goals.create({
        title: data.title,
        type: data.type,
        status: data.status || 'ACTIVE',
        progress: data.progress ?? 0,
        icon: data.icon,
        parentGoalId: data.parentGoalId || null,
        metadata: data.metadata,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
      });

      if (Array.isArray(data.selectedProjectIds) && data.selectedProjectIds.length > 0 && newGoal?.id) {
        linkResults.push(...await Promise.allSettled(
          data.selectedProjectIds.map((pid: string) => {
            const p = projects.find((proj: any) => proj.id === pid);
            return api.projects.update(pid, { goalId: newGoal.id, version: p?.version });
          })
        ));
      }

      if (Array.isArray(data.selectedHabitIds) && data.selectedHabitIds.length > 0 && newGoal?.id) {
        linkResults.push(...await Promise.allSettled(
          data.selectedHabitIds.map((hid: string) =>
            api.habits.update(hid, { linkedGoalId: newGoal.id, version: allHabits.find(h => h.id === hid)?.version })
          )
        ));
      }

      return { ...newGoal, linkFailures: linkResults.filter(r => r.status === 'rejected').length };
    },
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setFormModalOpen(false);
      setParentGoalForModal(null);
      if (newGoal.linkFailures) toast.error(`Goal created, but ${newGoal.linkFailures} links failed. Reopen Edit to retry.`);
      else toast.success(`Created "${newGoal?.title || 'Goal'}"`);
    },
    onError: () => {
      toast.error('Failed to create goal');
    },
  });

  const updateGoalDetailsMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      selectedProjectIds,
      selectedHabitIds,
    }: {
      id: string;
      data: any;
      selectedProjectIds?: string[];
      selectedHabitIds?: string[];
    }) => {
      const linkResults: PromiseSettledResult<unknown>[] = [];
      const updated = await api.goals.update(id, data);

      if (Array.isArray(selectedProjectIds)) {
        const currentlyLinked = (projects || [])
          .filter((p: any) => p.goalId === id)
          .map((p: any) => p.id);
        const toLink = selectedProjectIds.filter((pid) => !currentlyLinked.includes(pid));
        const toUnlink = currentlyLinked.filter((pid) => !selectedProjectIds.includes(pid));

        linkResults.push(...await Promise.allSettled([
          ...toLink.map((pid) => {
            const p = projects.find((proj: any) => proj.id === pid);
            return api.projects.update(pid, { goalId: id, version: p?.version });
          }),
          ...toUnlink.map((pid) => {
            const p = projects.find((proj: any) => proj.id === pid);
            return api.projects.update(pid, { goalId: null, version: p?.version });
          }),
        ]));
      }

      if (Array.isArray(selectedHabitIds)) {
        const currentlyLinked = (allHabits || [])
          .filter((h: any) => h.linkedGoalId === id)
          .map((h: any) => h.id);
        const toLink = selectedHabitIds.filter((hid) => !currentlyLinked.includes(hid));
        const toUnlink = currentlyLinked.filter((hid) => !selectedHabitIds.includes(hid));

        linkResults.push(...await Promise.allSettled([
          ...toLink.map((hid) => api.habits.update(hid, { linkedGoalId: id, version: allHabits.find(h => h.id === hid)?.version })),
          ...toUnlink.map((hid) => api.habits.update(hid, { linkedGoalId: null, version: allHabits.find(h => h.id === hid)?.version })),
        ]));
      }

      return { ...updated, linkFailures: linkResults.filter(r => r.status === 'rejected').length };
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setFormModalOpen(false);
      setEditingGoal(null);
      if (updated.linkFailures) toast.error(`Goal saved, but ${updated.linkFailures} links failed. Reopen Edit to retry.`);
      else toast.success('Aspiration updated successfully');
    },
    onError: () => {
      toast.error('Failed to update goal');
    },
  });

  const handleCreateGoal = useCallback((defaultPillar = 'health') => {
    setEditingGoal(null);
    setParentGoalForModal(null);
    setDefaultPillarForModal(defaultPillar);
    setFormModalOpen(true);
  }, []);

  const handleAddChild = useCallback((parent: GoalWithRelations) => {
    setEditingGoal(null);
    setParentGoalForModal({ id: parent.id, title: parent.title });
    setFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((goal: GoalWithRelations) => {
    setParentGoalForModal(null);
    setEditingGoal(goal);
    setFormModalOpen(true);
  }, []);

  const handleModalSubmit = (data: any) => {
    if (editingGoal) {
      updateGoalDetailsMutation.mutate({
        id: editingGoal.id,
        data: {
          title: data.title,
          type: data.type,
          icon: data.icon,
          progress: data.progress,
          status: data.status,
          metadata: data.metadata,
          version: editingGoal.version,
          targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        },
        selectedProjectIds: data.selectedProjectIds,
        selectedHabitIds: data.selectedHabitIds,
      });
    } else {
      createGoalMutation.mutate(data);
    }
  };

  const rootGoals = useMemo(() => goals.filter((g) => !g.parentGoalId), [goals]);

  const getGoalStatus = (g: GoalWithRelations): GoalStatus =>
    (((g as any).metadata?.status || (g as any).status || 'ACTIVE') as GoalStatus);

  const scopedGoals = useMemo(() => {
    return rootGoals.filter((g) => {
      const meta = (g.metadata || {}) as Record<string, any>;
      if (selectedPillar !== 'all' && meta.category !== selectedPillar) return false;
      if (selectedHorizon !== 'all' && g.type !== selectedHorizon) return false;
      return true;
    });
  }, [rootGoals, selectedPillar, selectedHorizon]);

  const activeCount = useMemo(
    () => scopedGoals.filter((g) => g.progress < 100 && getGoalStatus(g) === 'ACTIVE').length,
    [scopedGoals]
  );
  const completedCount = useMemo(
    () => scopedGoals.filter((g) => g.progress >= 100 || getGoalStatus(g) === 'COMPLETED').length,
    [scopedGoals]
  );
  const pausedCount = useMemo(
    () => scopedGoals.filter((g) => getGoalStatus(g) === 'PAUSED').length,
    [scopedGoals]
  );

  // Multi-dimensional filtering
  const filteredGoals = useMemo(() => {
    return rootGoals.filter((g) => {
      // Status filter
      const st = getGoalStatus(g);
      const isComp = g.progress >= 100 || st === 'COMPLETED';
      if (activeTab === 'active' && (isComp || st !== 'ACTIVE')) return false;
      if (activeTab === 'completed' && !isComp) return false;
      if (activeTab === 'paused' && st !== 'PAUSED') return false;

      // Life Pillar filter
      const meta = (g.metadata || {}) as Record<string, any>;
      if (selectedPillar !== 'all' && meta.category !== selectedPillar) return false;

      // Horizon filter
      if (selectedHorizon !== 'all' && g.type !== selectedHorizon) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesWhy = (meta.whyStatement || meta.description || '').toLowerCase().includes(q);
        const matchesChild = (g.childGoals || []).some((c) => c.title.toLowerCase().includes(q));
        if (!matchesTitle && !matchesWhy && !matchesChild) return false;
      }

      return true;
    });
  }, [rootGoals, activeTab, selectedPillar, selectedHorizon, searchQuery]);

  const sortedGoals = useMemo(() => {
    return [...filteredGoals].sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      }
      if (sortBy === 'progress_desc') {
        return b.progress - a.progress;
      }
      if (sortBy === 'progress_asc') {
        return a.progress - b.progress;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [filteredGoals, sortBy]);

  if (goalsLoading || projectsLoading || habitsLoading) {
    return (
      <LoadingState
        variant="goals"
        title="Loading Life Aspirations..."
        description="Gathering personal life architecture, habit links, and pace metrics..."
      />
    );
  }

  if (goalsError || projectsError || habitsError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Goals"
          message="Could not retrieve goals data from the server. Please verify your connection."
          onRetry={() => {
            void Promise.all([retryGoals(), retryProjects(), retryHabits()]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-canvas overflow-y-auto min-w-0 animate-in fade-in duration-150">
      <PageHeader
        icon={Target}
        title="Life Aspirations & Goals"
        description="Personal vision, quarterly milestones, and daily momentum across your life pillars."
        primaryAction={{
          label: 'New Aspiration',
          icon: Plus,
          onClick: () => handleCreateGoal(),
        }}
        className="mb-6"
      />

      {/* EXECUTIVE KPI SUMMARY STRIP */}
      <GoalKpiStrip goals={goals} onOpenGoal={openGoal} />

      {/* UNIFIED STRATEGIC COMMAND TOOLBAR */}
      <div className="krama-card p-3.5 mb-6 space-y-3">
        {/* Pillar Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {LIFE_PILLARS.map((p) => {
            const PillarIcon = p.icon;
            const isSelected = selectedPillar === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPillar(p.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer group/pill active:scale-[0.98]',
                  isSelected
                    ? cn('border font-semibold shadow-xs', p.color)
                    : 'bg-surface hover:bg-surface-hover text-secondary hover:text-primary border border-border/80'
                )}
              >
                <PillarIcon
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 stroke-[2]',
                    isSelected ? '' : 'text-secondary group-hover/pill:text-primary'
                  )}
                />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Second Row: Search + Cadence + Status Tabs + View Switcher */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-border/60">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-secondary absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search aspirations, key results, habits..."
              className="w-full pl-9 pr-8 py-1.5 bg-background border border-border rounded-lg text-xs text-primary placeholder:text-secondary/60 focus:outline-none focus:border-accent font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-secondary hover:text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Horizon / Cadence Dropdown */}
            <select
              value={selectedHorizon}
              onChange={(e) => setSelectedHorizon(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border rounded-lg bg-surface text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer font-mono"
            >
              <option value="all">All Horizons</option>
              <option value="monthly">Monthly Sprint (30d)</option>
              <option value="quarterly">Quarterly Sprint (90d)</option>
              <option value="yearly">Annual Vision (1yr)</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 text-xs border border-border rounded-lg bg-surface text-secondary hover:text-primary focus:outline-none focus:border-accent cursor-pointer font-mono"
            >
              <option value="created">Newest First</option>
              <option value="deadline">Upcoming Deadline</option>
              <option value="progress_desc">Highest Progress</option>
              <option value="progress_asc">Lowest Progress</option>
            </select>

            {/* Status Tabs */}
            <div className="flex items-center bg-surface-hover p-0.5 rounded-lg border border-border text-caption font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  activeTab === 'all'
                    ? 'bg-card text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary'
                )}
              >
                All ({scopedGoals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  activeTab === 'active'
                    ? 'bg-card text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary'
                )}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  activeTab === 'completed'
                    ? 'bg-card text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary'
                )}
              >
                Done ({completedCount})
              </button>
              {pausedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('paused')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                    activeTab === 'paused'
                      ? 'bg-card text-warning-fg font-bold shadow-2xs'
                      : 'text-secondary hover:text-warning-fg'
                  )}
                >
                  Paused ({pausedCount})
                </button>
              )}
            </div>

            {/* View Mode Toggle: Tree vs Board */}
            <div className="flex items-center bg-surface-hover p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={cn(
                  'p-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 text-xs font-mono',
                  viewMode === 'tree'
                    ? 'bg-card text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary'
                )}
                title="Hierarchy Tree View"
              >
                <ListTree className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tree</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={cn(
                  'p-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 text-xs font-mono',
                  viewMode === 'board'
                    ? 'bg-card text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary'
                )}
                title="Life Pillar Matrix Board"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pillars</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1 min-h-0">
        {viewMode === 'board' ? (
          <GoalPillarBoard
            goals={sortedGoals}
            activeTab={activeTab}
            searchQuery={searchQuery}
            onOpenGoal={openGoal}
            onAddGoalWithPillar={handleCreateGoal}
            selectedPillar={selectedPillar}
          />
        ) : (
          <div className="space-y-3 pb-8">
            {sortedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onOpenDetail={openGoal}
                projects={projects}
                allHabits={allHabits}
              />
            ))}

            {sortedGoals.length === 0 && (
              <div className="border border-border rounded-2xl bg-surface h-72 flex items-center justify-center shadow-sm p-6 text-center">
                <EmptyState
                  icon={Target}
                  description={
                    searchQuery
                      ? `No goals matching "${searchQuery}"`
                      : selectedPillar !== 'all'
                      ? `No goals found under ${getPillar(selectedPillar).label}.`
                      : activeTab === 'all'
                      ? 'No life aspirations configured yet. Plant a seed for your future!'
                      : `No ${activeTab} goals found.`
                  }
                  actionLabel={
                    activeTab === 'all' && !searchQuery ? 'Create New Aspiration' : undefined
                  }
                  onAction={
                    activeTab === 'all' && !searchQuery ? () => handleCreateGoal() : undefined
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goal Form Modal */}
      <GoalFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingGoal(null);
          setParentGoalForModal(null);
        }}
        onSubmit={handleModalSubmit}
        isSubmitting={createGoalMutation.isPending || updateGoalDetailsMutation.isPending}
        initialData={editingGoal}
        parentGoal={parentGoalForModal}
        defaultPillar={defaultPillarForModal}
        projects={projects}
        allHabits={allHabits}
      />

      {/* Goal Detail Cockpit Drawer */}
      {detailGoal && (
        <GoalDetailDrawer
          goal={detailGoal}
          projects={projects}
          onClose={() => { setDetailGoal(null); setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('goal'); return next; }, { replace: true }); }}
          onAddChild={handleAddChild}
          onSelectGoal={openGoal}
        />
      )}
    </div>
  );
}
