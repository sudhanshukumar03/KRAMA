import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, ListTodo, AlertCircle, Play, Pause, Plus, Download } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';
import { BarChart, Bar, ResponsiveContainer, XAxis, PieChart, Pie, Cell, Tooltip } from 'recharts';

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

// Mock chart data (Issues completed per day)
const barData = [
  { name: 'Mon', completed: 3 },
  { name: 'Tue', completed: 5 },
  { name: 'Wed', completed: 2 },
  { name: 'Thu', completed: 8 },
  { name: 'Fri', completed: 4 },
  { name: 'Sat', completed: 1 },
  { name: 'Sun', completed: 0 },
];

export function Dashboard() {
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: dailyLogs = [] } = useQuery({ queryKey: ['dailyLogs'], queryFn: api.dailyLogs.list });

  if (issuesLoading || projectsLoading) return <div className="p-8 text-[#6B7280]">Loading dashboard...</div>;

  const activeProjects = projects.filter(p => p.status === 'active');
  const todoIssues = issues.filter(i => ['todo', 'backlog'].includes(i.status));
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const doneIssues = issues.filter(i => i.status === 'done' || i.status === 'released');
  
  // Compute Project Progress (Done vs Total)
  const totalIssues = issues.length;
  const doneCount = doneIssues.length;
  const pieData = [
    { name: 'Completed', value: doneCount },
    { name: 'Pending', value: totalIssues - doneCount }
  ];
  const pieColors = ['#0A0A0A', '#E5E7EB'];

  // Compute Upcoming Deadlines (Due in next 7 days or overdue)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const next48Hours = new Date(today.getTime() + 2 * 86400000);
  const upcomingDeadlines = issues.filter(i => 
    i.dueDate && new Date(i.dueDate) <= nextWeek && !['done', 'released'].includes(i.status)
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Mock Recent Activity (Sort across all models by updatedAt)
  const recentActivity = [
    ...projects.map(p => ({ id: p.id, action: `Project updated`, title: p.name, type: 'Project', date: new Date(p.updatedAt), status: p.status })),
    ...issues.map(i => ({ id: i.id, action: `Issue moved to ${i.status.replace('_', ' ')}`, title: i.title, type: 'Issue', date: new Date(i.updatedAt), status: i.status })),
    ...pages.map(p => ({ id: p.id, action: `Page edited`, title: p.title, type: 'Page', date: new Date(p.updatedAt), status: 'active' })),
    ...goals.map(g => ({ id: g.id, action: `Goal updated`, title: g.title, type: 'Goal', date: new Date(g.updatedAt), status: 'active' })),
    ...habits.map(h => ({ id: h.id, action: `Habit completed`, title: h.name, type: 'Habit', date: new Date(h.updatedAt), status: 'done' }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const summaryLine = `${inProgressIssues.length} issues in progress`;

  // Deep Work for today
  const todayLog = dailyLogs.find(l => new Date(l.date).toLocaleDateString() === today.toLocaleDateString());
  const deepWorkMins = todayLog?.deepWorkMinutes || 0;
  const hours = Math.floor(deepWorkMins / 60);
  const mins = deepWorkMins % 60;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150 flex flex-col gap-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">Dashboard</h1>
          <p className="text-[#6B7280] mt-1 font-medium">{formattedDate} — <span className="text-[#0A0A0A]">{summaryLine}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-9 px-4 rounded-md font-bold text-sm bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]">
            <Download className="w-4 h-4" /> Export
          </button>
          <BaseButton>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </BaseButton>
        </div>
      </div>
      
      {/* Row 1: Stat Cards (Bento row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Hero Card (In Progress) */}
        <div className="bg-[#0A0A0A] rounded-xl p-6 transition-transform duration-150 hover:-translate-y-1 shadow-lg shadow-black/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-lg text-white shadow-sm border border-white/5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white leading-none mb-1">{inProgressIssues.length}</div>
                <div className="text-sm text-[#9CA3AF] font-bold">In Progress</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[10px] uppercase font-bold tracking-wider text-[#9CA3AF]">Focus on these today</div>
        </div>

        {/* Regular Cards */}
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-transform duration-150 hover:-translate-y-1">
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

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-transform duration-150 hover:-translate-y-1">
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

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6 transition-transform duration-150 hover:-translate-y-1">
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

      {/* Row 2: Analytics & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-6">
          <h2 className="font-bold text-[#0A0A0A] text-sm mb-6">Project Analytics (Issues Completed)</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                <Bar dataKey="completed" fill="#0A0A0A" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6">
          <h2 className="font-bold text-[#0A0A0A] text-sm mb-4">Upcoming & Reminders</h2>
          <div className="space-y-3">
            {upcomingDeadlines.map(issue => {
              const isUrgentDate = new Date(issue.dueDate!) <= next48Hours;
              return (
                <div key={issue.id} className="flex items-start gap-3 p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#E5E7EB] cursor-pointer">
                  <div className={cn(
                    "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                    isUrgentDate ? "bg-[#DC2626]" : "bg-[#0A0A0A]"
                  )} />
                  <div className="min-w-0">
                    <div className="font-bold text-[#0A0A0A] text-sm truncate">{issue.title}</div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                      isUrgentDate ? "text-[#DC2626]" : "text-[#6B7280]"
                    )}>
                      Due {new Date(issue.dueDate!).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
            {upcomingDeadlines.length === 0 && (
              <div className="text-sm text-[#9CA3AF] font-medium p-2">No deadlines in next 7 days</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Activity & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Recent Activity (Avatar-Progress List adaptation) */}
        <div className="lg:col-span-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-6">
          <h2 className="font-bold text-[#0A0A0A] text-sm mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentActivity.map((activity, idx) => {
              const isDone = activity.status === 'done' || activity.status === 'released' || activity.status === 'completed';
              const isInProgress = activity.status === 'in_progress' || activity.status === 'active';
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#D1D5DB] transition-colors cursor-pointer group">
                  <div className="flex flex-col min-w-0">
                    <div className="text-sm text-[#0A0A0A] font-bold truncate">
                      {activity.title}
                    </div>
                    <div className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider mt-0.5">
                      {activity.type} • {getTimeAgo(activity.date)}
                    </div>
                  </div>
                  
                  {/* Grayscale Status Badge */}
                  <div className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ml-4 flex-shrink-0",
                    isDone ? "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]" 
                    : isInProgress ? "bg-white text-[#0A0A0A] border-[#0A0A0A]" 
                    : "bg-white text-[#6B7280] border-[#E5E7EB]"
                  )}>
                    {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Progress Donut */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col items-center justify-center">
          <h2 className="font-bold text-[#0A0A0A] text-sm w-full mb-2">Issue Progress</h2>
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[#0A0A0A] leading-none">{Math.round((doneCount / (totalIssues || 1)) * 100)}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0A0A0A]" />
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-[#E5E7EB]" />
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Deep Work Tracker */}
      <div className="grid grid-cols-1">
        <div className="bg-[#0A0A0A] rounded-xl p-6 flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <h2 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Deep Work Today</h2>
            <div className="text-4xl font-bold text-white font-mono tracking-tighter">
              {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:<span className="text-[#6B7280]">00</span>
            </div>
          </div>
          
          {/* Static Mock Controls */}
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Play className="w-5 h-5 ml-0.5" />
            </button>
            <button className="w-10 h-10 rounded-full border border-white/20 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Pause className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
