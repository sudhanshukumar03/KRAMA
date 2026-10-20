import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Activity,
  Unlink,
  Check,
  ArrowRight,
  Plus,
  ChevronDown,
  X,
  Flame,
  Link2,
} from 'lucide-react';
import { BaseButton } from '../ui/BaseButton';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { cn, errorMessage } from '../../lib/utils';
import type { ProjectWithRelations, Habit } from '../../types/schema';

interface LinkAction {
  isPending: boolean;
  mutate: (id: string, options?: { onSuccess?: () => void }) => void;
}

interface Props {
  goalId: string;
  projectsAvailable?: boolean;
  habitsAvailable?: boolean;
  linkedProjects: ProjectWithRelations[];
  unlinkedProjects: ProjectWithRelations[];
  linkedHabits: Habit[];
  unlinkedHabits: Habit[];
  selectedProjectIdToLink: string;
  selectedHabitIdToLink: string;
  setSelectedProjectIdToLink: (id: string) => void;
  setSelectedHabitIdToLink: (id: string) => void;
  linkProjectMutation: LinkAction;
  unlinkProjectMutation: LinkAction;
  linkHabitMutation: LinkAction;
  unlinkHabitMutation: LinkAction;
  logHabitMutation: LinkAction;
}

/**
 * Render project and habit connections with direct creation and automatic goal linking.
 */
