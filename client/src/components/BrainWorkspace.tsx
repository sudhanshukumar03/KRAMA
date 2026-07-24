import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChevronRight, ChevronDown, FileText, Plus } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { PageWithRelations } from '../types/schema';
import { cn } from '../lib/utils';

function PageTreeNode({ page, pages, level = 0, onSelect, selectedId }: { page: PageWithRelations, pages: PageWithRelations[], level?: number, onSelect: (id: string) => void, selectedId: string | null }) {
  const [expanded, setExpanded] = useState(true);
  const children = pages.filter(p => p.parentPageId === page.id);
  const hasChildren = children.length > 0;
  
  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-800/50 rounded-md cursor-pointer text-sm transition-colors",
          selectedId === page.id ? "bg-accent/10 text-accent font-medium" : "text-zinc-300"
        )}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        onClick={() => onSelect(page.id)}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
        >
          {hasChildren ? (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : null}
        </button>
        <span className="text-base leading-none">{page.icon || <FileText className="w-4 h-4 text-zinc-500" />}</span>
        <span className="truncate">{page.title}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map(child => (
            <PageTreeNode key={child.id} page={child} pages={pages} level={level + 1} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ page }: { page: PageWithRelations }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start typing...' })
    ],
    content: page.blocks || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-zinc max-w-none focus:outline-none min-h-[500px]',
      },
    },
    // we would useMutation to save here on update
  });

  if (!editor) return null;

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="text-6xl mb-6">{page.icon || '📄'}</div>
      <input 
        type="text" 
        defaultValue={page.title} 
        className="text-4xl font-bold bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 w-full mb-8 font-heading"
        placeholder="Page title"
      />
      <EditorContent editor={editor} />
    </div>
  );
}

export function BrainWorkspace() {
  const { data: pages = [], isLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-zinc-500">Loading brain...</div>;

  const rootPages = pages.filter(p => !p.parentPageId);
  const selectedPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="flex h-full w-full">
      {/* Page Tree Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col h-full">
        <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-sm font-semibold text-zinc-300">Knowledge Base</span>
          <button className="text-zinc-400 hover:text-zinc-100">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {rootPages.map(page => (
            <PageTreeNode key={page.id} page={page} pages={pages} onSelect={setSelectedPageId} selectedId={selectedPageId} />
          ))}
        </div>
      </div>

      {/* Editor Main Area */}
      <div className="flex-1 overflow-y-auto bg-zinc-950 px-12">
        {selectedPage ? (
          <Editor key={selectedPage.id} page={selectedPage} />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600">
            Select or create a page
          </div>
        )}
      </div>
    </div>
  );
}
