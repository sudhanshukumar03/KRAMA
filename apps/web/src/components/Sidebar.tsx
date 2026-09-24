import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { 
  Home, BookOpen, Target,
  Calendar, KanbanSquare, Clock, BarChart2,
  Search, LogOut, Moon, Sun, Download, X, 
  Settings, User, Briefcase,
  PanelLeftClose, Timer, ExternalLink,
  TrendingUp
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { KramaLogo } from './ui/KramaLogo';
import { NotificationCenter } from './NotificationCenter';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  shortcut?: string;
  badgeKey: string | null;
  external?: boolean;
}

// 5 Rule-of-5-7 Groups per KRAMA UI Design Direction
const overviewItems: NavItem[] = [
  { name: 'Dashboard', path: '/app/', icon: Home, shortcut: 'G D', badgeKey: null },
  { name: 'Analytics', path: '/app/analytics', icon: TrendingUp, shortcut: 'G A', badgeKey: null },
];

const planAndExecuteItems: NavItem[] = [
  { name: 'Execution Board', path: '/app/board', icon: KanbanSquare, shortcut: 'E K', badgeKey: 'openIssues' },
  { name: 'Sprint', path: '/app/sprint', icon: Clock, shortcut: 'E S', badgeKey: 'sprintIssues' },
  { name: 'Planner', path: '/app/planner', icon: Calendar, shortcut: 'E W', badgeKey: null },
  { name: 'Focus Timer', path: '/focus', icon: Timer, shortcut: '⌃⇧Q', badgeKey: null, external: true },
];

const strategyItems: NavItem[] = [
  { name: 'Goals', path: '/app/goals', icon: Target, shortcut: 'G G', badgeKey: 'goals' },
  { name: 'Habits', path: '/app/habits', icon: BarChart2, shortcut: 'E H', badgeKey: 'habits' },
  { name: 'Projects', path: '/app/projects', icon: Briefcase, shortcut: 'G P', badgeKey: 'projects' },
];

const knowledgeItems: NavItem[] = [
  { name: 'Brain Workspace', path: '/app/brain', icon: BookOpen, shortcut: 'G B', badgeKey: 'documents' },
];

