import { Command } from 'cmdk';
import { FileText, ListChecks, FolderKanban, Target } from 'lucide-react';
import type { SearchResult } from '../../types/schema';
import { cn } from '../../lib/utils';

const kinds = {
  page: { label: 'Documents', icon: FileText, color: 'text-cat-routines bg-cat-routines-bg' },
  issue: { label: 'Tasks', icon: ListChecks, color: 'text-cat-tasks bg-cat-tasks-bg' },
  project: { label: 'Projects', icon: FolderKanban, color: 'text-cat-projects bg-cat-projects-bg' },
  goal: { label: 'Goals', icon: Target, color: 'text-success-fg bg-success-bg' },
};
function Snippet({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index < 0) return <span>{text}</span>;
  return <span>{text.slice(0, index)}<mark className="bg-accent/20 text-accent rounded-sm px-0.5 font-medium">{text.slice(index, index + needle.length)}</mark>{text.slice(index + needle.length)}</span>;
}
export function SearchResults({ results, query, onOpen }: { results: SearchResult[]; query: string; onOpen: (url: string) => void }) {
  return Object.entries(kinds).map(([type, kind]) => {
    const rows = results.filter(result => result.type === type);
    if (!rows.length) return null;
    const Icon = kind.icon;
    return <Command.Group key={type} className="workspace-search-group" heading={`${query.trim() ? '' : 'Recent '}${query.trim() ? kind.label : kind.label.toLowerCase()}`}>
      {rows.map(result => <Command.Item key={`${type}-${result.id}`} value={`${type}:${result.id}`} onSelect={() => onOpen(result.url)} className="workspace-search-item group">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Icon aria-hidden="true" className={cn('mt-0.5 w-4 h-4 shrink-0', kind.color.split(' ')[0])} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold leading-tight"><Snippet text={result.title} query={query} /></div>
            {result.snippet && <div className="text-xs text-secondary mt-0.5 line-clamp-2 leading-relaxed"><Snippet text={result.snippet} query={query} /></div>}
          </div>
        </div>
        {result.badge && <span className={cn('text-xs px-1.5 py-0.5 rounded shrink-0 ml-2', kind.color)}>{result.badge.replaceAll('_', ' ')}</span>}
      </Command.Item>)}
    </Command.Group>;
  });
}
