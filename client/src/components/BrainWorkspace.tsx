import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChevronRight, FileText, Plus, FileSignature, Building2, Laptop, Brain, Clock, AlignLeft, BookOpen, Heading1, Heading2, List, ListOrdered, Quote, Code, Minus, Command, FolderKanban, Target, CheckCircle2, Link2, Trash2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { PageWithRelations } from '../types/schema';
import { cn } from '../lib/utils';
import { EmptyState } from './ui/EmptyState';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { toast } from 'sonner';

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
  const [expanded, setExpanded] = useState(level === 0);
  const queryClient = useQueryClient();
  const children = pages.filter(p => p.parentPageId === page.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === page.id;

  const handleDeletePage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.pages.delete(page.id);
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      if (isSelected) onSelect(pages.find(p => p.id !== page.id)?.id || '');
      toast.success(`Deleted "${page.title}"`, {
        action: res?.snapshot ? {
          label: 'Undo',
          onClick: async () => {
            await api.pages.restore(res.snapshot);
            queryClient.invalidateQueries({ queryKey: ['pages'] });
            toast.success(`Restored "${page.title}"`);
          }
        } : undefined
      });
    } catch (err) {
      toast.error('Failed to delete page');
    }
  };
  
  return (
    <div>
      <div 
        className={cn(
          "group relative flex items-center gap-2 py-1.5 px-2.5 hover:bg-[#F8F9FB] rounded-lg cursor-pointer text-xs transition-all duration-150 select-none",
          isSelected ? "bg-[#111827] text-white font-medium shadow-2xs" : "text-[#6B7280] hover:text-[#111827]"
        )}
        style={{ paddingLeft: `${(level * 14) + 10}px` }}
        onClick={() => onSelect(page.id)}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={cn(
            "w-4 h-4 flex items-center justify-center transition-colors duration-150 focus:outline-none rounded-sm",
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
            "opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center transition-all duration-150 rounded-md focus:outline-none",
            isSelected 
              ? "text-white hover:bg-white/20" 
              : "text-[#9CA3AF] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E5E8EC]"
          )}
          title="Add Sub-page"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleDeletePage}
          className={cn(
            "opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center transition-all duration-150 rounded-md focus:outline-none",
            isSelected 
              ? "text-white hover:bg-white/20" 
              : "text-[#9CA3AF] hover:text-[#DC2626] hover:bg-red-50"
          )}
          title="Delete Page"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Children Container */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-150 ease-in-out origin-top",
          expanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children.map(child => (
          <PageTreeNode 
            key={child.id} 
            page={child} 
            pages={pages} 
            level={level + 1} 
            onSelect={onSelect} 
            selectedId={selectedId} 
          />
        ))}
      </div>
    </div>
  );
}

function Breadcrumbs({ page, pages }: { page: PageWithRelations, pages: PageWithRelations[] }) {
  const trail: PageWithRelations[] = [];
  let curr: PageWithRelations | undefined = page;
  while (curr) {
    trail.unshift(curr);
    curr = pages.find(p => p.id === curr?.parentPageId);
  }

  return (
    <div className="flex items-center gap-1.5 text-caption text-[#6B7280] mb-6 font-mono select-none overflow-x-auto pb-1">
      <span className="flex items-center gap-1.5 hover:text-[#111827] cursor-pointer transition-colors duration-150">
        <BookOpen className="w-3.5 h-3.5 text-[#9CA3AF]" /> Knowledge Base
      </span>
      {trail.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-1.5 flex-shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-[#D1D5DB]" />
          <span className={cn(
            "flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-colors duration-150", 
            idx === trail.length - 1 ? "text-[#111827] font-medium bg-[#F8F9FB] border border-[#E5E8EC]" : "hover:text-[#111827] hover:bg-[#F8F9FB] cursor-pointer"
          )}>
            {getIconComponent(p.icon, "w-3.5 h-3.5 text-[#6B7280]")}
            {p.title}
          </span>
        </div>
      ))}
    </div>
  );
}

