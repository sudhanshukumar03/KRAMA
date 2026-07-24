import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FileText, KanbanSquare, Target, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const navigate = useNavigate();

  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Trigger scale animation after mount
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
    }
  }, [open]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-black/20 backdrop-blur-sm animate-in fade-in duration-150">
      <Command 
        className={cn(
          "w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-180 ease-out",
          animateIn ? "scale-100" : "scale-[0.98]"
        )}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        <div className="flex items-center border-b border-[#E5E7EB] px-4">
          <Search className="w-5 h-5 text-[#6B7280] mr-3 shrink-0" />
          <Command.Input 
            autoFocus
            className="flex h-14 w-full bg-transparent outline-none text-[#0A0A0A] placeholder:text-[#9CA3AF] text-lg font-medium" 
            placeholder="Type a command or search..." 
          />
        </div>
        
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="p-6 text-center text-[#6B7280] text-sm">No results found.</Command.Empty>

          <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#9CA3AF]">
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/board'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-[#6B7280] aria-selected:bg-[#F3F4F6] aria-selected:text-[#0A0A0A] transition-colors duration-100"
            >
              <KanbanSquare className="w-4 h-4" /> Go to Board
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/goals'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-[#6B7280] aria-selected:bg-[#F3F4F6] aria-selected:text-[#0A0A0A] transition-colors duration-100"
            >
              <Target className="w-4 h-4" /> Go to Goals
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Brain Pages" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#9CA3AF] mt-2">
            {pages.map((page) => (
              <Command.Item 
                key={page.id}
                onSelect={() => runCommand(() => navigate(`/app/brain`))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-[#6B7280] aria-selected:bg-[#F3F4F6] aria-selected:text-[#0A0A0A] transition-colors duration-100"
              >
                {page.icon ? (
                  <span className="w-4 h-4 flex items-center justify-center">{page.icon}</span>
                ) : (
                  <FileText className="w-4 h-4 text-[#9CA3AF]" />
                )}
                {page.title}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Issues" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#9CA3AF] mt-2">
            {issues.map((issue) => (
              <Command.Item 
                key={issue.id}
                onSelect={() => runCommand(() => navigate(`/app/board`))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-[#6B7280] aria-selected:bg-[#F3F4F6] aria-selected:text-[#0A0A0A] transition-colors duration-100"
              >
                <span className="text-[#9CA3AF] text-xs font-mono w-12">{issue.id}</span>
                <span className="truncate">{issue.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
