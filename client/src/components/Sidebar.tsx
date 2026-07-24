import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Target, 
  FolderKanban,
  KanbanSquare,
  Clock,
  CalendarCheck,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/app/', icon: Home },
  { name: 'Brain Workspace', path: '/app/brain', icon: BookOpen },
  { name: 'Goals', path: '/app/goals', icon: Target },
  { name: 'Projects', path: '/app/projects', icon: FolderKanban },
];

const executionItems = [
  { name: 'Kanban Board', path: '/app/board', icon: KanbanSquare },
  { name: 'Sprint View', path: '/app/sprint', icon: Clock },
  { name: 'Daily Review', path: '/app/review', icon: CalendarCheck },
];

export function Sidebar() {
  const location = useLocation();

  const renderLink = (item: { name: string; path: string; icon: any }) => {
    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    const Icon = item.icon;

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive 
            ? "bg-accent/10 text-accent" 
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
        )}
      >
        <Icon className="w-4 h-4" />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full text-zinc-100">
      {/* Header / Brand */}
      <div className="h-14 flex items-center px-4 font-semibold tracking-tight border-b border-zinc-800">
        KRAMA OS
      </div>

      {/* Search / Command Palette Trigger */}
      <div className="p-4">
        <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs font-mono bg-zinc-800 px-1.5 rounded">⌘K</kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pb-6">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-3">
            Brain
          </div>
          <div className="space-y-1">
            {navItems.map(renderLink)}
          </div>
        </div>

        <div className="px-3 pb-6">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-3">
            Execution
          </div>
          <div className="space-y-1">
            {executionItems.map(renderLink)}
          </div>
        </div>
      </div>
    </div>
  );
}