function Editor({ page, pages }: { page: PageWithRelations, pages: PageWithRelations[] }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Type / for slash commands or start typing strategic engineering documentation...' })
    ],
    content: (page.blocks ? page.blocks as Content : ''),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        api.pages.update(page.id, { blocks: json as any });
      }, 500);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc max-w-none focus:outline-none min-h-[480px] text-[#111827] leading-relaxed font-sans',
      },
    },
  });

  // Calculate word count & reading time
  const textContent = editor ? editor.getText() : (page.title || '');
  const words = textContent.trim().split(/\s+/).filter((w: string) => w.length > 0);
  const wordCount = words.length;
  const charCount = textContent.length;
  const readTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  if (!editor) return null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-8 h-full overflow-y-auto animate-in fade-in duration-150 flex flex-col">
      <Breadcrumbs page={page} pages={pages} />
      
      {/* Document Intelligence Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E5E8EC]">
        <div className="flex items-center gap-3">
          {getIconComponent(page.icon, "w-8 h-8 text-[#111827]")}
          <div>
            <span className="text-badge text-[#111827] block mb-0.5">
              Live Document • Notion Measure
            </span>
            <div className="text-caption font-mono text-[#6B7280] flex items-center gap-3">
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
        <div className="flex items-center gap-2.5">
          <span className="text-badge text-[#6B7280] bg-[#F8F9FB] px-2.5 py-1 rounded border border-[#E5E8EC]">
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
        className="text-title font-bold bg-transparent border-none outline-none text-[#111827] placeholder:text-[#9CA3AF] w-full mb-6 font-sans tracking-tight focus:ring-0"
        placeholder="Document Title..."
      />

      {/* NEW: Polished Slash Command / Quick Insert Menu (#11) */}
      <div className="bg-[#F8F9FB] border border-[#E5E8EC] rounded-xl p-2 mb-6 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-badge text-[#6B7280] flex items-center gap-1 mr-1 px-1.5 py-1 select-none">
            <Command className="w-3.5 h-3.5 text-[#111827]" /> Slash Commands:
          </span>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('heading', { level: 1 }) ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/h1 Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" /> H1 <span className="text-badge opacity-60">/h1</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('heading', { level: 2 }) ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/h2 Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" /> H2 <span className="text-badge opacity-60">/h2</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('bulletList') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/bullet Bullet List"
          >
            <List className="w-3.5 h-3.5" /> Bullet <span className="text-badge opacity-60">/bullet</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('orderedList') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/number Ordered List"
          >
            <ListOrdered className="w-3.5 h-3.5" /> Number <span className="text-badge opacity-60">/number</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('codeBlock') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/code Code Block"
          >
            <Code className="w-3.5 h-3.5" /> Code <span className="text-badge opacity-60">/code</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('blockquote') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/quote Callout"
          >
            <Quote className="w-3.5 h-3.5" /> Quote <span className="text-badge opacity-60">/quote</span>
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            title="/divider Horizontal Rule"
          >
            <Minus className="w-3.5 h-3.5" /> Divider <span className="text-badge opacity-60">/div</span>
          </button>
        </div>
        <div className="text-caption text-[#9CA3AF] hidden sm:block pr-1 select-none font-mono">
          Click or type /
        </div>
      </div>

      {/* Editor Content Box with #11 Block Hover and Spacing */}
      <div className="flex-1 bg-white rounded-xl p-8 border border-[#E5E8EC] shadow-2xs min-h-[540px] flex flex-col justify-between">
        <EditorContent editor={editor} />

        {/* Transitive References & Backlinks Panel */}
        {page.linkedProject && (
          <div className="mt-12 pt-6 border-t border-[#E5E8EC] font-mono text-xs">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[#6B7280] mb-3">
              <Link2 className="w-4 h-4 text-[#7C3AED]" /> Transitive References & Backlinks
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => window.location.href = `/app/projects/${page.linkedProject?.id}`}
                className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E8EC] hover:border-[#4F46E5] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 text-[#4F46E5] font-medium mb-1">
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" /> Linked Initiative
                </div>
                <div className="font-sans text-sm font-semibold text-[#111827] group-hover:text-[#4F46E5] truncate">
                  {page.linkedProject.name}
                </div>
                <div className="text-[10px] text-[#9CA3AF] mt-0.5 uppercase tracking-wider">
                  Status: {page.linkedProject.status}
                </div>
              </div>

              {page.linkedProject.goal && (
                <div 
                  onClick={() => window.location.href = '/app/goals'}
                  className="p-3 bg-[#0D9488]/5 rounded-lg border border-[#0D9488]/20 hover:border-[#0D9488] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-[#0D9488] font-medium mb-1">
                    <Target className="w-3.5 h-3.5 shrink-0" /> Parent OKR Goal
                  </div>
                  <div className="font-sans text-sm font-semibold text-[#111827] group-hover:text-[#0D9488] truncate">
                    {page.linkedProject.goal.title}
                  </div>
                  <div className="text-[10px] text-[#0D9488] mt-0.5 font-bold">
                    {page.linkedProject.goal.progress}% Completed
                  </div>
                </div>
              )}

              {page.linkedProject.issues && (
                <div 
                  onClick={() => window.location.href = `/app/projects/${page.linkedProject?.id}`}
                  className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E8EC] hover:border-[#2563EB] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-[#2563EB] font-medium mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Execution Tickets
                  </div>
                  <div className="font-sans text-sm font-semibold text-[#111827] group-hover:text-[#2563EB]">
                    {page.linkedProject.issues.filter((i: any) => i.status === 'done' || i.status === 'released').length} / {page.linkedProject.issues.length} Issues Done
                  </div>
                  <div className="text-[10px] text-[#6B7280] mt-0.5">
                    {page.linkedProject.sprints?.length || 0} Linked Sprints
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BrainWorkspace() {
  const { data: pages = [], isLoading } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id || null);

  if (isLoading) return <LoadingState title="Loading Knowledge Base..." description="Compiling technical specs and documentation trees..." />;

  const rootPages = pages.filter(p => !p.parentPageId);
  const selectedPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="flex flex-col h-full w-full bg-canvas">
      
      {/* Top Header with #6 Icon Sizing: 36x36px container (w-9 h-9) and monochrome badge */}
      <div className="h-20 border-b border-[#E5E8EC] bg-white px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-[#F8F9FB] border border-[#E5E8EC] text-[#111827] flex items-center justify-center shrink-0 shadow-2xs">
            <Brain className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-section-title tracking-tight text-[#111827]">Brain Workspace</h1>
              <span className="bg-[#F8F9FB] text-[#6B7280] border border-[#E5E8EC] px-2 py-0.5 rounded text-badge flex items-center gap-1">
                {pages.length} docs
              </span>
            </div>
            <p className="text-caption text-[#6B7280]">Strategic engineering documentation, specs, and knowledge base tree.</p>
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
