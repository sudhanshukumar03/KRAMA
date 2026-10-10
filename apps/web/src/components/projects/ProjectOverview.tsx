import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Check, CheckSquare, ChevronDown, Clock, FileText, Folder, Info, LayoutGrid, Pencil, Plus, Settings, Sparkles, Tag, Target, User, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BaseButton } from '../ui/BaseButton';
import { CompactGoalCard } from './CompactGoalCard';
import { resolveIcon } from '../../lib/iconResolver';
import type { ProjectWithRelations, DocumentWithRelations, Issue, GoalWithRelations, ProjectStatus } from '../../types/schema';

interface Props {
  project: ProjectWithRelations;
  projectDocs: DocumentWithRelations[];
  projectIssues: Issue[];
  completedIssues: Issue[];
  progressPct: number;
  projectGoal: GoalWithRelations | null | undefined;
  isPastDue: boolean; hasUrgentBlockers: boolean;
  riskStatus: string;
  riskBadgeClass: string;
  riskMessage: string;
  handleRunDiagnostic: () => Promise<void>;
  isAnalyzing: boolean;
  setActiveTab: (tab: 'overview' | 'board' | 'docs' | 'timeline' | 'settings') => void;
  setEditModalOpen: (open: boolean) => void;
  setCreateDirectiveModalOpen: (open: boolean) => void;
  statusMenuRef: React.RefObject<HTMLDivElement | null>;
  statusDropdownOpen: boolean;
  setStatusDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleQuickStatusChange: (status: ProjectStatus) => void;
  daysSinceUpdate: number;
  projectTags: string[];
  tagInputOpen: boolean;
  handleAddTag: React.FormEventHandler;
  newTagText: string;
  setNewTagText: (text: string) => void;
  setTagInputOpen: (open: boolean) => void;
  handleRemoveTag: (tag: string) => void;
  urgentIssues: Issue[];
}

export function ProjectOverview({ isPastDue, hasUrgentBlockers, project, projectDocs, projectIssues, completedIssues, progressPct, projectGoal, riskStatus, riskBadgeClass, riskMessage, handleRunDiagnostic, isAnalyzing, setActiveTab, setEditModalOpen, setCreateDirectiveModalOpen, statusMenuRef, statusDropdownOpen, setStatusDropdownOpen, handleQuickStatusChange, daysSinceUpdate, projectTags, tagInputOpen, handleAddTag, newTagText, setNewTagText, setTagInputOpen, handleRemoveTag, urgentIssues }: Props) {
  const navigate = useNavigate();
  return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

            {/* LEFT COLUMN (Wide 8-cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* CARD 1: AI Strategic Risk Sentinel Card */}
              <div className="krama-card p-5 border-success-border/40 bg-success-bg/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-success-bg text-success-fg border border-success-border flex items-center justify-center shrink-0">
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
                            Create tickets in Kanban or link milestones to start tracking progress.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectIssues.slice(0, 3).map((issue) => (
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
                          {(['idea', 'active', 'paused', 'shipped', 'completed', 'archived'] as const).map(st => (
                            <button
                              key={st}
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
                    progressPct === 100 ? "bg-success-fg" :
                    isPastDue ? "bg-danger-fg" :
                    hasUrgentBlockers ? "bg-warning-fg" : "bg-success-fg"
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
  );
}
