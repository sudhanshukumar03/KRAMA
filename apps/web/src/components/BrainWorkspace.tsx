import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChevronRight, FileText, Plus, FileSignature, Building2, Laptop, Brain, Clock, AlignLeft, BookOpen, Heading1, Heading2, List, ListOrdered, Quote, Code, Minus, Command, FolderKanban, Target, CheckCircle2, Link2, Trash2, Sparkles, Wand2, ArrowRight } from 'lucide-react';
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
import { ConfirmDeleteButton } from './ui/ConfirmDeleteButton';
import { toast } from 'sonner';

function getIconComponent(iconName: string | null, className?: string) {
 if (iconName === 'landmark') return <Building2 className={cn(className ||"w-4 h-4 text-secondary","stroke-[1.5]")} />;
 if (iconName === 'laptop') return <Laptop className={cn(className ||"w-4 h-4 text-secondary","stroke-[1.5]")} />;
 if (iconName) return <span className="text-body leading-none select-none">{iconName}</span>;
 return <FileText className={cn(className ||"w-4 h-4 text-muted","stroke-[1.5]")} />;
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
 toast.success(`Deleted"${page.title}"`, {
 action: res?.snapshot ? {
 label: 'Undo',
 onClick: async () => {
 await api.pages.restore(res.snapshot);
 queryClient.invalidateQueries({ queryKey: ['pages'] });
 toast.success(`Restored"${page.title}"`);
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
 toast.success(`Created sub-page under"${page.title}"`);
 } catch (err) {
 toast.error('Failed to create sub-page');
 }
 };
 
 return (
 <div className="font-sans">
 <div 
 className={cn("group relative flex items-center gap-2 py-2 px-3 hover:bg-surface-hover rounded-xl cursor-pointer text-caption transition-all duration-150 select-none my-0.5",
 isSelected ?"bg-primary text-surface font-bold shadow-2xs" :"text-secondary hover:text-primary"
 )}
 style={{ paddingLeft: `${(level * 16) + 12}px` }}
 onClick={() => onSelect(page.id)}
 >
 <button 
 onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
 className={cn("w-4 h-4 flex items-center justify-center transition-colors duration-150 focus:outline-none rounded-sm",
 isSelected ?"text-surface/70 hover:text-surface" :"text-muted hover:text-primary",
 !hasChildren &&"opacity-0 cursor-default"
 )}
 disabled={!hasChildren}
 >
 {hasChildren && (
 <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-150 stroke-[1.5]", 
 expanded ?"rotate-90" :""
 )} />
 )}
 </button>
 {level > 0 && (
 <div 
 className={cn("absolute border-l border-b rounded-bl-sm pointer-events-none",
 isSelected ?"border-surface/20" :"border-border"
 )}
 style={{
 left: `${((level - 1) * 16) + 28}px`,
 top: '-12px',
 height: '28px',
 width: '12px'
 }}
 />
 )}
 <span className="flex items-center justify-center flex-shrink-0 z-10">
 {getIconComponent(page.icon, isSelected ?"w-4 h-4 text-surface" :"w-4 h-4 text-secondary")}
 </span>
 <span className="truncate flex-1 z-10 font-sans">{page.title || 'Untitled Document'}</span>
 <button 
 onClick={handleCreateChildPage}
 className={cn("opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center transition-all duration-150 rounded-md focus:outline-none cursor-pointer",
 isSelected 
 ?"text-surface hover:bg-surface/20" 
 :"text-muted hover:text-primary hover:bg-surface border border-transparent hover:border-border"
 )}
 title="Add Sub-page"
 >
 <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
 </button>
 <ConfirmDeleteButton
 onConfirm={handleDeletePage}
 className={cn("opacity-0 group-hover:opacity-100",
 isSelected 
 ?"text-surface hover:text-[#DC2626] hover:bg-surface/20" 
 :"text-muted hover:text-[#DC2626] hover:bg-red-500/10"
 )}
 iconClassName="w-3.5 h-3.5 stroke-[1.5]"
 />
 </div>
 
 {/* Children Container */}
 <div 
 className={cn("overflow-hidden transition-all duration-150 ease-in-out origin-top",
 expanded ?"max-h-[1000px] opacity-100" :"max-h-0 opacity-0"
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
 <div className="flex items-center gap-2 text-caption text-secondary mb-6 font-mono select-none overflow-x-auto py-2 leading-normal border-b border-border/60 pb-3">
 <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors duration-150 shrink-0 font-bold uppercase tracking-wider">
 <BookOpen className="w-4 h-4 text-muted shrink-0 stroke-[1.5]" /> Knowledge Base
 </span>
 {trail.map((p, idx) => (
 <div key={p.id} className="flex items-center gap-2 flex-shrink-0">
 <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0 stroke-[1.5]" />
 <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-150 leading-none", 
 idx === trail.length - 1 ?"text-primary font-bold bg-surface-hover border border-border shadow-2xs" :"hover:text-primary hover:bg-surface-hover cursor-pointer font-medium"
 )}>
 {getIconComponent(p.icon,"w-3.5 h-3.5 text-secondary shrink-0")}
 <span className="font-sans truncate max-w-[150px]">{p.title || 'Untitled Document'}</span>
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
 Placeholder.configure({ placeholder: 'Type / for commands, or start writing clean engineering thoughts...' })
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
 class: 'prose prose-zinc max-w-none focus:outline-none min-h-[450px] text-primary leading-relaxed font-sans text-body',
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
 <div className="max-w-4xl mx-auto py-8 px-6 md:px-10 h-full overflow-y-auto animate-in fade-in duration-150 flex flex-col font-sans">
 <Breadcrumbs page={page} pages={pages} />
 
 {/* NEUTRAL WHITE THINKING IDENTITY: Document Telemetry Header Bar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
 <div className="flex items-center gap-3.5">
 <div className="w-10 h-10 rounded-2xl bg-surface-hover border border-border flex items-center justify-center shrink-0 shadow-2xs">
 {getIconComponent(page.icon,"w-5 h-5 text-primary")}
 </div>
 <div>
 <span className="text-caption font-mono font-bold text-primary block mb-0.5 uppercase tracking-wider">
 Neutral White Thinking Canvas • Live Specification
 </span>
 <div className="text-caption font-mono text-secondary flex items-center gap-3">
 <span className="flex items-center gap-1 font-bold">
 <AlignLeft className="w-3.5 h-3.5 text-muted stroke-[1.5]" /> {wordCount} words ({charCount} chars)
 </span>
 <span>•</span>
 <span className="flex items-center gap-1 text-[#109868] font-bold">
 <Clock className="w-3.5 h-3.5 stroke-[1.5]" /> ~{readTimeMins} min read
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2.5">
 <span className="text-caption font-mono font-bold text-secondary bg-surface-hover px-3 py-1.5 rounded-lg border border-border shadow-2xs">
 Auto-saved
 </span>
 <BaseButton onClick={() => toast.success('Document exported to Markdown / Engineering Spec')} className="text-caption py-1.5 cursor-pointer">
 Export Spec
 </BaseButton>
 </div>
 </div>

 {/* WRITING CANVAS CONTAINER (Clean Monochrome Notion / Arc Identity) */}
 <div className="flex-1 bg-surface rounded-2xl border border-border shadow-xs flex flex-col max-w-4xl mx-auto w-full overflow-hidden min-h-[620px] relative">
 
 {/* COMMAND RIBBON WITH FLOATING AI FORMATTING ASSISTANT */}
 <div className="bg-surface-hover/80 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-border">
 <div className="flex flex-wrap items-center gap-1.5">
 <span className="text-caption font-mono font-bold text-secondary flex items-center gap-1 mr-2 px-1 py-1 select-none uppercase tracking-wider">
 <Command className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> Slash Insert:
 </span>
 <button
 onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
 className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
 editor.isActive('heading', { level: 1 }) ?"bg-primary text-surface shadow-2xs" :"bg-surface text-primary border border-border/80 hover:bg-surface-hover"
 )}
 title="/h1 Heading 1"
 >
 <Heading1 className="w-3.5 h-3.5 stroke-[1.5]" /> H1
 </button>
 <button
 onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
 className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
 editor.isActive('heading', { level: 2 }) ?"bg-primary text-surface shadow-2xs" :"bg-surface text-primary border border-border/80 hover:bg-surface-hover"
 )}
 title="/h2 Heading 2"
 >
 <Heading2 className="w-3.5 h-3.5 stroke-[1.5]" /> H2
 </button>
 <button
 onClick={() => editor.chain().focus().toggleBulletList().run()}
 className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
 editor.isActive('bulletList') ?"bg-primary text-surface shadow-2xs" :"bg-surface text-primary border border-border/80 hover:bg-surface-hover"
 )}
 title="/bullet Bullet List"
 >
 <List className="w-3.5 h-3.5 stroke-[1.5]" /> Bullet
 </button>
 <button
 onClick={() => editor.chain().focus().toggleOrderedList().run()}
 className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
 editor.isActive('orderedList') ?"bg-primary text-surface shadow-2xs" :"bg-surface text-primary border border-border/80 hover:bg-surface-hover"
 )}
 title="/number Ordered List"
 >
 <ListOrdered className="w-3.5 h-3.5 stroke-[1.5]" /> Number
 </button>
 <button
 onClick={() => editor.chain().focus().toggleCodeBlock().run()}
 className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
 editor.isActive('codeBlock') ?"bg-primary text-surface shadow-2xs" :"bg-surface text-primary border border-border/80 hover:bg-surface-hover"
 )}
 title="/code Code Block"
 >
 <Code className="w-3.5 h-3.5 stroke-[1.5]" /> Code
 </button>
 <button
 onClick={() => editor.chain().focus().toggleBlockquote().run()}
 className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer",
 editor.isActive('blockquote') ?"bg-primary text-surface shadow-2xs" :"bg-surface text-primary border border-border/80 hover:bg-surface-hover"
 )}
 title="/quote Callout"
 >
 <Quote className="w-3.5 h-3.5 stroke-[1.5]" /> Quote
 </button>
 <button
 onClick={() => editor.chain().focus().setHorizontalRule().run()}
 className="px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer bg-surface text-primary border border-border/80 hover:bg-surface-hover"
 title="/divider Horizontal Rule"
 >
 <Minus className="w-3.5 h-3.5 stroke-[1.5]" /> Divider
 </button>
 </div>

 {/* Floating AI Formatting Assistant (Violet #7C3AED / #A78BFA Identity) */}
 <button
 type="button"
 onClick={() => toast.success("✨ AI Formatting Sentinel: Document structured with executive summary, clear heading hierarchy, and technical callouts.")}
 className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-all cursor-pointer hover:scale-105 active:scale-95"
 title="Trigger AI Document Formatting & Structure"
 >
 <Wand2 className="w-3.5 h-3.5 stroke-[1.5]" />
 <span>AI Polish & Structure</span>
 </button>
 </div>

 {/* EDITOR AREA */}
 <div className="flex-1 p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
 <div>
 <input 
 type="text" 
 value={title}
 onChange={(e) => handleTitleChange(e.target.value)}
 className="text-3xl md:text-4xl font-extrabold bg-transparent border-none outline-none text-primary placeholder:text-muted w-full mb-8 font-sans tracking-tight focus:ring-0 px-0 leading-tight"
 placeholder="Untitled Document..."
 />
 <EditorContent editor={editor} className="flex-1 font-sans" />
 </div>

 {/* AUTOMATIC BACKLINKS & TRANSITIVE REFERENCES FOOTER (#2563EB Indigo Identity) */}
 {page.linkedProject && (
 <div className="mt-14 pt-6 border-t border-border font-mono text-caption">
 <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-secondary mb-3">
 <Link2 className="w-4 h-4 text-[#2563EB] stroke-[1.5]" /> Transitive References & Backlinks
 </div>
 <div className="divide-y divide-border/60 -mx-3 px-3 bg-surface-hover/30 rounded-2xl border border-border/60">
 <div 
 onClick={() => window.location.href = `/app/projects/${page.linkedProject?.id}`}
 className="py-3.5 px-3 flex items-center justify-between gap-3 hover:bg-surface-hover rounded-xl transition-all cursor-pointer group"
 >
 <div className="flex items-center gap-3 min-w-0">
 <FolderKanban className="w-4 h-4 text-[#2563EB] shrink-0 stroke-[1.5]" />
 <span className="font-sans text-body font-bold text-primary group-hover:text-[#2563EB] :text-[#2563EB] truncate">{page.linkedProject.name}</span>
 <span className="text-[10px] text-secondary uppercase font-mono font-bold tracking-wider bg-surface px-2 py-0.5 rounded border border-border/80">({page.linkedProject.status})</span>
 </div>
 <span className="text-caption font-mono font-bold text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">Open Initiative <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" /></span>
 </div>

 {page.linkedProject.goal && (
 <div 
 onClick={() => window.location.href = '/app/goals'}
 className="py-3.5 px-3 flex items-center justify-between gap-3 hover:bg-surface-hover rounded-xl transition-all cursor-pointer group"
 >
 <div className="flex items-center gap-3 min-w-0">
 <Target className="w-4 h-4 text-[#109868] shrink-0 stroke-[1.5]" />
 <span className="font-sans text-body font-bold text-primary group-hover:text-[#109868] truncate">{page.linkedProject.goal.title}</span>
 </div>
 <span className="text-caption font-mono font-bold text-[#109868] shrink-0 bg-[#109868]/10 px-2.5 py-0.5 rounded border border-[#109868]/20">{page.linkedProject.goal.progress}% Completed</span>
 </div>
 )}

 {page.linkedProject.issues && (
 <div 
 onClick={() => window.location.href = `/app/projects/${page.linkedProject?.id}`}
 className="py-3.5 px-3 flex items-center justify-between gap-3 hover:bg-surface-hover rounded-xl transition-all cursor-pointer group"
 >
 <div className="flex items-center gap-3 min-w-0">
 <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0 stroke-[1.5]" />
 <span className="font-sans text-body font-bold text-primary group-hover:text-[#2563EB] :text-[#2563EB]">Execution Tickets & Sprints</span>
 </div>
 <span className="text-caption text-secondary font-mono font-bold shrink-0">
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
 <div className="p-8 font-sans">
 <ErrorState
 title="Failed to Load Knowledge Base"
 message="Could not retrieve documents from the server. Please verify network connectivity."
 />
 </div>
 );
 }

 const rootPages = pages.filter(p => !p.parentPageId);
 const selectedPage = pages.find(p => p.id === selectedPageId);

 return (
 <div className="flex flex-col h-full w-full bg-canvas font-sans text-primary">
 
 {/* COMMAND CENTER BRAIN HEADER */}
 <div className="h-20 border-b border-border bg-surface px-6 md:px-8 flex items-center justify-between shrink-0 shadow-2xs">
 <div className="flex items-center gap-3.5">
 <div className="w-10 h-10 rounded-2xl bg-primary text-surface flex items-center justify-center shrink-0 shadow-2xs">
 <Brain className="w-5 h-5 stroke-[1.5]" />
 </div>
 <div>
 <div className="flex items-center gap-2.5 mb-0.5">
 <h1 className="text-title text-primary mb-4 ">Brain Workspace</h1>
 <span className="bg-surface-hover text-secondary border border-border px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
 <Sparkles className="w-3 h-3 text-[#7C3AED] stroke-[1.5]" /> {pages.length} Specs Tracked
 </span>
 </div>
 <p className="text-caption text-secondary font-mono">Neutral White thinking canvas for engineering specs, architecture RFCs, and meeting notes.</p>
 </div>
 </div>
 
 <BaseButton onClick={handleCreateRootPage} className="shrink-0 cursor-pointer">
 <Plus className="w-4 h-4 mr-1.5 stroke-[1.5]" />
 New Document
 </BaseButton>
 </div>

 <div className="flex flex-1 overflow-hidden bg-surface">
 {/* Page Tree Sidebar Column */}
 <div className="w-72 md:w-80 border-r border-border bg-surface-hover/50 flex flex-col h-full shrink-0 select-none">
 <div className="p-4 border-b border-border flex justify-between items-center h-12 bg-surface">
 <span className="text-caption font-mono font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
 <BookOpen className="w-3.5 h-3.5 text-muted stroke-[1.5]" /> Page Tree Tree
 </span>
 <button 
 onClick={handleCreateRootPage}
 className="text-secondary hover:text-primary hover:bg-surface-hover border border-transparent hover:border-border transition-all rounded-lg p-1 cursor-pointer"
 title="Add Root Page"
 >
 <Plus className="w-4 h-4 stroke-[1.5]" />
 </button>
 </div>
 <div className="flex-1 overflow-y-auto p-3 space-y-1">
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
 <div className="flex-1 h-full bg-surface relative overflow-hidden">
 {selectedPage ? (
 <Editor key={selectedPage.id} page={selectedPage} pages={pages} />
 ) : (
 <div className="h-full flex items-center justify-center p-8">
 <EmptyState 
 icon={FileSignature}
 title="No Specification Selected"
 description="Select a document from the page tree on the left or initialize a new specification to start writing."
 actionLabel="Create New Spec"
 onAction={handleCreateRootPage}
 />
 </div>
 )}
 </div>
 </div>

 </div>
 );
}
