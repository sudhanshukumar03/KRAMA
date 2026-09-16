import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, ArrowLeft, Plus, CheckCircle2, Check, Clock, Target, AlertCircle, XCircle, ArrowUpCircle, FileText, Sparkles, CheckSquare, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { IconPicker } from './ui/IconPicker';
import { cn } from '../lib/utils';
import { computeGoalPace } from '../lib/goalUtils';
import type { GoalWithRelations } from '../types/schema';

import { resolveIcon } from '../lib/iconResolver';
import { ProjectLogo } from './ui/ProjectLogo';

interface ProjectEditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; problemStatement: string; status: string; targetDate: string; icon: string; goalId?: string | null }) => void;
  isSubmitting: boolean;
  initialData: any;
  goals?: any[];
}

function ProjectEditModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  goals = []
}: ProjectEditModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [problemStatement, setProblemStatement] = useState(initialData?.problemStatement || '');
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [goalId, setGoalId] = useState(initialData?.goalId || '');
  const [targetDate, setTargetDate] = useState(() => {
    if (initialData?.targetDate) return new Date(initialData.targetDate).toISOString().split('T')[0];
    return '';
  });
  const [icon, setIcon] = useState(initialData?.icon || 'FolderKanban');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setProblemStatement(initialData.problemStatement || '');
      setStatus(initialData.status || 'active');
      setGoalId(initialData.goalId || '');
      const tDate = initialData.targetDate || (initialData.metadata as any)?.targetDate;
      setTargetDate(tDate ? new Date(tDate).toISOString().split('T')[0] : '');
      setIcon(initialData.icon || 'FolderKanban');
    }
  }, [initialData]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      problemStatement: problemStatement.trim(),
      status,
      targetDate,
      icon,
      goalId: goalId || null,
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <IconPicker value={icon} onChange={setIcon} />
            <div>
              <h3 className="text-card text-primary mb-1">Edit Initiative Settings</h3>
              <p className="text-caption text-secondary font-mono">Configure roadmap alignment and technical scope</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Initiative Name <span className="text-danger-fg">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Krama OS Core"
              required
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all bg-surface font-sans"
            />
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Problem Statement / Technical Scope
            </label>
            <textarea
              value={problemStatement}
              onChange={e => setProblemStatement(e.target.value)}
              placeholder="Describe the objective, architectural constraints, and target outcomes..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none bg-surface font-sans"
            />
          </div>

          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
              Strategic OKR / Linked Goal
            </label>
            <select
              value={goalId}
              onChange={e => setGoalId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans cursor-pointer"
            >
              <option value="">None (Standalone Initiative)</option>
              {goals.map((g: any) => (
                <option key={g.id} value={g.id}>
                  🎯 {g.title} ({g.type?.toUpperCase() || 'OKR'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold cursor-pointer"
              >
                <option value="idea">💡 Idea / Discovery</option>
                <option value="active">⚡ Active Execution</option>
                <option value="paused">⏸️ Paused</option>
                <option value="shipped">🚀 Shipped / Live</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-mono font-bold text-primary uppercase mb-1.5 tracking-wider">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Initiative'}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'docs'>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: projects = [], isLoading: pLoading, isError: pError } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading, isError: iError } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const { data: pages = [], isLoading: docsLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });

  const project = projects.find(p => p.id === id);

  const editProjectMutation = useMutation({
    mutationFn: (data: { name: string; problemStatement: string; status: string; targetDate: string; icon: string; goalId?: string | null }) => {
      if (!project) throw new Error('Project not loaded');
      return api.projects.update(project.id, {
        name: data.name,
        problemStatement: data.problemStatement,
        status: data.status,
        icon: data.icon,
        goalId: data.goalId || null,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        version: project.version,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setEditModalOpen(false);
      toast.success('Initiative settings updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update initiative');
    }
  });

  if (pLoading || iLoading || docsLoading || goalsLoading) {
    return <LoadingState variant="project-detail" title="Loading Strategic Initiative..." description="Aggregating roadmap milestones, sprint tickets, and engineering documentation..." />;
  }

  if (pError || iError) {
    return (
      <div className="p-8 font-sans">
        <ErrorState
          title="Failed to Load Initiative Telemetry"
          message="Could not retrieve initiative data from the server. Please verify network connectivity."
        />
      </div>
    );
  }

  if (!project) return (
    <div className="p-12 font-sans">
      <EmptyState icon={FolderKanban} description="Strategic initiative not found in workspace" />
      <div className="mt-6 flex justify-center">
        <BaseButton onClick={() => navigate('/app/projects')}>Return to Portfolio Tree</BaseButton>
      </div>
    </div>
  );

  const projectIssues = project.tasks || issues.filter(i => i.projectId === project.id);
  const projectDocs = project.pages || pages.filter(p => p.linkedProjectId === project.id);
  const projectGoal = project.goal || (project.goalId ? goals.find(g => g.id === project.goalId) : null);

  const completedIssues = projectIssues.filter((i: any) => i.status === "DONE" || i.status === "REVIEW");
  const openIssues = projectIssues.filter((i: any) => i.status !== "DONE" && i.status !== "REVIEW");
  const progressPct = projectIssues.length > 0 ? Math.round((completedIssues.length / projectIssues.length) * 100) : 0;

  // Calculate days since last update
  const daysSinceUpdate = Math.max(0, Math.floor((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24)));

  // Real risk and deadline telemetry
  const urgentIssues = openIssues.filter((i: any) => i.priority === "URGENT" || i.priority === "HIGH");
  const projectTargetDate = project.targetDate || (project.metadata as any)?.targetDate;
  const daysRemaining = projectTargetDate ? Math.ceil((new Date(projectTargetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const isPastDue = daysRemaining !== null && daysRemaining < 0 && progressPct < 100;
  const isApproaching = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && progressPct < 80;
  const hasUrgentBlockers = urgentIssues.length > 0;

  let riskStatus = 'Nominal Velocity';
  let riskBadgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  let riskMessage = `Execution velocity is tracking strongly at ${progressPct}%. Milestones and sprint deliverables are well balanced.`;

  if (progressPct === 100) {
    riskStatus = 'Delivered & Complete';
    riskBadgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    riskMessage = 'Initiative fully executed (100% completion). Recommended action: Run retrospective in Decision Log.';
  } else if (isPastDue) {
    riskStatus = 'Critical: Overdue';
    riskBadgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    riskMessage = `Target horizon elapsed ${Math.abs(daysRemaining!)} days ago with ${openIssues.length} open tickets remaining. Immediate intervention required.`;
  } else if (isApproaching) {
    riskStatus = 'High Risk: Approaching Deadline';
    riskBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    riskMessage = `Target delivery date is in ${daysRemaining} days with ${progressPct}% completed. Requires acceleration of ${openIssues.length} remaining tickets.`;
  } else if (hasUrgentBlockers) {
    riskStatus = 'Attention: High Priority Tickets';
    riskBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    riskMessage = `${urgentIssues.length} high/urgent priority ticket(s) currently open. Focus daily sprints on clearing these blockers first.`;
  } else if (projectIssues.length === 0) {
    riskStatus = 'Scope Definition Phase';
    riskBadgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    riskMessage = 'No execution tickets created yet. Add tickets to Kanban or link Sprint directives to establish tracking.';
  }

  const handleRunDiagnostic = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      toast.success('AI Strategic Diagnostic Complete', {
        description: `Evaluated ${projectIssues.length} tickets and timeline. ${hasUrgentBlockers
            ? `Immediate priority: resolve "${urgentIssues[0].title}".`
            : progressPct === 100
              ? 'All milestone directives delivered. No blockers detected.'
              : 'Sprint velocity is on target. Maintain current ticket burn rate.'
          }`
      });
    }, 600);
  };

  // Kanban Columns Logic
  const columns = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];
  const getIssuesByStatus = (status: string) => projectIssues.filter((i: any) => i.status === status);

  return (
    <div className="flex flex-col h-full bg-canvas animate-in fade-in duration-150 pb-24 overflow-y-auto font-sans text-primary">

      <ProjectEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={(data) => editProjectMutation.mutate(data)}
        isSubmitting={editProjectMutation.isPending}
        initialData={project}
        goals={goals}
      />

      {/* COMMAND CENTER INITIATIVE HEADER (#2563EB Indigo Identity) */}
      <div className="px-6 md:px-8 pt-6 border-b border-border bg-surface shrink-0 shadow-2xs">
        <Link to="/app/projects" className="flex items-center gap-1.5 text-caption font-mono font-bold text-secondary hover:text-primary transition-colors mb-5 w-fit uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4 stroke-[1.5]" /> Return to Projects Tree
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-4">
            <ProjectLogo
              icon={project.icon}
              status={project.status}
              size="lg"
              onClick={() => setEditModalOpen(true)}
              title="Click to edit initiative settings"
              className="mt-0.5"
            />
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h1 className="text-title text-primary mb-4 ">{project.name}</h1>
                <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border shadow-2xs",
                  project.status === 'active' ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 animate-pulse" : "bg-surface-hover text-secondary border-border"
                )}>
                  {project.status}
                </span>
              </div>
              {project.problemStatement && (
                <p className="text-caption md:text-body text-secondary font-normal max-w-4xl leading-relaxed">{project.problemStatement}</p>
              )}
            </div>
          </div>
          <BaseButton onClick={() => setEditModalOpen(true)} className="shrink-0 cursor-pointer">
            Edit Initiative
          </BaseButton>
        </div>

        {/* TELEMETRY SCORECARD STRIP */}
        <div className="flex flex-wrap items-center gap-6 py-3.5 border-t border-border text-caption font-mono">
          <div className="flex items-center gap-2 text-secondary">
            <FolderKanban className="w-4 h-4 text-[#2563EB] stroke-[1.5]" />
            <span>
              <strong className="text-primary font-bold">{openIssues.length}</strong> Open / <strong className="text-[#109868] font-bold">{completedIssues.length}</strong> Done Issues
            </span>
          </div>
          <div className="flex items-center gap-2 text-secondary">
            <FileText className="w-4 h-4 text-[#7C3AED] stroke-[1.5]" />
            <span>
              <strong className="text-primary font-bold">{projectDocs.length}</strong> Linked Docs
            </span>
          </div>
          <div className="flex items-center gap-2 text-secondary">
            <Clock className="w-4 h-4 text-[#F59E0B] stroke-[1.5]" />
            <span>
              Updated <strong className="text-primary font-bold">{daysSinceUpdate}</strong> days ago
            </span>
          </div>
          {projectGoal && (
            <div
              onClick={() => navigate('/app/goals')}
              className="flex items-center gap-2 bg-[#109868]/10 hover:bg-[#109868]/20 border border-[#109868]/30 transition-colors px-3 py-1 rounded-lg text-[#109868] font-mono font-bold text-caption cursor-pointer ml-auto shadow-2xs"
            >
              <Target className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="uppercase tracking-wider">OKR: {projectGoal.title}</span>
            </div>
          )}
        </div>

        {/* MISSION CONTROL TABS */}
        <div className="flex gap-8 mt-1 border-t border-border">
          {(['overview', 'board', 'docs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("py-3.5 text-caption font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-secondary hover:text-primary"
              )}
            >
              {tab} {tab === 'board' && `(${projectIssues.length})`} {tab === 'docs' && `(${projectDocs.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="flex-1 p-6 md:p-8 bg-canvas">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="max-w-5xl space-y-8 animate-in fade-in duration-150">

            {/* AI Strategic Risk Sentinel Bar */}
            <div className="bg-gradient-to-r from-[#7C3AED]/15 via-surface to-transparent border border-[#7C3AED]/20 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 text-[#7C3AED] flex items-center justify-center shrink-0 border border-[#7C3AED]/30">
                  <Sparkles className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-card text-primary mb-1.5 flex items-center gap-2">
                    AI Strategic Risk Sentinel
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border", riskBadgeClass)}>
                      {riskStatus}
                    </span>
                  </h3>
                  <p className="text-caption text-secondary font-mono mt-0.5 leading-relaxed max-w-3xl">
                    {riskMessage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                <BaseButton
                  onClick={handleRunDiagnostic}
                  disabled={isAnalyzing}
                  variant="secondary"
                  className="text-caption py-2 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
                  {isAnalyzing ? 'Analyzing...' : 'Run AI Diagnostic'}
                </BaseButton>
                <BaseButton onClick={() => setActiveTab('board')} variant="secondary" className="shrink-0 text-caption py-2 cursor-pointer shadow-2xs">
                  Launch Kanban &rarr;
                </BaseButton>
              </div>
            </div>

            {/* Problem Statement & Scope Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs">
              <h3 className="text-card text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#2563EB] stroke-[1.5]" /> Problem Statement & Technical Scope
              </h3>
              <p className="text-primary text-body font-normal leading-relaxed">{project.problemStatement || "No problem statement defined for this initiative."}</p>
            </div>

            {/* Linked Strategic Goal Bridge */}
            {projectGoal && (
              <div className="space-y-3">
                <h3 className="text-card text-primary mb-2 uppercase tracking-wider">Strategic Goal Bridge (Linked OKR)</h3>
                <CompactGoalCard goal={projectGoal} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Recent Docs Preview */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-card text-primary mb-2 uppercase tracking-wider">Linked Knowledge Docs</h3>
                  <button onClick={() => setActiveTab('docs')} className="text-badge font-mono font-bold uppercase tracking-wider text-[#2563EB] hover:underline cursor-pointer">
                    View all ({projectDocs.length}) &rarr;
                  </button>
                </div>
                <div className="divide-y divide-border border border-border rounded-2xl bg-surface shadow-xs overflow-hidden">
                  {projectDocs.slice(0, 3).map((doc: any) => (
                    <div key={doc.id} onClick={() => navigate(`/app/brain`)} className="p-4 hover:bg-surface-hover transition-colors flex items-center gap-3.5 cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-surface-hover border border-border flex items-center justify-center shrink-0 group-hover:bg-[#7C3AED]/10 :bg-[#A78BFA]/10 transition-colors">
                        {React.createElement(resolveIcon(doc.icon), { className: "w-4 h-4 text-[#7C3AED] group-hover:scale-110 transition-transform" })}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-body text-primary truncate group-hover:text-[#7C3AED] :text-[#A78BFA] transition-colors">{doc.title}</span>
                        <span className="text-[10px] font-mono text-secondary mt-0.5">Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {projectDocs.length === 0 && <div className="p-8 text-center text-caption text-secondary font-mono italic">No linked engineering knowledge documents</div>}
                </div>
              </div>

              {/* Recent Execution Issues Preview */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-card text-primary mb-2 uppercase tracking-wider">Active Execution Tickets</h3>
                  <button onClick={() => setActiveTab('board')} className="text-badge font-mono font-bold uppercase tracking-wider text-[#2563EB] hover:underline cursor-pointer">
                    View all ({projectIssues.length}) &rarr;
                  </button>
                </div>
                <div className="divide-y divide-border border border-border rounded-2xl bg-surface shadow-xs overflow-hidden">
                  {projectIssues.slice(0, 3).map((issue: any) => (
                    <div key={issue.id} onClick={() => setActiveTab('board')} className="p-4 hover:bg-surface-hover transition-colors flex items-center justify-between cursor-pointer group">
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="font-bold text-body text-primary truncate group-hover:text-[#2563EB] :text-[#2563EB] transition-colors">{issue.title}</span>
                      </div>
                      <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0",
                        issue.priority === "URGENT" ? "bg-error-tint text-error border-error-tint" : "bg-surface-hover text-secondary border-border/80"
                      )}>
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {projectIssues.length === 0 && <div className="p-8 text-center text-caption text-secondary font-mono italic">No open execution tickets in initiative</div>}
                </div>
              </div>
            </div>

            {/* Delivered Milestones & Completed Directives Section */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-card text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#109868] stroke-[1.5]" /> Delivered Milestones & Completed Directives ({completedIssues.length})
                </h3>
                <span className="text-badge font-mono text-muted">
                  {progressPct}% Completed
                </span>
              </div>

              <div className="divide-y divide-border border border-border rounded-2xl bg-surface shadow-xs overflow-hidden">
                {completedIssues.map((issue: any) => (
                  <div key={issue.id} className="p-4 hover:bg-surface-hover/60 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#109868]/15 border border-[#109868]/30 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#109868] stroke-[2]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-body font-medium text-primary line-through decoration-border truncate">
                          {issue.title}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-muted mt-0.5">
                          <span>Completed {new Date(issue.updatedAt).toLocaleDateString()}</span>
                          {issue.estimate && (
                            <>
                              <span>•</span>
                              <span>{issue.estimate}h estimated</span>
                            </>
                          )}
                          {issue.priority && (
                            <>
                              <span>•</span>
                              <span className="uppercase text-[10px]">{issue.priority}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#109868]/10 text-[#109868] border border-[#109868]/20 shrink-0">
                      Delivered
                    </span>
                  </div>
                ))}
                {completedIssues.length === 0 && (
                  <div className="p-8 text-center text-caption text-secondary font-mono italic">
                    No deliverables completed yet. Complete tasks on the Kanban board or mark directives as DONE to populate the project delivery log.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BOARD TAB (Filtered Kanban with Linear Minimal Cards & Subtask Bars) */}
        {activeTab === 'board' && (
          <div className="flex flex-col h-full animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-5 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
              <span className="text-caption font-mono text-secondary font-bold">
                Showing <strong className="text-primary">{projectIssues.length}</strong> engineering tickets across 7 execution columns
              </span>
              <BaseButton onClick={() => navigate('/app/board')} className="text-caption py-2 cursor-pointer">
                <Plus className="w-4 h-4 mr-1.5 stroke-[1.5]" /> New Initiative Ticket
              </BaseButton>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-6 items-start">
              {columns.map(status => {
                const columnIssues = getIssuesByStatus(status);
                return (
                  <div key={status} className="w-[310px] flex-shrink-0 flex flex-col bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
                    <div className="p-3.5 border-b border-border flex justify-between items-center bg-surface-hover/80">
                      <span className="text-caption font-mono font-bold uppercase tracking-wider text-primary">{status.replace('_', ' ')}</span>
                      <span className="text-caption font-mono font-bold bg-surface text-primary border border-border px-2.5 py-0.5 rounded-md shadow-2xs">{columnIssues.length}</span>
                    </div>

                    <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-surface-hover/30 min-h-[380px] max-h-[65vh]">
                      {columnIssues.map((issue: any) => {
                        const subTasks = issue.childTasks || [];
                        const completedSubs = subTasks.filter((c: any) => c.status === "DONE" || c.status === "REVIEW").length;
                        const hasSubs = subTasks.length > 0;

                        return (
                          <div
                            key={issue.id}
                            onClick={() => navigate('/app/board')}
                            className="bg-surface border border-border rounded-xl p-4 shadow-2xs hover:border-[#2563EB] :border-[#2563EB] hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col gap-3"
                          >
                            <div className="flex items-start justify-end gap-2">
                              <span className={cn("text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                                issue.priority === "URGENT" ? "bg-error-tint text-error border-error-tint" :
                                  issue.priority === "HIGH" ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" : "bg-surface-hover text-secondary border-border/80"
                              )}>
                                {issue.priority}
                              </span>
                            </div>

                            <div className="font-bold text-body text-primary leading-snug group-hover:text-[#2563EB] :text-[#2563EB] transition-colors line-clamp-2 font-sans">
                              {issue.title}
                            </div>

                            {/* Sub-task Progress Bar */}
                            {hasSubs && (
                              <div className="space-y-1.5 pt-1.5 border-t border-border/60 font-mono">
                                <div className="flex justify-between items-center text-[10px] text-secondary">
                                  <span className="flex items-center gap-1.5 font-bold"><CheckSquare className="w-3.5 h-3.5 text-[#2563EB] stroke-[1.5]" /> Subtasks</span>
                                  <span className="font-bold text-primary">{completedSubs}/{subTasks.length}</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border/60">
                                  <div
                                    className="h-full bg-[#2563EB] transition-all duration-300"
                                    style={{ width: `${(completedSubs / subTasks.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] font-mono text-secondary pt-1.5 border-t border-border/60">
                              <span>{issue.assignee ? 'Assigned' : 'Unassigned'}</span>
                              {issue.estimateMinutes && <span className="bg-surface-hover px-2 py-0.5 rounded border border-border/80 font-bold text-primary">{issue.estimateMinutes}h pt</span>}
                            </div>
                          </div>
                        );
                      })}
                      {columnIssues.length === 0 && (
                        <div className="h-32 border border-dashed border-border rounded-xl flex items-center justify-center text-caption font-mono font-bold text-secondary bg-surface/50">
                          Empty Column
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DOCS TAB */}
        {activeTab === 'docs' && (
          <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-150 font-sans">
            {projectDocs.map((doc: any) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/app/brain`)}
                className="bg-surface border border-border p-6 rounded-2xl hover:border-[#7C3AED] :border-[#A78BFA] transition-all cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-md min-h-[180px] gap-5 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#7C3AED] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div>
                  <div className="mb-4 group-hover:scale-110 transition-transform w-fit p-2.5 rounded-xl bg-surface-hover border border-border/80">{React.createElement(resolveIcon(doc.icon), { className: "w-6 h-6 text-[#7C3AED]" })}</div>
                  <div className="font-bold text-card text-primary leading-snug group-hover:text-[#7C3AED] :text-[#A78BFA] transition-colors">{doc.title}</div>
                </div>
                <div className="pt-3.5 border-t border-border/60 flex items-center justify-between text-caption font-mono text-secondary">
                  <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  <span className="text-[#7C3AED] font-bold group-hover:underline flex items-center gap-1">Open Doc <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" /></span>
                </div>
              </div>
            ))}
            {projectDocs.length === 0 && (
              <div className="col-span-full py-16 bg-surface/50 rounded-2xl border border-border border-dashed flex justify-center">
                <EmptyState icon={FolderKanban} description="No engineering knowledge documents linked to this initiative" />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Strategic Goal Card Reused for Overview Tab
function CompactGoalCard({ goal }: { goal: GoalWithRelations }) {
  const navigate = useNavigate();
  const pace = computeGoalPace(goal);

  return (
    <div
      onClick={() => navigate('/app/goals')}
      className="bg-surface border-2 border-[#109868] rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden group font-sans"
    >
      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#109868]" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 pl-2">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white bg-[#109868] px-2.5 py-0.5 rounded-md shadow-2xs">
              {goal.type} • STRATEGIC OKR
            </span>
            <h3 className="text-card text-primary mb-2 ">{goal.title}</h3>
          </div>
          {goal.targetDate && (
            <div className="flex items-center gap-1.5 text-caption font-mono text-secondary font-bold">
              <Clock className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" />
              Target Horizon: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className="text-right font-mono">
          <span className="text-3xl font-bold text-[#109868]">{goal.progress}%</span>
          <span className="block text-caption text-secondary font-bold uppercase tracking-wider">OKR Progress</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border mb-4">
        <div
          className="h-full bg-[#109868] transition-all duration-700 ease-out"
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      {/* Pace Telemetry Panel */}
      <div className="bg-surface-hover/80 border border-border rounded-xl p-3.5 flex flex-wrap gap-x-6 gap-y-2 items-center font-mono text-caption">
        <div className="flex items-center gap-1.5 font-bold">
          {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-error stroke-[1.5]" /> :
            pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-warning stroke-[1.5]" /> :
              pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#109868] stroke-[1.5]" /> :
                <CheckCircle2 className="w-4 h-4 text-[#109868] stroke-[1.5]" />}
          <span className={cn("uppercase tracking-widest text-badge font-bold",
            ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-error" : "text-[#109868]"
          )}>
            {pace.badge}
          </span>
        </div>

        <div className="flex items-center gap-4 text-secondary">
          <span>Req Pace: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(2)}%/day</span>
          <span>Actual: <strong className="text-primary font-bold">{pace.actualPace.toFixed(2)}%/day</strong></span>
        </div>

        <div className="text-badge uppercase tracking-wider font-bold text-primary ml-auto">
          {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
            <span className="text-error">Stalled — Intervention Required</span>
          ) : pace.projectedDate ? (
            <span>Est. Completion: {pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
