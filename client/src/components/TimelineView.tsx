import { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Target, Brain, AlignLeft, Send, FolderKanban, Square, CheckSquare as CheckSquareIcon } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

export function TimelineView() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  // Timeline events: map from issues that have scheduledDate or dueDate today
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const todayIssues = issues.filter(i => {
    const date = i.scheduledDate ? new Date(i.scheduledDate) : i.dueDate ? new Date(i.dueDate) : null;
    return date && date >= todayStart && date <= todayEnd;
  });

  // Top tasks (priority items for today)
  const topTasks = todayIssues.filter(i => i.priority === 'urgent' || i.priority === 'high' || i.status === 'in_progress');

  // Active Projects Preview
  const activeProjects = projects.filter(p => p.status === 'active').slice(0, 3);
  
  // Fake kanban columns for Active Projects
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', projects: activeProjects.slice(0, 1) },
    { id: 'in_progress', title: 'In Progress', projects: activeProjects.slice(1, 2) },
    { id: 'done', title: 'Done', projects: activeProjects.slice(2, 3) },
  ];

  const rootGoals = goals.filter(g => !g.parentGoalId).slice(0, 3);
  const currentMonthName = currentTime.toLocaleDateString('en-US', { month: 'long' });
  const monthProgress = Math.round(((currentTime.getDate()) / new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate()) * 100);

  // Helper for Days of week
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex h-full w-full bg-white animate-in fade-in duration-150">
      
      {/* LEFT COLUMN: Main Content (60%) */}
      <div className="w-[60%] h-full overflow-y-auto p-8 lg:p-12 relative border-r border-[#E5E7EB]">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <Clock className="w-6 h-6 text-[#0A0A0A]" />
          <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">Today</h1>
        </div>

        {/* Timeline */}
        <div className="relative pl-6 mb-12">
          {/* Vertical line */}
          <div className="absolute top-2 bottom-0 left-[11px] w-[1px] bg-[#E5E7EB]" />
          
          <div className="space-y-6 relative">
            {todayIssues.map((issue) => {
              const isDone = issue.status === 'done' || issue.status === 'released';
              return (
                <div key={issue.id} className="relative group">
                  <div className={cn(
                    "absolute -left-[29px] top-[18px] w-2.5 h-2.5 rounded-full ring-4 ring-white",
                    isDone ? "bg-[#D1D5DB]" : "bg-[#0A0A0A]"
                  )} />
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex gap-4 items-center">
                    <div className="w-8 h-8 rounded bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center text-lg">
                      {isDone ? '✅' : '🎯'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-sm", isDone ? "text-[#9CA3AF] line-through" : "text-[#0A0A0A]")}>
                          {issue.title}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {issue.labels.map(l => (
                          <span key={l} className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-[#9CA3AF]">
                      {issue.estimate ? `${issue.estimate}h` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
            {todayIssues.length === 0 && (
              <div className="text-sm font-medium text-[#9CA3AF] py-4">No events scheduled for today.</div>
            )}
          </div>
        </div>

        {/* Top Tasks */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider mb-4">Top Tasks</h2>
          <div className="space-y-2">
            {topTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3">
                <Square className="w-5 h-5 text-[#D1D5DB] shrink-0" />
                <span className="text-sm font-medium text-[#0A0A0A]">{task.title}</span>
                {task.priority === 'urgent' && <span className="ml-auto text-[10px] font-bold text-[#DC2626] uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded border border-[#DC2626]/20">Urgent</span>}
              </div>
            ))}
            {topTasks.length === 0 && <div className="text-sm text-[#9CA3AF]">No top tasks today.</div>}
          </div>
        </div>

        {/* Active Projects Preview (Kanban) */}
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider mb-4">Active Projects Preview</h2>
          <div className="grid grid-cols-3 gap-4">
            {kanbanColumns.map(col => (
              <div key={col.id} className="bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] p-3 flex flex-col h-32">
                <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                  {col.title}
                </div>
                {col.projects.map(p => (
                  <div key={p.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3 hover:border-[#0A0A0A] transition-colors cursor-pointer" onClick={() => navigate(`/app/projects/${p.id}`)}>
                    <div className="font-bold text-sm text-[#0A0A0A] line-clamp-1">{p.name}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Widgets (40%) */}
      <div className="w-[40%] bg-[#FAFAFA] h-full overflow-y-auto p-8 lg:p-12 space-y-8">
        
        {/* Clock & Date */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center justify-center">
          <div className="text-5xl font-black tracking-tighter text-[#0A0A0A] mb-2">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
          <div className="text-sm font-bold text-[#6B7280] uppercase tracking-widest">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Month Progress */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <div className="flex justify-between items-end mb-3">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{currentMonthName} Progress</span>
            <span className="text-lg font-bold text-[#0A0A0A]">{monthProgress}%</span>
          </div>
          <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className="h-full bg-[#0A0A0A]" style={{ width: `${monthProgress}%` }} />
          </div>
        </div>

        {/* Goals Widget */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" /> Active Goals
          </h3>
          <div className="space-y-4">
            {rootGoals.map(goal => (
              <div key={goal.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-bold text-[#0A0A0A] truncate pr-4">{goal.title}</span>
                  <span className="text-[10px] font-bold text-[#6B7280] bg-[#FAFAFA] border border-[#E5E7EB] px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {goal.progress}%
                  </span>
                </div>
                <div className="h-1 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0A0A0A]" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Habits Weekly Grid */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" /> Habits
            </h3>
            <button onClick={() => navigate('/app/habits')} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider hover:text-[#0A0A0A] transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center">
              <div className="w-1/2"></div>
              <div className="w-1/2 flex justify-between pr-8">
                {daysOfWeek.map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-[#9CA3AF] w-4 text-center">{d}</span>
                ))}
              </div>
            </div>
            
            {habits.slice(0, 4).map(habit => (
              <div key={habit.id} className="flex items-center">
                <div className="w-1/2 text-xs font-bold text-[#0A0A0A] truncate pr-2">{habit.name}</div>
                <div className="w-1/2 flex justify-between items-center pr-2">
                  {daysOfWeek.map((_, i) => (
                    // Mock data: randomly complete some days for visual effect, but Sunday (i=6) is today
                    <div key={i} className={cn(
                      "w-4 h-4 border rounded-sm flex items-center justify-center",
                      (i < 5 && i % 2 === 0) || i === 6 ? "bg-[#0A0A0A] border-[#0A0A0A]" : "bg-transparent border-[#D1D5DB]"
                    )}>
                      {((i < 5 && i % 2 === 0) || i === 6) && <CheckSquareIcon className="w-3 h-3 text-white" />}
                    </div>
                  ))}
                  <div className="w-5 text-right text-[10px] font-bold text-[#9CA3AF]">
                    {habit.streak}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Journal Widget */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlignLeft className="w-4 h-4" /> Quick Note
          </h3>
          <textarea 
            className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#9CA3AF] h-20 mb-3"
            placeholder="What's on your mind?"
          />
          <BaseButton className="w-full justify-center">
            <Send className="w-3 h-3 mr-2" /> Add New Page
          </BaseButton>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-3">
          <div onClick={() => navigate('/app/projects')} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-[#0A0A0A] transition-colors">
            <FolderKanban className="w-5 h-5 text-[#0A0A0A] mb-2" />
            <span className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider">Projects</span>
          </div>
          <div onClick={() => navigate('/app/brain')} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-[#0A0A0A] transition-colors">
            <Brain className="w-5 h-5 text-[#0A0A0A] mb-2" />
            <span className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider">Brain</span>
          </div>
          <div onClick={() => navigate('/app/goals')} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-[#0A0A0A] transition-colors">
            <Target className="w-5 h-5 text-[#0A0A0A] mb-2" />
            <span className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider">Goals</span>
          </div>
        </div>

      </div>
    </div>
  );
}
