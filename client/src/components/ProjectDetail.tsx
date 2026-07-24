import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, ArrowLeft, Plus, CheckCircle2, Clock, Target, AlertCircle, XCircle, ArrowUpCircle, FileText } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';
import { computeGoalPace } from './Goals';
import type { GoalWithRelations } from '../types/schema';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'roadmap' | 'docs'>('overview');

  const { data: projects = [], isLoading: pLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: pages = [], isLoading: docsLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: roadmapItems = [], isLoading: rmLoading } = useQuery({ queryKey: ['roadmapItems'], queryFn: api.roadmapItems.list });
  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });

  if (pLoading || iLoading || docsLoading || rmLoading || goalsLoading) return <div className="p-8 text-[#6B7280]">Loading project...</div>;

  const project = projects.find(p => p.id === id);
  if (!project) return (
    <div className="p-12">
      <EmptyState icon={FolderKanban} description="Project not found" />
      <div className="mt-4 flex justify-center">
        <BaseButton onClick={() => navigate('/app/projects')}>Go Back</BaseButton>
      </div>
    </div>
  );

  const projectIssues = issues.filter(i => i.projectId === project.id);
  const projectDocs = pages.filter(p => p.linkedProjectId === project.id);
  const projectRoadmap = roadmapItems.filter(r => r.projectId === project.id).sort((a, b) => a.order - b.order);
  const projectGoal = project.goalId ? goals.find(g => g.id === project.goalId) : null;

  const completedIssues = projectIssues.filter(i => i.status === 'done' || i.status === 'released');
  const openIssues = projectIssues.filter(i => i.status !== 'done' && i.status !== 'released');
  
  // Calculate days since last update
  const daysSinceUpdate = Math.max(0, Math.floor((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24)));

  // Kanban Columns Logic
  const columns = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];
  const getIssuesByStatus = (status: string) => projectIssues.filter(i => i.status === status);

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="px-8 pt-8 border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <Link to="/app/projects" className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-4 w-fit font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">{project.name}</h1>
              <span className={cn(
                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                project.status === 'active' ? "bg-white text-[#0A0A0A] border-[#E5E7EB]" : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
              )}>
                {project.status}
              </span>
            </div>
            {project.problemStatement && (
              <p className="text-sm text-[#6B7280] font-medium">{project.problemStatement}</p>
            )}
          </div>
          <BaseButton>Edit Project</BaseButton>
        </div>
        
        {/* Health Strip */}
        <div className="flex items-center gap-6 py-4 border-t border-[#E5E7EB] border-dashed">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[#9CA3AF]" />
            <span className="text-xs font-bold text-[#6B7280]">
              <span className="text-[#0A0A0A]">{openIssues.length}</span> Open / <span className="text-[#0A0A0A]">{completedIssues.length}</span> Done
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#9CA3AF]" />
            <span className="text-xs font-bold text-[#6B7280]">
              <span className="text-[#0A0A0A]">{projectDocs.length}</span> Docs Linked
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#9CA3AF]" />
            <span className="text-xs font-bold text-[#6B7280]">
              Updated <span className="text-[#0A0A0A]">{daysSinceUpdate}</span> days ago
            </span>
          </div>
          {projectGoal && (
            <div 
              onClick={() => navigate('/app/goals')}
              className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors px-2.5 py-1 rounded cursor-pointer ml-auto"
            >
              <Target className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider">{projectGoal.title}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-2">
          {(['overview', 'board', 'roadmap', 'docs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors",
                activeTab === tab ? "border-[#0A0A0A] text-[#0A0A0A]" : "border-transparent text-[#6B7280] hover:text-[#0A0A0A]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-white">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl space-y-8">
            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6">
              <h3 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Problem Statement</h3>
              <p className="text-[#0A0A0A] text-lg font-medium leading-relaxed">{project.problemStatement || "No problem statement defined."}</p>
            </div>

            {/* Linked Goal Card (Bridge Layer Proof) */}
            {projectGoal && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#0A0A0A]">Linked Goal</h3>
                <CompactGoalCard goal={projectGoal} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-8">
              {/* Recent Docs Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0A0A0A]">Recent Docs</h3>
                  <button onClick={() => setActiveTab('docs')} className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors">
                    View all
                  </button>
                </div>
                <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg">
                  {projectDocs.slice(0, 3).map(doc => (
                    <div key={doc.id} onClick={() => navigate(`/app/brain/page/${doc.id}`)} className="p-3 hover:bg-[#F3F4F6] transition-colors flex items-center gap-3 cursor-pointer">
                      <span className="text-xl">{doc.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-[#0A0A0A]">{doc.title}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mt-0.5">Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {projectDocs.length === 0 && <div className="p-6 text-center text-sm text-[#9CA3AF]">No linked docs</div>}
                </div>
              </div>

              {/* Recent Issues Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0A0A0A]">Recent Issues</h3>
                  <button onClick={() => setActiveTab('board')} className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors">
                    View all
                  </button>
                </div>
                <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg">
                  {projectIssues.slice(0, 3).map(issue => (
                    <div key={issue.id} className="p-3 hover:bg-[#F3F4F6] transition-colors flex items-center justify-between cursor-pointer">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="font-medium text-sm text-[#0A0A0A] truncate">{issue.title}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mt-0.5">{issue.id}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border flex-shrink-0",
                        issue.priority === 'urgent' ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-[#6B7280] border-[#E5E7EB]"
                      )}>
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {projectIssues.length === 0 && <div className="p-6 text-center text-sm text-[#9CA3AF]">No open issues</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Board Tab (Filtered Kanban) */}
        {activeTab === 'board' && (
          <div className="flex flex-col h-full">
            <div className="flex justify-end mb-4">
              <BaseButton><Plus className="w-4 h-4 mr-2" /> New Issue</BaseButton>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)] items-start">
              {columns.map(status => {
                const columnIssues = getIssuesByStatus(status);
                return (
                  <div key={status} className="w-[300px] flex-shrink-0 flex flex-col bg-[#FFFFFF] rounded-xl border border-[#E5E7EB] h-full max-h-full overflow-hidden">
                    <div className="p-3 border-b border-[#E5E7EB] flex justify-between items-center bg-[#FAFAFA]">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#0A0A0A]">{status.replace('_', ' ')}</span>
                      <span className="text-[10px] font-bold bg-[#E5E7EB] text-[#6B7280] px-1.5 py-0.5 rounded-full">{columnIssues.length}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-[#FAFAFA]">
                      {columnIssues.map(issue => (
                        <div key={issue.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-sm hover:border-[#0A0A0A] transition-colors cursor-pointer">
                          <div className="font-medium text-sm text-[#0A0A0A] leading-tight mb-2">{issue.title}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{issue.id}</span>
                            {issue.priority === 'urgent' && (
                              <span className="text-[10px] font-bold text-[#DC2626] border border-[#DC2626]/20 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Roadmap Tab */}
        {activeTab === 'roadmap' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0A0A0A]">Project Roadmap</h2>
              <BaseButton className="text-xs px-4 py-2"><Plus className="w-3 h-3 mr-1 inline"/> Add Phase</BaseButton>
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-[#E5E7EB]">
              {projectRoadmap.map(item => {
                
                return (
                  <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    
                    {/* Timeline Node */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full ring-4 ring-white transition-colors",
                        item.status === 'completed' ? "bg-[#D1D5DB]" : item.status === 'in_progress' ? "bg-[#0A0A0A]" : "bg-[#9CA3AF]"
                      )} />
                    </div>

                    {/* Card */}
                    <div className={cn(
                      "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-white transition-colors",
                      item.status === 'completed' ? "border-[#F3F4F6] opacity-70" : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{item.version}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                          item.status === 'completed' ? "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]" : 
                          item.status === 'in_progress' ? "bg-white text-[#0A0A0A] border-[#0A0A0A]" : 
                          "bg-white border-[#E5E7EB] text-[#6B7280]"
                        )}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className={cn("font-bold text-sm", item.status === 'completed' ? "text-[#6B7280]" : "text-[#0A0A0A]")}>
                        {item.title}
                      </h3>
                    </div>

                  </div>
                );
              })}
              {projectRoadmap.length === 0 && (
                <div className="relative py-12 flex justify-center bg-white z-10">
                  <EmptyState icon={Clock} description="No roadmap defined" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Docs Tab */}
        {activeTab === 'docs' && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectDocs.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => navigate(`/app/brain/page/${doc.id}`)}
                className="bg-[#FAFAFA] border border-[#E5E7EB] p-4 rounded-xl hover:border-[#0A0A0A] transition-colors cursor-pointer group flex flex-col h-32"
              >
                <div className="text-2xl mb-2">{doc.icon}</div>
                <div className="font-bold text-sm text-[#0A0A0A] leading-snug">{doc.title}</div>
                <div className="mt-auto flex gap-1">
                  {doc.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] bg-white border border-[#E5E7EB] px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {projectDocs.length === 0 && (
              <div className="col-span-full py-12">
                <EmptyState icon={FolderKanban} description="No documents linked to this project" />
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
    <div className="bg-white border border-[#0A0A0A] rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A] bg-[#FAFAFA] border border-[#E5E7EB] px-1.5 py-0.5 rounded">
              {goal.type}
            </span>
            <h3 className="text-lg font-bold text-[#0A0A0A]">{goal.title}</h3>
          </div>
          {goal.targetDate && (
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] font-medium">
              <Clock className="w-3.5 h-3.5" />
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </div>
          )}
        </div>
        <span className="text-2xl font-bold text-[#0A0A0A]">{goal.progress}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-[#0A0A0A] transition-all duration-400 ease-out" 
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      {/* Pace Panel (Reused from Goals view) */}
      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <div className="flex items-center gap-2">
          {['stalled', 'past_due'].includes(pace.status) ? <XCircle className="w-4 h-4 text-[#DC2626]" /> :
           pace.status === 'behind' ? <AlertCircle className="w-4 h-4 text-[#DC2626]" /> :
           pace.status === 'ahead' ? <ArrowUpCircle className="w-4 h-4 text-[#0A0A0A]" /> :
           <CheckCircle2 className="w-4 h-4 text-[#0A0A0A]" />}
          <span className={cn(
            "text-xs font-bold uppercase tracking-widest",
            ['stalled', 'past_due', 'behind'].includes(pace.status) ? "text-[#DC2626]" : "text-[#0A0A0A]"
          )}>
            {pace.badge}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-[#6B7280]">
          <span>Req: {pace.requiredPace === Infinity ? 'N/A' : pace.requiredPace.toFixed(2)}%/day</span>
          <span>Act: {pace.actualPace.toFixed(2)}%/day</span>
        </div>

        <div className="text-[10px] uppercase tracking-wider font-bold text-[#0A0A0A] ml-auto">
          {pace.status === 'stalled' || (pace.status === 'past_due' && pace.actualPace === 0) ? (
            <span className="text-[#9CA3AF]">Stalled</span>
          ) : pace.projectedDate ? (
            <span>Projected: {pace.projectedDate.toLocaleDateString()}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
