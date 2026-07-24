import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChevronRight, FileText, Plus, FileSignature } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { PageWithRelations } from '../types/schema';
import { cn } from '../lib/utils';
import { EmptyState } from './ui/EmptyState';


function PageTreeNode({ 
  page, 
  pages, 
  level = 0, 
  onSelect, 
  selectedId 
}: { 
  page: PageWithRelations, 
  pages: PageWithRelations[], 
  level?: number, 
  onSelect: (id: string) => void, 
  selectedId: string | null 
}) {
  const [expanded, setExpanded] = useState(true);
  const children = pages.filter(p => p.parentPageId === page.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === page.id;
  
  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 hover:bg-[#F3F4F6] rounded-md cursor-pointer text-sm transition-colors duration-100",
          isSelected ? "bg-[#F3F4F6] text-[#0A0A0A] font-medium" : "text-[#6B7280]"
        )}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        onClick={() => onSelect(page.id)}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-4 h-4 flex items-center justify-center text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] rounded-sm"
        >
          {hasChildren && (
            <ChevronRight className={cn(
              "w-3.5 h-3.5 transition-transform duration-150", 
              expanded ? "rotate-90" : ""
            )} />
          )}
        </button>
        <span className="text-base leading-none">{page.icon || <FileText className="w-4 h-4 text-[#9CA3AF]" />}</span>
        <span className="truncate">{page.title}</span>
      </div>
      
      {/* Children Container with height/opacity animation via Tailwind */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-150 ease-in-out origin-top",
          expanded && hasChildren ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children.map(child => (
          <PageTreeNode key={child.id} page={child} pages={pages} level={level + 1} onSelect={onSelect} selectedId={selectedId} />
        ))}
      </div>
    </div>
  );
}

function Breadcrumbs({ page, pages }: { page: PageWithRelations, pages: PageWithRelations[] }) {
  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let current: PageWithRelations | undefined = page;
    while (current) {
      crumbs.unshift(current);
      current = pages.find(p => p.id === current?.parentPageId);
    }
    return crumbs;
  }, [page, pages]);

  return (
    <div className="flex items-center gap-1 text-sm font-medium mb-8">
      <span className="text-[#6B7280] flex items-center gap-1">
        <div className="w-5 h-5 rounded flex items-center justify-center bg-[#F3F4F6]">
          <span className="text-xs">S</span>
        </div>
        Knowledge Base
      </span>
      <span className="text-[#D1D5DB] mx-1">/</span>
      
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <div key={crumb.id} className="flex items-center">
            <span className={cn(
              "flex items-center gap-1.5",
              isLast ? "text-[#0A0A0A]" : "text-[#6B7280]"
            )}>
              {crumb.icon && <span>{crumb.icon}</span>}
              {crumb.title}
            </span>
            {!isLast && <span className="text-[#D1D5DB] mx-2">/</span>}
          </div>
        );
      })}
    </div>
  );
}

function Editor({ page, pages }: { page: PageWithRelations, pages: PageWithRelations[] }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start typing...' })
    ],
    content: (page.blocks ? page.blocks as Content : ''),
    editorProps: {
      attributes: {
        class: 'prose prose-zinc max-w-none focus:outline-none min-h-[500px]',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="max-w-3xl mx-auto py-12 px-8 h-full overflow-y-auto animate-in fade-in duration-150">
      <Breadcrumbs page={page} pages={pages} />
      
      <div className="text-6xl mb-6 leading-none select-none">{page.icon || '📄'}</div>
      <input 
        type="text" 
        defaultValue={page.title} 
        className="text-4xl font-bold bg-transparent border-none outline-none text-[#0A0A0A] placeholder:text-[#9CA3AF] w-full mb-8"
        placeholder="Page title"
      />
      <EditorContent editor={editor} />
    </div>
  );
}

export function BrainWorkspace() {
  const { data: pages = [], isLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading brain...</div>;

  const rootPages = pages.filter(p => !p.parentPageId);
  const selectedPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="flex h-full w-full bg-white">
      {/* Page Tree Column */}
      <div className="w-64 border-r border-[#E5E7EB] bg-[#FAFAFA] flex flex-col h-full flex-shrink-0">
        <div className="p-3 border-b border-[#E5E7EB] flex justify-between items-center h-14">
          <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Pages</span>
          <button className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] rounded-sm p-0.5">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {rootPages.map(page => (
            <PageTreeNode 
              key={page.id} 
              page={page} 
              pages={pages} 
              onSelect={setSelectedPageId} 
              selectedId={selectedPageId} 
            />
          ))}
        </div>
      </div>

      {/* Editor Main Area Column */}
      <div className="flex-1 h-full bg-white relative">
        {selectedPage ? (
          <Editor key={selectedPage.id} page={selectedPage} pages={pages} />
        ) : (
          <EmptyState 
            icon={FileSignature}
            title="No Document Selected"
            description="Select a document from the page tree or create a new one to start writing."
            actionLabel="Create New Page"
            onAction={() => alert('Create page action')}
          />
        )}
      </div>
    </div>
  );
}
