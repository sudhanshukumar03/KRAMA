import { useState, useEffect, useRef, useCallback } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FileText, KanbanSquare, Target, Search, Brain, Calendar, Clock, Plus, ArrowRight, Zap, Rocket, ListChecks, FolderKanban, Scale, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import type { SearchResult } from '../types/schema';

function HighlightedSnippet({ text, query }: { text: string; query: string }) {
 if (!query || !text) return <span>{text}</span>;
 const lowerText = text.toLowerCase();
 const lowerQuery = query.toLowerCase().trim();
 const idx = lowerText.indexOf(lowerQuery);
 if (idx === -1) return <span>{text}</span>;
 return (
 <span>
 {text.slice(0, idx)}
 <mark className="bg-[#FEF3C7] text-[#92400E] rounded-sm px-0.5 font-medium">{text.slice(idx, idx + lowerQuery.length)}</mark>
 {text.slice(idx + lowerQuery.length)}
 </span>
 );
}

const typeIcons: Record<string, React.ReactNode> = {
 page: <FileText className="w-4 h-4 text-[#7C3AED]" />,
 issue: <ListChecks className="w-4 h-4 text-[#2563EB]" />,
 project: <FolderKanban className="w-4 h-4 text-[#2563EB]" />,
 goal: <Target className="w-4 h-4 text-[#0D9488]" />,
 decision: <Scale className="w-4 h-4 text-[#D97706]" />,
};

const typeColors: Record<string, string> = {
 page: 'text-[#7C3AED] bg-[#7C3AED]/10',
 issue: 'text-[#2563EB] bg-[#2563EB]/10',
 project: 'text-[#2563EB] bg-[#2563EB]/10',
 goal: 'text-[#0D9488] bg-[#0D9488]/10',
 decision: 'text-[#D97706] bg-[#D97706]/10',
};

const typeLabels: Record<string, string> = {
 page: 'Knowledge Base & Doc Snippets',
 issue: 'Active Issues & Tickets',
 project: 'Engineering Projects',
 goal: 'Strategic Goals',
 decision: 'Decision Log',
};