export function Sidebar({ 
  mobileOpen = false, 
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse
}: { 
  mobileOpen?: boolean; 
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
 const location = useLocation();
 const { toggleTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  // Fetch live counts for badges
  const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const { data: sprints = [] } = useQuery({ queryKey: ['sprints'], queryFn: api.sprints.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: api.documents.list });

  const activeSprint = sprints.find(s => s.status === 'active') || sprints[0];
  const openIssuesCount = issues.filter(i => i.status !== "DONE" && i.status !== "REVIEW" && i.status !== "CANCELED").length;
  const sprintIssuesCount = activeSprint
    ? issues.filter(i => i.sprintId === activeSprint.id && i.status !== 'DONE' && i.status !== 'CANCELED').length
    : 0;
  const activeProjectsCount = projects.filter(p => p.status === 'active').length;

  const getBadgeValue = (key: string | null) => {
    if (key === 'openIssues') return openIssuesCount;
    if (key === 'sprintIssues') return sprintIssuesCount;
    if (key === 'projects') return activeProjectsCount;
    if (key === 'goals') return goals.length;
    if (key === 'habits') return habits.length;
    if (key === 'documents') return documents.length;
    return null;
  };

 const handleExport = async () => {
 try {
 const toastId = toast.loading('Exporting workspace backup...');
 const data = await api.workspaces.export();
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `krama-backup-${new Date().toISOString().split('T')[0]}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 toast.dismiss(toastId);
 toast.success('Workspace backup exported successfully');
 } catch (err: any) {
 toast.error('Failed to export backup: ' + err.message);
 }
 };

  const renderLink = (item: NavItem) => {
    const isActive = location.pathname === item.path || (item.path !== '/app/' && location.pathname.startsWith(item.path));
    const Icon = item.icon;
    const badgeVal = getBadgeValue(item.badgeKey);

    if (item.external) {
      return (
        <button
          key={item.path}
          type="button"
          onClick={() => {
            onMobileClose?.();
            window.open(item.path, '_blank');
          }}
          className="w-full group flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption transition-colors duration-150 outline-none select-none relative text-secondary hover:text-primary hover:bg-surface-hover border border-transparent cursor-pointer text-left"
          title={`${item.name} (Opens in new full-screen tab)`}
        >
          <div className="flex items-center gap-2.5 min-w-0 z-10 pl-1">
            <Icon className="w-4 h-4 shrink-0 stroke-[1.75] transition-colors text-muted group-hover:text-primary" />
            <span className="truncate">{item.name}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {item.shortcut && (
              <kbd className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-muted transition-opacity">
                {item.shortcut}
              </kbd>
            )}
            <ExternalLink className="w-3 h-3 text-muted/60 group-hover:text-muted transition-colors" />
          </div>
        </button>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        className={cn(
          "group flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption transition-colors duration-150 outline-none select-none relative",
          isActive 
            ? "text-primary font-medium bg-surface-hover border border-border" 
            : "text-secondary hover:text-primary hover:bg-surface-hover border border-transparent"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-accent rounded-r" />
        )}
        <div className="flex items-center gap-2.5 min-w-0 z-10 pl-1">
          <Icon className={cn(
            "w-4 h-4 shrink-0 stroke-[1.75] transition-colors",
            isActive ? "text-accent" : "text-muted group-hover:text-primary"
          )} />
          <span className="truncate">{item.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {badgeVal !== null && badgeVal > 0 && (
            <span className={cn(
              "px-1.5 py-0.2 rounded font-mono text-badge leading-tight border transition-colors",
              isActive 
                ? "bg-accent-tint text-accent border-accent/20 font-semibold" 
                : "bg-surface-hover text-muted border-border/80 group-hover:text-secondary"
            )}>
              {badgeVal}
            </span>
          )}
          {item.shortcut && (
            <kbd className="opacity-0 group-hover:opacity-100 transition-opacity">
              {item.shortcut}
            </kbd>
          )}
        </div>
      </Link>
    );
  };

 const sidebarContent = (
 <div className="w-[280px] border-r border-border bg-surface flex flex-col h-full flex-shrink-0 select-none shadow-level-1 z-10">
 {/* Header / Brand */}
 <div className="h-13 flex items-center justify-between px-4 border-b border-border bg-surface">
      <Link to="/app/" className="hover:opacity-90 transition-opacity">
        <KramaLogo size="sm" withText textClassName="font-semibold tracking-tight text-primary text-body leading-none block" />
      </Link>
      <div className="flex items-center gap-1">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors outline-none cursor-pointer border border-transparent"
            title="Collapse sidebar (Ctrl+\)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        <NotificationCenter />
        <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen((prev) => !prev)}
          className={cn(
            "p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors outline-none cursor-pointer border border-transparent",
            settingsOpen && "text-primary bg-surface-hover border-border"
          )}
          title="Settings & Preferences"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-level-2 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            {/* Profile Details */}
            <div className="p-2.5 rounded-md bg-surface-hover/70 border border-border/80 mb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <User className="w-3 h-3 text-accent" />
                  <span>Profile Details</span>
                </span>
                <span className="text-badge font-mono text-muted bg-surface px-1.5 py-0.2 rounded border border-border">
                  PRO
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent-tint border border-accent/20 flex items-center justify-center text-accent font-mono font-semibold text-caption shrink-0">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
                </div>
                <div className="min-w-0">
                  <div className="text-caption font-semibold text-primary truncate leading-tight">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-badge text-muted font-mono truncate leading-tight mt-0.5">
                    {user?.email || 'user@krama.os'}
                  </div>
                  <div className="text-badge text-muted font-mono flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                    <span>Focused</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-primary hover:bg-surface-hover transition-colors group cursor-pointer"
              title="Toggle Theme"
            >
              <span className="flex items-center gap-2">
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-warning" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-muted group-hover:text-primary" />
                )}
                <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
              <span className="text-badge font-mono text-muted uppercase">
                {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            <button
              onClick={() => {
                setSettingsOpen(false);
                handleExport();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-primary hover:bg-surface-hover transition-colors group cursor-pointer"
              title="Export all workspace data as JSON"
            >
              <span className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
                <span>Export Data</span>
              </span>
              <span className="text-badge font-mono text-muted">JSON</span>
            </button>

            <div className="my-1 border-t border-border/80" />

            <button
              onClick={() => {
                setSettingsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-error hover:bg-error-tint transition-colors group cursor-pointer"
              title="Sign out"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5 text-muted group-hover:text-error transition-colors" />
                <span>Sign Out</span>
              </span>
            </button>
          </div>
        )}
      </div>
      </div>
  </div>

  {/* Workspace Switcher */}
  <div className="px-3 py-2 border-b border-border bg-surface/50">
    <WorkspaceSwitcher />
  </div>

  {/* Search / Command Palette Trigger */}
 <div className="p-3 border-b border-border bg-surface">
 <button 
 onClick={() => {
 onMobileClose?.();
 window.dispatchEvent(new CustomEvent('open-cmdk'));
 }}
 className="w-full flex items-center justify-between px-2.5 py-1.5 text-caption text-secondary bg-surface border border-border rounded-md hover:border-border-strong hover:text-primary transition-colors outline-none cursor-pointer group"
 >
 <div className="flex items-center gap-2">
 <Search className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
 <span className="font-normal">Search or jump to...</span>
 </div>
 <kbd>⌘K</kbd>
 </button>
 </div>

 {/* Navigation Sections */}
 <div className="flex-1 overflow-y-auto p-3 space-y-5">
 {/* 1. Overview */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Overview
 </div>
 <div className="space-y-0.5">
 {overviewItems.map(renderLink)}
 </div>
 </div>

 {/* 2. Plan & Execute */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Plan & Execute
 </div>
 <div className="space-y-0.5">
 {planAndExecuteItems.map(renderLink)}
 </div>
 </div>

 {/* 3. Strategy */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Strategy
 </div>
 <div className="space-y-0.5">
 {strategyItems.map(renderLink)}
 </div>
 </div>

 {/* 4. Knowledge */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Knowledge
 </div>
 <div className="space-y-0.5">
 {knowledgeItems.map(renderLink)}
 </div>
 </div>
 </div>
 </div>
 );

 return (
 <>
      <div className={cn(
        "hidden md:block h-full shrink-0 transition-[width,opacity] duration-200 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-[260px] lg:w-[280px] opacity-100"
      )}>
        {sidebarContent}
      </div>

 {mobileOpen && (
 <div className="fixed inset-0 z-[60] md:hidden flex animate-in fade-in duration-150">
 <div onClick={onMobileClose} className="fixed inset-0 bg-black/50 backdrop-blur-2xs" />
 <div className="relative h-full z-10 animate-in slide-in-from-left duration-200">
 <button
 onClick={onMobileClose}
 className="absolute top-3 right-3 p-1.5 rounded-md text-secondary hover:text-primary hover:bg-surface-hover z-20"
 >
 <X className="w-4 h-4" />
 </button>
 {sidebarContent}
 </div>
 </div>
 )}
 </>
 );
}

