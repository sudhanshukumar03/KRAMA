import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, FolderKanban } from 'lucide-react';
import type { DocumentWithRelations, IssueWithRelations, ProjectWithRelations } from '../../types/schema';
import { cn } from '../../lib/utils';
import { resolveIcon } from '../../lib/iconResolver';
import { EmptyState } from '../ui/EmptyState';
import { BaseButton } from '../ui/BaseButton';

export function ProjectDocuments({ documents, projectId }: { documents: DocumentWithRelations[]; projectId: string }) {
  const navigate = useNavigate();
  return (<div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-150 font-sans mt-6">
            {documents.map((doc) => (
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
            {documents.length === 0 && (
              <div className="col-span-full py-16 bg-surface/50 rounded-2xl border border-border border-dashed flex flex-col items-center justify-center gap-3">
                <EmptyState icon={FolderKanban} description="No engineering knowledge documents linked to this initiative" />
                <BaseButton
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/app/brain?projectId=${projectId}`)}
                >
                  Create Document in Brain
                </BaseButton>
              </div>
            )}
          </div>);
}

interface TimelineProps {
  projectTargetDate: string | null | undefined;
  daysRemaining: number | null;
  projectMilestones: NonNullable<ProjectWithRelations['milestones']>;
  projectIssues: IssueWithRelations[];
}
export function ProjectTimeline({ projectTargetDate, daysRemaining, projectMilestones, projectIssues }: TimelineProps) {
  return (<div className="max-w-5xl space-y-6 animate-in fade-in duration-150 font-sans mt-6">
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
          </div>);
}
