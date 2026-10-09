import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Star, FolderKanban, FolderInput, Copy, History, Sparkles, 
  ChevronDown, FileText, FileCode, CheckSquare, ListTree, Check, Plus, 
  Heading1, Heading2, List, ListOrdered, Code, Quote, Minus, Link2,
  X, ArrowUpRight, MoreHorizontal, Trash2
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { SlashCommandsExtension } from '../../extensions/SlashCommands';
import { WikiLinkExtension } from '../../extensions/WikiLinkExtension';
import { EntityMentionExtension } from '../../extensions/EntityMentionExtension';
import { SelectionToTaskModal } from '../editor/SelectionToTaskModal';
import type { MentionEntityItem } from '../editor/EntityMentionMenu';
import { DocumentOutlinePanel } from '../editor/DocumentOutlinePanel';
import type { DocumentType, DocumentWithRelations } from '../../types/schema';
import { CustomLink } from '../../extensions/CustomLink';
import { cn } from '../../lib/utils';
import { BaseButton } from '../ui/BaseButton';
import { toast } from 'sonner';
import { IconPicker } from '../ui/IconPicker';
import { Breadcrumbs } from './Breadcrumbs';
import { GroundedAIPanel } from './GroundedAIPanel';
import { VersionHistoryModal } from './modals/VersionHistoryModal';
import { AddEntityLinkModal } from './modals/AddEntityLinkModal';
import { TAG_COLORS, getTagColor } from './helpers';
import { api } from '../../api/client';
import { DocumentSaveQueue, acquireDocumentSaveQueue, retainDocumentSaveQueue } from '../../lib/documentSaveQueue';
import { useAuth } from '../../contexts/AuthContext';

export interface EditorProps {
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  projects: any[];
  onSelectDoc: (id: string) => void;
  onMoveDoc?: (doc: DocumentWithRelations) => void;
}

export function Editor(props: EditorProps) {
  const documentQuery = useQuery({
    queryKey: ['document', props.page.id],
    queryFn: () => api.documents.get(props.page.id),
    enabled: !!props.page.id,
  });

  if (documentQuery.isLoading) {
    return <div className="flex-1 grid place-items-center text-secondary" role="status">Loading document...</div>;
  }
  if (!documentQuery.data) {
    return (
      <div className="flex-1 grid place-items-center text-secondary" role="alert">
        <div className="text-center">
          <p>Could not load this document.</p>
          <button type="button" className="mt-2 underline text-accent-fg" onClick={() => void documentQuery.refetch()}>Try again</button>
        </div>
      </div>
    );
  }

  return <LoadedEditor {...props} page={documentQuery.data} />;
}

