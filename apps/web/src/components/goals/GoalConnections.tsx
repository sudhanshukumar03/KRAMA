import { useNavigate } from 'react-router-dom';
import { FolderKanban, Activity, Unlink, Check, ArrowRight } from 'lucide-react';
import type { ProjectWithRelations, Habit } from '../../types/schema';
interface LinkAction { isPending: boolean; mutate: (id: string) => void }
interface Props {
  goalId: string;
  linkedProjects: ProjectWithRelations[]; unlinkedProjects: ProjectWithRelations[];
  linkedHabits: Habit[]; unlinkedHabits: Habit[];
  selectedProjectIdToLink: string; selectedHabitIdToLink: string;
  setSelectedProjectIdToLink: (id: string) => void; setSelectedHabitIdToLink: (id: string) => void;
  linkProjectMutation: LinkAction; unlinkProjectMutation: LinkAction;
  linkHabitMutation: LinkAction; unlinkHabitMutation: LinkAction; logHabitMutation: LinkAction;
}

export function GoalConnections({ goalId, linkedProjects, unlinkedProjects, selectedProjectIdToLink, setSelectedProjectIdToLink, linkProjectMutation, unlinkProjectMutation, linkedHabits, unlinkedHabits, selectedHabitIdToLink, setSelectedHabitIdToLink, linkHabitMutation, unlinkHabitMutation, logHabitMutation }: Props) {
  const navigate = useNavigate();
  return <>
            {/* Connected Initiatives (Projects) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-caption font-mono uppercase tracking-wide text-secondary flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-cat-projects" /> Connected Projects ({linkedProjects.length})
                </h4>
              </div>

              {unlinkedProjects.length > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <select
                    aria-label="Project to connect"
                  value={selectedProjectIdToLink}
                    onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                    className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface text-primary focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">+ Connect existing project...</option>
                    {unlinkedProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p._count?.tasks ?? p.tasks?.length ?? 0} tasks)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedProjectIdToLink || linkProjectMutation.isPending}
                    onClick={() =>
                      selectedProjectIdToLink &&
                      linkProjectMutation.mutate(selectedProjectIdToLink)
                    }
                    className="px-2.5 py-1.5 text-xs bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    Connect
                  </button>
                </div>
              )}

              {linkedProjects.length === 0 ? (
                <p className="text-caption text-secondary italic">No projects connected yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-surface hover:border-accent/40 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/app/projects/${proj.id}`)}
                        className="flex-1 text-left min-w-0 flex items-center gap-2 cursor-pointer group"
                      >
                        <span className="w-2 h-2 rounded-full bg-cat-projects shrink-0" />
                        <p className="text-xs font-medium text-primary group-hover:text-accent-fg transition-colors truncate">
                          {proj.name}
                        </p>
                        <ArrowRight className="w-3 h-3 text-secondary group-hover:text-accent-fg transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-secondary bg-surface-hover px-1.5 py-0.5 rounded">
                          {proj._count?.tasks ?? proj.tasks?.length ?? 0} tasks
                        </span>
                        <button
                          type="button"
                          onClick={() => unlinkProjectMutation.mutate(proj.id)}
                          className="text-secondary hover:text-danger-fg p-1 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                          title="Disconnect project"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Habit Synergy (With Direct Log Button!) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-caption font-mono uppercase tracking-wide text-secondary flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-warning-fg" /> Daily Habits ({linkedHabits.length})
                </h4>
              </div>

              {unlinkedHabits.length > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <select
                    aria-label="Habit to connect"
                  value={selectedHabitIdToLink}
                    onChange={(e) => setSelectedHabitIdToLink(e.target.value)}
                    className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface text-primary focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">+ Connect daily habit...</option>
                    {unlinkedHabits.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} (streak: {h.streak ?? 0}d)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedHabitIdToLink || linkHabitMutation.isPending}
                    onClick={() =>
                      selectedHabitIdToLink && linkHabitMutation.mutate(selectedHabitIdToLink)
                    }
                    className="px-2.5 py-1.5 text-xs bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    Connect
                  </button>
                </div>
              )}

              {linkedHabits.length === 0 ? (
                <p className="text-caption text-secondary italic">No habits connected to this goal yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkedHabits.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-surface hover:border-accent/40 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/app/habits?goalId=${goalId}`)}
                        className="flex-1 text-left min-w-0 flex items-center gap-2 cursor-pointer group"
                      >
                        <p className="text-xs font-medium text-primary group-hover:text-accent-fg transition-colors truncate">
                          {h.name}
                        </p>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Direct Log Today Button */}
                        <button
                          type="button"
                          onClick={() => logHabitMutation.mutate(h.id)}
                          disabled={logHabitMutation.isPending}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-success-bg text-success-fg border border-success-border hover:bg-success-bg/80 transition-all flex items-center gap-1 cursor-pointer"
                          title="Log habit for today"
                        >
                          <Check className="w-3 h-3" /> Log Today
                        </button>

                        <span className="text-[10px] font-mono text-warning-fg bg-warning-bg border border-warning-border px-1.5 py-0.5 rounded font-semibold">
                          🔥 {h.streak ?? 0}d
                        </span>

                        <button
                          type="button"
                          onClick={() => unlinkHabitMutation.mutate(h.id)}
                          className="text-secondary hover:text-danger-fg p-1 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                          title="Disconnect habit"
                        >
                          <Unlink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


  </>;
}
