import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FileText, KanbanSquare, Target, Search, Brain, Calendar, Clock, Plus, ArrowRight, Zap, Rocket, ListChecks } from 'lucide-react';
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
    const handleOpenCmdk = () => setOpen(true);

    document.addEventListener('keydown', down);
    window.addEventListener('open-cmdk', handleOpenCmdk);
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-cmdk', handleOpenCmdk);
    };
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
    <div 
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[18vh] bg-[#111827]/30 backdrop-blur-sm animate-in fade-in duration-150 p-4"
    >
      <Command 
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-2xl bg-white border border-[#E5E8EC] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-180 ease-out select-none",
          animateIn ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
        )}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        <div className="flex items-center border-b border-[#E5E8EC] px-5 bg-[#F8F9FB]/50">
          <Search className="w-5 h-5 text-[#9CA3AF] mr-3.5 shrink-0 stroke-[2]" />
          <Command.Input 
            autoFocus
            className="flex h-14 w-full bg-transparent outline-none text-[#111827] placeholder:text-[#9CA3AF] text-base font-medium" 
            placeholder="Type a command, jump to tab, or search issues and docs..." 
          />
          <kbd className="text-[10px] font-mono text-[#6B7280] bg-white border border-[#E5E8EC] px-2 py-1 rounded-md shadow-2xs shrink-0">
            ESC
          </kbd>
        </div>
        
        <Command.List className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-[#E5E8EC]/60">
          <Command.Empty className="p-8 text-center text-[#6B7280] text-sm">
            No matching commands, issues, or documents found.
          </Command.Empty>

          {/* NEW: High-Velocity Quick Actions Group */}
          <Command.Group 
            heading={<div className="flex items-center gap-1.5 text-[#2563EB]"><Zap className="w-3.5 h-3.5 text-[#2563EB]" /><span>Instant Quick Actions</span></div>} 
            className="pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
          >
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/review'))}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#111827] aria-selected:text-white transition-colors group mb-1"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 group-aria-selected:bg-white/20 text-[#2563EB] group-aria-selected:text-white flex items-center justify-center">
                  <Brain className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">Start Deep Work Focus Session</div>
                  <div className="text-[11px] text-[#6B7280] group-aria-selected:text-white/80">Launch live stopwatch in Daily Review</div>
                </div>
              </div>
              <span className="text-xs font-mono opacity-0 group-aria-selected:opacity-100 flex items-center gap-1">
                Execute <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Command.Item>

            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/board'))}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#111827] aria-selected:text-white transition-colors group mb-1"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0D9488]/10 group-aria-selected:bg-white/20 text-[#0D9488] group-aria-selected:text-white flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">Create New Issue or Sub-task</div>
                  <div className="text-[11px] text-[#6B7280] group-aria-selected:text-white/80">Open Kanban Board quick-add pipeline</div>
                </div>
              </div>
              <span className="text-xs font-mono opacity-0 group-aria-selected:opacity-100 flex items-center gap-1">
                Execute <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Command.Item>

            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/planner'))}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#111827] aria-selected:text-white transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#EA580C]/10 group-aria-selected:bg-white/20 text-[#EA580C] group-aria-selected:text-white flex items-center justify-center">
                  <Calendar className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">Time-Block Weekly Planner</div>
                  <div className="text-[11px] text-[#6B7280] group-aria-selected:text-white/80">Schedule focus hours & meeting buffers</div>
                </div>
              </div>
              <span className="text-xs font-mono opacity-0 group-aria-selected:opacity-100 flex items-center gap-1">
                Execute <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Command.Item>
          </Command.Group>

          {/* Navigation Group */}
          <Command.Group 
            heading={<div className="flex items-center gap-1.5 text-[#4F46E5]"><Rocket className="w-3.5 h-3.5 text-[#4F46E5]" /><span>Jump to Screen</span></div>} 
            className="pt-2 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
          >
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#F8F9FB] aria-selected:text-[#2563EB] transition-colors duration-100"
            >
              <Target className="w-4 h-4 text-[#6B7280]" /> Dashboard Scorecard
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/board'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#F8F9FB] aria-selected:text-[#2563EB] transition-colors duration-100"
            >
              <KanbanSquare className="w-4 h-4 text-[#6B7280]" /> Kanban Execution Board
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/sprint'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#F8F9FB] aria-selected:text-[#2563EB] transition-colors duration-100"
            >
              <Clock className="w-4 h-4 text-[#6B7280]" /> Active Sprint Burndown View
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/app/goals'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#F8F9FB] aria-selected:text-[#2563EB] transition-colors duration-100"
            >
              <Target className="w-4 h-4 text-[#6B7280]" /> Goals & Quarterly OKRs
            </Command.Item>
          </Command.Group>

          {/* Brain Pages Group */}
          <Command.Group 
            heading={<div className="flex items-center gap-1.5 text-[#7C3AED]"><Brain className="w-3.5 h-3.5 text-[#7C3AED]" /><span>Knowledge Base Documents</span></div>} 
            className="pt-2 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
          >
            {pages.map((page) => (
              <Command.Item 
                key={page.id}
                onSelect={() => runCommand(() => navigate(`/app/brain`))}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#F8F9FB] aria-selected:text-[#2563EB] transition-colors duration-100"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {page.icon ? (
                    <span className="w-4 h-4 flex items-center justify-center text-sm">{page.icon}</span>
                  ) : (
                    <FileText className="w-4 h-4 text-[#9CA3AF]" />
                  )}
                  <span className="truncate">{page.title}</span>
                </div>
                <span className="text-[10px] font-mono text-[#9CA3AF] bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-[#E5E8EC]">
                  Doc
                </span>
              </Command.Item>
            ))}
          </Command.Group>

          {/* Issues Group */}
          <Command.Group 
            heading={<div className="flex items-center gap-1.5 text-[#2563EB]"><ListChecks className="w-3.5 h-3.5 text-[#2563EB]" /><span>Active Issues & Tickets</span></div>} 
            className="pt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
          >
            {issues.map((issue) => (
              <Command.Item 
                key={issue.id}
                onSelect={() => runCommand(() => navigate(`/app/board`))}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-[#111827] aria-selected:bg-[#F8F9FB] aria-selected:text-[#2563EB] transition-colors duration-100"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-[#9CA3AF] text-xs font-mono font-bold bg-[#F8F9FB] px-1.5 py-0.2 rounded border border-[#E5E8EC] shrink-0">
                    {issue.id.slice(0, 7).toUpperCase()}
                  </span>
                  <span className="truncate">{issue.title}</span>
                </div>
                <span className="text-[10px] font-mono capitalize text-[#6B7280] bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-[#E5E8EC]">
                  {issue.status.replace('_', ' ')}
                </span>
              </Command.Item>
            ))}
          </Command.Group>

        </Command.List>

        <div className="bg-[#F8F9FB] border-t border-[#E5E8EC] px-4 py-2 flex items-center justify-between text-[11px] text-[#6B7280] font-mono">
          <span>Tip: Press <kbd className="bg-white border border-[#E5E8EC] px-1 py-0.2 rounded text-[#111827]">↑</kbd> <kbd className="bg-white border border-[#E5E8EC] px-1 py-0.2 rounded text-[#111827]">↓</kbd> to navigate</span>
          <span>Press <kbd className="bg-white border border-[#E5E8EC] px-1.5 py-0.2 rounded text-[#111827] font-bold">↵</kbd> to execute</span>
        </div>
      </Command>
    </div>
  );
}
