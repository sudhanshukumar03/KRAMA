import { useState, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { KanbanSquare, Target, Search, Brain, Calendar, Timer, TrendingUp, Layers, Inbox, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { openFocusTab } from '../lib/focusNavigation';
import type { SearchResult } from '../types/schema';
import { useModalA11y } from '../hooks/useModalA11y';
import { SearchResults } from './search/SearchResults';
import '../styles/command-palette.css';
const navigation = [
  { title: 'Dashboard', path: '/app/', icon: Target }, { title: 'Inbox', path: '/app/inbox', icon: Inbox },
  { title: 'Tasks', path: '/app/board', icon: KanbanSquare }, { title: 'Planner', path: '/app/planner', icon: Calendar },
  { title: 'Focus Timer', path: '/focus', icon: Timer }, { title: 'Goals', path: '/app/goals', icon: Target },
  { title: 'Habits', path: '/app/habits', icon: TrendingUp }, { title: 'Projects', path: '/app/projects', icon: Layers },
  { title: 'Brain Workspace', path: '/app/brain', icon: Brain },
];

export function CommandPalette() {
 const [open, setOpen] = useState(false);
 const [animateIn, setAnimateIn] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [isSearching, setIsSearching] = useState(false);
 const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
 const [searchError, setSearchError] = useState(false);
 const [retryAttempt, setRetryAttempt] = useState(0);
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const dialogRef = useModalA11y(open, () => setOpen(false));
 const navigate = useNavigate();

 const hasSearchQuery = searchQuery.trim().length > 0;
 const matchedNavigation = navigation.filter(item => !hasSearchQuery || item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()));
 const resultCount = searchResults.length + matchedNavigation.length;
 const { data: recent, isError: recentError } = useQuery({
   queryKey: ['search', 'recent'], queryFn: api.search.recent, enabled: open && !hasSearchQuery, retry: 1,
 });

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
 setSearchResults([]);
 }
 }, [open]);

 // Each query owns its request. Closing, clearing or changing the query retires
 // its response before another request can publish results.
 useEffect(() => {
 setSearchResults([]);
 setSearchError(false);
 if (!open || !searchQuery.trim()) { setIsSearching(false); return; }
 const controller = new AbortController();
 setIsSearching(true);
 debounceRef.current = setTimeout(async () => {
   try {
     const data = await api.search.query(searchQuery, controller.signal);
     if (!controller.signal.aborted) setSearchResults(data.results || []);
   } catch {
     if (!controller.signal.aborted) setSearchError(true);
   } finally {
     if (!controller.signal.aborted) setIsSearching(false);
   }
 }, 200);
 return () => {
 if (debounceRef.current) clearTimeout(debounceRef.current);
 controller.abort();
 };
 }, [open, searchQuery, retryAttempt]);

 const runCommand = (command: () => void) => {
 setOpen(false);
 command();
 };


 if (!open) return null;

 return (
 <div
 onClick={() => setOpen(false)}
 className="workspace-search-overlay"
 >
 <Command
 ref={dialogRef}
 role="dialog"
 aria-modal="true"
 aria-label="Search workspace"
 onClick={(e) => e.stopPropagation()}
 shouldFilter={false}
 className={cn("workspace-search-dialog",
 animateIn ?"scale-100 opacity-100" :"scale-[0.98] opacity-0"
 )}
 onKeyDown={(e) => {
 if (e.key === 'Escape') {
 e.preventDefault();
 setOpen(false);
 }
 }}
 >
 <div className="workspace-search-header">
 <div className="workspace-search-field">
 {isSearching ? (
 <Loader2 aria-hidden="true" className="w-5 h-5 text-accent-fg shrink-0 animate-spin" />
 ) : (
 <Search aria-hidden="true" className="w-5 h-5 text-muted shrink-0" />
 )}
 <Command.Input
 autoFocus
 maxLength={2000}
 value={searchQuery}
 onValueChange={setSearchQuery}
 aria-label="Search your workspace"
 className="workspace-search-input"
 placeholder="Search your workspace…"
 />
 </div>
 <button type="button" aria-label="Close search" onClick={() => setOpen(false)} className="workspace-search-close">
 <span className="workspace-search-escape" aria-hidden="true">Esc</span>
 <X className="workspace-search-close-icon" size={18} aria-hidden="true" />
 </button>
 </div>

 <Command.List className="workspace-search-list">
 {searchError && <div role="alert" className="p-4 text-sm text-secondary">Search is unavailable. Your query is retained. <button type="button" className="min-h-11 px-3 text-accent-fg underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => setRetryAttempt(value => value + 1)}>Retry search</button></div>}
 {isSearching && <p role="status" className="p-4 text-sm text-secondary">Searching...</p>}
 {!searchError && !isSearching && <Command.Empty className="p-8 text-center text-secondary text-body">
 {hasSearchQuery ? 'No results. Try a different title or a few words from your notes.' : 'No matching commands found.'}
 </Command.Empty>}

 {matchedNavigation.length > 0 && <Command.Group heading="Go to" className="workspace-search-group">
 {matchedNavigation.map(item => (
   <Command.Item key={item.path} value={`navigation:${item.path}`} className="workspace-search-item" onSelect={() => runCommand(() => item.path === '/focus' ? openFocusTab() : navigate(item.path))}>
     <item.icon aria-hidden="true" className="w-4 h-4 text-secondary shrink-0" />{item.title}
   </Command.Item>
 ))}
 </Command.Group>}
 {!hasSearchQuery && recentError && <p role="status" className="px-3 py-2 text-sm text-secondary">Recent items are unavailable. Search or choose a page.</p>}
 <SearchResults results={hasSearchQuery ? searchResults : recent?.results || []} query={searchQuery} onOpen={url => runCommand(() => navigate(url))} />

 </Command.List>

 <div className="workspace-search-footer">
 <span>
 {hasSearchQuery
 ? isSearching ? 'Searching…' : searchError ? 'Search unavailable' : `${resultCount} result${resultCount !== 1 ? 's' : ''}`
 : <><kbd>↑</kbd> <kbd>↓</kbd> <span>Navigate</span></>
 }
 </span>
 <span><kbd>↵</kbd> <span>Open</span></span>
 </div>
 </Command>
 </div>
 );
}

