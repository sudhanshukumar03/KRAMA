import { ProjectDetailHeader } from './projects/ProjectDetailHeader';
import { useProjectDetailData } from './projects/useProjectDetailData';
import { projectDetailSummary } from './projects/projectDetailSummary';
import { ProjectDocuments, ProjectTimeline } from './projects/ProjectSupportingViews';
import { ProjectOverview } from './projects/ProjectOverview';
import type { ProjectStatus } from '../types/schema';
import { projectStatus, projectMetadata, errorMessage } from '../lib/utils';
import { Calendar, CheckCircle2, Clock, FileText, Folder, FolderKanban, KanbanSquare, LayoutDashboard, Settings } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { canHandlePageShortcut } from '../lib/keyboardShortcuts';
import { DeleteInitiativeModal, ProjectEditModal } from './projects/ProjectDialogs';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';
import { LoadingState } from './ui/LoadingState';

import { resolveIcon } from '../lib/iconResolver';
import { IssueCreateModal, KanbanBoard } from './KanbanBoard';

/**
 * Own project queries and mutations shared by Overview, Board, Brain and Timeline.
 * Pass derived values and actions to the overview so every tab uses the same data.
 */
export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'docs' | 'timeline' | 'settings'>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [createDirectiveModalOpen, setCreateDirectiveModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tag editing state
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  // Status dropdown in Project Details
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canHandlePageShortcut(e) || editModalOpen || deleteModalOpen || createDirectiveModalOpen) return;

      if (e.key === '1' || e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setActiveTab('overview');
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setActiveTab('board');
      } else if (e.key === '3' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setActiveTab('docs');
      } else if (e.key === '4' || e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setActiveTab('timeline');
      } else if (e.key === '5' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setActiveTab('settings');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setCreateDirectiveModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editModalOpen, deleteModalOpen, createDirectiveModalOpen]);

  const { projects, pError, retryProjects, issues, iLoading, iError, retryIssues, pages, docsLoading, docsError, retryDocs,
    goals, goalsLoading, goalsError, retryGoals, project, projectLoading, projectError, retryProject,
    editProjectMutation, deleteProjectMutation, createDirectiveMutation } = useProjectDetailData({
      id,
      onEdited: () => setEditModalOpen(false),
      onDeleted: () => setDeleteModalOpen(false),
      onTaskCreated: () => setCreateDirectiveModalOpen(false),
    });

  if (projectLoading) {
    return <LoadingState variant="project-detail" title="Loading Strategic Project..." description="Aggregating roadmap milestones, execution tickets, and engineering documentation..." />;
  }

  if (projectError && ('status' in projectError ? projectError.status : undefined) !== 404) {
    return (
      <div className="p-8 font-sans">
        <ErrorState
          onRetry={() => { retryProjects(); retryIssues(); retryDocs(); retryGoals(); retryProject(); }}
          title="Failed to Load Project Telemetry"
          message="Could not retrieve project data from the server. Please verify network connectivity."
        />
      </div>
    );
  }

  if (!project) return (
    <div className="p-12 font-sans">
      <EmptyState icon={FolderKanban} description="Strategic project not found in workspace" />
      <div className="mt-6 flex justify-center">
        <BaseButton onClick={() => navigate('/app/projects')}>Return to Projects</BaseButton>
      </div>
    </div>
  );

  const { projectMilestones, tasksAvailable, projectIssues, projectDocs, projectGoal, completedIssues, openIssues,
    progressPct, daysSinceUpdate, urgentIssues, projectTargetDate, daysRemaining,
    riskStatus, riskBadgeClass, riskMessage } = projectDetailSummary(project, issues, pages, goals, iError, iLoading);

  const handleRunDiagnostic = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Run a strategic diagnostic for project "${project.name}". Status: ${project.status}. Problem Statement: ${project.problemStatement || 'N/A'}. Tickets: ${projectIssues.length} tickets (${urgentIssues.length} urgent/high priority). Progress: ${progressPct}%. Provide a concise strategic assessment and recommended next actions.`;
      const result = await api.ai.complete({
        message: prompt,
      });
      const summary = result.answer || 'Strategic assessment completed successfully.';
      toast.success('AI Strategic Diagnostic Complete', {
        description: summary,
      });
    } catch (err) {
      toast.error('Diagnostic failed', {
        description: errorMessage(err, 'Please try again.'),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickStatusChange = (newStatus: ProjectStatus) => {
    setStatusDropdownOpen(false);
    editProjectMutation.mutate({
      name: project.name,
      problemStatement: project.problemStatement || '',
      status: newStatus,
      targetDate: (() => { const d = project.targetDate || projectMetadata(project.metadata).targetDate; return d ? new Date(d).toISOString() : ''; })(),
      icon: project.icon,
      goalId: project.goalId || null,
      tags: projectMetadata(project.metadata).tags || []
    });
  };

  const projectTags = projectMetadata(project.metadata).tags;

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagText.trim()) return;
    const tag = newTagText.trim().toLowerCase();
    if (!projectTags.includes(tag)) {
      const updated = [...projectTags, tag];
      editProjectMutation.mutate({
        name: project.name,
        problemStatement: project.problemStatement || '',
        status: projectStatus(project.status),
        targetDate: (() => { const d = project.targetDate || projectMetadata(project.metadata).targetDate; return d ? new Date(d).toISOString() : ''; })(),
        icon: project.icon,
        goalId: project.goalId || null,
        tags: updated
      });
    }
    setNewTagText('');
    setTagInputOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = projectTags.filter(t => t !== tagToRemove);
    editProjectMutation.mutate({
      name: project.name,
      problemStatement: project.problemStatement || '',
      status: projectStatus(project.status),
      targetDate: (() => { const d = project.targetDate || projectMetadata(project.metadata).targetDate; return d ? new Date(d).toISOString() : ''; })(),
      icon: project.icon,
      goalId: project.goalId || null,
      tags: updated
    });
  };


  return (
    <div className={cn("workspace-project-detail flex flex-col h-full bg-canvas animate-in fade-in duration-150 font-sans text-primary", activeTab === 'board' ? "overflow-hidden" : "overflow-y-auto pb-24")}>

      {/* MODALS */}
      {(pError || iError || docsError || goalsError) && <ErrorState title="Some linked details are unavailable" message="This project remains available. Retry to load its navigation list, tasks, documents or goal links." onRetry={() => { if (pError) retryProjects(); if (iError) retryIssues(); if (docsError) retryDocs(); if (goalsError) retryGoals(); }} />}
      <ProjectEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={(data) => editProjectMutation.mutate(data)}
        isSubmitting={editProjectMutation.isPending}
        initialData={project}
        goals={goals}
        goalsUnavailable={goalsError || goalsLoading}
      />

      <DeleteInitiativeModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => deleteProjectMutation.mutate()}
        isDeleting={deleteProjectMutation.isPending}
        initiativeName={project.name}
      />

      <IssueCreateModal
        open={createDirectiveModalOpen}
        initialStatus="BACKLOG"
        defaultProjectId={project.id}
        allIssues={issues}
        projects={projects}
        onClose={() => setCreateDirectiveModalOpen(false)}
        onSubmit={(data) => createDirectiveMutation.mutate(data)}
        isSubmitting={createDirectiveMutation.isPending}
      />

      <ProjectDetailHeader project={project} projects={projects} onEdit={() => setEditModalOpen(true)} onDelete={() => setDeleteModalOpen(true)} />

      {/* 2. MAIN CONTAINER */}
      <div className={cn("workspace-project-content px-6 md:px-8 pt-6 pb-2", activeTab === 'board' && "flex-1 min-h-0 flex flex-col p-0")}>

        {/* HERO BANNER CARD (High-Torque Cockpit Telemetry Console) */}
        {activeTab !== 'board' && (
          <div className="krama-card p-6 md:p-7 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left Column: Icon + Name + Description + Telemetry */}
              <div className="flex items-start gap-4 md:gap-5">
                <div
                  onClick={() => setEditModalOpen(true)}
                  title="Click to edit project settings (E)"
                  className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-accent-subtle text-accent-fg border border-accent/25 flex items-center justify-center shrink-0 shadow-resting cursor-pointer hover:border-accent/50 hover:bg-accent-subtle/80 active:scale-[0.98] transition-all"
                >
                  {React.createElement(resolveIcon(project.icon || 'FolderKanban'), { className: "w-7 h-7 stroke-[1.75]" })}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-display font-bold text-primary tracking-tight font-sans uppercase">
                      {project.name}
                    </h1>
                    <span className={cn(
                      "font-mono text-badge font-bold px-2 py-0.5 rounded uppercase tracking-wider border",
                      project.status === 'active' ? "bg-accent-subtle text-accent-fg border-accent/30" :
                      project.status === 'shipped' ? "bg-success-bg text-success-fg border-success-border" :
                      project.status === 'completed' ? "bg-success-bg text-success-fg border-success-border" :
                      project.status === 'paused' ? "bg-danger-bg text-danger-fg border-danger-border" :
                      project.status === 'archived' ? "bg-surface-hover text-secondary border-border" :
                      "bg-warning-bg text-warning-fg border-warning-border"
                    )}>
                      {project.status || 'IDEA'}
                    </span>
                  </div>

                  <p className="text-body text-secondary font-sans leading-relaxed max-w-2xl">
                    {project.problemStatement || "Bring the tasks, notes, and milestones for this outcome together."}
                  </p>

                  {/* Telemetry Row */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-caption font-mono text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-accent stroke-[1.75]" />
                      <span className="font-semibold text-primary tabular-nums">{openIssues.length > 0 ? `${openIssues.length} Open` : '0 Open'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success-fg stroke-[2]" />
                      <span className="font-semibold text-primary tabular-nums">{completedIssues.length} Done</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-warning-fg stroke-[1.75]" />
                      <span>{daysSinceUpdate === 0 ? 'Updated today' : <>Updated <strong className="text-primary font-semibold tabular-nums">{daysSinceUpdate}</strong> {daysSinceUpdate === 1 ? 'day' : 'days'} ago</>}</span>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          </div>
        )}

        {/* 3. TABS BAR */}
        <div
          role="tablist"
          aria-label="Project views"
          className={cn("flex items-center gap-2 sm:gap-6 border-b border-border px-1 font-sans", activeTab !== 'board' && "mt-6")}
          onKeyDown={(e) => {
            const tabsList = [
              { id: 'overview', label: 'Overview' },
              { id: 'board', label: 'Board' },
              { id: 'docs', label: 'Docs' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'settings', label: 'Settings' }
            ] as const;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const currentIndex = tabsList.findIndex(t => t.id === activeTab);
              const nextIndex = e.key === 'ArrowRight'
                ? (currentIndex + 1) % tabsList.length
                : (currentIndex - 1 + tabsList.length) % tabsList.length;
              const nextTab = tabsList[nextIndex];
              if (nextTab) {
                setActiveTab(nextTab.id);
                const el = document.getElementById(`project-tab-${nextTab.id}`);
                el?.focus();
              }
            }
          }}
        >
          {([
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: null, shortcut: '1' },
            { id: 'board', label: 'Board', icon: KanbanSquare, count: tasksAvailable ? projectIssues.length : undefined, shortcut: '2' },
            { id: 'docs', label: 'Docs', icon: FileText, count: docsError || docsLoading ? undefined : projectDocs.length, shortcut: '3' },
            { id: 'timeline', label: 'Timeline', icon: Calendar, count: null, shortcut: '4' },
            { id: 'settings', label: 'Settings', icon: Settings, count: null, shortcut: '5' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              id={`project-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`project-tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-3 text-caption font-semibold transition-all cursor-pointer -mb-px relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-t",
                activeTab === tab.id
                  ? "border-b-2 border-accent text-primary font-bold"
                  : "text-secondary hover:text-primary"
              )}
              title={`Switch to ${tab.label} (Press ${tab.shortcut})`}
            >
              <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-accent" : "text-muted")} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-secondary border border-border text-badge font-mono font-medium tabular-nums">
                  {tab.count}
                </span>
              )}

            </button>
          ))}
        </div>

        {/* 4. TAB CONTENTS */}

        {/* OVERVIEW TAB (2-Column Grid) */}
        {!tasksAvailable && ['overview', 'board', 'timeline'].includes(activeTab) && (iLoading ? <LoadingState title="Loading project tasks..." /> : <ErrorState title="Project tasks are unavailable" message="You can still edit the project or use its documents and settings." onRetry={() => { void retryIssues(); }} />)}
        {activeTab === 'overview' && tasksAvailable && (
          <div role="tabpanel" id="project-tabpanel-overview" aria-labelledby="project-tab-overview" tabIndex={0} className="focus:outline-none">
            <ProjectOverview
              project={project}
              projectDocs={projectDocs}
              documentsAvailable={!docsError && !docsLoading}
              projectIssues={projectIssues}
              completedIssues={completedIssues}
              progressPct={progressPct}
              projectGoal={projectGoal}
              riskStatus={riskStatus}
              riskBadgeClass={riskBadgeClass}
              riskMessage={riskMessage}
              handleRunDiagnostic={handleRunDiagnostic}
              isAnalyzing={isAnalyzing}
              setActiveTab={setActiveTab}
              setCreateDirectiveModalOpen={setCreateDirectiveModalOpen}
              statusMenuRef={statusMenuRef}
              statusDropdownOpen={statusDropdownOpen}
              setStatusDropdownOpen={setStatusDropdownOpen}
              handleQuickStatusChange={handleQuickStatusChange}
              projectTags={projectTags}
              tagInputOpen={tagInputOpen}
              handleAddTag={handleAddTag}
              newTagText={newTagText}
              setNewTagText={setNewTagText}
              setTagInputOpen={setTagInputOpen}
              handleRemoveTag={handleRemoveTag}
              urgentIssues={urgentIssues}
            />
          </div>
        )}

        {/* BOARD TAB (Unified Execution Board locked to current project) */}
        {activeTab === 'board' && tasksAvailable && (
          <div role="tabpanel" id="project-tabpanel-board" aria-labelledby="project-tab-board" tabIndex={0} className="flex-1 h-full min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-150 focus:outline-none">
            <KanbanBoard lockedProjectId={project.id} hideHeader={true} />
          </div>
        )}

        {activeTab === 'docs' && (
          <div role="tabpanel" id="project-tabpanel-docs" aria-labelledby="project-tab-docs" tabIndex={0} className="focus:outline-none">
            {docsLoading ? <p role="status">Loading documents...</p> : docsError ? <ErrorState title="Could not load project documents" onRetry={() => { void retryDocs(); }} /> : <ProjectDocuments documents={projectDocs} projectId={project.id} />}
          </div>
        )}

        {activeTab === 'timeline' && tasksAvailable && (
          <div role="tabpanel" id="project-tabpanel-timeline" aria-labelledby="project-tab-timeline" tabIndex={0} className="focus:outline-none">
            <ProjectTimeline projectTargetDate={projectTargetDate} daysRemaining={daysRemaining} projectMilestones={projectMilestones} projectIssues={projectIssues} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div role="tabpanel" id="project-tabpanel-settings" aria-labelledby="project-tab-settings" tabIndex={0} className="max-w-4xl space-y-6 animate-in fade-in duration-150 font-sans mt-6 focus:outline-none">
            <div className="krama-card p-6 space-y-6">
              <div>
                <h3 className="text-section font-bold text-primary">Project Settings & Metadata</h3>
                <p className="text-sm text-secondary leading-relaxed mt-2">Update this project’s details, dates and linked goal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/60 text-caption">
                <div className="p-4 rounded-xl border border-border bg-surface-hover/30 space-y-2">
                  <span className="font-bold text-primary">Edit Scope & Details</span>
                  <p className="text-secondary text-caption leading-relaxed">Modify project name, problem statement, OKR bridge, and target horizon date.</p>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditModalOpen(true)}
                    className="mt-2 text-caption"
                  >
                    Open Settings Editor
                  </BaseButton>
                </div>

                <div className="p-4 rounded-xl border border-danger-border bg-danger-bg/20 space-y-2">
                  <span className="font-bold text-danger-fg">Danger Zone</span>
                  <p className="text-secondary text-caption leading-relaxed">Hide this project and its tasks and milestones. Undo restores the deleted project.</p>
                  <BaseButton
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteModalOpen(true)}
                    className="mt-2 text-caption"
                  >
                    Delete Project
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
