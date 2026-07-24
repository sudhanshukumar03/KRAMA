import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Target, 
  FolderKanban,
  KanbanSquare,
  Clock,
  CalendarCheck,
  Search,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/app/', icon: Home },
  { name: 'Brain Workspace', path: '/app/brain', icon: BookOpen },
  { name: 'Goals', path: '/app/goals', icon: Target },
  { name: 'Projects', path: '/app/projects', icon: FolderKanban },
];

const executionItems = [
  { name: 'Weekly Planner', path: '/app/planner', icon: Calendar },
  { name: 'Kanban Board', path: '/app/board', icon: KanbanSquare },
  { name: 'Sprint View', path: '/app/sprint', icon: Clock },
  { name: 'Daily Review', path: '/app/review', icon: CalendarCheck },
];

export function Sidebar() {
  const location = useLocation();

  const renderLink = (item: { name: string; path: string; icon: any }) => {
    const isActive = location.pathname === item.path || (item.path !== '/app/' && location.pathname.startsWith(item.path));
    const Icon = item.icon;

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-1",
          isActive 
            ? "bg-[#F3F4F6] text-[#0A0A0A]" 
            : "text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F3F4F6]"
        )}
      >
        <Icon className={cn("w-4 h-4", isActive ? "text-[#0A0A0A]" : "text-[#6B7280]")} />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="w-64 border-r border-[#E5E7EB] bg-[#FAFAFA] flex flex-col h-full flex-shrink-0">
      {/* Header / Brand */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-[#E5E7EB]">
        <div className="w-6 h-6 rounded bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-xs">
          K
        </div>
        <span className="font-bold tracking-tight text-[#0A0A0A]">KRAMA OS</span>
      </div>

      {/* Search / Command Palette Trigger */}
      <div className="p-4 border-b border-[#E5E7EB]">
        <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#6B7280] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F3F4F6] transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-1">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] font-medium font-sans border border-[#E5E7EB] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 pb-6">
          <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 px-3">
            Brain
          </div>
          <div className="space-y-0.5">
            {navItems.map(renderLink)}
          </div>
        </div>

        <div className="px-3 pb-6">
          <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 px-3">
            Execution
          </div>
          <div className="space-y-0.5">
            {executionItems.map(renderLink)}
          </div>
        </div>
      </div>
    </div>
  );
}
