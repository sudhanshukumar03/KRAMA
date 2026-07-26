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
import { ErrorState } from './ui/ErrorState';
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

  const handleCreateChildPage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newPage = await api.pages.create({
        title: 'Untitled Child Document',
        spaceId: page.spaceId,
        parentPageId: page.id,
        blocks: []
      });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setExpanded(true);
      if (newPage?.id) onSelect(newPage.id);
      toast.success(`Created sub-page under "${page.title}"`);
    } catch (err) {
      toast.error('Failed to create sub-page');
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
          onClick={handleCreateChildPage}
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
    <div className="flex items-center gap-1.5 text-caption text-[#6B7280] mb-4 font-mono select-none overflow-x-auto py-2 leading-normal">
      <span className="flex items-center gap-1.5 hover:text-[#111827] cursor-pointer transition-colors duration-150 shrink-0">
        <BookOpen className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" /> Knowledge Base
      </span>
      {trail.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-1.5 flex-shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-[#D1D5DB] shrink-0" />
          <span className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors duration-150 leading-none", 
            idx === trail.length - 1 ? "text-[#111827] font-medium bg-[#F8F9FB] border border-[#E5E8EC]" : "hover:text-[#111827] hover:bg-[#F8F9FB] cursor-pointer"
          )}>
            {getIconComponent(p.icon, "w-3.5 h-3.5 text-[#6B7280] shrink-0")}
            <span>{p.title}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Editor({ page, pages }: { page: PageWithRelations, pages: PageWithRelations[] }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page.title || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      api.pages.update(page.id, { title: newTitle }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['pages'] });
      });
    }, 500);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Click or type / for commands, or start typing strategic engineering documentation...' })
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
        class: 'prose prose-zinc max-w-none focus:outline-none min-h-[400px] text-[#111827] leading-relaxed font-sans',
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
          <BaseButton onClick={() => toast.success('Document exported to PDF/Markdown')}>
            Export Doc
          </BaseButton>
        </div>
      </div>

      {/* Editor Card: Single cohesive Notion-style document container (#11) */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E8EC] shadow-2xs flex flex-col max-w-3xl mx-auto w-full overflow-hidden min-h-[580px]">
        {/* Toolbar / Slash Command Helper at the top of the container */}
        <div className="bg-[#F8F9FB] px-4 py-2.5 flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-badge text-[#6B7280] flex items-center gap-1 mr-1 px-1.5 py-1 select-none">
            <Command className="w-3.5 h-3.5 text-[#111827]" /> Quick Insert:
          </span>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('heading', { level: 1 }) ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/h1 Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" /> H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('heading', { level: 2 }) ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/h2 Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" /> H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('bulletList') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/bullet Bullet List"
          >
            <List className="w-3.5 h-3.5" /> Bullet
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('orderedList') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/number Ordered List"
          >
            <ListOrdered className="w-3.5 h-3.5" /> Number
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('codeBlock') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/code Code Block"
          >
            <Code className="w-3.5 h-3.5" /> Code
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
              editor.isActive('blockquote') ? "bg-[#111827] text-white shadow-2xs" : "bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            )}
            title="/quote Callout"
          >
            <Quote className="w-3.5 h-3.5" /> Quote
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer bg-white text-[#111827] border border-[#E5E8EC] hover:bg-[#E5E8EC]/40"
            title="/divider Horizontal Rule"
          >
            <Minus className="w-3.5 h-3.5" /> Divider
          </button>
        </div>

        {/* Subtle Divider separating toolbar from editable area */}
        <div className="h-px bg-[#E5E8EC] w-full shrink-0" />

        {/* EditorContent (flex-grow) beginning immediately below the divider */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <input 
              type="text"  
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-[32px] sm:text-[40px] font-extrabold bg-transparent border-none outline-none text-[#111827] placeholder:text-[#9CA3AF] w-full mb-6 font-sans tracking-tight focus:ring-0 px-0 leading-tight"
              placeholder="Untitled Document..."
            />
            <EditorContent editor={editor} className="flex-1" />
          </div>

          {/* Transitive References & Backlinks Panel (#2 Chrome Reduction: Hairline rows instead of boxed cards) */}
          {page.linkedProject && (
            <div className="mt-12 pt-6 border-t border-[#E5E8EC] font-mono text-xs">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[#6B7280] mb-3">
                <Link2 className="w-4 h-4 text-[#7C3AED]" /> Transitive References & Backlinks
              </div>
              <div className="divide-y divide-[#E5E8EC]/60 -mx-2 px-2">
                <div 
                  onClick={() => window.location.href = `/app/projects/${page.linkedProject?.id}`}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FB] rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderKanban className="w-4 h-4 text-[#4F46E5] shrink-0" />
                    <span className="font-sans text-sm font-medium text-[#111827] group-hover:text-[#4F46E5] truncate">{page.linkedProject.name}</span>
                    <span className="text-[10px] text-[#9CA3AF] uppercase font-mono tracking-wider">({page.linkedProject.status})</span>
                  </div>
                  <span className="text-[11px] text-[#4F46E5] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">view initiative &rarr;</span>
                </div>

                {page.linkedProject.goal && (
                  <div 
                    onClick={() => window.location.href = '/app/goals'}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FB] rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Target className="w-4 h-4 text-[#0D9488] shrink-0" />
                      <span className="font-sans text-sm font-medium text-[#111827] group-hover:text-[#0D9488] truncate">{page.linkedProject.goal.title}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#0D9488] shrink-0">{page.linkedProject.goal.progress}% Completed</span>
                  </div>
                )}

                {page.linkedProject.issues && (
                  <div 
                    onClick={() => window.location.href = `/app/projects/${page.linkedProject?.id}`}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FB] rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <span className="font-sans text-sm font-medium text-[#111827] group-hover:text-[#2563EB]">Execution Tickets & Sprints</span>
                    </div>
                    <span className="text-[11px] text-[#6B7280] font-mono shrink-0">
                      {page.linkedProject.issues.filter((i: any) => i.status === 'done' || i.status === 'released').length} / {page.linkedProject.issues.length} Done • {page.linkedProject.sprints?.length || 0} Sprints
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BrainWorkspace() {
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading, isError } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: api.spaces.list });
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id || null);

  const handleCreateRootPage = async () => {
    try {
      const defaultSpaceId = pages[0]?.spaceId || spaces[0]?.id;
      if (!defaultSpaceId) {
        toast.error('No space found. Please create a space first!');
        return;
      }
      const newPage = await api.pages.create({
        title: 'Untitled Document',
        spaceId: defaultSpaceId,
        parentPageId: null,
        blocks: []
      });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      if (newPage?.id) setSelectedPageId(newPage.id);
      toast.success('Created new document');
    } catch (err) {
      toast.error('Failed to create document');
    }
  };

  if (isLoading) return <LoadingState variant="brain" title="Loading Knowledge Base..." description="Compiling technical specs and documentation trees..." />;
  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Knowledge Base"
          message="Could not retrieve documents from the server. Please check your network or server connection."
        />
      </div>
    );
  }

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
        
        <BaseButton onClick={handleCreateRootPage}>
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
              onClick={handleCreateRootPage}
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
                onAction={handleCreateRootPage}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