export function CommandPalette() {
 const [open, setOpen] = useState(false);
 const [animateIn, setAnimateIn] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [debouncedQuery, setDebouncedQuery] = useState('');
 const [isSearching, setIsSearching] = useState(false);
 const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const navigate = useNavigate();

 // Fallback local data for when no search query is active
 const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
 const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
 const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
 const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

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
 setSearchQuery('');
 setDebouncedQuery('');
 setSearchResults([]);
 }
 }, [open]);

 // Debounced server-side search
 const performSearch = useCallback(async (q: string) => {
 if (!q.trim()) {
 setSearchResults([]);
 setIsSearching(false);
 return;
 }
 setIsSearching(true);
 try {
 const data = await api.search.query(q);
 setSearchResults(data.results || []);
 } catch (err) {
 console.error('Search error:', err);
 setSearchResults([]);
 } finally {
 setIsSearching(false);
 }
 }, []);

 useEffect(() => {
 if (debounceRef.current) clearTimeout(debounceRef.current);
 if (!searchQuery.trim()) {
 setDebouncedQuery('');
 setSearchResults([]);
 return;
 }
 debounceRef.current = setTimeout(() => {
 setDebouncedQuery(searchQuery);
 performSearch(searchQuery);
 }, 200);
 return () => {
 if (debounceRef.current) clearTimeout(debounceRef.current);
 };
 }, [searchQuery, performSearch]);

 const runCommand = (command: () => void) => {
 setOpen(false);
 command();
 };

 // Group search results by type
 const groupedResults = searchResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
 if (!acc[r.type]) acc[r.type] = [];
 acc[r.type].push(r);
 return acc;
 }, {});

 const hasSearchQuery = searchQuery.trim().length > 0;

 if (!open) return null;

 return (
 <div 
 onClick={() => setOpen(false)}
 className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[18vh] bg-primary/30 backdrop-blur-sm animate-in fade-in duration-150 p-4"
 >
 <Command 
 onClick={(e) => e.stopPropagation()}
 shouldFilter={!hasSearchQuery}
 className={cn("w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-180 ease-out select-none",
 animateIn ?"scale-100 opacity-100" :"scale-[0.98] opacity-0"
 )}
 onKeyDown={(e) => {
 if (e.key === 'Escape') {
 e.preventDefault();
 setOpen(false);
 }
 }}
 >
 <div className="flex items-center border-b border-border px-5 bg-surface-hover/50">
 {isSearching ? (
 <Loader2 className="w-5 h-5 text-[#2563EB] mr-3.5 shrink-0 stroke-[2] animate-spin" />
 ) : (
 <Search className="w-5 h-5 text-muted mr-3.5 shrink-0 stroke-[2]" />
 )}
 <Command.Input 
 autoFocus
 value={searchQuery}
 onValueChange={setSearchQuery}
 className="flex h-14 w-full bg-transparent outline-none text-primary placeholder:text-muted text-body font-medium" 
 placeholder="Search docs, issues, projects, goals, decisions..." 
 />
 <kbd className="text-[10px] font-mono text-secondary bg-surface border border-border px-2 py-1 rounded-md shadow-2xs shrink-0">
 ESC
 </kbd>
 </div>
 
 <Command.List className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-border/60">
 <Command.Empty className="p-8 text-center text-secondary text-body">
 {hasSearchQuery ? 'No matching results found across docs, issues, projects, goals, or decisions.' : 'No matching commands found.'}
 </Command.Empty>

 {/* SERVER-SIDE SEARCH RESULTS — shown when user has typed a query */}
 {hasSearchQuery && Object.entries(groupedResults).map(([type, results]) => (
 <Command.Group
 key={type}
 heading={
 <div className="flex items-center gap-1.5">
 {typeIcons[type]}
 <span className={typeColors[type]?.split(' ')[0]}>{typeLabels[type] || type}</span>
 <span className="text-muted ml-1">({results.length})</span>
 </div>
 }
 className="pt-2 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
 >
 {results.map((result) => (
 <Command.Item
 key={`${result.type}-${result.id}`}
 value={`${result.title} ${result.snippet}`}
 onSelect={() => runCommand(() => navigate(result.url))}
 className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100 group"
 >
 <div className="flex items-start gap-2.5 min-w-0 flex-1">
 <span className="mt-0.5 shrink-0">{typeIcons[result.type]}</span>
 <div className="min-w-0 flex-1">
 <div className="truncate font-semibold leading-tight">
 <HighlightedSnippet text={result.title} query={debouncedQuery} />
 </div>
 {result.snippet && (
 <div className="text-badge text-secondary mt-0.5 line-clamp-2 leading-relaxed">
 <HighlightedSnippet text={result.snippet} query={debouncedQuery} />
 </div>
 )}
 </div>
 </div>
 {result.badge && (
 <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded font-medium shrink-0 ml-2",
 typeColors[result.type] || 'text-secondary bg-surface-hover'
 )}>
 {result.badge}
 </span>
 )}
 </Command.Item>
 ))}
 </Command.Group>
 ))}

 {/* STATIC GROUPS — shown when NO search query is active */}
 {!hasSearchQuery && (
 <>
 {/* Quick Actions Group */}
 <Command.Group 
 heading={<div className="flex items-center gap-1.5 text-[#2563EB]"><Zap className="w-3.5 h-3.5 text-[#2563EB]" /><span>Instant Quick Actions</span></div>} 
 className="pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
 >
 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/review'))}
 className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-body font-medium text-primary aria-selected:bg-primary aria-selected:text-white transition-colors group mb-1"
 >
 <div className="flex items-center gap-3">
 <div className="w-7 h-7 rounded-lg bg-surface-hover border border-border group-aria-selected:bg-white/20 group-aria-selected:border-transparent text-primary group-aria-selected:text-white flex items-center justify-center">
 <Brain className="w-4 h-4 stroke-[2]" />
 </div>
 <div>
 <div className="font-semibold leading-tight">Start Deep Work Focus Session</div>
 <div className="text-badge text-secondary group-aria-selected:text-white/80">Launch live stopwatch in Daily Review</div>
 </div>
 </div>
 <span className="text-caption font-mono opacity-0 group-aria-selected:opacity-100 flex items-center gap-1">
 Execute <ArrowRight className="w-3.5 h-3.5" />
 </span>
 </Command.Item>

 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/board'))}
 className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-body font-medium text-primary aria-selected:bg-primary aria-selected:text-white transition-colors group mb-1"
 >
 <div className="flex items-center gap-3">
 <div className="w-7 h-7 rounded-lg bg-surface-hover border border-border group-aria-selected:bg-white/20 group-aria-selected:border-transparent text-primary group-aria-selected:text-white flex items-center justify-center">
 <Plus className="w-4 h-4 stroke-[2]" />
 </div>
 <div>
 <div className="font-semibold leading-tight">Create New Issue or Sub-task</div>
 <div className="text-badge text-secondary group-aria-selected:text-white/80">Open Kanban Board quick-add pipeline</div>
 </div>
 </div>
 <span className="text-caption font-mono opacity-0 group-aria-selected:opacity-100 flex items-center gap-1">
 Execute <ArrowRight className="w-3.5 h-3.5" />
 </span>
 </Command.Item>

 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/planner'))}
 className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-body font-medium text-primary aria-selected:bg-primary aria-selected:text-white transition-colors group"
 >
 <div className="flex items-center gap-3">
 <div className="w-7 h-7 rounded-lg bg-surface-hover border border-border group-aria-selected:bg-white/20 group-aria-selected:border-transparent text-primary group-aria-selected:text-white flex items-center justify-center">
 <Calendar className="w-4 h-4 stroke-[2]" />
 </div>
 <div>
 <div className="font-semibold leading-tight">Time-Block Weekly Planner</div>
 <div className="text-badge text-secondary group-aria-selected:text-white/80">Schedule focus hours & meeting buffers</div>
 </div>
 </div>
 <span className="text-caption font-mono opacity-0 group-aria-selected:opacity-100 flex items-center gap-1">
 Execute <ArrowRight className="w-3.5 h-3.5" />
 </span>
 </Command.Item>
 </Command.Group>

 {/* Navigation Group */}
 <Command.Group 
 heading={<div className="flex items-center gap-1.5 text-[#2563EB]"><Rocket className="w-3.5 h-3.5 text-[#2563EB]" /><span>Jump to Screen</span></div>} 
 className="pt-2 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
 >
 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/'))}
 className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <Target className="w-4 h-4 text-secondary" /> Dashboard Scorecard
 </Command.Item>
 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/board'))}
 className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <KanbanSquare className="w-4 h-4 text-secondary" /> Kanban Execution Board
 </Command.Item>
 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/sprint'))}
 className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <Clock className="w-4 h-4 text-secondary" /> Active Sprint Burndown View
 </Command.Item>
 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/goals'))}
 className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <Target className="w-4 h-4 text-secondary" /> Goals & Quarterly OKRs
 </Command.Item>
 <Command.Item 
 onSelect={() => runCommand(() => navigate('/app/decisions'))}
 className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <Scale className="w-4 h-4 text-secondary" /> Decision Log
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
 className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <div className="flex items-center gap-2.5 truncate">
 {page.icon ? (
 <span className="w-4 h-4 flex items-center justify-center text-body">{page.icon}</span>
 ) : (
 <FileText className="w-4 h-4 text-muted" />
 )}
 <span className="truncate">{page.title}</span>
 </div>
 <span className="text-[10px] font-mono text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border">
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
 className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <div className="flex items-center gap-2.5 truncate">
 <span className="text-muted text-caption font-mono font-bold bg-surface-hover px-1.5 py-0.2 rounded border border-border shrink-0">
 {issue.id.slice(0, 7).toUpperCase()}
 </span>
 <span className="truncate">{issue.title}</span>
 </div>
 <span className="text-[10px] font-mono capitalize text-secondary bg-surface-hover px-1.5 py-0.5 rounded border border-border">
 {issue.status.replace('_', ' ')}
 </span>
 </Command.Item>
 ))}
 </Command.Group>

 {/* Goals Group */}
 <Command.Group 
 heading={<div className="flex items-center gap-1.5 text-[#0D9488]"><Target className="w-3.5 h-3.5 text-[#0D9488]" /><span>Goals & Strategic OKRs</span></div>} 
 className="pt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
 >
 {goals.map((goal) => (
 <Command.Item 
 key={goal.id}
 onSelect={() => runCommand(() => navigate(`/app/goals`))}
 className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#0D9488] transition-colors duration-100"
 >
 <div className="flex items-center gap-2.5 truncate">
 <Target className="w-4 h-4 text-[#0D9488] shrink-0" />
 <span className="truncate">{goal.title}</span>
 </div>
 <span className="text-[10px] font-mono text-[#0D9488] bg-[#0D9488]/10 px-1.5 py-0.5 rounded font-medium">
 {goal.progress || 0}%
 </span>
 </Command.Item>
 ))}
 </Command.Group>

 {/* Projects Group */}
 <Command.Group 
 heading={<div className="flex items-center gap-1.5 text-primary"><FolderKanban className="w-3.5 h-3.5 text-primary" /><span>Engineering Projects</span></div>} 
 className="pt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
 >
 {projects.map((proj) => (
 <Command.Item 
 key={proj.id}
 onSelect={() => runCommand(() => navigate(`/app/projects/${proj.id}`))}
 className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-body font-medium text-primary aria-selected:bg-surface-hover aria-selected:text-[#2563EB] transition-colors duration-100"
 >
 <div className="flex items-center gap-2.5 truncate">
 <FolderKanban className="w-4 h-4 text-[#2563EB] shrink-0" />
 <span className="truncate">{proj.name}</span>
 </div>
 <span className="text-[10px] font-mono text-secondary bg-surface-hover px-1.5 py-0.5 rounded border border-border">
 Project
 </span>
 </Command.Item>
 ))}
 </Command.Group>
 </>
 )}

 </Command.List>

 <div className="bg-surface-hover border-t border-border px-4 py-2 flex items-center justify-between text-badge text-secondary font-mono">
 <span>
 {hasSearchQuery
 ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} • Powered by Postgres full-text search`
 : <>Tip: Press <kbd className="bg-surface border border-border px-1 py-0.2 rounded text-primary">↑</kbd> <kbd className="bg-surface border border-border px-1 py-0.2 rounded text-primary">↓</kbd> to navigate</>
 }
 </span>
 <span>Press <kbd className="bg-surface border border-border px-1.5 py-0.2 rounded text-primary font-bold">↵</kbd> to execute</span>
 </div>
 </Command>
 </div>
 );
}

