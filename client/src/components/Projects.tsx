import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FolderKanban, Plus, Clock, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export function Projects() {
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  if (isLoading) return <div className="p-8 text-zinc-500">Loading projects...</div>;

  const statuses = ['active', 'idea', 'paused', 'shipped'];

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex flex-col h-full">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
          <p className="text-zinc-400">Track and manage all your initiatives.</p>
        </div>
        <button className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-lg shadow-accent/20">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statuses.map(status => (
          <div key={status} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-400 font-semibold text-sm uppercase tracking-wider px-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                status === 'active' ? 'bg-accent' : 
                status === 'idea' ? 'bg-amber-500' :
                status === 'shipped' ? 'bg-green-500' : 'bg-zinc-600'
              )} />
              {status}
              <span className="ml-auto bg-zinc-800 px-2 py-0.5 rounded text-xs">
                {projects.filter(p => p.status === status).length}
              </span>
            </div>
            
            <div className="flex flex-col gap-3">
              {projects.filter(p => p.status === status).map(project => (
                <div 
                  key={project.id} 
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-zinc-200 group-hover:text-accent transition-colors">
                      {project.name}
                    </h3>
                    <FolderKanban className="w-4 h-4 text-zinc-600" />
                  </div>
                  
                  {project.problemStatement && (
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2 leading-relaxed">
                      {project.problemStatement}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 mt-auto">
                    {project.goalId && (
                      <div className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded-md">
                        <Target className="w-3.5 h-3.5" /> Goal Link
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Clock className="w-3.5 h-3.5" /> 
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
