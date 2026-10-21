import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckSquare, ChevronDown, Clock, FileText, Info, LayoutGrid, Plus, Settings, Bot, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BaseButton } from '../ui/BaseButton';
import { CompactGoalCard } from './CompactGoalCard';
import { resolveIcon } from '../../lib/iconResolver';
import type { ProjectWithRelations, DocumentWithRelations, Issue, GoalWithRelations, ProjectStatus } from '../../types/schema';

interface Props {
  project: ProjectWithRelations;
  projectDocs: DocumentWithRelations[];
  documentsAvailable?: boolean;
  projectIssues: Issue[];
  completedIssues: Issue[];
  progressPct: number;
  projectGoal: GoalWithRelations | null | undefined;
  riskStatus: string;
  riskBadgeClass: string;
  riskMessage: string;
  handleRunDiagnostic: () => Promise<void>;
  isAnalyzing: boolean;
  setActiveTab: (tab: 'overview' | 'board' | 'docs' | 'timeline' | 'settings') => void;
  setCreateDirectiveModalOpen: (open: boolean) => void;
  statusMenuRef: React.RefObject<HTMLDivElement | null>;
  statusDropdownOpen: boolean;
  setStatusDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleQuickStatusChange: (status: ProjectStatus) => void;
  projectTags: string[];
  tagInputOpen: boolean;
  handleAddTag: React.FormEventHandler;
  newTagText: string;
  setNewTagText: (text: string) => void;
  setTagInputOpen: (open: boolean) => void;
  handleRemoveTag: (tag: string) => void;
  urgentIssues: Issue[];
}

/**
 * Render the project summary from values supplied by ProjectDetail.
 * Editing actions are callbacks to the parent's mutations and dialog state.
 */
