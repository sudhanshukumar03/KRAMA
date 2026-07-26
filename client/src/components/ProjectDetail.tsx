import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, ArrowLeft, Plus, CheckCircle2, Clock, Target, AlertCircle, XCircle, ArrowUpCircle, FileText, Sparkles, CheckSquare, Building2, Laptop } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import { computeGoalPace } from '../lib/goalUtils';
import type { GoalWithRelations } from '../types/schema';

function getDocIcon(iconName: string | null, className?: string) {
  if (iconName === 'landmark') return <Building2 className={cn(className || "w-4 h-4 text-[#7C3AED]", "stroke-[1.75]")} />;
  if (iconName === 'laptop') return <Laptop className={cn(className || "w-4 h-4 text-[#7C3AED]", "stroke-[1.75]")} />;
  return <FileText className={cn(className || "w-4 h-4 text-[#7C3AED]", "stroke-[1.75]")} />;
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
    return <LoadingState variant="project-detail" title="Loading Project Details..." description="Aggregating roadmap milestones, sprint tasks, and documentation..." />;
  }

  if (pError || iError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Project Details"
          message="Could not retrieve project data from the server. Please verify your connection."
        />
      </div>
    );
  }

  const project = projects.find(p => p.id === id);
  if (!project) return (
    <div className="p-12">
      <EmptyState icon={FolderKanban} description="Project not found in workspace" />
      <div className="mt-4 flex justify-center">
        <BaseButton onClick={() => navigate('/app/projects')}>Go Back to Projects</BaseButton>
      </div>
    </div>
  );

  const projectIssues = project.issues || issues.filter(i => i.projectId === project.id);
  const projectDocs = project.docs || pages.filter(p => p.linkedProjectId === project.id);
  const projectRoadmap = project.roadmapItems || roadmapItems.filter(r => r.projectId === project.id).sort((a, b) => a.order - b.order);
  const projectGoal = project.goal || (project.goalId ? goals.find(g => g.id === project.goalId) : null);

  const completedIssues = projectIssues.filter(i => i.status === 'done' || i.status === 'released');
  const openIssues = projectIssues.filter(i => i.status !== 'done' && i.status !== 'released');
  
  // Calculate days since last update
  const daysSinceUpdate = Math.max(0, Math.floor((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24)));

  // Kanban Columns Logic
  const columns = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];
  const getIssuesByStatus = (status: string) => projectIssues.filter(i => i.status === status);

  return (
    <div className="flex flex-col h-full bg-canvas animate-in fade-in duration-150 pb-20 overflow-y-auto">
      
      {/* NEW: Top Header with 40x40px Indigo Project Category Tile (#4F46E5) */}
      <div className="px-8 pt-6 border-b border-[#E5E8EC] bg-white shrink-0 shadow-2xs">
        <Link to="/app/projects" className="flex items-center gap-1.5 text-xs font-mono text-[#6B7280] hover:text-[#111827] transition-colors mb-4 w-fit font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects Tree
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <FolderKanban className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">{project.name}</h1>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest border",
                  project.status === 'active' ? "bg-[#EFF4FE] text-[#2563EB] border-[#2563EB]/20" : "bg-[#F8F9FB] text-[#6B7280] border-[#E5E8EC]"
                )}>
                  {project.status}
                </span>
                <span className="font-mono text-xs text-[#9CA3AF] bg-[#F8F9FB] px-2 py-0.5 rounded border border-[#E5E8EC]">
                  ID: {project.id.slice(0, 6).toUpperCase()}
                </span>
              </div>
              {project.problemStatement && (
                <p className="text-xs text-[#6B7280] font-normal max-w-3xl leading-relaxed">{project.problemStatement}</p>
              )}
            </div>
          </div>
          <BaseButton onClick={() => alert('Edit Project Settings')}>
            Edit Project
          </BaseButton>
        </div>
        
        {/* Health Strip Scorecard Bar */}
        <div className="flex flex-wrap items-center gap-6 py-3 border-t border-[#E5E8EC] text-xs font-mono">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <FolderKanban className="w-4 h-4 text-[#4F46E5]" />
            <span>
              <strong className="text-[#111827]">{openIssues.length}</strong> Open / <strong className="text-[#0D9488]">{completedIssues.length}</strong> Done Issues
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            <span>
              <strong className="text-[#111827]">{projectDocs.length}</strong> Linked Docs
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Clock className="w-4 h-4 text-[#EA580C]" />
            <span>
              Updated <strong className="text-[#111827]">{daysSinceUpdate}</strong> days ago
            </span>
          </div>
          {projectGoal && (
            <div 
              onClick={() => navigate('/app/goals')}
              className="flex items-center gap-2 bg-[#0D9488]/10 hover:bg-[#0D9488]/20 border border-[#0D9488]/30 transition-colors px-2.5 py-1 rounded text-[#0D9488] font-mono text-[11px] cursor-pointer ml-auto"
            >
              <Target className="w-3.5 h-3.5 text-[#0D9488] stroke-[1.75]" />
              <span className="font-bold uppercase tracking-wider">OKR: {projectGoal.title}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-2 border-t border-[#E5E8EC]">
          {(['overview', 'board', 'roadmap', 'docs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                activeTab === tab ? "border-[#111827] text-[#111827]" : "border-transparent text-[#6B7280] hover:text-[#111827]"
              )}
            >
              {tab} {tab === 'board' && `(${projectIssues.length})`} {tab === 'docs' && `(${projectDocs.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 bg-canvas">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in duration-150">
            <div className="bg-white border border-[#E5E8EC] rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-mono font-bold text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" /> Problem Statement & Scope
              </h3>
              <p className="text-[#111827] text-base font-normal leading-relaxed">{project.problemStatement || "No problem statement defined for this initiative."}</p>
            </div>

            {/* Linked Goal Card */}
            {projectGoal && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#6B7280]">Strategic Goal Bridge</h3>
                <CompactGoalCard goal={projectGoal} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Recent Docs Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#6B7280]">Recent Knowledge Docs</h3>
                  <button onClick={() => setActiveTab('docs')} className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] hover:underline">
                    View all ({projectDocs.length})
                  </button>
                </div>
                <div className="divide-y divide-[#E5E8EC] border border-[#E5E8EC] rounded-xl bg-white shadow-2xs overflow-hidden">
                  {projectDocs.slice(0, 3).map(doc => (
                    <div key={doc.id} onClick={() => navigate(`/app/brain`)} className="p-3.5 hover:bg-[#F8F9FB] transition-colors flex items-center gap-3 cursor-pointer group">
                      {getDocIcon(doc.icon, "w-5 h-5 text-[#7C3AED] shrink-0 group-hover:scale-110 transition-transform")}
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm text-[#111827] truncate group-hover:text-[#2563EB] transition-colors">{doc.title}</span>
                        <span className="text-[10px] font-mono text-[#9CA3AF] mt-0.5">Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {projectDocs.length === 0 && <div className="p-6 text-center text-xs text-[#9CA3AF] font-mono italic">No linked knowledge docs</div>}
                </div>
              </div>

              {/* Recent Issues Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#6B7280]">Recent Execution Issues</h3>
                  <button onClick={() => setActiveTab('board')} className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] hover:underline">
                    View all ({projectIssues.length})
                  </button>
                </div>
                <div className="divide-y divide-[#E5E8EC] border border-[#E5E8EC] rounded-xl bg-white shadow-2xs overflow-hidden">
                  {projectIssues.slice(0, 3).map(issue => (
                    <div key={issue.id} onClick={() => setActiveTab('board')} className="p-3.5 hover:bg-[#F8F9FB] transition-colors flex items-center justify-between cursor-pointer group">
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="font-medium text-sm text-[#111827] truncate group-hover:text-[#2563EB] transition-colors">{issue.title}</span>
                        <span className="text-[10px] font-mono text-[#9CA3AF] mt-0.5">{issue.id.slice(0, 7).toUpperCase()}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest border shrink-0",
                        issue.priority === 'urgent' ? "bg-red-50 text-[#DC2626] border-[#DC2626]/20" : "bg-[#F8F9FB] text-[#6B7280] border-[#E5E8EC]"
                      )}>
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {projectIssues.length === 0 && <div className="p-6 text-center text-xs text-[#9CA3AF] font-mono italic">No open issues in project</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Enhanced Board Tab (Filtered Kanban with Sub-task Bars & Elevated Priority Badges) */}
        {activeTab === 'board' && (
          <div className="flex flex-col h-full animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-[#E5E8EC] shadow-2xs">
              <span className="text-xs font-mono text-[#6B7280] font-medium">
                Showing <strong className="text-[#111827]">{projectIssues.length}</strong> project execution tickets across 7 columns
              </span>
              <BaseButton onClick={() => alert('New Ticket for Project')} className="text-xs py-1.5">
                <Plus className="w-3.5 h-3.5 mr-1" /> New Project Issue
              </BaseButton>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 items-start">
              {columns.map(status => {
                const columnIssues = getIssuesByStatus(status);
                return (
                  <div key={status} className="w-[300px] flex-shrink-0 flex flex-col bg-white rounded-xl border border-[#E5E8EC] shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-[#E5E8EC] flex justify-between items-center bg-[#F8F9FB]">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827]">{status.replace('_', ' ')}</span>
                      <span className="text-xs font-mono font-bold bg-white text-[#6B7280] border border-[#E5E8EC] px-2 py-0.2 rounded-md">{columnIssues.length}</span>
                    </div>
                    
                    <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto bg-[#F8F9FB]/50 min-h-[350px] max-h-[60vh]">
                      {columnIssues.map(issue => {
                        const subTasks = issue.childIssues || [];
                        const completedSubs = subTasks.filter((c: any) => c.status === 'done' || c.status === 'released').length;
                        const hasSubs = subTasks.length > 0;

                        return (
                          <div 
                            key={issue.id} 
                            onClick={() => alert(`View issue ${issue.id}`)}
                            className="bg-white border border-[#E5E8EC] rounded-xl p-3.5 shadow-2xs hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col gap-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold text-[#9CA3AF] bg-[#F8F9FB] px-1.5 py-0.2 rounded border border-[#E5E8EC]">
                                {issue.id.slice(0, 7).toUpperCase()}
                              </span>
                              <span className={cn(
                                "text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.2 rounded border",
                                issue.priority === 'urgent' ? "bg-red-50 text-[#DC2626] border-[#DC2626]/20" :
                                issue.priority === 'high' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                "bg-[#F8F9FB] text-[#6B7280] border-[#E5E8EC]"
                              )}>
                                {issue.priority}
                              </span>
                            </div>

                            <div className="font-medium text-sm text-[#111827] leading-snug group-hover:text-[#2563EB] transition-colors line-clamp-2">
                              {issue.title}
                            </div>

                            {/* Sub-task Progress Bar */}
                            {hasSubs && (
                              <div className="space-y-1 pt-1 border-t border-[#E5E8EC]/60">
                                <div className="flex justify-between items-center text-[10px] font-mono text-[#6B7280]">
                                  <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-[#2563EB]" /> Sub-tasks</span>
                                  <span className="font-bold text-[#111827]">{completedSubs}/{subTasks.length}</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/60">
                                  <div 
                                    className="h-full bg-[#2563EB] transition-all duration-300"
                                    style={{ width: `${(completedSubs / subTasks.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pt-1 border-t border-[#E5E8EC]/60">
                              <span>{issue.assignee ? 'Assigned' : 'Unassigned'}</span>
                              {issue.estimate && <span className="bg-[#F8F9FB] px-1.5 py-0.2 rounded border border-[#E5E8EC] font-medium">{issue.estimate}h pt</span>}
                            </div>
                          </div>
                        );
                      })}
                      {columnIssues.length === 0 && (
                        <div className="h-28 border border-dashed border-[#E5E8EC] rounded-lg flex items-center justify-center text-xs font-mono text-[#9CA3AF] bg-white/50">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Roadmap Tab */}
        {activeTab === 'roadmap' && (
          <div className="max-w-3xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-[#E5E8EC] shadow-2xs">
              <div>
                <h2 className="text-lg font-medium text-[#111827]">Project Roadmap Timeline</h2>
                <p className="text-xs text-[#6B7280]">Phased milestones and release versions for this strategic initiative.</p>
              </div>
              <BaseButton className="text-xs px-3.5 py-1.5"><Plus className="w-3.5 h-3.5 mr-1"/> Add Phase</BaseButton>
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[#E5E8EC]">
              {projectRoadmap.map((item: any) => (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  
                  {/* Timeline Node */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 border border-[#E5E8EC] shadow-sm">
                    <div className={cn(
                      "w-3 h-3 rounded-full transition-colors",
                      item.status === 'completed' ? "bg-[#0D9488]" : item.status === 'in_progress' ? "bg-[#2563EB]" : "bg-[#9CA3AF]"
                    )} />
                  </div>

                  {/* Card */}
                  <div className={cn(
                    "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border bg-white transition-all shadow-sm hover:shadow-md",
                    item.status === 'completed' ? "border-[#E5E8EC] opacity-80" : "border-[#E5E8EC] hover:border-[#4F46E5]"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4F46E5] bg-[#EFF4FE] px-2 py-0.5 rounded border border-[#4F46E5]/20">{item.version}</span>
                      <span className={cn(
                        "text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                        item.status === 'completed' ? "bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20" : 
                        item.status === 'in_progress' ? "bg-[#111827] text-white border-[#111827]" : 
                        "bg-[#F8F9FB] border-[#E5E8EC] text-[#6B7280]"
                      )}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className={cn("font-medium text-base text-[#111827] mb-1")}>
                      {item.title}
                    </h3>
                    {item.description && <p className="text-xs text-[#6B7280]">{item.description}</p>}
                  </div>

                </div>
              ))}
              {projectRoadmap.length === 0 && (
                <div className="relative py-12 flex justify-center bg-white z-10 rounded-xl border border-[#E5E8EC] border-dashed">
                  <EmptyState icon={Clock} description="No roadmap defined for this project" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Docs Tab */}
        {activeTab === 'docs' && (
          <div className="max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            {projectDocs.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => navigate(`/app/brain`)}
                className="bg-white border border-[#E5E8EC] p-5 rounded-xl hover:border-[#2563EB] transition-all cursor-pointer group flex flex-col justify-between shadow-sm hover:shadow-md min-h-[160px] gap-4"
              >
                <div>
                  <div className="mb-3 group-hover:scale-110 transition-transform w-fit">{getDocIcon(doc.icon, "w-7 h-7 text-[#7C3AED]")}</div>
                  <div className="font-medium text-base text-[#111827] leading-snug group-hover:text-[#2563EB] transition-colors">{doc.title}</div>
                </div>
                <div className="pt-3 border-t border-[#E5E8EC]/60 flex items-center justify-between text-xs font-mono text-[#6B7280]">
                  <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  <span className="text-[#2563EB] font-semibold group-hover:underline">Open Doc &rarr;</span>
                </div>
              </div>
            ))}
            {projectDocs.length === 0 && (
              <div className="col-span-full py-12 bg-white rounded-xl border border-[#E5E8EC] border-dashed">
                <EmptyState icon={FolderKanban} description="No knowledge documents linked to this project" />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Compact Goal Card reused for the Overview Tab
function CompactGoalCard({ goal }: { goal: GoalWithRelations }) {
  const pace = computeGoalPace(goal);

  return (
    <div 
      onClick={() => window.location.href = '/app/goals'}
      className="bg-white border border-[#E5E8EC] rounded-xl p-5 hover:border-[#0D9488] shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-2 py-0.5 rounded">
              {goal.type}
            </span>
            <h3 className="text-lg font-semibold text-[#111827]">{goal.title}</h3>
          </div>
          {goal.targetDate && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#6B7280]">
              <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
              Target Date: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className="text-right font-mono">
          <span className="text-3xl font-bold text-[#111827]">{goal.progress}%</span>
          <span className="block text-[10px] text-[#6B7280] uppercase">Progress</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC] mb-4">
        <div 
          className="h-full bg-[#0D9488] transition-all duration-400 ease-out" 
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      {/* Pace Panel */}
      <div className="bg-[#F8F9FB] border border-[#E5E8EC] rounded-lg p-3 flex flex-wrap gap-x-6 gap-y-2 items-center font-mono text-xs">
        <div className="flex items-center gap-1.5 font-bold">
          {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-[#DC2626]" /> :
           pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-[#DC2626]" /> :
           pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#0D9488]" /> :
           <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />}
          <span className={cn(
            "uppercase tracking-widest text-[11px]",
            ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-[#DC2626]" : "text-[#0D9488]"
          )}>
            {pace.badge}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[#6B7280]">
          <span>Req: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(2)}%/day</span>
          <span>Act: <strong className="text-[#111827]">{pace.actualPace.toFixed(2)}%/day</strong></span>
        </div>

        <div className="text-[11px] uppercase tracking-wider font-bold text-[#111827] ml-auto">
          {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
            <span className="text-[#DC2626]">Stalled — Action Needed</span>
          ) : pace.projectedDate ? (
            <span>Est. Completion: {pace.projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
