import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { 
 Home, BookOpen, Target, FolderKanban, Network, GraduationCap,
 Calendar, Clock4, KanbanSquare, Clock, CalendarCheck, TrendingUp,
 Scale, Search, LogOut, Moon, Sun, Download, X, 
 Zap, ChevronDown, ChevronRight
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface NavItem {
 name: string;
 path: string;
 icon: any;
 shortcut?: string;
 badgeKey: string | null;
}

// 5 Rule-of-5-7 Groups per KRAMA UI Design Direction
const overviewItems: NavItem[] = [
 { name: 'Dashboard', path: '/app/', icon: Home, shortcut: 'G D', badgeKey: null },
];

const planAndExecuteItems: NavItem[] = [
 { name: 'Execution Board', path: '/app/board', icon: KanbanSquare, shortcut: 'E K', badgeKey: 'openIssues' },
 { name: 'Sprint View', path: '/app/sprint', icon: Clock, shortcut: 'E S', badgeKey: 'sprintIssues' },
 { name: 'Weekly Planner', path: '/app/planner', icon: Calendar, shortcut: 'E W', badgeKey: null },
 { name: 'Daily Timeline', path: '/app/timeline', icon: Clock4, shortcut: 'E T', badgeKey: null },
];

const strategyItems: NavItem[] = [
 { name: 'Goals & OKRs', path: '/app/goals', icon: Target, shortcut: 'G G', badgeKey: 'goals' },
 { name: 'Habits & Rituals', path: '/app/habits', icon: TrendingUp, shortcut: 'E H', badgeKey: 'habits' },
 { name: 'Projects', path: '/app/projects', icon: FolderKanban, shortcut: 'G P', badgeKey: 'projects' },
];

const knowledgeItems: NavItem[] = [
 { name: 'Brain Workspace', path: '/app/brain', icon: BookOpen, shortcut: 'G B', badgeKey: 'pages' },
 { name: 'Decision Log', path: '/app/decisions', icon: Scale, shortcut: 'S D', badgeKey: null },
 { name: 'Knowledge Graph', path: '/app/graph', icon: Network, shortcut: 'G K', badgeKey: null },
];

const reflectItems: NavItem[] = [
 { name: 'Daily Review', path: '/app/review', icon: CalendarCheck, shortcut: 'E R', badgeKey: null },
];

const systemItems: NavItem[] = [
 { name: 'Analytics', path: '/app/analytics', icon: TrendingUp, shortcut: 'S N', badgeKey: null },
 { name: 'Skills & Mastery', path: '/app/career', icon: GraduationCap, shortcut: 'S S', badgeKey: null },
 { name: 'Automations', path: '/app/automations', icon: Zap, shortcut: 'S A', badgeKey: null },
];

export function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
 const location = useLocation();
 const { theme, toggleTheme } = useTheme();
 const { user, logout } = useAuth();
 const [systemOpen, setSystemOpen] = useState(false);

 // Fetch live counts for badges
 const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
 const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
 const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
 const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
 const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });

 const openIssuesCount = issues.filter(i => i.status !== "DONE" && i.status !== "REVIEW").length;
 const sprintIssuesCount = issues.filter(i => ["TODO", "IN_PROGRESS", "REVIEW"].includes(i.status)).length;
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
 <span className="opacity-0 group-hover:opacity-100 transition-opacity text-badge font-mono text-muted bg-surface-hover border border-border px-1 py-0.2 rounded">
 {item.shortcut}
 </span>
 )}
 </div>
 </Link>
 );
 };

 const sidebarContent = (
 <div className="w-[280px] border-r border-border bg-surface flex flex-col h-full flex-shrink-0 select-none shadow-level-1 z-10">
 {/* Header / Brand */}
 <div className="h-13 flex items-center justify-between px-4 border-b border-border bg-surface">
 <div className="flex items-center gap-2.5">
 <div className="w-6 h-6 rounded-md bg-primary text-surface flex items-center justify-center font-mono font-bold text-caption">
 K
 </div>
 <div>
 <span className="font-semibold tracking-tight text-primary text-body leading-none block">KRAMA</span>
 </div>
 </div>
 <div className="flex items-center gap-1.5 text-badge font-mono text-muted">
 <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
 <span>v2</span>
 </div>
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
 <kbd className="text-badge font-mono text-muted bg-surface-hover border border-border px-1.5 py-0.5 rounded">
 ⌘K
 </kbd>
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

 {/* 5. Reflect */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Reflect
 </div>
 <div className="space-y-0.5">
 {reflectItems.map(renderLink)}
 </div>
 </div>

 {/* Utilities Collapsible */}
 <div className="pt-2 border-t border-border">
 <button
 onClick={() => setSystemOpen(!systemOpen)}
 className="w-full flex items-center justify-between text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5 py-1 rounded hover:text-primary hover:bg-surface-hover transition-colors"
 >
 <span>Utilities</span>
 {systemOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
 </button>
 {systemOpen && (
 <div className="space-y-0.5 mt-1">
 {systemItems.map(renderLink)}
 </div>
 )}
 </div>
 </div>

 {/* Utilities & Actions */}
 <div className="p-2 border-t border-border space-y-0.5 bg-surface">
 <button
 onClick={toggleTheme}
 className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-primary hover:bg-surface-hover transition-colors group cursor-pointer"
 title="Toggle Theme"
 >
 <span className="flex items-center gap-2">
 {theme === 'dark' ? (
 <Sun className="w-3.5 h-3.5 text-warning" />
 ) : (
 <Moon className="w-3.5 h-3.5 text-muted group-hover:text-primary" />
 )}
 <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
 </span>
 <span className="text-badge font-mono text-muted uppercase">
 {theme === 'dark' ? 'Light' : 'Dark'}
 </span>
 </button>

 <button
 onClick={handleExport}
 className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-primary hover:bg-surface-hover transition-colors group cursor-pointer"
 title="Export all workspace data as JSON"
 >
 <span className="flex items-center gap-2">
 <Download className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
 <span>Export Data</span>
 </span>
 <span className="text-badge font-mono text-muted">JSON</span>
 </button>
 
 <button
 onClick={logout}
 className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-error hover:bg-error-tint transition-colors group cursor-pointer"
 title="Sign out"
 >
 <span className="flex items-center gap-2">
 <LogOut className="w-3.5 h-3.5 text-muted group-hover:text-error transition-colors" />
 <span>Sign Out</span>
 </span>
 </button>
 </div>

 {/* Footer User Strip */}
 <div className="p-3 border-t border-border bg-surface flex items-center justify-between">
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="w-7 h-7 rounded-full bg-accent-tint border border-accent/20 flex items-center justify-center text-accent font-mono font-semibold text-caption shrink-0">
 {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
 </div>
 <div className="min-w-0">
 <div className="text-caption font-medium text-primary truncate">{user?.name || 'User'}</div>
 <div className="text-badge text-muted font-mono flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> Focused
 </div>
 </div>
 </div>
 <span className="text-badge font-mono text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border">
 PRO
 </span>
 </div>
 </div>
 );

 return (
 <>
 <div className="hidden md:block h-full">
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

