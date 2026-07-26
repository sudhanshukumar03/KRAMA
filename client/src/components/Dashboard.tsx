import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Target, CheckCircle2, ListTodo, AlertCircle, Play, Plus, Download, Clock, ArrowUpRight, Flame, TrendingUp, Sparkles, Check } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
import { BarChart, Bar, ResponsiveContainer, XAxis, PieChart, Pie, Cell, Tooltip, CartesianGrid } from 'recharts';
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
  
  const { data: issues = [], isLoading: issuesLoading, isError: issuesError } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [], isLoading: projectsLoading, isError: projectsError } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: dailyLogs = [] } = useQuery({ queryKey: ['daily-logs'], queryFn: api.dailyLogs.list });

  const queryClient = useQueryClient();
  const toggleHabitMutation = useMutation({
    mutationFn: (id: string) => api.habits.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  if (issuesLoading || projectsLoading) {
    return <LoadingState variant="dashboard" title="Loading dashboard..." description="Compiling metrics and workspace activity..." />;
  }

  if (issuesError || projectsError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load dashboard data"
          message="An error occurred while fetching dashboard metrics. Please check your network connection or server status."
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      </div>
    );
  }

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
  const deepWorkMins = todayLog?.deepWorkMinutes || 0;
  const hours = Math.floor(deepWorkMins / 60);
  const mins = deepWorkMins % 60;

  // Active Habit Streaks count
  const activeStreaksCount = habits.filter(h => h.streak > 0).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 flex flex-col gap-8 pb-20">
      
      {/* Header (#1 Typography: 32px/650 title, 15px/450 body) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E8EC] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-title tracking-tight text-[#111827]">Dashboard</h1>
            <span className="bg-[#EFF4FE] text-[#2563EB] border border-[#2563EB]/20 px-2.5 py-0.5 rounded text-badge flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#2563EB] stroke-[2]" /> Live Pulse
            </span>
          </div>
          <p className="text-body text-[#6B7280]">{formattedDate} — <span className="text-[#111827] font-medium">{summaryLine}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-9 px-4 rounded-md font-medium text-xs bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#F8F9FB] transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm">
            <Download className="w-3.5 h-3.5 stroke-[1.75]" /> Export
          </button>
          <BaseButton onClick={() => navigate('/app/projects')}>
            <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> New Project
          </BaseButton>
        </div>
      </div>

      {/* SECTION 1: TODAY'S FOCUS (HERO SCORECARD & NAV CARDS) (#8 Guide the Eye Order) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-h2 tracking-tight text-[#111827]">Today's Focus</h2>
          <span className="text-caption font-mono text-[#6B7280]">Real-time execution velocity</span>
        </div>

        {/* Execution Velocity Scorecard (4 Interactive Stat Tickers) */}
        <div className="bg-white border border-[#E5E8EC] rounded-xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E8EC] gap-6 sm:gap-0">
          
          {/* Metric 1: Weekly Velocity */}
          <div className="sm:pr-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#111827] stroke-[1.75]" /> Weekly Velocity
              </span>
              <span className="text-badge text-[#6B7280] bg-[#F8F9FB] border border-[#E5E8EC] px-1.5 py-0.5 rounded">+18 pts</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-medium font-mono text-[#111827]">23 <span className="text-caption font-sans text-[#6B7280] font-normal">tasks/wk</span></span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {[3, 5, 2, 8, 4, 1, 0].map((val, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full bg-[#F8F9FB] overflow-hidden">
                  <div className="h-full bg-[#111827] transition-all duration-400 ease-out" style={{ width: `${(val / 8) * 100}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Metric 2: Active Streaks */}
          <div className="pt-6 sm:pt-0 sm:px-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[1.75]" /> Active Streaks
              </span>
              <span className="text-badge text-[#C2410C] bg-[#FFF7ED] border border-[#FFEDD5] px-1.5 py-0.5 rounded">{activeStreaksCount} active</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-medium font-mono text-[#111827]">{habits.length} <span className="text-caption font-sans text-[#6B7280] font-normal">habits logged</span></span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {[-6, -5, -4, -3, -2, -1, 0].map((offset, i) => {
                const d = new Date(today.getTime() + offset * 86400000);
                const dStr = d.toISOString().split('T')[0] || '';
                const completedOnDay = habits.some(h => 
                  h.completions?.some(c => c.date.toString().startsWith(dStr) && c.completed) ||
                  (offset === 0 && h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === d.toDateString())
                );
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full transition-all duration-400", completedOnDay ? "bg-[#EA580C]" : "bg-[#E5E8EC]")} />
                    <span className="text-[9px] font-mono text-[#9CA3AF]">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metric 3: Q3 OKR Pace */}
          <div className="pt-6 lg:pt-0 sm:px-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#0D9488] stroke-[1.75]" /> Q3 OKR Pace
              </span>
              <span className="text-badge text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-1.5 py-0.5 rounded">On Track</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-medium font-mono text-[#111827]">35% <span className="text-caption font-sans text-[#6B7280] font-normal">avg progress</span></span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/40">
              <div className="h-full bg-[#0D9488] transition-all duration-400 ease-out" style={{ width: '35%' }} />
            </div>
          </div>

          {/* Metric 4: Deep Work Ratio */}
          <div className="pt-6 lg:pt-0 sm:pl-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-[#6B7280] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#111827] stroke-[1.75]" /> Deep Work Today
              </span>
              <span className="text-badge text-[#6B7280] bg-[#F8F9FB] border border-[#E5E8EC] px-1.5 py-0.5 rounded">70% target</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-medium font-mono text-[#111827]">{hours}h {mins}m <span className="text-caption font-sans text-[#6B7280] font-normal">/ 5h goal</span></span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/40">
              <div className="h-full bg-[#111827] transition-all duration-400 ease-out" style={{ width: `${Math.min(100, (deepWorkMins / 300) * 100)}%` }} />
            </div>
          </div>

        </div>
        
        {/* Row 1: Stat Cards with #6 Icon Sizing: 36x36px container (w-9 h-9), 16px icon (w-4 h-4), and #7 Card hover lift */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Hero Card (#8 Guide the Eye: Solid Brand Blue Fill) */}
          <div onClick={() => navigate('/app/timeline')} className="bg-[#2563EB] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-white/20 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-150">
                  <AlertCircle className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-white leading-none mb-1 font-mono">{inProgressIssues.length}</div>
                  <div className="text-caption text-white/90 font-medium">In Progress</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/80 group-hover:text-white transition-colors duration-150" />
            </div>
            <div className="mt-4 text-badge text-white/80 flex items-center justify-between">
              <span>Focus on these today</span>
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 text-[10px] lowercase font-normal">open timeline &rarr;</span>
            </div>
          </div>

          {/* Projects Card (Indigo Category Tint #4F46E5) */}
          <div onClick={() => navigate('/app/projects')} className="bg-white border border-[#E5E8EC] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#4F46E5] hover:shadow-md flex flex-col justify-between cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-150 shadow-2xs">
                  <Target className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-[#111827] leading-none mb-1 font-mono">{activeProjects.length}</div>
                  <div className="text-caption text-[#6B7280] font-medium">Active Projects</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#4F46E5] transition-colors duration-150" />
            </div>
            <div className="mt-4 text-badge text-[#9CA3AF] flex items-center justify-between">
              <span>+1 this week</span>
              <span className="text-[#4F46E5] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 text-[10px] lowercase font-normal">view projects &rarr;</span>
            </div>
          </div>

          {/* To Do Card (Execution Blue Category Tint #2563EB) */}
          <div onClick={() => navigate('/app/timeline')} className="bg-white border border-[#E5E8EC] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-md flex flex-col justify-between cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-150 shadow-2xs">
                  <ListTodo className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-[#111827] leading-none mb-1 font-mono">{todoIssues.length}</div>
                  <div className="text-caption text-[#6B7280] font-medium">To Do</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors duration-150" />
            </div>
            <div className="mt-4 text-badge text-[#9CA3AF] flex items-center justify-between">
              <span>-2 since yesterday</span>
              <span className="text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 text-[10px] lowercase font-normal">open board &rarr;</span>
            </div>
          </div>

          {/* Completed Card (Goals Teal Category Tint #0D9488) */}
          <div onClick={() => navigate('/app/goals')} className="bg-white border border-[#E5E8EC] rounded-xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#0D9488] hover:shadow-md flex flex-col justify-between cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-150 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-[#111827] leading-none mb-1 font-mono">{doneIssues.length}</div>
                  <div className="text-caption text-[#6B7280] font-medium">Completed</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0D9488] transition-colors duration-150" />
            </div>
            <div className="mt-4 text-badge text-[#9CA3AF] flex items-center justify-between">
              <span>92% Sprint Pace</span>
              <span className="text-[#0D9488] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 text-[10px] lowercase font-normal">view goals &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROGRESS (#8 Guide the Eye Order & #2 Chrome Reduction: Unboxed Section with 1px Divider) */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-[#E5E8EC] pb-3">
          <h2 className="text-h2 tracking-tight text-[#111827]">Progress & Velocity</h2>
          <span className="text-caption font-mono text-[#6B7280]">Sprint completion ratio & live deep work</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Issue Progress Donut (Unboxed content-forward treatment) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-2">
            <div className="relative w-36 h-36 min-h-[144px] shrink-0 flex items-center justify-center">
              {totalIssues === 0 ? (
                <div className="w-28 h-28 rounded-full border-8 border-[#F8F9FB] flex items-center justify-center">
                  <span className="text-caption text-[#9CA3AF] font-medium">No issues</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={144}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={64}
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
                <span className="text-xl font-medium text-[#111827] leading-none font-mono">{totalIssues ? Math.round((doneCount / totalIssues) * 100) : 0}%</span>
                <span className="text-badge text-[#6B7280] mt-1">Done</span>
              </div>
            </div>
            
            <div className="space-y-3 w-full">
              <div className="text-card-title text-[#111827]">Sprint Issue Balance</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-caption text-[#6B7280]">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#2563EB]" /> Completed</span>
                  <span className="font-mono font-medium text-[#111827]">{doneCount}</span>
                </div>
                <div className="flex items-center justify-between text-caption text-[#6B7280]">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#E5E8EC]" /> Pending</span>
                  <span className="font-mono font-medium text-[#111827]">{Math.max(0, totalIssues - doneCount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Deep Work Tracker (Unboxed content-forward treatment) */}
          <div className="lg:col-span-2 bg-[#F8F9FB] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-[10px] bg-white border border-[#E5E8EC] text-[#111827] flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-4 h-4 stroke-[1.75]" />
              </div>
              <div>
                <h3 className="text-badge text-[#9CA3AF]">Deep Work Focus Session</h3>
                <div className="text-2xl font-medium text-[#111827] font-mono tracking-tight mt-0.5">
                  {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:<span className="text-[#6B7280]">00</span>
                </div>
              </div>
            </div>
            
            <button onClick={() => navigate('/app/review')} className="h-9 px-4 rounded-md bg-white border border-[#E5E8EC] hover:border-[#111827] text-[#111827] text-xs font-medium transition-all duration-150 flex items-center gap-2 shadow-sm cursor-pointer shrink-0">
              <Play className="w-3.5 h-3.5 text-[#111827] stroke-[2]" /> Launch Stopwatch &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2.5: PROJECTS (#8 Guide the Eye Order: Focus -> Progress -> Projects -> Analytics -> Upcoming) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-[#E5E8EC] pb-3">
          <h2 className="text-h2 tracking-tight text-[#111827]">Active Projects</h2>
          <span className="text-badge text-[#4F46E5] cursor-pointer hover:underline lowercase font-normal" onClick={() => navigate('/app/projects')}>view portfolio &rarr;</span>
        </div>
        <div className="divide-y divide-[#E5E8EC]/60">
          {activeProjects.slice(0, 4).map(project => (
            <div key={project.id} onClick={() => navigate('/app/projects')} className="py-3 flex items-center justify-between gap-4 group cursor-pointer hover:bg-[#F8F9FB] -mx-2 px-2 rounded-lg transition-all duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-[#111827] text-body truncate group-hover:text-[#4F46E5] transition-colors duration-150">{project.name}</div>
                  <div className="text-caption text-[#6B7280] truncate">{project.description || 'No description provided'}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <span className="text-badge text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded uppercase font-mono">{project.status || 'Active'}</span>
                <span className="text-caption text-[#4F46E5] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1">open &rarr;</span>
              </div>
            </div>
          ))}
          {activeProjects.length === 0 && (
            <div className="py-6 text-body text-[#9CA3AF]">No active projects logged</div>
          )}
        </div>
      </div>

      {/* SECTION 3: ANALYTICS (#8 Guide the Eye Order, #2 Chrome Reduction: Unboxed Section, #9 Chart Polish) */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-[#E5E8EC] pb-3">
          <h2 className="text-h2 tracking-tight text-[#111827]">Analytics</h2>
          <span className="text-caption font-mono text-[#6B7280]">7-day engineering output</span>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="text-card-title text-[#111827]">Issues Completed per Day</div>
            <span className="text-badge text-[#6B7280] bg-[#F8F9FB] border border-[#E5E8EC] px-2.5 py-1 rounded">Last 7 Days</span>
          </div>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E8EC" />
                <Tooltip 
                  cursor={{ fill: '#F8F9FB', opacity: 0.8 }} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E5E8EC', backgroundColor: '#FFFFFF', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '13px', padding: '8px 12px' }}
                  formatter={(value: any) => [`${value} issues`, 'Completed']}
                />
                <XAxis dataKey="name" axisLine={{ stroke: '#E5E8EC', strokeWidth: 1 }} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 450 }} dy={10} />
                <Bar dataKey="completed" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 4: UPCOMING, HABITS & RECENT ACTIVITY (#8 Guide the Eye Order & #2 Chrome Reduction: Unboxed Sections with 1px Dividers) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start pt-4">
        
        {/* Unboxed Upcoming Reminders (#2 Chrome Reduction) */}
        <div>
          <div className="flex items-center justify-between border-b border-[#E5E8EC] pb-3 mb-4">
            <h2 className="text-h2 tracking-tight text-[#111827]">Upcoming</h2>
            <span className="text-badge text-[#2563EB] cursor-pointer hover:underline lowercase font-normal" onClick={() => navigate('/app/timeline')}>view calendar &rarr;</span>
          </div>
          <div className="divide-y divide-[#E5E8EC]/60">
            {upcomingDeadlines.map(issue => {
              const isUrgentDate = new Date(issue.dueDate!) <= next48Hours;
              return (
                <div key={issue.id} onClick={() => navigate('/app/timeline')} className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-[#F8F9FB] -mx-2 px-2 rounded-lg transition-all duration-150">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      "mt-1.5 w-2 h-2 rounded-full shrink-0 transition-all duration-300",
                      isUrgentDate ? "bg-[#DC2626]" : "bg-[#2563EB]"
                    )} />
                    <div className="min-w-0">
                      <div className="font-medium text-[#111827] text-body truncate group-hover:text-[#2563EB] transition-colors duration-150">{issue.title}</div>
                      <div className={cn(
                        "text-badge mt-0.5",
                        isUrgentDate ? "text-[#DC2626]" : "text-[#6B7280]"
                      )}>
                        Due {new Date(issue.dueDate!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-caption text-[#2563EB] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 flex items-center gap-1">
                    open &rarr;
                  </span>
                </div>
              );
            })}
            {upcomingDeadlines.length === 0 && (
              <div className="py-6 text-body text-[#9CA3AF]">No deadlines in next 7 days</div>
            )}
          </div>
        </div>

        {/* Unboxed Daily Habits Checklist (#2 Chrome Reduction) */}
        <div>
          <div className="flex items-center justify-between border-b border-[#E5E8EC] pb-3 mb-4">
            <h2 className="text-h2 tracking-tight text-[#111827]">Daily Habits</h2>
            <span className="text-badge text-[#2563EB] cursor-pointer hover:underline lowercase font-normal" onClick={() => navigate('/app/goals')}>view all &rarr;</span>
          </div>
          <div className="divide-y divide-[#E5E8EC]/60">
            {habits.map(habit => {
              const todayStr = new Date().toISOString().split('T')[0] || '';
              const isCompletedToday = habit.completions?.some(c => c.date.toString().startsWith(todayStr) && c.completed) || 
                (habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString());
              return (
                <div 
                  key={habit.id} 
                  onClick={() => toggleHabitMutation.mutate(habit.id)}
                  className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-[#F8F9FB] -mx-2 px-2 rounded-lg transition-all duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      type="button"
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center border transition-all duration-150 shrink-0",
                        isCompletedToday 
                          ? "bg-[#2563EB] border-[#2563EB] text-white" 
                          : "border-[#D1D5DB] bg-white group-hover:border-[#9CA3AF]"
                      )}
                    >
                      {isCompletedToday && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </button>
                    <div className="min-w-0">
                      <div className={cn(
                        "font-medium text-body truncate transition-colors duration-150",
                        isCompletedToday ? "line-through text-[#9CA3AF]" : "text-[#111827] group-hover:text-[#2563EB]"
                      )}>
                        {habit.name}
                      </div>
                      <div className="text-badge text-[#6B7280] mt-0.5 flex items-center gap-1.5">
                        <span>{habit.cadence}</span>
                        <span>•</span>
                        <span className="text-[#EA580C] font-mono flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 inline" /> {habit.streak}d</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-caption text-[#2563EB] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                    {isCompletedToday ? 'undo' : 'check'} &rarr;
                  </span>
                </div>
              );
            })}
            {habits.length === 0 && (
              <div className="py-6 text-body text-[#9CA3AF]">No habits configured yet</div>
            )}
          </div>
        </div>

        {/* Unboxed Recent Activity with Interactive Filter Tabs (#2 Chrome Reduction) */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E8EC] pb-3 mb-4">
            <h2 className="text-h2 tracking-tight text-[#111827]">Recent Activity</h2>
            
            {/* Interactive Filter Pills */}
            <div className="flex items-center gap-1 bg-[#F8F9FB] border border-[#E5E8EC] p-0.5 rounded-lg w-max">
              {(['All', 'Issue', 'Project', 'Habit', 'Page'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActivityFilter(tab)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-caption font-medium transition-all duration-150 cursor-pointer",
                    activityFilter === tab ? "bg-white text-[#111827] shadow-sm font-semibold" : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  {tab === 'All' ? 'All' : `${tab}s`}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#E5E8EC]/60">
            {filteredActivity.map((activity, idx) => {
              const isDone = activity.status === 'done' || activity.status === 'released' || activity.status === 'completed';
              const isInProgress = activity.status === 'in_progress' || activity.status === 'active';
              return (
                <div key={idx} onClick={() => navigate(activity.link)} className="py-3.5 flex items-center justify-between gap-4 group cursor-pointer hover:bg-[#F8F9FB] -mx-2 px-2 rounded-lg transition-all duration-150">
                  <div className="flex flex-col min-w-0">
                    <div className="text-body text-[#111827] font-medium truncate group-hover:text-[#2563EB] transition-colors duration-150 flex items-center gap-2">
                      {activity.title}
                    </div>
                    <div className="text-caption text-[#6B7280] mt-0.5">
                      <span className="font-medium text-[#111827]">{activity.type}</span> • {activity.action} • {getTimeAgo(activity.date)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-badge",
                      isDone ? "bg-[#F8F9FB] text-[#6B7280] border border-[#E5E8EC]" 
                      : isInProgress ? "bg-[#EFF4FE] text-[#2563EB] border border-[#2563EB]/20" 
                      : "bg-[#F8F9FB] text-[#6B7280]"
                    )}>
                      {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  </div>
                </div>
              );
            })}
            {filteredActivity.length === 0 && (
              <div className="py-8 text-center text-body text-[#9CA3AF]">No recent activity found for {activityFilter}s.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
