import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Home, 
  BookOpen, 
  FolderKanban,
  KanbanSquare,
  Calendar,
  CalendarCheck,
  Search,
  Download,
  X,
  Moon,
  Sun,
  Maximize2,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';

const navItems = [
  { name: 'Dashboard', path: '/app/', icon: Home, shortcut: 'G D' },
  { name: 'Brain', path: '/app/brain', icon: BookOpen, shortcut: 'G B' },
  { name: 'Projects', path: '/app/projects', icon: FolderKanban, shortcut: 'G P' },
  { name: 'Planner', path: '/app/planner', icon: Calendar, shortcut: 'E W' },
  { name: 'Execution', path: '/app/board', icon: KanbanSquare, shortcut: 'E K' },
  { name: 'Review', path: '/app/review', icon: CalendarCheck, shortcut: 'E R' },
];

export function Sidebar({ 
  mobileOpen = false, 
  onMobileClose,
  onToggleFocus
}: { 
  mobileOpen?: boolean; 
  onMobileClose?: () => void;
  onToggleFocus?: () => void;
}) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleExport = async () => {
    try {
      const toastId = toast.loading('Exporting workspace backup...');
      const res = await fetch('http://localhost:3001/api/workspaces/export');
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `krama-os-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.dismiss(toastId);
      toast.success('Workspace backup exported successfully');
    } catch (err: any) {
      toast.error('Failed to export backup: ' + (err.message || 'Unknown error'));
    }
  };

  const renderLink = (item: { name: string; path: string; icon: any; shortcut?: string }) => {
    const isActive = location.pathname === item.path || (item.path !== '/app/' && location.pathname.startsWith(item.path));
    const Icon = item.icon;

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        className={cn(
          "group flex items-center justify-between px-4 py-3.5 rounded-xl text-[16px] font-[550] transition-all duration-150 outline-none select-none",
          isActive 
            ? "bg-surface text-primary font-[650] shadow-sm border border-border" 
            : "text-secondary hover:text-primary hover:bg-surface-hover/80 border border-transparent"
        )}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Icon className={cn("w-5 h-5 shrink-0 stroke-[1.5] transition-colors", isActive ? "text-primary" : "text-muted group-hover:text-primary")} />
          <span className="truncate">{item.name}</span>
        </div>

        {item.shortcut && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono font-medium text-muted bg-surface-hover border border-border px-1 py-0.2 rounded shrink-0 ml-2">
            {item.shortcut}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="w-72 border-r border-border bg-surface-hover flex flex-col h-full flex-shrink-0 select-none">
      {/* Header / Brand — Linear / Apple Restraint */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#111827] dark:bg-white text-white dark:text-[#111827] flex items-center justify-center font-mono font-bold text-sm shadow-sm">
            K
          </div>
          <div>
            <span className="font-bold tracking-tight text-primary text-[16px] leading-none block mb-0.5">KRAMA OS</span>
            <span className="text-[10px] font-mono text-muted uppercase tracking-widest font-bold">Builder OS</span>
          </div>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#109868]" title="System Online & Executing" />
      </div>

      {/* Search / Command Palette Trigger (⌘K) */}
      <div className="p-4 border-b border-border bg-surface/50">
        <button 
          onClick={() => {
            onMobileClose?.();
            window.dispatchEvent(new CustomEvent('open-cmdk'));
          }}
          className="w-full flex items-center justify-between px-4 py-3 text-[15px] font-[550] text-secondary bg-surface border border-border rounded-xl hover:border-primary/50 hover:text-primary transition-all shadow-sm outline-none cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-muted group-hover:text-primary stroke-[1.5] transition-colors" />
            <span className="font-medium">Search workspace...</span>
          </div>
          <kbd className="text-[10px] font-medium font-mono border border-border text-secondary bg-surface-hover px-1.5 py-0.5 rounded shadow-2xs group-hover:border-primary/40 group-hover:text-primary transition-colors">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Primary Navigation — Clean Linear 6-Item Loop */}
      <div className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5">
        {navItems.map(renderLink)}
      </div>

      {/* Horizontal Divider & Secondary Controls */}
      <div className="px-4 py-3 border-t border-border space-y-1.5">
        {/* Focus Mode Trigger */}
        {onToggleFocus && (
          <button
            onClick={onToggleFocus}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-[550] text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-transparent hover:border-border group cursor-pointer"
            title="Enter Zero-Distraction Focus Mode"
          >
            <span className="flex items-center gap-3.5">
              <Maximize2 className="w-5 h-5 text-secondary group-hover:text-[#2563EB] stroke-[1.5] transition-colors" />
              <span>Focus Mode</span>
            </span>
            <span className="text-[9px] font-mono text-muted group-hover:text-secondary uppercase">ESC</span>
          </button>
        )}

        {/* Theme Toggle Action */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-[550] text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-transparent hover:border-border group cursor-pointer"
          title="Toggle Dark / Bright Mode"
        >
          <span className="flex items-center gap-3.5">
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-500 group-hover:text-amber-600 stroke-[1.5] transition-colors" />
            ) : (
              <Moon className="w-5 h-5 text-secondary group-hover:text-[#2563EB] stroke-[1.5] transition-colors" />
            )}
            <span>{theme === 'dark' ? 'Bright Mode' : 'Dark Mode'}</span>
          </span>
          <span className="text-[9px] font-mono text-muted group-hover:text-secondary uppercase">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* Export Backup Action */}
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-[550] text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-transparent hover:border-border group cursor-pointer"
          title="Export workspace backup as JSON"
        >
          <span className="flex items-center gap-3.5">
            <Download className="w-5 h-5 text-secondary group-hover:text-[#2563EB] stroke-[1.5] transition-colors" />
            <span>Export Data</span>
          </span>
          <span className="text-[9px] font-mono text-muted group-hover:text-secondary uppercase">JSON</span>
        </button>
      </div>

      {/* Footer Profile Strip — Clean & Restrained */}
      <div className="p-4 border-t border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] font-mono font-bold text-sm shrink-0">
            SK
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-primary truncate">Sudhanshu K.</div>
            <div className="text-[11px] text-muted font-mono flex items-center gap-1.5 font-bold mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#109868]" /> Pro Builder
            </div>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-cmdk'))}
          className="text-[10px] font-mono text-muted hover:text-primary p-1 rounded hover:bg-surface-hover transition-colors"
          title="Settings / Quick Actions"
        >
          <Settings className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
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
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
