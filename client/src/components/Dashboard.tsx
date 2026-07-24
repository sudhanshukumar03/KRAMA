import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, ListTodo, AlertCircle, FolderKanban, Activity, History, Calendar, CheckSquare } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  if (issuesLoading || projectsLoading) return <div className="p-8 text-[#6B7280]">Loading dashboard...</div>;

  const activeProjects = projects.filter(p => p.status === 'active');
  const todoIssues = issues.filter(i => ['todo', 'backlog'].includes(i.status));
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const doneIssues = issues.filter(i => i.status === 'done' || i.status === 'released');
  const urgentIssues = issues.filter(i => i.priority === 'urgent');

  // Compute Upcoming Deadlines (Due in next 7 days or overdue)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const upcomingDeadlines = issues.filter(i => 
    i.dueDate && new Date(i.dueDate) <= nextWeek && !['done', 'released'].includes(i.status)
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Mock Recent Activity (Sort projects/issues by updatedAt)
  const recentActivity = [
    ...projects.map(p => ({ id: p.id, title: p.name, type: 'Project', date: new Date(p.updatedAt) })),
    ...issues.map(i => ({ id: i.id, title: i.title, type: 'Issue', date: new Date(i.updatedAt) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const summaryLine = `${inProgressIssues.length} issues in progress, ${urgentIssues.length} urgent`;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">Dashboard</h1>
        <p className="text-[#6B7280] mt-1 font-medium">{formattedDate} — <span className="text-[#0A0A0A]">{summaryLine}</span></p>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0A0A0A] leading-none mb-1">{activeProjects.length}</div>
                <div className="text-sm text-[#6B7280] font-bold">Active Projects</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[10px] uppercase font-bold tracking-wider text-[#9CA3AF]">+1 this week</div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
                <ListTodo className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0A0A0A] leading-none mb-1">{todoIssues.length}</div>
                <div className="text-sm text-[#6B7280] font-bold">To Do</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[10px] uppercase font-bold tracking-wider text-[#9CA3AF]">-2 since yesterday</div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0A0A0A] leading-none mb-1">{inProgressIssues.length}</div>
                <div className="text-sm text-[#6B7280] font-bold">In Progress</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[10px] uppercase font-bold tracking-wider text-[#9CA3AF]">no change today</div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-colors duration-150 hover:bg-[#F3F4F6]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg text-[#0A0A0A] shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0A0A0A] leading-none mb-1">{doneIssues.length}</div>
                <div className="text-sm text-[#6B7280] font-bold">Completed</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[10px] uppercase font-bold tracking-wider text-[#9CA3AF]">+5 this week</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Core Work */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Current Work */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA]">
              <h2 className="font-bold text-[#0A0A0A] text-sm">Current Work (In Progress)</h2>
            </div>
            <div className="divide-y divide-[#E5E7EB] flex-1">
              {inProgressIssues.map(issue => (
                <div key={issue.id} className="p-5 hover:bg-[#F3F4F6] transition-colors duration-100 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-[#0A0A0A]">{issue.title}</div>
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                      issue.priority === 'urgent' ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-[#6B7280] border-[#E5E7EB]"
                    )}>
                      {issue.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <span className="font-medium text-[#9CA3AF]">{issue.id}</span>
                    {issue.labels.map(l => (
                      <span key={l} className="bg-[#FAFAFA] border border-[#E5E7EB] px-1.5 py-0.5 rounded text-[#6B7280]">{l}</span>
                    ))}
                  </div>
                </div>
              ))}
              {inProgressIssues.length === 0 && (
                <div className="py-12">
                  <EmptyState icon={Activity} description="Nothing currently in progress" />
                </div>
              )}
            </div>
          </div>

          {/* Active Projects */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA]">
              <h2 className="font-bold text-[#0A0A0A] text-sm">Active Projects</h2>
            </div>
            <div className="divide-y divide-[#E5E7EB] flex-1">
              {activeProjects.map(project => (
                <div key={project.id} className="p-5 hover:bg-[#F3F4F6] transition-colors duration-100 cursor-pointer">
                  <div className="font-bold text-[#0A0A0A] mb-1">{project.name}</div>
                  <div className="text-sm text-[#6B7280] leading-relaxed">{project.problemStatement}</div>
                </div>
              ))}
              {activeProjects.length === 0 && (
                <div className="py-12">
                  <EmptyState icon={FolderKanban} description="No active projects" />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Context & Planning */}
        <div className="flex flex-col gap-6">
          
          {/* Today's Habits */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between">
              <h2 className="font-bold text-[#0A0A0A] text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Today's Habits
              </h2>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {habits.map(habit => (
                <div key={habit.id} className="p-4 flex items-center justify-between hover:bg-[#F3F4F6] transition-colors cursor-pointer group">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#0A0A0A] text-sm">{habit.name}</span>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">🔥 {habit.streak} streak</span>
                  </div>
                  <button className="w-6 h-6 rounded-md border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white hover:border-[#0A0A0A] transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0A0A0A]" />
              <h2 className="font-bold text-[#0A0A0A] text-sm">Upcoming Deadlines</h2>
            </div>
            <div className="divide-y divide-[#E5E7EB] p-2">
              {upcomingDeadlines.map(issue => (
                <div key={issue.id} className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors">
                  <div className="font-bold text-[#0A0A0A] text-sm truncate">{issue.title}</div>
                  <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1">
                    Due: {new Date(issue.dueDate!).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {upcomingDeadlines.length === 0 && (
                <div className="p-4 text-center text-sm text-[#9CA3AF] font-medium">No deadlines in next 7 days</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center gap-2">
              <History className="w-4 h-4 text-[#0A0A0A]" />
              <h2 className="font-bold text-[#0A0A0A] text-sm">Recent Activity</h2>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="p-4 flex flex-col gap-1">
                  <div className="text-sm text-[#0A0A0A]">
                    <span className="font-bold text-[#6B7280]">{activity.type}</span> updated
                  </div>
                  <div className="font-bold text-[#0A0A0A] truncate">{activity.title}</div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                    {activity.date.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