function LoadedEditor({
  page,
  pages,
  projects,
  onSelectDoc,
  onMoveDoc
}: EditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page.title || '');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isReferencesOpen, setIsReferencesOpen] = useState(true);
  const [taskModalData, setTaskModalData] = useState<{ isOpen: boolean; initialTitle: string }>({
    isOpen: false,
    initialTitle: '',
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const { user, workspaceId } = useAuth();
  const draftKey = `krama:document-draft:v1:${user?.id}:${workspaceId}:${page.id}`;
  const [save] = useState(() => acquireDocumentSaveQueue(draftKey, () => new DocumentSaveQueue(page.id,
    { content: page.contentJson || { type: 'doc', content: [] }, title: page.title || '', revision: page.updatedAt },
    api.documents, draftKey, localStorage,
    () => { void queryClient.invalidateQueries({ queryKey: ['documents'] }); })));
  const saveState = useSyncExternalStore(save.subscribe, save.getSnapshot);

  // Fetch workspace tasks for entity linking and references
  const { data: tasks = [] } = useQuery({
    queryKey: ['issues'],
    queryFn: () => api.tasks.list()
  });

  const mentionEntities = useMemo<MentionEntityItem[]>(() => {
    const docs: MentionEntityItem[] = pages.map(p => ({
      id: p.id,
      title: p.title || 'Untitled Document',
      type: 'DOCUMENT',
      subtitle: p.documentType || 'SPEC',
    }));
    const taskEntities: MentionEntityItem[] = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      type: 'TASK',
      subtitle: t.status,
    }));
    const projEntities: MentionEntityItem[] = projects.map((p: any) => ({
      id: p.id,
      title: p.name,
      type: 'PROJECT',
      subtitle: p.status,
    }));
    return [...docs, ...taskEntities, ...projEntities];
  }, [pages, tasks, projects]);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const mentionEntitiesRef = useRef(mentionEntities);
  mentionEntitiesRef.current = mentionEntities;

  useEffect(() => {
    setTitle(save.title);
    if (save.recovered) {
      toast.info('Recovered your unsaved draft. Review it and choose Retry save.');
    }
  }, [save]);

  // Fetch links for current document
  const { data: linksData, refetch: refetchLinks } = useQuery({
    queryKey: ['document-links', page.id],
    queryFn: () => api.documents.getLinks(page.id),
    enabled: !!page.id
  });

  // Listen for auto-link events from WikiLinks or @Mentions
  useEffect(() => {
    const handleEntityLinked = async (e: any) => {
      const { targetType, targetId } = e.detail || {};
      if (targetType && targetId && page.id) {
        try {
          await api.documents.addLink(page.id, { targetType, targetId, linkType: 'REFERENCE' });
          refetchLinks();
        } catch {
          // Link may already exist
        }
      }
    };
    window.addEventListener('krama:entity-linked', handleEntityLinked);
    return () => window.removeEventListener('krama:entity-linked', handleEntityLinked);
  }, [page.id, refetchLinks]);

  // Click outside to close More Actions menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  const handleToggleFavorite = async () => {
    try {
      await save.updateMetadata({ isFavorite: !page.isFavorite });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(page.isFavorite ? 'Removed from favorites' : 'Marked as favorite');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleDuplicate = async () => {
    try {
      await save.flush();
      const copy = await api.documents.duplicate(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (copy?.id) onSelectDoc(copy.id);
      toast.success(`Duplicated "${page.title}"`);
    } catch (err: any) {
      toast.error('Failed to duplicate document: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    save.setTitle(newTitle);
  };
  const handleTitleBlur = () => { void save.flush().catch(() => {}); };

  const handleLinkProject = async (projectId: string | null) => {
    try {
      await save.updateMetadata({ projectId: projectId || null, linkedProjectId: projectId || null });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(projectId ? 'Document linked to project' : 'Document unlinked from project');
    } catch (err: any) {
      toast.error('Failed to update project link: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleDocumentTypeChange = async (type: DocumentType) => {
    try {
      await save.updateMetadata({ documentType: type });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Document type updated to ${type}`);
    } catch {
      toast.error('Failed to update type');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await save.updateMetadata({ statusBadges: [status] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Lifecycle status set to ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    try {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].name;
      await api.documents.addTag(page.id, newTagInput.trim(), color);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setNewTagInput('');
      setIsAddingTag(false);
      toast.success(`Tag #${newTagInput.trim()} added`);
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.documents.removeTag(page.id, tagId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Tag removed');
    } catch {
      toast.error('Failed to remove tag');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.documents.removeLink(linkId);
      refetchLinks();
      toast.success('Link removed');
    } catch {
      toast.error('Failed to remove link');
    }
  };

  const handleExport = async (format: 'md' | 'spec') => {
    try { await save.flush(); } catch { toast.error('Save your changes before exporting.'); return; }
    const filename = `${page.title || 'document'}.${format === 'spec' ? 'spec.md' : 'md'}`;
    api.documents.export(page.id, format, filename)
      .then(() => toast.success(`Exported as ${format === 'spec' ? 'Architecture Spec' : 'Markdown'}`))
      .catch(() => toast.error('Export failed'));
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Placeholder.configure({ placeholder: 'Type / for commands, @ for entities, or [[ to link specs...' }),
      CustomLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: null,
          target: null,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      SlashCommandsExtension,
      WikiLinkExtension.configure({
        getDocuments: () => pagesRef.current,
      }),
      EntityMentionExtension.configure({
        getEntities: () => mentionEntitiesRef.current,
      }),
    ] as any,
    content: save.content as Content,
    onUpdate: ({ editor }) => { save.setContent(editor.getJSON()); },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[420px] text-primary leading-relaxed font-sans text-body',
      },
      handleClickOn: (_view, _pos, _node, _nodePos, event) => {
        const target = event.target as HTMLElement | null;
        const wikilink = target?.closest('[data-doc-id]');
        if (wikilink) {
          const docId = wikilink.getAttribute('data-doc-id');
          if (docId) {
            event.preventDefault();
            onSelectDoc(docId);
            return true;
          }
        }
        const mention = target?.closest('[data-entity-type]');
        if (mention) {
          const entityType = mention.getAttribute('data-entity-type');
          const entityId = mention.getAttribute('data-entity-id');
          if (entityType === 'DOCUMENT' && entityId) {
            event.preventDefault();
            onSelectDoc(entityId);
            return true;
          }
          if (entityType === 'PROJECT' && entityId) {
            event.preventDefault();
            navigate(`/app/projects/${entityId}`);
            return true;
          }
          if (entityType === 'TASK' && entityId) {
            event.preventDefault();
            navigate('/app/board');
            return true;
          }
        }
        return false;
      },
    },
  });

  // Listen for open task modal requests (e.g. from /task or selection bridge)
  useEffect(() => {
    const handler = (e: any) => {
      let taskTitle = e.detail?.defaultTitle || '';
      if (!taskTitle && editor) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          taskTitle = editor.state.doc.textBetween(from, to, ' ').trim();
        }
      }
      setTaskModalData({ isOpen: true, initialTitle: taskTitle });
    };
    window.addEventListener('krama:open-task-modal', handler);
    return () => window.removeEventListener('krama:open-task-modal', handler);
  }, [editor]);

  // Global shortcut to convert selected text or thought into task
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('krama:open-task-modal'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTaskCreated = (task: any) => {
    if (editor && !editor.isDestroyed) {
      const { from, to } = editor.state.selection;
      const content = [
        {
          type: 'text',
          text: `@Task: ${task.title} `,
          marks: [
            {
              type: 'link',
              attrs: {
                href: '#',
                class: 'mention mention-task',
                'data-entity-type': 'TASK',
                'data-entity-id': task.id,
              },
            },
          ],
        },
      ];
      if (from !== to) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(content).run();
      } else {
        editor.chain().focus().insertContent(content).run();
      }
    }
    refetchLinks();
  };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (save.state !== 'saved') { event.preventDefault(); event.returnValue = ''; }
    };
    const release = retainDocumentSaveQueue(draftKey, save);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); release(); };
  }, [save, draftKey]);

  const reloadSavedDocument = async () => {
    if (!window.confirm('Discard your unsaved draft and load the latest saved document?')) return;
    try {
      await save.whenIdle();
      const fresh = await api.documents.get(page.id);
      await save.replaceFromServer({ content: fresh.contentJson, title: fresh.title || '', revision: fresh.updatedAt });
      setTitle(fresh.title || '');
      editor?.commands.setContent(fresh.contentJson as Content, { emitUpdate: false });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch { toast.error('Could not load the saved document. Your draft is still available.'); }
  };

  // Word count & metrics
  const textContent = editor ? editor.getText() : (page.title || '');
  const words = textContent.trim().split(/\s+/).filter((w: string) => w.length > 0);
  const wordCount = words.length;
  const readTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      <div className="flex-1 min-w-0 overflow-y-auto py-5 px-4 md:px-8 max-w-5xl mx-auto flex flex-col font-sans w-full">
        <div className="flex flex-wrap items-center gap-2 mb-3 text-caption">
          <span role="status" aria-live="polite" className={saveState === 'error' || saveState === 'conflict' ? 'text-danger-fg' : 'text-secondary'}>
            {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'conflict' ? 'Conflict — your changes are unsaved.' : saveState === 'error' ? 'Save failed — your changes are unsaved.' : 'Unsaved changes'}
          </span>
          {(saveState === 'error' || saveState === 'unsaved') && <button className="min-h-11 px-3 text-accent-fg underline" onClick={() => { void save.flush().catch(() => {}); }}>Retry save</button>}
          {saveState === 'conflict' && <><button className="min-h-11 px-3 text-accent-fg underline" onClick={reloadSavedDocument}>Load saved version</button><button className="min-h-11 px-3 text-accent-fg underline" onClick={() => { const blob = new Blob([JSON.stringify({ title, content: editor?.getJSON() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'document-draft.json'; link.click(); URL.revokeObjectURL(url); }}>Download my draft</button></>}
        </div>
        {/* Top Control Bar: Breadcrumbs on Left, Utility Actions on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border">
          <div className="min-w-0 flex-1">
            <Breadcrumbs page={page} pages={pages} onSelect={onSelectDoc} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* Favorite Star Button */}
            <button
              onClick={handleToggleFavorite}
              className={cn("p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0",
                page.isFavorite
                  ? "bg-warning-bg border-warning-border text-warning-fg hover:bg-warning-bg/80"
                  : "border-border bg-surface hover:bg-surface-hover text-muted hover:text-primary"
              )}
              title={page.isFavorite ? "Favorited" : "Star as favorite"}
            >
              <Star className={cn("w-3.5 h-3.5", page.isFavorite && "fill-warning-fg")} />
            </button>

            {/* Project Linker */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-surface text-caption font-mono">
              <FolderKanban className="w-3.5 h-3.5 text-accent-fg shrink-0" />
              <select
                aria-label="Linked project"
                value={page.projectId || page.linkedProjectId || ''}
                onChange={(e) => handleLinkProject(e.target.value || null)}
                className="bg-transparent text-primary text-caption font-medium outline-none cursor-pointer max-w-[110px] truncate pr-1"
                title="Link to project"
              >
                <option value="" className="bg-surface text-secondary">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-primary">{p.name}</option>
                ))}
              </select>
            </div>

            {/* Convert to Task Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('krama:open-task-modal'))}
              className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-success-bg hover:border-success-border hover:text-success-fg text-secondary transition-all cursor-pointer text-caption font-mono font-bold flex items-center gap-1.5 shadow-2xs"
              title="Convert Selection or Idea to Task (Ctrl+Shift+T)"
            >
              <CheckSquare className="w-3.5 h-3.5 text-success-fg" />
              <span className="hidden sm:inline">To Task</span>
            </button>

            {/* Outline Button */}
            <button
              aria-expanded={isOutlineOpen}
              onClick={() => setIsOutlineOpen(!isOutlineOpen)}
              className={cn("px-2.5 py-1 rounded-lg border text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-caption",
                isOutlineOpen
                  ? "bg-surface-hover text-accent-fg border-accent/30"
                  : "border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary"
              )}
              title="Table of Contents Outline"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Outline</span>
            </button>

            {/* AI Assistant Button */}
            <button
              aria-label="AI Assist"
              aria-expanded={isAiOpen}
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-caption",
                isAiOpen
                  ? "bg-accent text-on-accent"
                  : "bg-accent-subtle hover:bg-accent/20 text-accent-fg border border-accent/30"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Assist</span>
            </button>

            {/* More Options Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={cn(
                  "p-1.5 rounded-lg border transition-colors cursor-pointer",
                  isMoreMenuOpen
                    ? "border-accent/40 bg-surface-hover text-primary"
                    : "border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary"
                )}
                aria-label="More actions (Move, Duplicate, History, Export)"
                aria-expanded={isMoreMenuOpen}
                title="More actions (Move, Duplicate, History, Export)"
              >
                <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-xl py-1.5 w-52 z-30 font-mono text-caption animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      void save.flush().then(() => onMoveDoc?.(page)).catch(() => toast.error('Save your changes before moving this document.'));
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-cat-projects" />
                    <span>Move Document...</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleDuplicate();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-accent-fg" />
                    <span>Duplicate Subtree</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsVersionModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-cat-routines" />
                    <span>Version History</span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <div className="px-3 py-1 text-badge text-muted uppercase font-bold tracking-wider">Export</div>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExport('md');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-cat-projects" />
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExport('spec');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-cat-tasks" />
                    <span>Full Spec (.spec.md)</span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={async () => {
                      setIsMoreMenuOpen(false);
                      if (!window.confirm(`Move "${page.title || 'Untitled'}" to Trash?`)) return;
                      try {
                        await save.flush();
                        await api.documents.delete(page.id);
                        queryClient.invalidateQueries({ queryKey: ['documents'] });
                        toast.success(`Moved "${page.title || 'Untitled'}" to Trash`, {
                          action: {
                            label: 'Undo',
                            onClick: async () => {
                              await api.documents.restore(page.id);
                              queryClient.invalidateQueries({ queryKey: ['documents'] });
                              onSelectDoc(page.id);
                            }
                          }
                        });
                        const nextDoc = pages.find(p => p.id !== page.id);
                        onSelectDoc(nextDoc?.id || '');
                      } catch (err: any) {
                        toast.error('Failed to delete document: ' + (err?.message || 'Unknown error'));
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-danger-bg text-danger-fg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Properties & Telemetry Row: Icon, DocType, Non-wrapping Stats Pill, and Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-accent-subtle border border-accent/20 text-accent-fg flex items-center justify-center shrink-0 shadow-2xs hover:bg-accent/20 transition-colors cursor-pointer">
              <IconPicker
                value={page.icon}
                onChange={(newIcon) => {
                  save.updateMetadata({ icon: newIcon })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
                    .catch(() => toast.error('Failed to update icon'));
                }}
                triggerClassName="border-none hover:border-none shadow-none bg-transparent hover:bg-transparent !p-0"
              />
            </div>

            {/* Document Type Picker */}
            <select
              value={page.documentType || 'GENERAL'}
              onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
              className="bg-surface-hover text-secondary hover:text-primary px-2.5 py-1 rounded-lg border border-border text-caption font-mono font-bold outline-none cursor-pointer"
            >
              <option value="GENERAL">GENERAL</option>
              <option value="SPEC">SPEC</option>
              <option value="RFC">RFC</option>
              <option value="MEETING">MEETING</option>
              <option value="IDEA">IDEA</option>
              <option value="NOTE">NOTE</option>
            </select>

            {/* Document Lifecycle Status Badge Picker */}
            <select
              value={page.statusBadges?.[0] || 'DRAFT'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={cn(
                "px-2 py-1 rounded-lg border text-caption font-mono font-bold outline-none cursor-pointer transition-colors",
                (page.statusBadges?.[0] === 'DRAFT' || !page.statusBadges?.[0]) && "bg-warning-bg text-warning-fg border-warning-border",
                page.statusBadges?.[0] === 'IN_REVIEW' && "bg-accent-subtle text-accent-fg border-accent/30",
                page.statusBadges?.[0] === 'ACCEPTED' && "bg-success-bg text-success-fg border-success-border",
                page.statusBadges?.[0] === 'DEPRECATED' && "bg-danger-bg text-danger-fg border-danger-border"
              )}
            >
              <option value="DRAFT" className="bg-surface text-warning-fg">DRAFT</option>
              <option value="IN_REVIEW" className="bg-surface text-accent-fg">IN_REVIEW</option>
              <option value="ACCEPTED" className="bg-surface text-success-fg">ACCEPTED</option>
              <option value="DEPRECATED" className="bg-surface text-danger-fg">DEPRECATED</option>
            </select>

            {/* Simple, clean word count & reading time */}
            <span className="text-muted font-mono text-caption select-none">
              {wordCount} words · {readTimeMins} min read
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {page.tags?.map((item: any) => {
              const tag = item.tag || item;
              const colorClass = getTagColor(tag.color);
              return (
                <span
                  key={tag.id}
                  className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-mono border", colorClass.bg, colorClass.text, colorClass.border)}
                >
                  <span>#{tag.name}</span>
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="hover:opacity-75 focus:outline-none ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {isAddingTag ? (
              <div className="inline-flex items-center gap-1 bg-surface border border-border rounded-md px-2 py-0.5 text-caption font-mono">
                <span>#</span>
                <input
                  autoFocus
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') setIsAddingTag(false);
                  }}
                  placeholder="tag name..."
                  className="bg-transparent border-none outline-none text-primary w-24 text-caption"
                />
                <button onClick={handleAddTag} className="text-accent-fg hover:text-accent">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-mono text-muted hover:text-primary hover:bg-surface-hover border border-dashed border-border"
              >
                <Plus className="w-3 h-3" />
                <span>Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* Writing Canvas Container */}
        <div className="flex-1 v4-card rounded-2xl border border-border shadow-xs bg-surface flex flex-col w-full overflow-hidden min-h-[580px] relative mb-8">
          {/* Command Ribbon */}
          {editor && (
            <div className="bg-surface-hover/80 backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-border">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('heading', { level: 1 }) ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('heading', { level: 2 }) ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('bulletList') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('orderedList') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Ordered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('codeBlock') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('blockquote') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer bg-surface text-primary border border-border hover:bg-surface-hover active:scale-[0.98]"
                  title="Horizontal Rule"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto relative">
            <div>
              <input
                type="text"
                aria-label="Document title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                className="text-3xl md:text-4xl font-extrabold bg-transparent border-none outline-none text-primary placeholder:text-muted w-full mb-6 font-sans tracking-tight focus:ring-0 px-0 leading-tight"
                placeholder="Untitled Document..."
              />
              {editor && <EditorContent editor={editor} className="flex-1 font-sans" />}
            </div>

            {/* Collapsible Document Outline Panel */}
            <DocumentOutlinePanel
              editor={editor}
              isOpen={isOutlineOpen}
              onClose={() => setIsOutlineOpen(false)}
            />
          </div>
        </div>


        {/* 9. BIDIRECTIONAL ENTITY LINKS & BACKLINKS SECTION */}
        {(() => {
          const totalReferences = (linksData?.incoming?.length || 0) + (linksData?.outgoing?.length || 0);
          return (
            <div className="pt-6 border-t border-border font-mono text-caption mb-12">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setIsReferencesOpen(!isReferencesOpen)}
                  className="flex items-center gap-2 font-bold uppercase tracking-wider text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  <Link2 className="w-4 h-4 text-accent-fg stroke-[1.75]" />
                  <span>References & Backlinks</span>
                  <span className="text-badge px-1.5 py-0.5 rounded-full bg-surface-hover border border-border text-muted font-mono font-bold">
                    {totalReferences}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-muted", !isReferencesOpen && "-rotate-90")} />
                </button>
                <BaseButton onClick={() => setIsLinkModalOpen(true)} className="text-caption py-1 px-2.5">
                  + Link Item
                </BaseButton>
              </div>

              {page.linkedProject && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-accent-subtle border border-accent/20 mb-3 text-[12px] font-sans">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-3.5 h-3.5 text-accent-fg shrink-0" />
                    <span className="text-secondary text-caption font-mono">LINKED PROJECT:</span>
                    <span className="font-semibold text-primary">{page.linkedProject.name}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/app/projects/${page.linkedProject?.id}`)}
                    className="text-accent-fg hover:text-accent font-bold flex items-center gap-1 text-caption cursor-pointer"
                  >
                    View Project <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isReferencesOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  {/* Incoming Backlinks */}
                  <div className="p-4 rounded-xl border border-border bg-surface">
                    <span className="text-caption font-bold text-secondary uppercase tracking-wider block mb-2">
                      Incoming Backlinks ({linksData?.incoming?.length || 0})
                    </span>
                    {(!linksData?.incoming || linksData.incoming.length === 0) ? (
                      <span className="text-muted text-[12px] italic">No documents currently reference this page.</span>
                    ) : (
                      <div className="space-y-1.5">
                        {linksData.incoming.map((link: any) => {
                          const sourceDoc = pages.find(p => p.id === link.sourceId);
                          return (
                            <div
                              key={link.id}
                              onClick={() => sourceDoc && onSelectDoc(sourceDoc.id)}
                              className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50 hover:bg-accent-subtle cursor-pointer transition-colors"
                            >
                              <span className="font-sans font-medium text-primary text-[13px] truncate">
                                {sourceDoc?.title || `Doc #${link.sourceId.slice(0, 8)}`}
                              </span>
                              <span className="text-badge font-mono text-accent-fg uppercase bg-accent-subtle px-1.5 py-0.5 rounded font-bold">
                                {link.linkType}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Outgoing References */}
                  <div className="p-4 rounded-xl border border-border bg-surface">
                    <span className="text-caption font-bold text-secondary uppercase tracking-wider block mb-2">
                      Outgoing References ({linksData?.outgoing?.length || 0})
                    </span>
                    {(!linksData?.outgoing || linksData.outgoing.length === 0) ? (
                      <span className="text-muted text-[12px] italic">No outgoing entity links added yet.</span>
                    ) : (
                      <div className="space-y-1.5">
                        {linksData.outgoing.map((link: any) => {
                          let label = `${link.targetType} #${link.targetId.slice(0, 8)}`;
                          let statusBadge = '';
                          if (link.targetType === 'DOCUMENT') {
                            label = pages.find(p => p.id === link.targetId)?.title || label;
                          } else if (link.targetType === 'PROJECT') {
                            label = projects.find(p => p.id === link.targetId)?.name || label;
                          } else if (link.targetType === 'TASK') {
                            const task = tasks.find((t: any) => t.id === link.targetId);
                            label = task ? task.title : label;
                            statusBadge = task?.status || '';
                          }

                          const handleLinkClick = () => {
                            if (link.targetType === 'DOCUMENT') {
                              onSelectDoc(link.targetId);
                            } else if (link.targetType === 'PROJECT') {
                              navigate(`/app/projects/${link.targetId}`);
                            } else if (link.targetType === 'TASK') {
                              navigate('/app/board');
                            }
                          };

                          return (
                            <div
                              key={link.id}
                              onClick={handleLinkClick}
                              className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50 hover:bg-accent-subtle cursor-pointer transition-colors group"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {link.targetType === 'DOCUMENT' && <FileText className="w-3.5 h-3.5 text-cat-tasks shrink-0" />}
                                {link.targetType === 'PROJECT' && <FolderKanban className="w-3.5 h-3.5 text-cat-projects shrink-0" />}
                                {link.targetType === 'TASK' && <CheckSquare className="w-3.5 h-3.5 text-warning-fg shrink-0" />}
                                <span className="font-sans font-medium text-primary text-[13px] truncate group-hover:text-accent-fg">
                                  {label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {statusBadge && (
                                  <span className="text-badge font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-secondary">
                                    {statusBadge}
                                  </span>
                                )}
                                <span className={cn("text-badge font-mono uppercase px-1.5 py-0.5 rounded font-bold",
                                  link.targetType === 'DOCUMENT' && "text-accent-fg bg-accent-subtle",
                                  link.targetType === 'PROJECT' && "text-cat-timeblocks bg-cat-timeblocks-bg",
                                  link.targetType === 'TASK' && "text-warning-fg bg-warning-bg"
                                )}>
                                  {link.targetType}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLink(link.id);
                                  }}
                                  className="p-1 text-muted hover:text-danger-fg transition-colors"
                                  title="Remove reference"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Slide-over AI Assist Panel */}
      <GroundedAIPanel
        documentId={page.id}
        documentTitle={page.title || 'Untitled Document'}
        editor={editor}
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        documentId={page.id}
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        beforeAction={() => save.flush()}
        onRestoreSuccess={async (restoredDoc) => {
          if (restoredDoc?.contentJson && editor && !editor.isDestroyed) {
            await save.replaceFromServer({ content: restoredDoc.contentJson, title: title, revision: restoredDoc.updatedAt });
            editor.commands.setContent(restoredDoc.contentJson as Content, { emitUpdate: false });
          }
          queryClient.invalidateQueries({ queryKey: ['documents'] });
        }}
      />

      {/* Add Entity Link Modal */}
      <AddEntityLinkModal
        documentId={page.id}
        pages={pages}
        projects={projects}
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSuccess={() => refetchLinks()}
      />

      {/* Selection / Checklist to Task Modal */}
      <SelectionToTaskModal
        documentId={page.id}
        isOpen={taskModalData.isOpen}
        initialTitle={taskModalData.initialTitle}
        onClose={() => setTaskModalData({ isOpen: false, initialTitle: '' })}
        onSuccess={handleTaskCreated}
      />
    </div>
  );
}
