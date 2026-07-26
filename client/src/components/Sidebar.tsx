import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  Home, 
  BookOpen, 
  Target, 
  FolderKanban,
  KanbanSquare,
  CalendarCheck,
  Search,
  Calendar,
  Clock,
  Clock4,
  TrendingUp,
  Sparkles,
  Scale
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/app/', icon: Home, shortcut: 'G D', badgeKey: null },
  { name: 'Brain Workspace', path: '/app/brain', icon: BookOpen, shortcut: 'G B', badgeKey: 'pages' },
  { name: 'Goals', path: '/app/goals', icon: Target, shortcut: 'G G', badgeKey: 'goals' },
  { name: 'Projects', path: '/app/projects', icon: FolderKanban, shortcut: 'G P', badgeKey: 'projects' },
];

const executionItems = [
  { name: 'Weekly Planner', path: '/app/planner', icon: Calendar, shortcut: 'E W', badgeKey: null },
  { name: 'Daily Schedule', path: '/app/timeline', icon: Clock4, shortcut: 'E T', badgeKey: null },
  { name: 'Kanban Board', path: '/app/board', icon: KanbanSquare, shortcut: 'E K', badgeKey: 'openIssues' },
  { name: 'Sprint View', path: '/app/sprint', icon: Clock, shortcut: 'E S', badgeKey: 'sprintIssues' },
  { name: 'Daily Review', path: '/app/review', icon: CalendarCheck, shortcut: 'E R', badgeKey: null },
  { name: 'Decision Log', path: '/app/decisions', icon: Scale, shortcut: 'E D', badgeKey: null },
  { name: 'Habit Tracker', path: '/app/habits', icon: TrendingUp, shortcut: 'E H', badgeKey: 'habits' },
];

export function Sidebar() {
  const location = useLocation();

  // Fetch live counts for badges
  const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });

  const openIssuesCount = issues.filter(i => i.status !== 'done' && i.status !== 'released').length;
  const sprintIssuesCount = issues.filter(i => ['todo', 'in_progress', 'review'].includes(i.status)).length;
  const activeProjectsCount = projects.filter(p => p.status === 'active').length;

  const getBadgeValue = (key: string | null) => {
    if (key === 'openIssues') return openIssuesCount;
    if (key === 'sprintIssues') return sprintIssuesCount;
    if (key === 'projects') return activeProjectsCount;
    if (key === 'goals') return goals.length;
    if (key === 'habits') return habits.length;
    if (key === 'pages') return pages.length;
    return null;
  };

  const renderLink = (item: { name: string; path: string; icon: any; shortcut?: string; badgeKey: string | null }) => {
    const isActive = location.pathname === item.path || (item.path !== '/app/' && location.pathname.startsWith(item.path));
    const Icon = item.icon;
    const badgeVal = getBadgeValue(item.badgeKey);

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-100 outline-none select-none",
          isActive 
            ? "bg-white text-[#111827] font-semibold shadow-2xs border border-[#E5E8EC]" 
            : "text-[#6B7280] hover:text-[#111827] hover:bg-white/60 border border-transparent"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={cn("w-4 h-4 shrink-0 stroke-[1.75]", isActive ? "text-[#2563EB]" : "text-[#9CA3AF] group-hover:text-[#111827]")} />
          <span className="truncate">{item.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {badgeVal !== null && badgeVal > 0 && (
            <span className={cn(
              "px-1.5 py-0.2 rounded font-mono text-[10px] leading-tight border transition-colors",
              isActive 
                ? "bg-[#EFF4FE] text-[#2563EB] border-[#2563EB]/20 font-bold" 
                : "bg-[#F8F9FB] text-[#6B7280] border-[#E5E8EC] group-hover:text-[#111827]"
            )}>
              {badgeVal}
            </span>
          )}
          {item.shortcut && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono font-medium text-[#9CA3AF] bg-[#F8F9FB] border border-[#E5E8EC] px-1 py-0.2 rounded">
              {item.shortcut}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="w-64 border-r border-[#E5E8EC] bg-[#F8F9FB] flex flex-col h-full flex-shrink-0 select-none">
      {/* Header / Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#E5E8EC] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#111827] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
            K
          </div>
          <div>
            <span className="font-bold tracking-tight text-[#111827] text-sm leading-none block">KRAMA OS</span>
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" title="Live Sync Active" />
      </div>

      {/* Search / Command Palette Trigger */}
      <div className="p-3 border-b border-[#E5E8EC] bg-white/50">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-cmdk'))}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#6B7280] bg-white border border-[#E5E8EC] rounded-lg hover:border-[#2563EB] hover:text-[#111827] transition-all shadow-2xs outline-none cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#2563EB] stroke-[2] transition-colors" />
            <span className="font-medium">Search workspace...</span>
          </div>
          <kbd className="text-[10px] font-medium font-mono border border-[#E5E8EC] text-[#6B7280] bg-[#F8F9FB] px-1.5 py-0.5 rounded shadow-2xs group-hover:border-[#2563EB]/40 group-hover:text-[#2563EB] transition-colors">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        <div className="px-3">
          <div className="text-[10px] font-mono font-bold text-[#9CA3AF] uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
            <span>Strategic Brain</span>
            <Sparkles className="w-3 h-3 text-[#7C3AED]" />
          </div>
          <div className="space-y-1">
            {navItems.map(renderLink)}
          </div>
        </div>

        <div className="px-3">
          <div className="text-[10px] font-mono font-bold text-[#9CA3AF] uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
            <span>Execution Loop</span>
            <span className="text-[#2563EB] text-[9px] bg-[#EFF4FE] px-1.5 py-0.2 rounded border border-[#2563EB]/20 font-bold">Active</span>
          </div>
          <div className="space-y-1">
            {executionItems.map(renderLink)}
          </div>
        </div>
      </div>

      {/* Footer User Strip */}
      <div className="p-3 border-t border-[#E5E8EC] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] font-mono font-bold text-xs shrink-0">
            SK
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#111827] truncate">Sudhanshu K.</div>
            <div className="text-[10px] text-[#0D9488] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" /> Online & Focused
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-[#9CA3AF] bg-[#F8F9FB] px-2 py-1 rounded border border-[#E5E8EC]">
          Pro
        </div>
      </div>
    </div>
  );
}
