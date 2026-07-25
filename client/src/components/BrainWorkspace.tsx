import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChevronRight, FileText, Plus, FileSignature, Building2, Laptop, Brain, Clock, AlignLeft, Sparkles, BookOpen } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { PageWithRelations } from '../types/schema';
import { cn } from '../lib/utils';
import { EmptyState } from './ui/EmptyState';
import { BaseButton } from './ui/BaseButton';

function getIconComponent(iconName: string | null, className?: string) {
  if (iconName === 'landmark') return <Building2 className={cn(className || "w-4 h-4 text-[#6B7280]", "stroke-[1.75]")} />;
  if (iconName === 'laptop') return <Laptop className={cn(className || "w-4 h-4 text-[#6B7280]", "stroke-[1.75]")} />;
  if (iconName) return <span className="text-base leading-none">{iconName}</span>;
  return <FileText className={cn(className || "w-4 h-4 text-[#9CA3AF]", "stroke-[1.75]")} />;
}

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
          "group relative flex items-center gap-2 py-1.5 px-2.5 hover:bg-[#F8F9FB] rounded-lg cursor-pointer text-xs transition-all duration-100 select-none",
          isSelected ? "bg-[#111827] text-white font-medium shadow-2xs" : "text-[#6B7280] hover:text-[#111827]"
        )}
        style={{ paddingLeft: `${(level * 14) + 10}px` }}
        onClick={() => onSelect(page.id)}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={cn(
            "w-4 h-4 flex items-center justify-center transition-colors focus:outline-none rounded-sm",
            isSelected ? "text-white/70 hover:text-white" : "text-[#9CA3AF] hover:text-[#111827]",
            !hasChildren && "opacity-0 cursor-default"
          )}
          disabled={!hasChildren}
        >
          {hasChildren && (
            <ChevronRight className={cn(
              "w-3.5 h-3.5 transition-transform duration-150", 
              expanded ? "rotate-90" : ""
            )} />
          )}
        </button>
        {level > 0 && (
          <div 
            className={cn(
              "absolute border-l border-b rounded-bl-sm pointer-events-none",
              isSelected ? "border-white/20" : "border-[#E5E8EC]"
            )}
            style={{
              left: `${((level - 1) * 14) + 26}px`,
              top: '-12px',
              height: '26px',
              width: '12px'
            }}
          />
        )}
        <span className="flex items-center justify-center flex-shrink-0 z-10">
          {getIconComponent(page.icon, isSelected ? "w-4 h-4 text-white" : "w-4 h-4 text-[#6B7280]")}
        </span>
        <span className="truncate flex-1 z-10">{page.title}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); alert('Create child page'); }}
          className={cn(
            "opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center transition-all rounded-md focus:outline-none",
            isSelected 
              ? "text-white hover:bg-white/20" 
              : "text-[#9CA3AF] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E5E8EC]"
          )}
          title="Add Sub-page"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Children Container */}
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
    <div className="flex items-center gap-1.5 text-xs font-mono font-medium mb-6 bg-[#F8F9FB] px-3.5 py-2 rounded-xl border border-[#E5E8EC] w-fit">
      <span className="text-[#6B7280] flex items-center gap-1.5">
        <div className="w-5 h-5 rounded flex items-center justify-center bg-[#7C3AED]/10 text-[#7C3AED]">
          <BookOpen className="w-3 h-3 stroke-[2]" />
        </div>
        Brain Knowledge Base
      </span>
      <span className="text-[#9CA3AF] mx-1">/</span>
      
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <div key={crumb.id} className="flex items-center">
            <span className={cn(
              "flex items-center gap-1.5",
              isLast ? "text-[#111827] font-bold" : "text-[#6B7280]"
            )}>
              {getIconComponent(crumb.icon, isLast ? "w-3.5 h-3.5 text-[#111827]" : "w-3.5 h-3.5 text-[#6B7280]")}
              {crumb.title}
            </span>
            {!isLast && <span className="text-[#9CA3AF] mx-2">/</span>}
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
      Placeholder.configure({ placeholder: 'Start typing strategic engineering documentation...' })
    ],
    content: (page.blocks ? page.blocks as Content : ''),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      api.pages.update(page.id, { blocks: json as any });
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc max-w-none focus:outline-none min-h-[450px] text-[#111827] leading-relaxed font-sans',
      },
    },
  });

  // Calculate word count & reading time
  const textContent = editor ? editor.getText() : (page.title || '');
  const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = textContent.length;
  const readTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-8 h-full overflow-y-auto animate-in fade-in duration-150 flex flex-col">
      <Breadcrumbs page={page} pages={pages} />
      
      {/* NEW: Document Intelligence Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E5E8EC]">
        <div className="flex items-center gap-3">
          {getIconComponent(page.icon, "w-8 h-8 text-[#111827]")}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#7C3AED] font-bold block mb-0.5">
              Live Document
            </span>
            <div className="text-xs font-mono text-[#6B7280] flex items-center gap-3">
              <span className="flex items-center gap-1">
                <AlignLeft className="w-3.5 h-3.5 text-[#9CA3AF]" /> {wordCount} words ({charCount} chars)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#0D9488] font-medium">
                <Clock className="w-3.5 h-3.5" /> ~{readTimeMins} min read
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#6B7280] bg-[#F8F9FB] px-2.5 py-1 rounded-lg border border-[#E5E8EC]">
            Auto-saved
          </span>
          <BaseButton onClick={() => alert('Document exported to PDF/Markdown')}>
            Export Doc
          </BaseButton>
        </div>
      </div>

      <input 
        type="text"  
        defaultValue={page.title} 
        className="text-4xl font-bold bg-transparent border-none outline-none text-[#111827] placeholder:text-[#9CA3AF] w-full mb-6 font-sans tracking-tight focus:ring-0"
        placeholder="Document Title..."
      />

      <div className="flex-1 bg-white rounded-xl p-6 border border-[#E5E8EC]/60 shadow-2xs min-h-[500px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function BrainWorkspace() {
  const { data: pages = [], isLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id || null);

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading brain workspace...</div>;

  const rootPages = pages.filter(p => !p.parentPageId);
  const selectedPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="flex flex-col h-full w-full bg-canvas">
      
      {/* NEW: Top Header with 40x40px Purple Brain Category Tile (#7C3AED) */}
      <div className="h-20 border-b border-[#E5E8EC] bg-white px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Brain className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-medium tracking-tight text-[#111827]">Brain Workspace</h1>
              <span className="bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 px-2 py-0.2 rounded text-[10px] font-mono font-medium uppercase tracking-[0.02em] flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-[#7C3AED]" /> {pages.length} docs
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">Strategic engineering documentation, specs, and knowledge base tree.</p>
          </div>
        </div>
        
        <BaseButton onClick={() => alert('New Document')}>
          <Plus className="w-4 h-4 mr-1.5 stroke-[2]" />
          New Document
        </BaseButton>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white">
        {/* Page Tree Column */}
        <div className="w-72 border-r border-[#E5E8EC] bg-[#F8F9FB] flex flex-col h-full shrink-0 select-none">
          <div className="p-3.5 border-b border-[#E5E8EC] flex justify-between items-center h-12 bg-white/50">
            <span className="text-[11px] font-mono font-bold text-[#6B7280] uppercase tracking-wider">Page Tree</span>
            <button 
              onClick={() => alert('Create root document')}
              className="text-[#6B7280] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E5E8EC] transition-all rounded-md p-1"
              title="Add Root Page"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
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
        <div className="flex-1 h-full bg-white relative overflow-hidden">
          {selectedPage ? (
            <Editor key={selectedPage.id} page={selectedPage} pages={pages} />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <EmptyState 
                icon={FileSignature}
                title="No Document Selected"
                description="Select a document from the page tree on the left or create a new one to start writing."
                actionLabel="Create New Page"
                onAction={() => alert('Create page action')}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
