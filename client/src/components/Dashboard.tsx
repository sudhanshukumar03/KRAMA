import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, ListTodo, AlertCircle, Play, Plus, Download, Clock, ArrowUpRight, Flame, TrendingUp, Sparkles } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';
import { BarChart, Bar, ResponsiveContainer, XAxis, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';

// Helper for relative time
function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
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
  const navigate = useNavigate();
  const [activityFilter, setActivityFilter] = useState<'All' | 'Issue' | 'Project' | 'Habit' | 'Page'>('All');
  
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
    { name: 'Pending', value: Math.max(0, totalIssues - doneCount) }
  ];
  const pieColors = ['#2563EB', '#E5E8EC'];

  // Compute Upcoming Deadlines (Due in next 7 days or overdue)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const next48Hours = new Date(today.getTime() + 2 * 86400000);
  const upcomingDeadlines = issues.filter(i => 
    i.dueDate && new Date(i.dueDate) <= nextWeek && !['done', 'released'].includes(i.status)
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Recent Activity (Sort across all models by updatedAt)
  const allActivity = [
    ...projects.map(p => ({ id: p.id, action: `Project updated`, title: p.name, type: 'Project' as const, date: new Date(p.updatedAt), status: p.status, link: `/app/projects/${p.id}` })),
    ...issues.map(i => ({ id: i.id, action: `Issue moved to ${i.status.replace('_', ' ')}`, title: i.title, type: 'Issue' as const, date: new Date(i.updatedAt), status: i.status, link: `/app/timeline` })),
    ...pages.map(p => ({ id: p.id, action: `Page edited`, title: p.title, type: 'Page' as const, date: new Date(p.updatedAt), status: 'active', link: `/app/brain` })),
    ...goals.map(g => ({ id: g.id, action: `Goal updated`, title: g.title, type: 'Goal' as const, date: new Date(g.updatedAt), status: 'active', link: `/app/goals` })),
    ...habits.map(h => ({ id: h.id, action: `Habit completed`, title: h.name, type: 'Habit' as const, date: new Date(h.updatedAt), status: 'done', link: `/app/goals` }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredActivity = activityFilter === 'All' 
    ? allActivity.slice(0, 6)
    : allActivity.filter(a => a.type === activityFilter).slice(0, 6);

  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const summaryLine = `${inProgressIssues.length} issues in progress`;

  // Deep Work for today
  const todayLog = dailyLogs.find(l => new Date(l.date).toLocaleDateString() === today.toLocaleDateString());
  const deepWorkMins = todayLog?.deepWorkMinutes || 180;
  const hours = Math.floor(deepWorkMins / 60);
  const mins = deepWorkMins % 60;

  // Active Habit Streaks count
  const activeStreaksCount = habits.filter(h => h.streak > 0).length;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 flex flex-col gap-8 pb-20">
      
      {/* Header (H1: 28px/500 per typography rules) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Dashboard</h1>
            <span className="bg-[#EFF4FE] text-[#2563EB] border border-[#2563EB]/20 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.02em] flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-[#2563EB]" /> Live Pulse
            </span>
          </div>
          <p className="text-[13px] text-[#6B7280] font-normal">{formattedDate} — <span className="text-[#111827] font-medium">{summaryLine}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-9 px-4 rounded-md font-medium text-xs bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#F8F9FB] transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Download className="w-3.5 h-3.5 stroke-[1.75]" /> Export
          </button>
          <BaseButton onClick={() => navigate('/app/projects')}>
            <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> New Project
          </BaseButton>
        </div>
      </div>

      {/* NEW: Execution Velocity Scorecard (4 Interactive Stat Tickers with Sparklines & Tints) */}
      <div className="bg-white border border-[#E5E8EC] rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E8EC] gap-4 sm:gap-0">
        
        {/* Metric 1: Weekly Velocity */}
        <div className="sm:pr-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#111827] stroke-[1.75]" /> Weekly Velocity
            </span>
            <span className="text-[10px] font-mono text-[#6B7280] bg-[#F8F9FB] border border-[#E5E8EC] px-1.5 py-0.2 rounded font-medium">+18 pts</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-medium font-mono text-[#111827]">23 <span className="text-xs font-sans text-[#6B7280] font-normal">tasks/wk</span></span>
          </div>
          <div className="mt-3 flex items-center gap-1">
            {[3, 5, 2, 8, 4, 1, 0].map((val, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-[#F8F9FB] overflow-hidden">
                <div className="h-full bg-[#111827]" style={{ width: `${(val / 8) * 100}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Metric 2: Active Streaks */}
        <div className="pt-4 sm:pt-0 sm:px-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[1.75]" /> Active Streaks
            </span>
            <span className="text-[10px] font-mono text-[#C2410C] bg-[#FFF7ED] border border-[#FFEDD5] px-1.5 py-0.2 rounded font-medium">{activeStreaksCount} active</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-medium font-mono text-[#111827]">{habits.length || 3} <span className="text-xs font-sans text-[#6B7280] font-normal">habits logged</span></span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full", i < 5 ? "bg-[#EA580C]" : "bg-[#E5E8EC]")} />
                <span className="text-[8px] font-mono text-[#9CA3AF]">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 3: Q3 OKR Pace */}
        <div className="pt-4 lg:pt-0 sm:px-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#0D9488] stroke-[1.75]" /> Q3 OKR Pace
            </span>
            <span className="text-[10px] font-mono text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-1.5 py-0.2 rounded font-medium">On Track</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-medium font-mono text-[#111827]">35% <span className="text-xs font-sans text-[#6B7280] font-normal">avg progress</span></span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/40">
            <div className="h-full bg-[#0D9488] transition-all duration-500" style={{ width: '35%' }} />
          </div>
        </div>

        {/* Metric 4: Deep Work Ratio */}
        <div className="pt-4 lg:pt-0 sm:pl-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#111827] stroke-[1.75]" /> Deep Work Today
            </span>
            <span className="text-[10px] font-mono text-[#6B7280] bg-[#F8F9FB] border border-[#E5E8EC] px-1.5 py-0.2 rounded font-medium">70% target</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-medium font-mono text-[#111827]">{hours}h {mins}m <span className="text-xs font-sans text-[#6B7280] font-normal">/ 5h goal</span></span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/40">
            <div className="h-full bg-[#111827] transition-all duration-500" style={{ width: `${Math.min(100, (deepWorkMins / 300) * 100)}%` }} />
          </div>
        </div>

      </div>
      
      {/* Row 1: Stat Cards with 40x40px, 12px-radius Category Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Hero Card (The single strongest treatment on Dashboard: Solid black fill) */}
        <div onClick={() => navigate('/app/timeline')} className="bg-[#111827] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 shadow-md flex flex-col justify-between cursor-pointer group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              {/* Category Tile: Execution (#2563EB) */}
              <div className="w-10 h-10 rounded-[12px] bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-2xl font-medium text-white leading-none mb-1 font-mono">{inProgressIssues.length}</div>
                <div className="text-xs text-[#9CA3AF] font-medium">In Progress</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-white transition-colors" />
          </div>
          <div className="mt-4 text-[11px] uppercase font-medium tracking-[0.02em] text-[#9CA3AF] flex items-center justify-between">
            <span>Focus on these today</span>
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px]">Open timeline &rarr;</span>
          </div>
        </div>

        {/* Projects Card */}
        <div onClick={() => navigate('/app/projects')} className="bg-white border border-[#E5E8EC] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#111827] shadow-sm flex flex-col justify-between cursor-pointer group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[12px] bg-[#F8F9FB] border border-[#E5E8EC] text-[#111827] flex items-center justify-center shrink-0 group-hover:bg-[#111827] group-hover:text-white transition-all shadow-2xs">
                <Target className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-2xl font-medium text-[#111827] leading-none mb-1 font-mono">{activeProjects.length}</div>
                <div className="text-xs text-[#6B7280] font-medium">Active Projects</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#111827] transition-colors" />
          </div>
          <div className="mt-4 text-[11px] uppercase font-medium tracking-[0.02em] text-[#9CA3AF] flex items-center justify-between">
            <span>+1 this week</span>
            <span className="text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px]">View projects &rarr;</span>
          </div>
        </div>

        {/* To Do Card */}
        <div onClick={() => navigate('/app/timeline')} className="bg-white border border-[#E5E8EC] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#111827] shadow-sm flex flex-col justify-between cursor-pointer group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[12px] bg-[#F8F9FB] border border-[#E5E8EC] text-[#111827] flex items-center justify-center shrink-0 group-hover:bg-[#111827] group-hover:text-white transition-all shadow-2xs">
                <ListTodo className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-2xl font-medium text-[#111827] leading-none mb-1 font-mono">{todoIssues.length}</div>
                <div className="text-xs text-[#6B7280] font-medium">To Do</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#111827] transition-colors" />
          </div>
          <div className="mt-4 text-[11px] uppercase font-medium tracking-[0.02em] text-[#9CA3AF] flex items-center justify-between">
            <span>-2 since yesterday</span>
            <span className="text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px]">Open board &rarr;</span>
          </div>
        </div>

        {/* Completed Card */}
        <div onClick={() => navigate('/app/goals')} className="bg-white border border-[#E5E8EC] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#111827] shadow-sm flex flex-col justify-between cursor-pointer group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[12px] bg-[#F8F9FB] border border-[#E5E8EC] text-[#111827] flex items-center justify-center shrink-0 group-hover:bg-[#111827] group-hover:text-white transition-all shadow-2xs">
                <CheckCircle2 className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-2xl font-medium text-[#111827] leading-none mb-1 font-mono">{doneIssues.length}</div>
                <div className="text-xs text-[#6B7280] font-medium">Completed</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#111827] transition-colors" />
          </div>
          <div className="mt-4 text-[11px] uppercase font-medium tracking-[0.02em] text-[#9CA3AF] flex items-center justify-between">
            <span>92% Sprint Pace</span>
            <span className="text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px]">View goals &rarr;</span>
          </div>
        </div>
      </div>

      {/* Row 2: Analytics & De-boxed Reminders with Hover Polish */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-white border border-[#E5E8EC] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-medium text-[#111827] text-[18px]">Project Analytics (Issues Completed)</h2>
            <span className="text-xs text-[#6B7280] bg-[#F8F9FB] border border-[#E5E8EC] px-2.5 py-1 rounded-md font-mono">Last 7 Days</span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Tooltip cursor={{ fill: '#F8F9FB' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E8EC', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', fontSize: '12px' }} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} dy={10} />
                <Bar dataKey="completed" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* De-boxed Reminders with Quick Action Hover Bars */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-[#111827] text-[18px]">Upcoming & Reminders</h2>
            <span className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#2563EB] cursor-pointer hover:underline" onClick={() => navigate('/app/timeline')}>View calendar</span>
          </div>
          <div className="divide-y divide-[#E5E8EC]">
            {upcomingDeadlines.map(issue => {
              const isUrgentDate = new Date(issue.dueDate!) <= next48Hours;
              return (
                <div key={issue.id} onClick={() => navigate('/app/timeline')} className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-[#F8F9FB] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      "mt-1.5 w-2 h-2 rounded-full shrink-0",
                      isUrgentDate ? "bg-[#DC2626]" : "bg-[#2563EB]"
                    )} />
                    <div className="min-w-0">
                      <div className="font-medium text-[#111827] text-sm truncate group-hover:text-[#2563EB] transition-colors">{issue.title}</div>
                      <div className={cn(
                        "text-[11px] uppercase tracking-[0.02em] mt-0.5",
                        isUrgentDate ? "text-[#DC2626] font-medium" : "text-[#6B7280]"
                      )}>
                        Due {new Date(issue.dueDate!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#2563EB] font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1">
                    Open &rarr;
                  </span>
                </div>
              );
            })}
            {upcomingDeadlines.length === 0 && (
              <div className="py-6 text-sm text-[#9CA3AF] font-normal">No deadlines in next 7 days</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: De-boxed Recent Activity with Interactive Filter Tabs & Issue Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* De-boxed Recent Activity with Filter Bar */}
        <div className="lg:col-span-2 px-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-medium text-[#111827] text-[18px]">Recent Activity</h2>
            
            {/* Interactive Filter Pills */}
            <div className="flex items-center gap-1 bg-[#F8F9FB] border border-[#E5E8EC] p-0.5 rounded-lg w-max">
              {(['All', 'Issue', 'Project', 'Habit', 'Page'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActivityFilter(tab)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    activityFilter === tab ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  {tab === 'All' ? 'All' : `${tab}s`}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#E5E8EC]">
            {filteredActivity.map((activity, idx) => {
              const isDone = activity.status === 'done' || activity.status === 'released' || activity.status === 'completed';
              const isInProgress = activity.status === 'in_progress' || activity.status === 'active';
              return (
                <div key={idx} onClick={() => navigate(activity.link)} className="py-3.5 flex items-center justify-between gap-4 group cursor-pointer hover:bg-[#F8F9FB] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex flex-col min-w-0">
                    <div className="text-sm text-[#111827] font-medium truncate group-hover:text-[#2563EB] transition-colors flex items-center gap-2">
                      {activity.title}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">
                      <span className="font-medium text-[#111827]">{activity.type}</span> • {activity.action} • {getTimeAgo(activity.date)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.02em]",
                      isDone ? "bg-[#F8F9FB] text-[#6B7280] border border-[#E5E8EC]" 
                      : isInProgress ? "bg-[#EFF4FE] text-[#2563EB] border border-[#2563EB]/20" 
                      : "bg-[#F8F9FB] text-[#6B7280]"
                    )}>
                      {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
            {filteredActivity.length === 0 && (
              <div className="py-8 text-center text-sm text-[#9CA3AF]">No recent activity found for {activityFilter}s.</div>
            )}
          </div>
        </div>

        {/* Issue Progress Donut */}
        <div className="bg-white border border-[#E5E8EC] rounded-xl p-6 shadow-sm flex flex-col items-center justify-center">
          <h2 className="font-medium text-[#111827] text-[18px] w-full mb-4">Issue Progress</h2>
          <div className="relative w-44 h-44 min-h-[176px] flex items-center justify-center">
            {totalIssues === 0 ? (
              <div className="w-32 h-32 rounded-full border-8 border-[#F8F9FB] flex items-center justify-center">
                <span className="text-sm text-[#9CA3AF] font-medium">No issues</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={176}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={74}
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
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-medium text-[#111827] leading-none font-mono">{totalIssues ? Math.round((doneCount / totalIssues) * 100) : 0}%</span>
              <span className="text-[10px] text-[#6B7280] uppercase tracking-[0.02em] mt-1">Done</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.02em]">Completed ({doneCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E5E8EC]" />
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.02em]">Pending ({Math.max(0, totalIssues - doneCount)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Quieter Inline Deep Work Tracker */}
      <div className="bg-[#F8F9FB] border border-[#E5E8EC] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-white border border-[#E5E8EC] text-[#111827] flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-[0.02em]">Deep Work Today</h2>
            <div className="text-2xl font-medium text-[#111827] font-mono tracking-tight mt-0.5">
              {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:<span className="text-[#6B7280]">00</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button onClick={() => navigate('/app/review')} className="h-9 px-4 rounded-md bg-white border border-[#E5E8EC] hover:border-[#111827] text-[#111827] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm">
            <Play className="w-3.5 h-3.5 text-[#111827] stroke-[2]" /> Open Focus Timer &rarr;
          </button>
        </div>
      </div>

    </div>
  );
}
