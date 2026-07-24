import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChevronRight, ChevronDown, FileText, Plus } from 'lucide-react';
import type { PageWithRelations } from '../types/schema';
import { cn } from '../lib/utils';

function PageTreeNode({ page, pages, level = 0, onSelect, selectedId }: { page: PageWithRelations; pages: PageWithRelations[]; level?: number; onSelect: (id: string) => void; selectedId: string | null }) {
  const [expanded, setExpanded] = useState(true);
  const children = pages.filter((p) => p.parentPageId === page.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-zinc-800/50',
          selectedId === page.id ? 'bg-accent/10 font-medium text-accent' : 'text-zinc-300'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelect(page.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((value) => !value);
          }}
          className="flex h-4 w-4 items-center justify-center text-zinc-500 hover:text-zinc-300"
        >
          {hasChildren ? (expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}
        </button>
        <span className="text-base leading-none">{page.icon || <FileText className="h-4 w-4 text-zinc-500" />}</span>
        <span className="truncate">{page.title}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <PageTreeNode key={child.id} page={child} pages={pages} level={level + 1} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatBlocksToText(blocks: PageWithRelations['blocks']): string {
  if (blocks == null) return '';
  if (typeof blocks === 'string') return blocks;
  if (typeof blocks === 'number' || typeof blocks === 'boolean') return String(blocks);
  if (Array.isArray(blocks)) {
    return blocks.map((item) => formatBlocksToText(item as PageWithRelations['blocks'])).join('\n');
  }
  if (typeof blocks === 'object') {
    return JSON.stringify(blocks, null, 2);
  }
  return '';
}

function Editor({ page }: { page: PageWithRelations }) {
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(() => formatBlocksToText(page.blocks));

  useEffect(() => {
    setTitle(page.title);
    setContent(formatBlocksToText(page.blocks));
  }, [page.id, page.title, page.blocks]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div className="mb-2 text-6xl">{page.icon || '📄'}</div>
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="w-full border-none bg-transparent text-4xl font-bold text-zinc-100 outline-none placeholder:text-zinc-700"
        placeholder="Page title"
      />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="min-h-[480px] resize-none rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm leading-7 text-zinc-200 outline-none ring-0 placeholder:text-zinc-600"
        placeholder="Write your thoughts, notes, or ideas here..."
      />
    </div>
  );
}

export function BrainWorkspace() {
  const { data: pages = [], isLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-zinc-500">Loading brain...</div>;

  const rootPages = pages.filter((p) => !p.parentPageId);
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  return (
    <div className="flex h-full w-full">
      <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between border-b border-zinc-800 p-3">
          <span className="text-sm font-semibold text-zinc-300">Knowledge Base</span>
          <button className="text-zinc-400 hover:text-zinc-100">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {rootPages.map((page) => (
            <PageTreeNode key={page.id} page={page} pages={pages} onSelect={setSelectedPageId} selectedId={selectedPageId} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-950 px-12">
        {selectedPage ? (
          <Editor key={selectedPage.id} page={selectedPage} />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600">Select or create a page</div>
        )}
      </div>
    </div>
  );
}
