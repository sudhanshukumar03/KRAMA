import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, ListTodo, AlertCircle, FolderKanban, Activity, History, Calendar, CheckSquare } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';

// Helper for relative time
function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " secs ago";
}

export function Dashboard() {
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });

  if (issuesLoading || projectsLoading) return <div className="p-8 text-[#6B7280]">Loading dashboard...</div>;

  const activeProjects = projects.filter(p => p.status === 'active');
  const todoIssues = issues.filter(i => ['todo', 'backlog'].includes(i.status));
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const doneIssues = issues.filter(i => i.status === 'done' || i.status === 'released');
  const urgentIssues = issues.filter(i => i.priority === 'urgent');

  // Compute Upcoming Deadlines (Due in next 7 days or overdue)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const next48Hours = new Date(today.getTime() + 2 * 86400000);
  const upcomingDeadlines = issues.filter(i => 
    i.dueDate && new Date(i.dueDate) <= nextWeek && !['done', 'released'].includes(i.status)
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Mock Recent Activity (Sort across all models by updatedAt)
  const recentActivity = [
    ...projects.map(p => ({ id: p.id, action: `Project updated`, title: p.name, type: 'Project', date: new Date(p.updatedAt) })),
    ...issues.map(i => ({ id: i.id, action: `Issue moved to ${i.status.replace('_', ' ')}`, title: i.title, type: 'Issue', date: new Date(i.updatedAt) })),
    ...pages.map(p => ({ id: p.id, action: `Page edited`, title: p.title, type: 'Page', date: new Date(p.updatedAt) })),
    ...goals.map(g => ({ id: g.id, action: `Goal updated`, title: g.title, type: 'Goal', date: new Date(g.updatedAt) })),
    ...habits.map(h => ({ id: h.id, action: `Habit completed`, title: h.name, type: 'Habit', date: new Date(h.updatedAt) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const summaryLine = `${inProgressIssues.length} issues in progress, ${urgentIssues.length} urgent`;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">Dashboard</h1>
        <p className="text-[#6B7280] mt-1 font-medium">{formattedDate} — <span className="text-[#0A0A0A]">{summaryLine}</span></p>
      </div>
      
      {/* Stat Cards (Heaviest Visual Weight) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        
        {/* Left Column: Core Work (Medium Visual Weight) */}
        <div className="lg:col-span-3 flex flex-col gap-10">
          
          {/* Current Work */}
          <div className="flex flex-col">
            <h2 className="font-bold text-[#0A0A0A] text-sm pt-4 pb-2 border-b border-[#E5E7EB]">Current Work (In Progress)</h2>
            <div className="divide-y divide-[#E5E7EB]">
              {inProgressIssues.map(issue => (
                <div key={issue.id} className="py-4 px-2 hover:bg-[#F3F4F6] transition-colors duration-100 cursor-pointer rounded -mx-2">
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
          <div className="flex flex-col">
            <h2 className="font-bold text-[#0A0A0A] text-sm pt-4 pb-2 border-b border-[#E5E7EB]">Active Projects</h2>
            <div className="divide-y divide-[#E5E7EB]">
              {activeProjects.map(project => (
                <div key={project.id} className="py-4 px-2 hover:bg-[#F3F4F6] transition-colors duration-100 cursor-pointer rounded -mx-2">
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

        {/* Right Column: Context & Planning (Lightest Visual Weight) */}
        <div className="lg:col-span-2 flex flex-col gap-10">
          
          {/* Today's Habits */}
          <div className="flex flex-col">
            <h2 className="font-bold text-[#0A0A0A] text-sm pb-2 border-b border-[#E5E7EB] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#0A0A0A]" /> Today's Habits
            </h2>
            <div className="divide-y divide-[#E5E7EB]">
              {habits.map(habit => (
                <div key={habit.id} className="py-3 px-2 flex items-center justify-between hover:bg-[#F3F4F6] transition-colors cursor-pointer group rounded -mx-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#0A0A0A] text-sm">{habit.name}</span>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">🔥 {habit.streak} streak</span>
                  </div>
                  <button className="w-5 h-5 rounded border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white hover:border-[#0A0A0A] transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="flex flex-col">
            <h2 className="font-bold text-[#0A0A0A] text-sm pb-2 border-b border-[#E5E7EB] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0A0A0A]" /> Upcoming Deadlines
            </h2>
            <div className="divide-y divide-[#E5E7EB]">
              {upcomingDeadlines.map(issue => {
                const isUrgentDate = new Date(issue.dueDate!) <= next48Hours;
                return (
                  <div key={issue.id} className="py-3 px-2 hover:bg-[#F3F4F6] transition-colors rounded -mx-2">
                    <div className="font-bold text-[#0A0A0A] text-sm truncate">{issue.title}</div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-wider mt-1",
                      isUrgentDate ? "text-[#DC2626]" : "text-[#6B7280]"
                    )}>
                      Due: {new Date(issue.dueDate!).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
              {upcomingDeadlines.length === 0 && (
                <div className="py-4 text-sm text-[#9CA3AF] font-medium">No deadlines in next 7 days</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="flex flex-col">
            <h2 className="font-bold text-[#0A0A0A] text-sm pb-2 border-b border-[#E5E7EB] flex items-center gap-2">
              <History className="w-4 h-4 text-[#0A0A0A]" /> Recent Activity
            </h2>
            <div className="divide-y divide-[#E5E7EB]">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="py-3 px-2 flex flex-col gap-1 hover:bg-[#F3F4F6] transition-colors rounded -mx-2">
                  <div className="text-xs text-[#0A0A0A] font-medium leading-tight">
                    {activity.action} — <span className="font-bold">{activity.title}</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                    {getTimeAgo(activity.date)}
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
