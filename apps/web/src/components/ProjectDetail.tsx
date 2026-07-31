import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, ArrowLeft, Plus, CheckCircle2, Clock, Target, AlertCircle, XCircle, ArrowUpCircle, FileText, Sparkles, CheckSquare, Building2, Laptop, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import { computeGoalPace } from '../lib/goalUtils';
import type { GoalWithRelations } from '../types/schema';

function getDocIcon(iconName: string | null, className?: string) {
 if (iconName === 'landmark') return <Building2 className={cn(className ||"w-4 h-4 text-[#7C3AED]","stroke-[1.5]")} />;
 if (iconName === 'laptop') return <Laptop className={cn(className ||"w-4 h-4 text-[#7C3AED]","stroke-[1.5]")} />;
 return <FileText className={cn(className ||"w-4 h-4 text-[#7C3AED]","stroke-[1.5]")} />;
}

export function ProjectDetail() {
 const { id } = useParams();
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'roadmap' | 'docs'>('overview');

 const { data: projects = [], isLoading: pLoading, isError: pError } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
 const { data: issues = [], isLoading: iLoading, isError: iError } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
 const { data: pages = [], isLoading: docsLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
 const { data: roadmapItems = [], isLoading: rmLoading } = useQuery({ queryKey: ['roadmapItems'], queryFn: api.roadmapItems.list });
 const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });

 if (pLoading || iLoading || docsLoading || rmLoading || goalsLoading) {
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

 const project = projects.find(p => p.id === id);
 if (!project) return (
 <div className="p-12 font-sans">
 <EmptyState icon={FolderKanban} description="Strategic initiative not found in workspace" />
 <div className="mt-6 flex justify-center">
 <BaseButton onClick={() => navigate('/app/projects')}>Return to Portfolio Tree</BaseButton>
 </div>
 </div>
 );

 const projectIssues = project.issues || issues.filter(i => i.projectId === project.id);
 const projectDocs = project.docs || pages.filter(p => p.linkedProjectId === project.id);
 const projectRoadmap = project.roadmapItems || roadmapItems.filter(r => r.projectId === project.id).sort((a, b) => a.order - b.order);
 const projectGoal = project.goal || (project.goalId ? goals.find(g => g.id === project.goalId) : null);

 const completedIssues = projectIssues.filter((i: any) => i.status === 'done' || i.status === 'released');
 const openIssues = projectIssues.filter((i: any) => i.status !== 'done' && i.status !== 'released');
 const progressPct = projectIssues.length > 0 ? Math.round((completedIssues.length / projectIssues.length) * 100) : 0;
 
 // Calculate days since last update
 const daysSinceUpdate = Math.max(0, Math.floor((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24)));

 // Kanban Columns Logic
 const columns = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];
 const getIssuesByStatus = (status: string) => projectIssues.filter((i: any) => i.status === status);

 return (
 <div className="flex flex-col h-full bg-canvas animate-in fade-in duration-150 pb-24 overflow-y-auto font-sans text-primary">
 
 {/* COMMAND CENTER INITIATIVE HEADER (#2563EB Indigo Identity) */}
 <div className="px-6 md:px-8 pt-6 border-b border-border bg-surface shrink-0 shadow-2xs">
 <Link to="/app/projects" className="flex items-center gap-1.5 text-caption font-mono font-bold text-secondary hover:text-primary transition-colors mb-5 w-fit uppercase tracking-wider">
 <ArrowLeft className="w-4 h-4 stroke-[1.5]" /> Return to Projects Tree
 </Link>
 
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm border border-[#2563EB]/20 mt-0.5">
 <FolderKanban className="w-6 h-6 stroke-[1.5]" />
 </div>
 <div>
 <div className="flex flex-wrap items-center gap-3 mb-1.5">
 <h1 className="text-title text-primary mb-4 ">{project.name}</h1>
 <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border shadow-2xs",
 project.status === 'active' ?"bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 animate-pulse" :"bg-surface-hover text-secondary border-border"
 )}>
 {project.status}
 </span>
 <span className="font-mono text-caption font-bold text-secondary bg-surface-hover px-2.5 py-0.5 rounded-md border border-border">
 ID: {project.id.slice(0, 6).toUpperCase()}
 </span>
 </div>
 {project.problemStatement && (
 <p className="text-caption md:text-body text-secondary font-normal max-w-4xl leading-relaxed">{project.problemStatement}</p>
 )}
 </div>
 </div>
 <BaseButton onClick={() => toast.info('Initiative settings modal coming in future release')} className="shrink-0 cursor-pointer">
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
 {(['overview', 'board', 'roadmap', 'docs'] as const).map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={cn("py-3.5 text-caption font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
 activeTab === tab ?"border-primary text-primary" :"border-transparent text-secondary hover:text-primary"
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
 <h3 className="text-card text-primary mb-2 flex items-center gap-2">
 AI Strategic Risk Sentinel <span className="bg-[#109868]/10 text-[#109868] border border-[#109868]/20 px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase">Nominal Velocity</span>
 </h3>
 <p className="text-caption text-secondary font-mono mt-0.5 leading-relaxed">
 {progressPct === 100 
 ?"Initiative fully executed (100% completion). Recommended action: Run retrospective in Decision Log." 
 : progressPct > 50 
 ? `Execution velocity is tracking strongly at ${progressPct}%. 96% confidence of hitting target roadmap dates.` 
 :"Early phase initialization. AI recommends assigning child subtasks and linking quarterly OKRs to maintain momentum."}
 </p>
 </div>
 </div>
 <BaseButton onClick={() => setActiveTab('board')} variant="secondary" className="shrink-0 text-caption py-2">
 Launch Kanban &rarr;
 </BaseButton>
 </div>

 {/* Problem Statement & Scope Card */}
 <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs">
 <h3 className="text-card text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
 <FolderKanban className="w-4 h-4 text-[#2563EB] stroke-[1.5]" /> Problem Statement & Technical Scope
 </h3>
 <p className="text-primary text-body font-normal leading-relaxed">{project.problemStatement ||"No problem statement defined for this initiative."}</p>
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
 {getDocIcon(doc.icon,"w-4 h-4 text-[#7C3AED] group-hover:scale-110 transition-transform")}
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
 <span className="text-[10px] font-mono text-secondary mt-0.5">{issue.id.slice(0, 7).toUpperCase()}</span>
 </div>
 <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0",
 issue.priority === 'urgent' ?"bg-red-500/10 text-red-600 border-red-500/20" :"bg-surface-hover text-secondary border-border/80"
 )}>
 {issue.status.replace('_', ' ')}
 </span>
 </div>
 ))}
 {projectIssues.length === 0 && <div className="p-8 text-center text-caption text-secondary font-mono italic">No open execution tickets in initiative</div>}
 </div>
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
 <BaseButton onClick={() => navigate('/app/kanban')} className="text-caption py-2 cursor-pointer">
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
 const subTasks = issue.childIssues || [];
 const completedSubs = subTasks.filter((c: any) => c.status === 'done' || c.status === 'released').length;
 const hasSubs = subTasks.length > 0;

 return (
 <div 
 key={issue.id} 
 onClick={() => navigate('/app/kanban')}
 className="bg-surface border border-border rounded-xl p-4 shadow-2xs hover:border-[#2563EB] :border-[#2563EB] hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col gap-3"
 >
 <div className="flex items-start justify-between gap-2">
 <span className="text-[10px] font-mono font-bold text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border/60">
 {issue.id.slice(0, 7).toUpperCase()}
 </span>
 <span className={cn("text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
 issue.priority === 'urgent' ?"bg-red-500/10 text-red-600 border-red-500/20" :
 issue.priority === 'high' ?"bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" :"bg-surface-hover text-secondary border-border/80"
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
 {issue.estimate && <span className="bg-surface-hover px-2 py-0.5 rounded border border-border/80 font-bold text-primary">{issue.estimate}h pt</span>}
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

 {/* ROADMAP TAB */}
 {activeTab === 'roadmap' && (
 <div className="max-w-4xl animate-in fade-in duration-150 font-sans">
 <div className="flex items-center justify-between mb-8 bg-surface p-5 rounded-2xl border border-border shadow-xs">
 <div>
 <h2 className="text-section text-primary mb-3 ">Initiative Roadmap & Milestones</h2>
 <p className="text-caption text-secondary font-mono mt-0.5">Phased architectural milestones and release horizons for this initiative.</p>
 </div>
 <BaseButton className="text-caption px-4 py-2 cursor-pointer"><Plus className="w-4 h-4 mr-1.5 stroke-[1.5]"/> Add Horizon Phase</BaseButton>
 </div>
 
 <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#2563EB] before:via-border before:to-transparent">
 {projectRoadmap.map((item: any) => (
 <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
 
 {/* Timeline Precision Node */}
 <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 border-2 border-border shadow-sm group-hover:border-[#2563EB] :border-[#2563EB] transition-colors">
 <div className={cn("w-3.5 h-3.5 rounded-full transition-all",
 item.status === 'completed' ?"bg-[#109868] shadow-2xs" : item.status === 'in_progress' ?"bg-[#2563EB] animate-pulse" :"bg-border"
 )} />
 </div>

 {/* Roadmap Milestone Card */}
 <div className={cn("w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border bg-surface transition-all shadow-xs hover:shadow-md",
 item.status === 'completed' ?"border-border/80 opacity-80" :"border-border hover:border-[#2563EB] :border-[#2563EB]"
 )}>
 <div className="flex items-center justify-between mb-2.5">
 <span className="text-caption font-mono font-bold uppercase tracking-widest text-[#2563EB] bg-[#2563EB]/10 px-2.5 py-0.5 rounded-md border border-[#2563EB]/20">{item.version}</span>
 <span className={cn("text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border",
 item.status === 'completed' ?"bg-[#109868]/10 text-[#109868] border-[#109868]/20" : 
 item.status === 'in_progress' ?"bg-[#2563EB] text-white border-transparent shadow-2xs" :"bg-surface-hover border-border text-secondary"
 )}>
 {item.status.replace('_', ' ')}
 </span>
 </div>
 <h3 className="text-card text-primary mb-2 .5">
 {item.title}
 </h3>
 {item.description && <p className="text-caption md:text-body text-secondary leading-relaxed">{item.description}</p>}
 </div>

 </div>
 ))}
 {projectRoadmap.length === 0 && (
 <div className="relative py-16 flex justify-center bg-surface/50 z-10 rounded-2xl border border-border border-dashed">
 <EmptyState icon={Clock} description="No roadmap phases mapped for this initiative" />
 </div>
 )}
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
 <div className="mb-4 group-hover:scale-110 transition-transform w-fit p-2.5 rounded-xl bg-surface-hover border border-border/80">{getDocIcon(doc.icon,"w-6 h-6 text-[#7C3AED]")}</div>
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
 const pace = computeGoalPace(goal);

 return (
 <div 
 onClick={() => window.location.href = '/app/goals'}
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
 {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-red-500 stroke-[1.5]" /> :
 pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-amber-500 stroke-[1.5]" /> :
 pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#109868] stroke-[1.5]" /> :
 <CheckCircle2 className="w-4 h-4 text-[#109868] stroke-[1.5]" />}
 <span className={cn("uppercase tracking-widest text-badge font-bold",
 ['stalled', 'past_due', 'behind'].includes(pace.status) ?"text-red-500" :"text-[#109868]"
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
 <span className="text-red-500">Stalled — Intervention Required</span>
 ) : pace.projectedDate ? (
 <span>Est. Completion: {pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
 ) : null}
 </div>
 </div>
 </div>
 );
}
