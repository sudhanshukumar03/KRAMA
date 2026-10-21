import { GoalCheckInPanel } from './GoalCheckInPanel';
import { GoalProgressSummary } from './GoalProgressSummary';
import { GoalConnections } from './GoalConnections';
import { Calendar, CheckCircle2, Plus, ChevronRight, MessageSquareQuote, History, Clock } from 'lucide-react';
import { goalMetadata } from '../../lib/goalUtils';
import { cn } from '../../lib/utils';
import type { GoalDetailModel } from './useGoalDetailModel';

export function GoalOverviewPanel({ model }: { model: GoalDetailModel }) {
  const { projectsAvailable, onAddChild, goalId, handleSelectGoal, selectedProjectIdToLink, setSelectedProjectIdToLink, selectedHabitIdToLink, setSelectedHabitIdToLink, isLoading, habitsLoading, habitsError, current, metadata, isMeasurable, pace, childGoals, linkedProjects, unlinkedProjects, linkedHabits, unlinkedHabits, snapshots, linkProjectMutation, unlinkProjectMutation, linkHabitMutation, unlinkHabitMutation, logHabitMutation } = model;
  const isCompleted = current.progress >= 100 || metadata.status === 'COMPLETED';
  return (
    <div id="cockpit-panel" role="tabpanel" aria-labelledby="tab-cockpit" className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Motivation Quote Card */}
            {(metadata.whyStatement || metadata.description) && (
              <div className="goal-motivation">
                <div className="goal-section-label">

                  <h3>Why it matters</h3>
                </div>
                <p className="goal-motivation-text">
                  “{metadata.whyStatement || metadata.description}”
                </p>
              </div>
            )}

            <GoalProgressSummary
              pace={pace}
              progress={current.progress ?? 0}
              metadata={metadata}
              isCompleted={isCompleted}
              isMeasurable={isMeasurable}
              targetDate={current.targetDate}
            />

            <GoalCheckInPanel model={model} />

            {/* Milestones / Key Results */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold tracking-normal text-secondary flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  <span>Key Results</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-secondary text-xs font-mono font-medium border border-border/60">
                    {childGoals.length}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => onAddChild?.(current)}
                  className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Key Result
                </button>
              </div>

              {childGoals.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface/30 text-center flex flex-col items-center justify-center gap-1">
                  <CheckCircle2 className="w-6 h-6 text-muted/60 stroke-[1.5]" />
                  <p className="text-xs font-medium text-secondary">No key results configured yet</p>
                  <p className="text-caption text-muted max-w-xs">Break down this goal into measurable milestones!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {childGoals.map((kr) => {
                    const krMeta = goalMetadata(kr.metadata);
                    const krMeasurable = Boolean(krMeta.measurable) && krMeta.targetValue != null;
                    return (
                      <div
                        key={kr.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select key result: ${kr.title}`}
                        onClick={() => handleSelectGoal(kr)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectGoal(kr);
                          }
                        }}
                        className="krama-card p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-primary group-hover:text-accent-fg transition-colors truncate">
                            {kr.title}
                          </p>
                          <div className="flex items-center gap-2.5 text-xs text-secondary mt-1">
                            {krMeasurable && (
                              <span className="font-mono text-xs text-primary font-medium tabular-nums">
                                {krMeta.currentValue ?? 0} / {krMeta.targetValue}
                                {krMeta.unit ? ` ${krMeta.unit}` : ''}
                              </span>
                            )}
                            {krMeta.weight && Number(krMeta.weight) > 1 && (
                              <span className="px-1.5 py-0.2 rounded bg-surface-hover border border-border text-xs text-accent-fg font-medium">
                                {krMeta.weight}x weight
                              </span>
                            )}
                            {kr.targetDate && (
                              <span className="flex items-center gap-1 text-xs text-muted">
                                <Calendar className="w-3 h-3" />
                                {new Date(kr.targetDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={cn(
                              'text-xs font-bold font-mono px-2 py-0.5 rounded-md border tabular-nums',
                              kr.progress >= 100
                                ? 'bg-success-bg text-success-fg border-success-border'
                                : 'bg-surface-hover text-primary border-border'
                            )}
                          >
                            {kr.progress}%
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <GoalConnections
              goalId={goalId}
              projectsAvailable={projectsAvailable}
              habitsAvailable={!habitsError && !habitsLoading}
              linkedProjects={linkedProjects}
              unlinkedProjects={unlinkedProjects}
              selectedProjectIdToLink={selectedProjectIdToLink}
              setSelectedProjectIdToLink={setSelectedProjectIdToLink}
              linkProjectMutation={linkProjectMutation}
              unlinkProjectMutation={unlinkProjectMutation}
              linkedHabits={linkedHabits}
              unlinkedHabits={unlinkedHabits}
              selectedHabitIdToLink={selectedHabitIdToLink}
              setSelectedHabitIdToLink={setSelectedHabitIdToLink}
              linkHabitMutation={linkHabitMutation}
              unlinkHabitMutation={unlinkHabitMutation}
              logHabitMutation={logHabitMutation}
            />

            {/* Reflection & Progress History (Visual Timeline) */}
            {snapshots.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold tracking-normal text-secondary flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-accent" />
                    <span>Progress & Reflection History</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-secondary text-xs font-mono font-medium border border-border/60">
                      {snapshots.length}
                    </span>
                  </h4>
                </div>

                <div className="space-y-3 pt-1">
                  {[...snapshots].reverse().map((s, i) => {
                    const isLatest = i === 0;
                    const isBaseline = s.progress === 0 && !s.notes;
                    return (
                      <div key={i} className="flex items-start gap-3 group relative">
                        {/* Timeline Node Column */}
                        <div className="flex flex-col items-center self-stretch shrink-0 pt-3.5 w-4">
                          <span
                            className={cn(
                              'w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125 z-10',
                              isLatest
                                ? 'bg-accent ring-3 ring-accent/20'
                                : s.progress >= 100
                                ? 'bg-success-fg ring-2 ring-success-fg/20'
                                : 'bg-muted-fg/40'
                            )}
                          />
                          {i < snapshots.length - 1 && (
                            <div className="w-[1.5px] flex-1 bg-gradient-to-b from-accent/30 via-border/80 to-border/40 mt-1.5" />
                          )}
                        </div>

                        {/* Timeline Card */}
                        <div className="flex-1 min-w-0 krama-card p-3.5 rounded-xl border border-border/80 bg-surface/70 hover:border-accent/40 transition-colors shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-primary">
                                {new Date(s.date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              {isLatest && (
                                <span className="px-1.5 py-0.2 rounded text-xs font-mono font-semibold bg-accent-subtle text-accent-fg border border-accent/20">
                                  Current
                                </span>
                              )}
                            </div>

                            <span
                              className={cn(
                                'text-xs font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums',
                                s.progress >= 100
                                  ? 'bg-success-bg text-success-fg border-success-border'
                                  : s.progress > 0
                                  ? 'bg-accent-subtle text-accent-fg border-accent/20'
                                  : 'bg-surface-hover text-secondary border-border'
                              )}
                            >
                              {Math.round(s.progress)}%
                            </span>
                          </div>

                          {s.notes ? (
                            <div className="mt-2 pt-2 border-t border-border/50 text-xs text-primary leading-relaxed flex items-start gap-2 bg-surface/50 p-2.5 rounded-lg">
                              <MessageSquareQuote className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                              <p className="italic font-sans text-secondary">{s.notes}</p>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-xs text-muted font-sans flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-muted shrink-0" />
                              <span>{isBaseline ? 'Initial baseline established' : 'Progress checkpoint logged'}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isLoading && (
              <p className="text-xs text-secondary text-center py-2">Loading details…</p>
            )}
          </div>
  );
}
