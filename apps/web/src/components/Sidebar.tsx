import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { 
  Home, BookOpen, Target, FolderKanban, Network,
  Calendar, Clock4, KanbanSquare, Clock, CalendarCheck, TrendingUp,
  Sparkles, Scale, Search, LogOut, Moon, Sun, Download, X
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const strategicBrainItems = [
  { name: 'Dashboard', path: '/app/', icon: Home, shortcut: 'G D', badgeKey: null },
  { name: 'Brain Workspace', path: '/app/brain', icon: BookOpen, shortcut: 'G B', badgeKey: 'pages' },
  { name: 'Goals & OKRs', path: '/app/goals', icon: Target, shortcut: 'G G', badgeKey: 'goals' },
  { name: 'Projects', path: '/app/projects', icon: FolderKanban, shortcut: 'G P', badgeKey: 'projects' },
  { name: 'Knowledge Graph', path: '/app/graph', icon: Network, shortcut: 'G K', badgeKey: null },
];

const executionLoopItems = [
  { name: 'Planner', path: '/app/planner', icon: Calendar, shortcut: 'E W', badgeKey: null },
  { name: 'Daily Schedule', path: '/app/timeline', icon: Clock4, shortcut: 'E T', badgeKey: null },
  { name: 'Timeline', path: '/app/sprint', icon: Clock, shortcut: 'E S', badgeKey: 'sprintIssues' },
  { name: 'Kanban Board', path: '/app/board', icon: KanbanSquare, shortcut: 'E K', badgeKey: 'openIssues' },
  { name: 'Habits', path: '/app/habits', icon: TrendingUp, shortcut: 'E H', badgeKey: 'habits' },
  { name: 'Reviews', path: '/app/review', icon: CalendarCheck, shortcut: 'E R', badgeKey: null },
];

const systemItems = [
  { name: 'Decision Log', path: '/app/decisions', icon: Scale, shortcut: 'S D', badgeKey: null },
  { name: 'Analytics', path: '/app/analytics', icon: TrendingUp, shortcut: 'S N', badgeKey: null },
];

export function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
 const location = useLocation();
 const { theme, toggleTheme } = useTheme();
 const { user, logout } = useAuth();

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

 const renderLink = (item: { name: string; path: string; icon: any; shortcut?: string; badgeKey: string | null }) => {
 const isActive = location.pathname === item.path || (item.path !== '/app/' && location.pathname.startsWith(item.path));
 const Icon = item.icon;
 const badgeVal = getBadgeValue(item.badgeKey);

 return (
 <Link
 key={item.path}
 to={item.path}
 onClick={onMobileClose}
 className={cn("group flex items-center justify-between px-3 py-2 rounded-lg text-caption transition-all duration-150 outline-none select-none relative overflow-hidden",
 isActive 
 ?"text-primary font-semibold shadow-sm border border-border bg-white/60 dark:bg-black/40 backdrop-blur-md" 
 :"text-secondary font-medium hover:text-primary hover:bg-surface/80 border border-transparent"
 )}
 >
 {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-accent rounded-r-md shadow-[0_0_8px_var(--color-accent)]" />}
 <div className="flex items-center gap-2.5 min-w-0 z-10">
 <Icon className={cn("w-4 h-4 shrink-0 stroke-[1.75] transition-transform duration-150 ease-out group-hover:translate-x-[1.5px]", isActive ?"text-accent drop-shadow-[0_0_4px_var(--color-accent-tint)]" :"text-muted group-hover:text-primary")} />
 <span className="truncate">{item.name}</span>
 </div>

 <div className="flex items-center gap-1.5 shrink-0 ml-2">
 {badgeVal !== null && badgeVal > 0 && (
 <span className={cn("px-1.5 py-0.2 rounded font-mono text-[10px] leading-tight border transition-colors",
 isActive 
 ?"bg-accent-tint text-[#2563EB] border-[#2563EB]/20 font-bold" 
 :"bg-surface-hover text-secondary border-border group-hover:text-primary"
 )}>
 {badgeVal}
 </span>
 )}
 {item.shortcut && (
 <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono font-medium text-muted bg-surface-hover border border-border px-1 py-0.2 rounded">
 {item.shortcut}
 </span>
 )}
 </div>
 </Link>
 );
 };

 const sidebarContent = (
 <div className="w-[300px] border-r border-border bg-[var(--color-sidebar)] rounded-r-[var(--radius-sidebar)] flex flex-col h-full flex-shrink-0 select-none shadow-[var(--shadow-resting)] z-10 transition-transform duration-300">
 {/* Header / Brand */}
 <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-mono font-bold text-caption shadow-sm">
 K
 </div>
 <div>
 <span className="font-bold tracking-tight text-primary text-body leading-none block">KRAMA OS</span>
 </div>
 </div>
 <div className="w-2 h-2 rounded-full bg-[#0D9488]" style={{ animation: 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} title="Live Sync Active" />
 </div>

 {/* Search / Command Palette Trigger */}
 <div className="p-3 border-b border-border bg-surface/50">
 <button 
 onClick={() => {
 onMobileClose?.();
 window.dispatchEvent(new CustomEvent('open-cmdk'));
 }}
 className="w-full flex items-center justify-between px-3 py-2 text-caption text-secondary bg-surface border border-border rounded-lg hover:border-primary hover:text-primary transition-all shadow-2xs outline-none cursor-pointer group"
 >
 <div className="flex items-center gap-2">
 <Search className="w-3.5 h-3.5 text-muted group-hover:text-primary stroke-[2] transition-colors" />
 <span className="font-medium">Search workspace...</span>
 </div>
 <kbd className="text-[10px] font-medium font-mono border border-border text-secondary bg-surface-hover px-1.5 py-0.5 rounded shadow-2xs group-hover:border-primary/40 group-hover:text-primary transition-colors">
 ⌘K
 </kbd>
 </button>
 </div>

 <div className="flex-1 overflow-y-auto py-4 space-y-6">
 <div className="px-3">
 <div className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
 <span>Strategic Brain</span>
 <Sparkles className="w-3 h-3 text-[#7C3AED]" />
 </div>
 <div className="space-y-1">
 {strategicBrainItems.map(renderLink)}
 </div>
 </div>

 <div className="px-3">
 <div className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
 <span>Execution Loop</span>
 <span className="text-[#2563EB] text-[9px] bg-accent-tint px-1.5 py-0.2 rounded border border-[#2563EB]/20 font-bold">Active</span>
 </div>
 <div className="space-y-1">
 {executionLoopItems.map(renderLink)}
 </div>
 </div>

 <div className="px-3 mt-6">
 <div className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
 <span>System</span>
 </div>
 <div className="space-y-1">
 {systemItems.map(renderLink)}
 </div>
 </div>
 </div>

 {/* Theme Toggle Action */}
 <div className="px-3 py-2 border-t border-border">
 <button
 onClick={toggleTheme}
 className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-caption font-medium text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-transparent hover:border-border group cursor-pointer"
 title="Toggle Dark / Bright Mode"
 >
 <span className="flex items-center gap-2">
 {theme === 'dark' ? (
 <Sun className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-600 transition-colors" />
 ) : (
 <Moon className="w-3.5 h-3.5 text-secondary group-hover:text-[#2563EB] transition-colors" />
 )}
 <span>{theme === 'dark' ? 'Bright Mode' : 'Dark Mode'}</span>
 </span>
 <span className="text-[10px] font-mono text-muted group-hover:text-secondary uppercase">
 {theme === 'dark' ? 'Light' : 'Dark'}
 </span>
 </button>
 </div>

 {/* Export Backup Action */}
 <div className="px-3 py-2 border-t border-border">
 <button
 onClick={handleExport}
 className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-caption font-medium text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-transparent hover:border-border group"
 title="Export all workspace data as JSON"
 >
 <span className="flex items-center gap-2">
 <Download className="w-3.5 h-3.5 text-secondary group-hover:text-[#2563EB] transition-colors" />
 <span>Export Data</span>
 </span>
 <span className="text-[10px] font-mono text-muted group-hover:text-secondary">JSON</span>
 </button>
 
 <button
 onClick={logout}
 className="w-full flex items-center justify-between px-3 py-2 mt-1 rounded-lg text-caption font-medium text-secondary hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors border border-transparent group"
 title="Sign out of KRAMA OS"
 >
 <span className="flex items-center gap-2">
 <LogOut className="w-3.5 h-3.5 text-secondary group-hover:text-[#DC2626] transition-colors" />
 <span>Sign Out</span>
 </span>
 </button>
 </div>

 {/* Shortcuts Hint */}
 <div className="px-3 py-2 border-t border-border flex justify-center bg-surface-hover/50">
 <span className="text-[10px] font-mono text-muted flex items-center gap-1.5">
 Press <kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-primary shadow-2xs font-bold">?</kbd> for shortcuts
 </span>
 </div>

 {/* Footer User Strip */}
 <div className="p-3 border-t border-border bg-surface flex items-center justify-between">
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] font-mono font-bold text-caption shrink-0">
 {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
 </div>
 <div className="min-w-0">
 <div className="text-caption font-semibold text-primary truncate">{user?.name || 'Loading...'}</div>
 <div className="text-[10px] text-[#0D9488] font-mono flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" /> Online & Focused
 </div>
 </div>
 </div>
 <div className="text-[10px] font-mono text-muted bg-surface-hover px-2 py-1 rounded border border-border">
 Pro
 </div>
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
 <div onClick={onMobileClose} className="fixed inset-0 bg-black/40 backdrop-blur-2xs" />
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