export function GoalConnections({
  goalId,
  projectsAvailable = true,
  habitsAvailable = true,
  linkedProjects,
  unlinkedProjects,
  selectedProjectIdToLink,
  setSelectedProjectIdToLink,
  linkProjectMutation,
  unlinkProjectMutation,
  linkedHabits,
  unlinkedHabits,
  selectedHabitIdToLink,
  setSelectedHabitIdToLink,
  linkHabitMutation,
  unlinkHabitMutation,
  logHabitMutation,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showHabitSelector, setShowHabitSelector] = useState(false);

  // Direct Project Creation states
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDate, setNewProjectDate] = useState('');

  // Direct Habit Creation states
  const [isCreatingHabit, setIsCreatingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCadence, setNewHabitCadence] = useState<'daily' | 'weekly'>('daily');

  // Mutation to create a Project directly linked to this Goal
  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; targetDate?: string }) => {
      return api.projects.create({
        name: data.name.trim(),
        goalId,
        status: 'active',
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        icon: 'FolderKanban',
      });
    },
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setIsCreatingProject(false);
      setNewProjectName('');
      setNewProjectDate('');
      toast.success(`Project "${newProj.name}" created and linked to goal!`);
    },
    onError: (err) => {
      toast.error('Failed to create project: ' + errorMessage(err, 'Unknown error'));
    },
  });

  // Mutation to create a Habit directly linked to this Goal
  const createHabitMutation = useMutation({
    mutationFn: async (data: { name: string; cadence: 'daily' | 'weekly' }) => {
      return api.habits.create({
        name: data.name.trim(),
        linkedGoalId: goalId,
        cadence: data.cadence,
        category: 'PRODUCTIVITY',
        difficulty: 'MEDIUM',
        scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      });
    },
    onSuccess: (newHabit) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      setIsCreatingHabit(false);
      setNewHabitName('');
      toast.success(`Habit "${newHabit.name}" created and linked to goal!`);
    },
    onError: (err) => {
      toast.error('Failed to create habit: ' + errorMessage(err, 'Unknown error'));
    },
  });

  return (
    <div className="space-y-6">
      {/* Connected Initiatives (Projects) */}
      <fieldset disabled={!projectsAvailable} aria-label="Connected projects" className="space-y-2.5 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
            <FolderKanban className="w-3.5 h-3.5 text-cat-projects" />
            <span>Connected Projects</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-secondary text-[11px] font-mono font-medium border border-border/60">
              {projectsAvailable ? linkedProjects.length : 'Unavailable'}
            </span>
          </h4>

          <div className="flex items-center gap-2">
            {unlinkedProjects.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowProjectSelector((prev) => !prev);
                  setIsCreatingProject(false);
                }}
                className="text-[11px] font-medium text-secondary hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                title="Connect an existing project in your workspace"
              >
                <Link2 className="w-3 h-3" />
                <span>{showProjectSelector ? 'Cancel' : 'Link Existing'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsCreatingProject((prev) => !prev);
                setShowProjectSelector(false);
              }}
              className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isCreatingProject ? (
                <>
                  <X className="w-3.5 h-3.5" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> New Project
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inline Quick Project Creation Form */}
        {isCreatingProject && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newProjectName.trim()) return;
              createProjectMutation.mutate({
                name: newProjectName,
                targetDate: newProjectDate || undefined,
              });
            }}
            className="p-3.5 rounded-xl border border-accent/30 bg-surface/90 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                Create & Link New Project
              </span>
              <span className="text-[10px] font-mono text-accent-fg bg-accent-subtle px-1.5 py-0.5 rounded border border-accent/20">
                Auto-linked
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                autoFocus
                placeholder="Project title (e.g. Marathon Training Plan, MVP Launch)..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="krama-input w-full text-xs h-9 px-3 bg-surface text-primary rounded-lg border border-border focus:border-accent"
                disabled={createProjectMutation.isPending}
              />

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="date"
                    aria-label="Target Date"
                    value={newProjectDate}
                    onChange={(e) => setNewProjectDate(e.target.value)}
                    className="krama-input w-full text-xs h-8 px-2.5 bg-surface text-primary rounded-lg border border-border focus:border-accent font-mono"
                    disabled={createProjectMutation.isPending}
                  />
                </div>

                <BaseButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newProjectName.trim() || createProjectMutation.isPending}
                  isLoading={createProjectMutation.isPending}
                  className="h-8 px-3 text-xs font-semibold shrink-0 gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </BaseButton>
              </div>
            </div>
          </form>
        )}

        {/* Inline Existing Project Linker */}
        {showProjectSelector && unlinkedProjects.length > 0 && (
          <div className="p-3 rounded-xl border border-accent/30 bg-surface/80 shadow-xs space-y-2.5 animate-in fade-in duration-150">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
              Select existing workspace project to link:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  aria-label="Project to connect"
                  value={selectedProjectIdToLink}
                  onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                  className="krama-input w-full text-xs h-9 pl-3 pr-8 bg-surface text-primary rounded-lg border border-border appearance-none cursor-pointer focus:border-accent"
                >
                  <option value="">Choose a project...</option>
                  {unlinkedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p._count?.tasks ?? p.tasks?.length ?? 0} tasks)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <BaseButton
                type="button"
                variant="primary"
                size="sm"
                disabled={!selectedProjectIdToLink || linkProjectMutation.isPending}
                onClick={() => {
                  if (selectedProjectIdToLink) {
                    linkProjectMutation.mutate(selectedProjectIdToLink, { onSuccess: () => setShowProjectSelector(false) });
                  }
                }}
                className="h-9 px-3 text-xs font-semibold shrink-0 gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {linkProjectMutation.isPending ? 'Linking...' : 'Connect'}
              </BaseButton>
            </div>
          </div>
        )}

        {/* Empty State vs Linked List */}
        {!projectsAvailable ? <p className="text-sm text-secondary">Project connections are unavailable. Existing links are retained.</p> : linkedProjects.length === 0 && !isCreatingProject ? (
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface/30 flex flex-col items-center justify-center text-center gap-2.5 transition-all">
            <div className="w-8 h-8 rounded-xl bg-cat-projects/10 text-cat-projects border border-cat-projects/20 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary">No connected projects</p>
              <p className="text-[11px] text-secondary/80 max-w-xs mt-0.5">
                Link initiatives to roll up task execution and milestone progress.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsCreatingProject(true)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent text-xs font-semibold text-primary hover:text-accent-fg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Create New Project</span>
              </button>
              {unlinkedProjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowProjectSelector(true)}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link Existing</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedProjects.map((proj) => (
              <div
                key={proj.id}
                className="krama-card p-2.5 rounded-xl border border-border bg-surface hover:border-accent/40 transition-colors flex items-center justify-between gap-3 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/app/projects/${proj.id}`)}
                  className="flex-1 text-left min-w-0 flex items-center gap-2.5 cursor-pointer group"
                >
                  <span className="w-2 h-2 rounded-full bg-cat-projects shrink-0" />
                  <p className="text-xs font-semibold text-primary group-hover:text-accent-fg transition-colors truncate">
                    {proj.name}
                  </p>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-accent-fg transition-transform group-hover:translate-x-0.5 shrink-0" />
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-secondary bg-surface-hover border border-border/60 px-2 py-0.5 rounded-md tabular-nums">
                    {proj._count?.tasks ?? proj.tasks?.length ?? 0} tasks
                  </span>
                  <button
                    type="button"
                    onClick={() => unlinkProjectMutation.mutate(proj.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger-fg hover:bg-danger-bg/40 transition-colors cursor-pointer"
                    title="Disconnect project"
                    aria-label={`Disconnect project ${proj.name}`}
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* Daily Habit Synergy (With Direct 1-Click Log) */}
      <fieldset disabled={!habitsAvailable} aria-label="Connected habits" className="space-y-2.5 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-warning-fg" />
            <span>Daily Habits</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-secondary text-[11px] font-mono font-medium border border-border/60">
              {habitsAvailable ? linkedHabits.length : 'Unavailable'}
            </span>
          </h4>

          <div className="flex items-center gap-2">
            {unlinkedHabits.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowHabitSelector((prev) => !prev);
                  setIsCreatingHabit(false);
                }}
                className="text-[11px] font-medium text-secondary hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                title="Connect an existing habit in your workspace"
              >
                <Link2 className="w-3 h-3" />
                <span>{showHabitSelector ? 'Cancel' : 'Link Existing'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsCreatingHabit((prev) => !prev);
                setShowHabitSelector(false);
              }}
              className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isCreatingHabit ? (
                <>
                  <X className="w-3.5 h-3.5" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> New Habit
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inline Quick Habit Creation Form */}
        {isCreatingHabit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newHabitName.trim()) return;
              createHabitMutation.mutate({
                name: newHabitName,
                cadence: newHabitCadence,
              });
            }}
            className="p-3.5 rounded-xl border border-accent/30 bg-surface/90 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                Create & Link New Habit
              </span>
              <span className="text-[10px] font-mono text-accent-fg bg-accent-subtle px-1.5 py-0.5 rounded border border-accent/20">
                Auto-linked
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                autoFocus
                placeholder="Habit title (e.g. Read 20 pages, Morning Run, Deep Work)..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="krama-input w-full text-xs h-9 px-3 bg-surface text-primary rounded-lg border border-border focus:border-accent"
                disabled={createHabitMutation.isPending}
              />

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-surface-hover p-0.5 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setNewHabitCadence('daily')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] rounded-md transition-all cursor-pointer',
                      newHabitCadence === 'daily'
                        ? 'bg-surface-elevated text-primary shadow-xs font-bold border border-border'
                        : 'text-secondary hover:text-primary'
                    )}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHabitCadence('weekly')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] rounded-md transition-all cursor-pointer',
                      newHabitCadence === 'weekly'
                        ? 'bg-surface-elevated text-primary shadow-xs font-bold border border-border'
                        : 'text-secondary hover:text-primary'
                    )}
                  >
                    Weekly
                  </button>
                </div>

                <div className="flex-1" />

                <BaseButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newHabitName.trim() || createHabitMutation.isPending}
                  isLoading={createHabitMutation.isPending}
                  className="h-8 px-3 text-xs font-semibold shrink-0 gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Habit</span>
                </BaseButton>
              </div>
            </div>
          </form>
        )}

        {/* Inline Habit Connect Dropdown Drawer/Card */}
        {showHabitSelector && unlinkedHabits.length > 0 && (
          <div className="p-3 rounded-xl border border-accent/30 bg-surface/80 shadow-xs space-y-2.5 animate-in fade-in duration-150">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
              Select daily habit to connect:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  aria-label="Habit to connect"
                  value={selectedHabitIdToLink}
                  onChange={(e) => setSelectedHabitIdToLink(e.target.value)}
                  className="krama-input w-full text-xs h-9 pl-3 pr-8 bg-surface text-primary rounded-lg border border-border appearance-none cursor-pointer focus:border-accent"
                >
                  <option value="">Choose a habit...</option>
                  {unlinkedHabits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (streak: {h.streak ?? 0}d)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <BaseButton
                type="button"
                variant="primary"
                size="sm"
                disabled={!selectedHabitIdToLink || linkHabitMutation.isPending}
                onClick={() => {
                  if (selectedHabitIdToLink) {
                    linkHabitMutation.mutate(selectedHabitIdToLink, { onSuccess: () => setShowHabitSelector(false) });
                  }
                }}
                className="h-9 px-3 text-xs font-semibold shrink-0 gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {linkHabitMutation.isPending ? 'Linking...' : 'Connect'}
              </BaseButton>
            </div>
          </div>
        )}

        {/* Empty State vs Linked List */}
        {!habitsAvailable ? <p className="text-sm text-secondary">Habit connections are unavailable. Existing links are retained.</p> : linkedHabits.length === 0 && !isCreatingHabit ? (
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface/30 flex flex-col items-center justify-center text-center gap-2.5 transition-all">
            <div className="w-8 h-8 rounded-xl bg-warning-bg text-warning-fg border border-warning-border flex items-center justify-center">
              <Activity className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary">No connected habits</p>
              <p className="text-[11px] text-secondary/80 max-w-xs mt-0.5">
                Anchor daily routines to reinforce consistent execution momentum.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsCreatingHabit(true)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent text-xs font-semibold text-primary hover:text-accent-fg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-warning-fg" />
                <span>Create New Habit</span>
              </button>
              {unlinkedHabits.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHabitSelector(true)}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link Existing</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedHabits.map((h) => (
              <div
                key={h.id}
                className="krama-card p-2.5 rounded-xl border border-border bg-surface hover:border-accent/40 transition-colors flex items-center justify-between gap-3 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/app/habits?goalId=${goalId}`)}
                  className="flex-1 text-left min-w-0 flex items-center gap-2 cursor-pointer group"
                >
                  <p className="text-xs font-semibold text-primary group-hover:text-accent-fg transition-colors truncate">
                    {h.name}
                  </p>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Direct Log Today Button */}
                  <button
                    type="button"
                    onClick={() => logHabitMutation.mutate(h.id)}
                    disabled={logHabitMutation.isPending}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-success-bg text-success-fg border border-success-border hover:bg-success-bg/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Log habit for today"
                  >
                    <Check className="w-3 h-3" /> Log Today
                  </button>

                  <span className="text-[11px] font-mono text-warning-fg bg-warning-bg border border-warning-border px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-warning-fg" />
                    <span>{h.streak ?? 0}d</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => unlinkHabitMutation.mutate(h.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger-fg hover:bg-danger-bg/40 transition-colors cursor-pointer"
                    title="Disconnect habit"
                    aria-label={`Disconnect habit ${h.name}`}
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}
