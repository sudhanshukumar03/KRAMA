import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FileText, KanbanSquare, Target, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
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

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-black/50 backdrop-blur-sm">
      <Command 
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        <div className="flex items-center border-b border-zinc-800 px-3">
          <Search className="w-5 h-5 text-zinc-500 mr-2 shrink-0" />
          <Command.Input 
            autoFocus
            className="flex h-14 w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500 text-lg" 
            placeholder="Type a command or search..." 
          />
        </div>
        
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="p-6 text-center text-zinc-500 text-sm">No results found.</Command.Empty>

          <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500">
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/board'))}
              className="flex items-center gap-2 px-2 py-2.5 rounded-md cursor-pointer text-sm text-zinc-300 aria-selected:bg-accent/10 aria-selected:text-accent"
            >
              <KanbanSquare className="w-4 h-4" /> Go to Board
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/goals'))}
              className="flex items-center gap-2 px-2 py-2.5 rounded-md cursor-pointer text-sm text-zinc-300 aria-selected:bg-accent/10 aria-selected:text-accent"
            >
              <Target className="w-4 h-4" /> Go to Goals
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Brain Pages" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500 mt-2">
            {pages.map((page) => (
              <Command.Item 
                key={page.id}
                onSelect={() => runCommand(() => navigate(`/app/brain`))}
                className="flex items-center gap-2 px-2 py-2.5 rounded-md cursor-pointer text-sm text-zinc-300 aria-selected:bg-zinc-800"
              >
                <FileText className="w-4 h-4 text-zinc-500" /> 
                {page.title}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Issues" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500 mt-2">
            {issues.map((issue) => (
              <Command.Item 
                key={issue.id}
                onSelect={() => runCommand(() => navigate(`/app/board`))}
                className="flex flex-col items-start gap-0.5 px-2 py-2.5 rounded-md cursor-pointer text-sm text-zinc-300 aria-selected:bg-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs">{issue.id}</span>
                  <span>{issue.title}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