export function ProjectOverview({ project, projectDocs, documentsAvailable = true, projectIssues, completedIssues, progressPct, projectGoal, riskStatus, riskBadgeClass, riskMessage, handleRunDiagnostic, isAnalyzing, setActiveTab, setCreateDirectiveModalOpen, statusMenuRef, statusDropdownOpen, setStatusDropdownOpen, handleQuickStatusChange, projectTags, tagInputOpen, handleAddTag, newTagText, setNewTagText, setTagInputOpen, handleRemoveTag, urgentIssues }: Props) {
  const navigate = useNavigate();
  const openIssues = projectIssues.filter(issue => !['DONE', 'CANCELED'].includes(issue.status));
  return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

            {/* LEFT COLUMN (Wide 8-cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* CARD 1: AI Strategic Risk Sentinel Card */}
              <div className="krama-card p-5 border-success-border/40 bg-success-bg/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-success-bg text-success-fg border border-success-border flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-body font-bold text-primary flex flex-wrap items-center gap-2">
                      Project health
                      <span className={cn("px-2 py-0.5 rounded text-badge font-mono font-bold uppercase border tracking-wider", riskBadgeClass)}>
                        {riskStatus}
                      </span>
                    </h3>
                    <p className="text-sm text-secondary font-sans mt-2 leading-relaxed max-w-xl">
                      {riskMessage}
                      {urgentIssues.length > 0 && <span className="block mt-1">{urgentIssues.length} high or urgent task{urgentIssues.length === 1 ? '' : 's'}</span>}
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
                    <Bot className="w-3.5 h-3.5 text-accent" />
                    {isAnalyzing ? 'Analyzing...' : 'Ask AI for advice'}
                  </BaseButton>

                </div>
              </div>

              {/* SUBGRID: Notes & Open tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Subcard A: Notes */}
                <div className="krama-card p-5 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-surface-hover text-cat-routines border border-border flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 stroke-[1.75]" />
                        </div>
                        <h4 className="text-body font-bold text-primary">Notes</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('docs')}
                        className="text-badge font-mono font-bold uppercase text-accent hover:underline cursor-pointer flex items-center gap-1"
                      >
                        VIEW ALL →
                      </button>
                    </div>

                    <div className="py-5">
                      {!documentsAvailable ? <p className="text-caption text-secondary">Linked documents are unavailable.</p> : projectDocs.length === 0 ? (
                        <div className="text-center py-3">
                          <FileText className="w-8 h-8 text-muted stroke-[1.25] mx-auto mb-2 opacity-50" />
                          <h5 className="text-caption font-bold text-primary mb-1">No linked notes yet</h5>
                          <p className="text-caption text-muted max-w-[240px] mx-auto leading-relaxed">
                            Keep the notes and research for this project here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectDocs.slice(0, 3).map((doc) => (
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
                    <Plus className="w-3 h-3" /> Link or create note
                  </BaseButton>
                </div>

                {/* Subcard B: Open tasks */}
                <div className="krama-card p-5 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-surface-hover text-success-fg border border-border flex items-center justify-center shrink-0">
                          <CheckSquare className="w-3.5 h-3.5 stroke-[1.75]" />
                        </div>
                        <h4 className="text-body font-bold text-primary">Open tasks</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('board')}
                        className="text-badge font-mono font-bold uppercase text-accent hover:underline cursor-pointer flex items-center gap-1"
                      >
                        VIEW ALL →
                      </button>
                    </div>

                    <div className="py-5">
                      {openIssues.length === 0 ? (
                        <div className="text-center py-3">
                          <LayoutGrid className="w-8 h-8 text-muted stroke-[1.25] mx-auto mb-2 opacity-50" />
                          <h5 className="text-caption font-bold text-primary mb-1">No open tasks yet</h5>
                          <p className="text-caption text-muted max-w-[240px] mx-auto leading-relaxed">
                            Add the next step for this project.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {openIssues.slice(0, 3).map((issue) => (
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
                    title="Create task (C)"
                  >
                    <Plus className="w-3 h-3" /> New task
                  </BaseButton>
                </div>
              </div>

              {/* CARD 4: Task progress */}
              <div className="krama-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-success-bg text-success-fg border border-success-border flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <h4 className="text-body font-bold text-primary">
                      Task progress ({completedIssues.length})
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
                    {completedIssues.slice(0, 3).map((issue) => (
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
                  <h3 className="text-caption font-mono font-bold uppercase tracking-wider text-secondary">Linked goal</h3>
                  <CompactGoalCard goal={projectGoal} />
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (Sidebar 4-cols) */}
            <div className="lg:col-span-4 space-y-6">

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
                        aria-haspopup="listbox"
                        aria-expanded={statusDropdownOpen}
                        aria-label={`Change project status, currently ${project.status || 'open'}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-subtle text-accent-fg border border-accent/20 font-medium text-caption font-mono hover:bg-accent-subtle/80 transition-colors cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="capitalize">{project.status || 'Open'}</span>
                        <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
                      </button>

                      {statusDropdownOpen && (
                        <div role="listbox" aria-label="Select project status" className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption font-mono animate-in fade-in zoom-in-95 duration-100">
                          {(['idea', 'active', 'paused', 'shipped', 'completed', 'archived'] as const).map(st => (
                            <button
                              key={st}
                              role="option"
                              aria-selected={project.status === st}
                              onClick={() => handleQuickStatusChange(st)}
                              className="w-full px-3 py-1.5 text-left capitalize hover:bg-surface-hover flex items-center justify-between text-primary cursor-pointer text-caption"
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                  st === 'active' ? "bg-accent" :
                                  st === 'idea' ? "bg-warning-fg" :
                                  st === 'paused' ? "bg-danger-fg" :
                                  st === 'completed' ? "bg-sky-500" :
                                  st === 'archived' ? "bg-secondary/50" : "bg-success-fg"
                                )}></span>
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
                          <button onClick={() => handleRemoveTag(t)} aria-label={`Remove tag ${t}`} className="hover:text-danger-fg cursor-pointer text-muted hover:text-danger-fg">×</button>
                        </span>
                      ))}

                      {tagInputOpen ? (
                        <form onSubmit={handleAddTag} className="flex items-center gap-1">
                          <input
                            id="project-new-tag-input"
                            name="newTagText"
                            aria-label="New tag name"
                            type="text"
                            value={newTagText}
                            onChange={e => setNewTagText(e.target.value)}
                            placeholder="tag..."
                            autoFocus
                            className="w-20 px-2 py-0.5 text-badge font-mono bg-surface border border-accent rounded focus:outline-none text-primary"
                          />
                          <button type="submit" aria-label="Add tag" className="px-1.5 py-0.5 bg-accent text-on-accent rounded text-badge font-bold cursor-pointer" title="Add tag">✓</button>
                          <button type="button" aria-label="Cancel adding tag" onClick={() => { setTagInputOpen(false); setNewTagText(''); }} className="px-1 py-0.5 text-muted hover:text-primary rounded text-badge cursor-pointer" title="Cancel">✕</button>
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


            </div>
          </div>
  );
}
