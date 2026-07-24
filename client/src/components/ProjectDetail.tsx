import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, ArrowLeft, Plus, CheckCircle2, Circle, Clock } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'roadmap' | 'docs'>('overview');

  const { data: projects = [], isLoading: pLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: pages = [], isLoading: docsLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: roadmapItems = [], isLoading: rmLoading } = useQuery({ queryKey: ['roadmapItems'], queryFn: api.roadmapItems.list });

  if (pLoading || iLoading || docsLoading || rmLoading) return <div className="p-8 text-[#6B7280]">Loading project...</div>;

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

  // Kanban Columns Logic
  const columns = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];
  const getIssuesByStatus = (status: string) => projectIssues.filter(i => i.status === status);

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <Link to="/app/projects" className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-4 w-fit font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] mb-2">{project.name}</h1>
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                project.status === 'active' ? "bg-white text-[#0A0A0A] border-[#E5E7EB]" : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
              )}>
                {project.status}
              </span>
            </div>
          </div>
          <BaseButton>Edit Project</BaseButton>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6 mt-8">
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

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0A0A0A]">Key Documents</h3>
                  <BaseButton className="!bg-[#FAFAFA] !text-[#0A0A0A] !border !border-[#E5E7EB] hover:!bg-[#F3F4F6] text-xs px-3 py-1.5"><Plus className="w-3 h-3 mr-1 inline"/> New</BaseButton>
                </div>
                <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg">
                  {projectDocs.slice(0, 3).map(doc => (
                    <div key={doc.id} className="p-3 hover:bg-[#F3F4F6] flex items-center gap-3 cursor-pointer">
                      <span className="text-xl">{doc.icon}</span>
                      <span className="font-medium text-sm text-[#0A0A0A]">{doc.title}</span>
                    </div>
                  ))}
                  {projectDocs.length === 0 && <div className="p-6 text-center text-sm text-[#9CA3AF]">No linked docs</div>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0A0A0A]">Roadmap Progress</h3>
                </div>
                <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg">
                  {projectRoadmap.slice(0, 3).map(item => (
                    <div key={item.id} className="p-3 flex items-center gap-3">
                      {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-[#0A0A0A]" /> : 
                       item.status === 'in_progress' ? <Clock className="w-4 h-4 text-amber-500" /> : 
                       <Circle className="w-4 h-4 text-[#E5E7EB]" />}
                      <span className="font-medium text-sm text-[#0A0A0A]">{item.title}</span>
                      <span className="ml-auto text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{item.version}</span>
                    </div>
                  ))}
                  {projectRoadmap.length === 0 && <div className="p-6 text-center text-sm text-[#9CA3AF]">No roadmap items</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Board Tab (Filtered Kanban) */}
        {activeTab === 'board' && (
          <div className="flex gap-4 h-[calc(100vh-280px)] overflow-x-auto pb-4">
            {columns.map(status => {
              const columnIssues = getIssuesByStatus(status);
              return (
                <div key={status} className="w-[300px] flex-shrink-0 flex flex-col bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
                  <div className="p-3 border-b border-[#E5E7EB] flex justify-between items-center bg-white/50 rounded-t-xl">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B7280]">{status.replace('_', ' ')}</span>
                    <span className="text-[10px] font-bold bg-[#E5E7EB] text-[#6B7280] px-1.5 py-0.5 rounded-full">{columnIssues.length}</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {columnIssues.map(issue => (
                      <div key={issue.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-sm hover:border-[#0A0A0A] transition-colors cursor-pointer">
                        <div className="font-medium text-sm text-[#0A0A0A] leading-tight mb-2">{issue.title}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{issue.id}</span>
                          {issue.childIssues && issue.childIssues.length > 0 && (
                            <span className="text-[10px] font-bold text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                              {issue.childIssues.filter(c => c.status === 'done').length}/{issue.childIssues.length} sub
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
        )}

        {/* Roadmap Tab */}
        {activeTab === 'roadmap' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0A0A0A]">Project Roadmap</h2>
              <BaseButton className="text-xs px-4 py-2"><Plus className="w-3 h-3 mr-1 inline"/> Add Phase</BaseButton>
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[#E5E7EB]">
              {projectRoadmap.map(item => (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Timeline Node */}
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2",
                    item.status === 'completed' ? "text-[#0A0A0A]" : item.status === 'in_progress' ? "text-amber-500" : "text-[#9CA3AF]"
                  )}>
                    {item.status === 'completed' ? <CheckCircle2 className="w-5 h-5 fill-current text-white" /> : <Circle className="w-4 h-4 fill-current" />}
                  </div>

                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{item.version}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                        item.status === 'completed' ? "bg-[#F3F4F6] text-[#0A0A0A]" : item.status === 'in_progress' ? "bg-amber-50 text-amber-600" : "bg-white border border-[#E5E7EB] text-[#6B7280]"
                      )}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#0A0A0A]">{item.title}</h3>
                  </div>

                </div>
              ))}
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
              <div key={doc.id} className="bg-[#FAFAFA] border border-[#E5E7EB] p-4 rounded-xl hover:border-[#0A0A0A] transition-colors cursor-pointer group flex flex-col h-32">
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
