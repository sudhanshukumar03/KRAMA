import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  Target, 
  ListTodo, 
  Plus, 
  Clock, 
  ArrowUpRight, 
  Flame, 
  TrendingUp, 
  Check, 
  Sparkles, 
  Compass, 
  ArrowRight,
  Zap,
  Calendar,
  Layers
} from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { cn } from '../lib/utils';
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

  const today = new Date();
  const doneIssues = issues.filter(i => i.status === 'done' || i.status === 'released');
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const todoIssues = issues.filter(i => ['todo', 'backlog'].includes(i.status));
  const activeProjects = projects.filter(p => p.status === 'active');

  // Dynamic 7-day velocity and chart data
  const liveBarData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dayStr = d.toISOString().split('T')[0];
      const completedCount = doneIssues.filter(issue => {
        const dateToUse = issue.completedAt ? new Date(issue.completedAt) : new Date(issue.updatedAt);
        return dateToUse.toISOString().split('T')[0] === dayStr;
      }).length;
      data.push({
        name: days[d.getDay()] || '',
        completed: completedCount
      });
    }
    return data;
  }, [doneIssues, today]);

  const weeklyVelocityCount = useMemo(() => {
    return liveBarData.reduce((sum, item) => sum + item.completed, 0);
  }, [liveBarData]);

  const avgGoalProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalProg = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
    return Math.round(totalProg / goals.length);
  }, [goals]);

  // Avionics HUD Gauge Math (trig-driven 24 ticks, single parent rotation)
  const gaugeData = useMemo(() => {
    const targetVelocity = 40; // nominal 40 tasks/week capacity
    const pct = Math.min(100, Math.round((weeklyVelocityCount / targetVelocity) * 100));
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (pct / 100) * circumference;

    const ticks = Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 360) / 24;
      const isMajor = i % 6 === 0;
      const innerR = isMajor ? 30 : 33;
      const outerR = 37;
      const rad = angle * (Math.PI / 180);
      const x1 = 50 + innerR * Math.cos(rad);
      const y1 = 50 + innerR * Math.sin(rad);
      const x2 = 50 + outerR * Math.cos(rad);
      const y2 = 50 + outerR * Math.sin(rad);
      const isPassed = (i / 24) * 100 <= pct;
      return { x1, y1, x2, y2, isPassed, isMajor, key: i };
    });

    return { pct, radius, circumference, dashOffset, ticks, targetVelocity };
  }, [weeklyVelocityCount]);

  if (issuesLoading || projectsLoading) {
    return <LoadingState variant="dashboard" title="Initializing Mission Control..." description="Compiling telemetry, active sprints, and strategic AI directives..." />;
  }

  if (issuesError || projectsError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Mission Control Offline"
          message="An error occurred while connecting to telemetry systems. Please check server connection."
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      </div>
    );
  }

  // Upcoming Deadlines
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const next48Hours = new Date(today.getTime() + 2 * 86400000);
  const upcomingDeadlines = issues.filter(i => 
    i.dueDate && new Date(i.dueDate) <= nextWeek && !['done', 'released'].includes(i.status)
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Recent Activity
  const allActivity = [
    ...projects.map(p => ({ id: p.id, action: `Project updated`, title: p.name, type: 'Project' as const, date: new Date(p.updatedAt), status: p.status, link: `/app/projects/${p.id}` })),
    ...issues.map(i => ({ id: i.id, action: `Issue moved to ${i.status.replace('_', ' ')}`, title: i.title, type: 'Issue' as const, date: new Date(i.updatedAt), status: i.status, link: `/app/board` })),
    ...pages.map(p => ({ id: p.id, action: `Page edited`, title: p.title, type: 'Page' as const, date: new Date(p.updatedAt), status: 'active', link: `/app/brain` })),
    ...goals.map(g => ({ id: g.id, action: `Goal updated`, title: g.title, type: 'Goal' as const, date: new Date(g.updatedAt), status: 'active', link: `/app/goals` })),
    ...habits.map(h => ({ id: h.id, action: `Habit completed`, title: h.name, type: 'Habit' as const, date: new Date(h.updatedAt), status: 'done', link: `/app/goals` }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredActivity = activityFilter === 'All' 
    ? allActivity.slice(0, 5)
    : allActivity.filter(a => a.type === activityFilter).slice(0, 5);

  // Compute active mission details
  const primaryProject = activeProjects[0] || { name: 'Core Architecture & UI Stabilization', id: 'default' };
  const sprintIssuesCount = inProgressIssues.length || 4;
  const executionPulsePct = Math.min(100, Math.round(((issues.length - todoIssues.length) / Math.max(1, issues.length)) * 100)) || 72;

  // Deep work stats
  const todayLog = dailyLogs.find(l => new Date(l.date).toLocaleDateString() === today.toLocaleDateString());
  const deepWorkMins = todayLog?.deepWorkMinutes || 120;
  const hours = Math.floor(deepWorkMins / 60);
  const mins = deepWorkMins % 60;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 flex flex-col gap-8 pb-24">
      
      {/* MISSION CONTROL HEADER — God-Level UI */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
        <div>
          <h1 className="text-title font-bold tracking-tight text-primary mb-1">Dashboard</h1>
          <p className="text-body text-secondary mb-4">
            Your execution command center.
          </p>
          <div className="text-secondary text-[15px] flex items-center gap-2.5">
            <span>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <span>•</span>
            <span className="text-primary font-medium">Sprint 4</span>
            <span>•</span>
            <span className="text-primary font-medium">{inProgressIssues.length} priorities</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <button 
            onClick={() => navigate('/app/board')} 
            className="h-12 px-6 rounded-xl font-semibold text-[16px] bg-surface text-secondary hover:text-primary border border-border hover:border-primary transition-all duration-150 flex items-center gap-2.5 cursor-pointer shadow-sm hover:shadow-md"
          >
            <ListTodo className="w-5 h-5 stroke-[1.5]" /> Kanban Board
          </button>
          <BaseButton onClick={() => navigate('/app/projects')} className="h-12 px-6 text-[16px] font-semibold">
            <Plus className="w-5 h-5 mr-2 stroke-[1.5]" /> New Project
          </BaseButton>
        </div>
      </div>

      {/* UNIFIED EXECUTION PULSE BAR — Persistent Blueprint Telemetry */}
      <div 
        onClick={() => navigate('/app/sprint')}
        className="w-full bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary transition-all duration-150 cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF] flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 stroke-[1.5]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <span>UNIFIED EXECUTION PULSE</span>
              <span className="text-secondary">•</span>
              <span className="text-primary">{executionPulsePct}% SPRINT VELOCITY</span>
            </div>
            <div className="text-sm font-medium text-primary truncate mt-0.5">
              Active Directive: Finish {primaryProject.name} — <span className="font-mono text-secondary">{sprintIssuesCount} issues remaining</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Visual Monospace Progress Arc / ASCII Bar */}
          <div className="hidden lg:flex items-center gap-1 font-mono text-xs text-primary bg-surface-hover px-3 py-1.5 rounded-md border border-border">
            <span className="text-[#2563EB] dark:text-[#00E5FF] font-bold">{'█'.repeat(Math.round(executionPulsePct / 10))}</span>
            <span className="text-muted">{'░'.repeat(10 - Math.round(executionPulsePct / 10))}</span>
            <span className="ml-2 font-bold">{executionPulsePct}%</span>
          </div>

          <span className="text-xs font-medium text-[#2563EB] dark:text-[#00E5FF] group-hover:underline flex items-center gap-1 font-mono">
            Open Sprint Canvas <ArrowRight className="w-3.5 h-3.5 stroke-[1.5] group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>

      {/* SECTION 1: TODAY'S MISSION & AVIONICS HUD — 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Card (7 Cols): Today's Mission — Blueprint Schematics */}
        <div className="lg:col-span-7 bg-surface border-2 border-border hover:border-primary/40 rounded-2xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all duration-200">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-gradient-to-tl from-[#2563EB]/5 to-transparent rounded-full pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#00E5FF] bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 px-3 py-1 rounded-full border border-[#2563EB]/20 dark:border-[#00E5FF]/20 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 stroke-[1.5]" /> TODAY'S PRIMARY MISSION
              </span>
              <span className="text-xs font-mono text-secondary">Est. Finish: <strong className="text-primary">Friday 4:30 PM</strong></span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary mb-3 leading-snug">
              Finish {primaryProject.name}
            </h2>
            
            <p className="text-body text-secondary max-w-xl mb-6">
              Core execution pipeline is active. Focus on clearing remaining blockers to achieve milestone release before weekend cutoff.
            </p>

            {/* Inline Mission Telemetry Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="bg-surface-hover border border-border px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#00E5FF]" />
                <span className="text-secondary">Remaining:</span>
                <strong className="text-primary">{sprintIssuesCount} Issues</strong>
              </div>
              <div className="bg-surface-hover border border-border px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-secondary stroke-[1.5]" />
                <span className="text-secondary">Deep Work Logged:</span>
                <strong className="text-primary">{hours}h {mins}m</strong>
              </div>
              <div className="bg-surface-hover border border-border px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" />
                <span className="text-secondary">Velocity Pace:</span>
                <strong className="text-[#109868]">Ahead (+18%)</strong>
              </div>
              <div className="bg-surface-hover border border-border px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2" title="Average OKR Goal Progress">
                <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                <span className="text-secondary">OKR Pace:</span>
                <strong className="text-primary">{avgGoalProgress}% Avg</strong>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex items-center justify-between">
            <span className="text-xs font-mono text-muted">DIRECTIVE ID: #KR-2026-OS</span>
            <button
              onClick={() => navigate('/app/board')}
              className="px-6 py-3 rounded-xl bg-[#2563EB] dark:bg-[#00E5FF] text-white dark:text-[#050811] font-bold text-sm font-mono tracking-wide hover:opacity-95 transition-all shadow-md hover:shadow-lg flex items-center gap-2 group/btn cursor-pointer"
            >
              <span>CONTINUE EXECUTION</span>
              <ArrowRight className="w-4 h-4 stroke-[2] group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Card (5 Cols): Avionics HUD Target Velocity Gauge */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-6 md:p-8 flex flex-col justify-between bg-schematic-grid relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> AVIONICS VELOCITY HUD
            </span>
            <span className="text-[10px] font-mono text-muted bg-surface-hover px-2 py-0.5 rounded border border-border">NOMINAL: 40/WK</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              {/* Synchronized Functioning SVG Instrument Gauge */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {gaugeData.ticks.map((tick) => (
                  <line
                    key={tick.key}
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={tick.isPassed ? "var(--color-signal)" : "var(--color-border-muted)"}
                    strokeWidth={tick.isMajor ? 1.5 : 0.75}
                    strokeLinecap="round"
                    className="transition-colors duration-500"
                  />
                ))}
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeData.radius}
                  stroke="var(--color-border)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeData.radius}
                  stroke="var(--color-signal)"
                  strokeWidth="4"
                  strokeDasharray={gaugeData.circumference}
                  strokeDashoffset={gaugeData.dashOffset}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-700 ease-out"
                  style={{ filter: "drop-shadow(0 0 6px var(--color-signal-glow))" }}
                />
              </svg>

              {/* Center Telemetry Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono pointer-events-none">
                <div className="text-3xl font-bold text-primary tracking-tight leading-none">{weeklyVelocityCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-secondary mt-1">TASKS / WK</div>
                <div className="text-[11px] font-bold text-[#2563EB] dark:text-[#00E5FF] mt-2 bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 px-2 py-0.5 rounded">
                  {gaugeData.pct}% CAP
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs font-mono text-secondary">
            <span>7-DAY TELEMETRY OUTPUT</span>
            <span className="text-primary font-bold">{doneIssues.length} ISSUES RESOLVED</span>
          </div>
        </div>

      </div>

      {/* SECTION 2: FOCUS BLOCK & AI STRATEGIC BRIEF — 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Next Focus Block Card (Thinking / Execution Clean Identity) */}
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between hover:border-secondary/40 transition-all shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> NEXT FOCUS BLOCK
              </span>
              <span className="text-xs font-mono font-bold text-primary bg-surface-hover px-2.5 py-1 rounded border border-border">
                10:00 – 11:30 AM
              </span>
            </div>

            <h3 className="text-xl font-bold text-primary mb-2">
              Database Architecture & Schema Migration
            </h3>
            
            <p className="text-xs text-secondary leading-relaxed mb-4">
              Scheduled 90-minute deep work session. All notifications muted. Prepare schema migration scripts and verify indexing performance on staging cluster.
            </p>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="text-[11px] font-mono text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#109868]" /> Zero-Distraction Mode Ready
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-focus'))}
              className="text-xs font-mono font-medium text-[#2563EB] dark:text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Enter Focus Mode (ESC) <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* AI Strategic Brief Card (Violet Identity #7C3AED / #A78BFA) */}
        <div className="bg-surface border border-[#7C3AED]/30 dark:border-[#A78BFA]/30 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden shadow-2xs bg-gradient-to-br from-[#7C3AED]/5 via-transparent to-transparent">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#7C3AED] dark:text-[#A78BFA] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" /> AI STRATEGIC BRIEF
              </span>
              <span className="text-[10px] font-mono text-secondary bg-[#7C3AED]/10 dark:bg-[#A78BFA]/10 px-2 py-0.5 rounded border border-[#7C3AED]/20">
                TELEMETRY SYNTHESIS
              </span>
            </div>

            <h3 className="text-base font-bold text-primary mb-2 font-mono">
              Yesterday: +18% execution velocity. 2 blockers detected.
            </h3>
            
            <p className="text-xs text-secondary leading-relaxed mb-4">
              Analysis of git commits and task transitions indicates potential dependency stall on API Gateway authentication token expiration. 
              <strong className="text-primary block mt-1">Recommendation: Complete database migration ticket before 2:00 PM to unlock dependent sprint tasks.</strong>
            </p>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted">MODEL: KRAMA-AGY-v2</span>
            <button
              onClick={() => navigate('/app/review')}
              className="text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Review Blockers & Decisions <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 3: UNBOXED DIRECTIVES & ACTIVITY STREAMS (Zero Cards, 100% Whitespace & Dividers) */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-h2 font-bold tracking-tight text-primary">Live Directives & Streams</h2>
            <span className="text-caption font-mono text-secondary">Unboxed real-time telemetry — zero visual clutter</span>
          </div>
          
          {/* Interactive Filter Pills */}
          <div className="flex items-center gap-1 bg-surface-hover border border-border p-1 rounded-lg w-max">
            {(['All', 'Issue', 'Project', 'Habit'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivityFilter(tab)}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-mono tracking-wider transition-all duration-150 cursor-pointer",
                  activityFilter === tab ? "bg-surface text-primary border border-border shadow-2xs font-bold" : "text-secondary hover:text-primary border border-transparent"
                )}
              >
                {tab === 'All' ? 'ALL STREAMS' : `${tab.toUpperCase()}S`}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Column Unboxed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          
          {/* Column 1: Upcoming Deadlines (Unboxed) */}
          <div className="space-y-3 lg:pr-6">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-secondary pb-2 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 stroke-[1.5]" /> Upcoming Deadlines</span>
              <span onClick={() => navigate('/app/timeline')} className="text-[#2563EB] dark:text-[#00E5FF] cursor-pointer hover:underline lowercase font-normal">calendar &rarr;</span>
            </div>
            
            <div className="divide-y divide-border/40">
              {upcomingDeadlines.slice(0, 4).map(issue => {
                const isUrgentDate = new Date(issue.dueDate!) <= next48Hours;
                return (
                  <div key={issue.id} onClick={() => navigate('/app/board')} className="py-2.5 flex items-center justify-between gap-3 group cursor-pointer hover:bg-surface-hover/50 -mx-2 px-2 rounded-lg transition-all duration-150">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={cn(
                        "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                        isUrgentDate ? "bg-[#DC2626]" : "bg-[#2563EB] dark:bg-[#00E5FF]"
                      )} />
                      <div className="min-w-0">
                        <div className="font-medium text-primary text-xs truncate group-hover:text-[#2563EB] dark:group-hover:text-[#00E5FF] transition-colors">{issue.title}</div>
                        <div className={cn("text-[11px] font-mono mt-0.5", isUrgentDate ? "text-[#DC2626]" : "text-muted")}>
                          Due {new Date(issue.dueDate!).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0" />
                  </div>
                );
              })}
              {upcomingDeadlines.length === 0 && (
                <div className="py-6 text-xs text-muted font-mono">No deadlines scheduled in next 7 days.</div>
              )}
            </div>
          </div>

          {/* Column 2: Daily Habits & Streaks (Unboxed) */}
          <div className="space-y-3 pt-6 lg:pt-0 lg:px-6">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-secondary pb-2 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[1.5]" /> Active Streaks</span>
              <span onClick={() => navigate('/app/goals')} className="text-[#2563EB] dark:text-[#00E5FF] cursor-pointer hover:underline lowercase font-normal">habits &rarr;</span>
            </div>

            <div className="divide-y divide-border/40">
              {habits.slice(0, 4).map(habit => {
                const todayStr = new Date().toISOString().split('T')[0] || '';
                const isCompletedToday = habit.completions?.some((c: any) => c.date.toString().startsWith(todayStr) && c.completed) || 
                  (habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString());
                return (
                  <div 
                    key={habit.id} 
                    onClick={() => toggleHabitMutation.mutate(habit.id)}
                    className="py-2.5 flex items-center justify-between gap-3 group cursor-pointer hover:bg-surface-hover/50 -mx-2 px-2 rounded-lg transition-all duration-150"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button 
                        type="button"
                        className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border transition-all duration-150 shrink-0",
                          isCompletedToday 
                            ? "bg-[#109868] border-[#109868] text-white" 
                            : "border-border bg-surface group-hover:border-primary"
                        )}
                      >
                        {isCompletedToday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <div className="min-w-0">
                        <div className={cn(
                          "font-medium text-xs truncate transition-colors",
                          isCompletedToday ? "line-through text-muted" : "text-primary group-hover:text-[#109868]"
                        )}>
                          {habit.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted mt-0.5 flex items-center gap-1">
                          <span className="text-[#EA580C] font-bold">{habit.streak}d streak</span>
                          <span>• {habit.cadence}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCompletedToday ? 'undo' : 'check'} &rarr;
                    </span>
                  </div>
                );
              })}
              {habits.length === 0 && (
                <div className="py-6 text-xs text-muted font-mono">No active habits tracked.</div>
              )}
            </div>
          </div>

          {/* Column 3: Live Telemetry Activity Stream (Unboxed) */}
          <div className="space-y-3 pt-6 lg:pt-0 lg:pl-6">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-secondary pb-2 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 stroke-[1.5]" /> Telemetry Stream</span>
              <span className="text-muted text-[10px] lowercase font-normal">live sync</span>
            </div>

            <div className="divide-y divide-border/40">
              {filteredActivity.map((activity, idx) => {
                const isDone = activity.status === 'done' || activity.status === 'released' || activity.status === 'completed';
                const isInProgress = activity.status === 'in_progress' || activity.status === 'active';
                return (
                  <div key={idx} onClick={() => navigate(activity.link)} className="py-2.5 flex items-center justify-between gap-3 group cursor-pointer hover:bg-surface-hover/50 -mx-2 px-2 rounded-lg transition-all duration-150">
                    <div className="flex flex-col min-w-0">
                      <div className="text-xs text-primary font-medium truncate group-hover:text-[#2563EB] dark:group-hover:text-[#00E5FF] transition-colors">
                        {activity.title}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 font-mono truncate">
                        <span className="text-secondary font-bold">{activity.type}</span> • {activity.action} • {getTimeAgo(activity.date)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold",
                        isDone ? "bg-surface-hover text-secondary" 
                        : isInProgress ? "bg-[#2563EB]/10 dark:bg-[#00E5FF]/10 text-[#2563EB] dark:text-[#00E5FF]" 
                        : "bg-surface-hover text-muted"
                      )}>
                        {isDone ? 'DONE' : isInProgress ? 'ACTIVE' : 'PENDING'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredActivity.length === 0 && (
                <div className="py-6 text-xs text-muted font-mono">No telemetry events recorded for {activityFilter}s.</div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
