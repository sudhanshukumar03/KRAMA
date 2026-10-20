import { DocumentReferences } from './DocumentReferences';
import { isDescendantOf } from './helpers';
import { EditorFormattingToolbar } from './EditorFormattingToolbar';
import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';
import { hasOpenModal } from '../../lib/keyboardShortcuts';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Star, FolderKanban, FolderInput, Copy, History, Bot,
  FileText, FileCode, CheckSquare, ListTree, Check, Plus,
  X, MoreHorizontal, Trash2, ChevronDown
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
import type { DocumentType, DocumentWithRelations, ProjectWithRelations, IssueWithRelations } from '../../types/schema';
import { CustomLink } from '../../extensions/CustomLink';
import { cn, errorMessage } from '../../lib/utils';
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

const LIFECYCLE_STATUSES = new Set(['DRAFT', 'IN_REVIEW', 'ACCEPTED', 'DEPRECATED']);

export interface EditorProps {
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  projects: ProjectWithRelations[];
  projectsAvailable?: boolean;
  onSelectDoc: (id: string) => void;
  onMoveDoc?: (doc: DocumentWithRelations) => void;
}

/**
 * Coordinate document loading, editing and recovery through DocumentSaveQueue.
 * Body and metadata edits share its revision token instead of independent saves.
 */
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
  projectsAvailable = true,
  onSelectDoc,
  onMoveDoc
}: EditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lifecycleStatus = page.statusBadges?.find(status => LIFECYCLE_STATUSES.has(status)) || 'DRAFT';
  const [title, setTitle] = useState(page.title || '');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
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
    {
      update: async (id, metadata) => {
        const saved = await api.documents.update(id, metadata);
        queryClient.setQueryData<DocumentWithRelations>(['document', id], cached => cached ? { ...cached, ...saved } : saved);
        return saved;
      },
      updateContent: async (id, content, revision) => {
        const saved = await api.documents.updateContent(id, content, revision);
        // Publish only the acknowledged body; newer edits remain in the queue.
        // A remounted editor must not start from an old cached draft.
        queryClient.setQueryData<DocumentWithRelations>(['document', id], cached => cached ? {
          ...cached, ...saved, contentJson: content as DocumentWithRelations['contentJson'],
        } : cached);
        return saved;
      },
    }, draftKey, localStorage,
    () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      void queryClient.invalidateQueries({ queryKey: ['document', page.id] });
    })));
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
    const taskEntities: MentionEntityItem[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: 'TASK',
      subtitle: t.status,
    }));
    const projEntities: MentionEntityItem[] = projects.map((p) => ({
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
    const handleEntityLinked = async (e: Event) => {
      const { targetType, targetId } = (e as CustomEvent<{ targetType?: string; targetId?: string }>).detail || {};
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
    } catch (err) {
      toast.error('Failed to duplicate document: ' + errorMessage(err, 'Unknown error'));
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
    } catch (err) {
      toast.error('Failed to update project link: ' + errorMessage(err, 'Unknown error'));
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
      await save.updateMetadata({ statusBadges: [...(page.statusBadges || []).filter(badge => !LIFECYCLE_STATUSES.has(badge)), status] });
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
      queryClient.invalidateQueries({ queryKey: ['document', page.id] });
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
      queryClient.invalidateQueries({ queryKey: ['document', page.id] });
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
    ],
    content: save.content as Content,
    onUpdate: ({ editor }) => { save.setContent(editor.getJSON()); },
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Document body',
        'aria-multiline': 'true',
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
            navigate(`/app/board?task=${encodeURIComponent(entityId)}`);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Listen for open task modal requests (e.g. from /task or selection bridge)
  useEffect(() => {
    const handler = (e: Event) => {
      let taskTitle = (e as CustomEvent<{ defaultTitle?: string }>).detail?.defaultTitle || '';
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
      if (e.defaultPrevented || e.isComposing || hasOpenModal()) return;
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('krama:open-task-modal'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTaskCreated = (task: IssueWithRelations) => {
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
      queryClient.setQueryData(['document', page.id], fresh);
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
      <div className="flex-1 min-w-0 overflow-y-auto py-3 px-4 md:px-8 max-w-5xl mx-auto flex flex-col font-sans w-full">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-caption">
          <span role="status" aria-live="polite" className={saveState === 'error' || saveState === 'conflict' ? 'text-danger-fg' : 'text-secondary'}>
            {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'conflict' ? 'Conflict — your changes are unsaved.' : saveState === 'error' ? 'Save failed — your changes are unsaved.' : 'Unsaved changes'}
          </span>
          {(saveState === 'error' || saveState === 'unsaved') && <button className="min-h-11 px-3 text-accent-fg underline" onClick={() => { void save.flush().catch(() => {}); }}>Retry save</button>}
          {saveState === 'conflict' && <><button className="min-h-11 px-3 text-accent-fg underline" onClick={reloadSavedDocument}>Load saved version</button><button className="min-h-11 px-3 text-accent-fg underline" onClick={() => { const blob = new Blob([JSON.stringify({ title, content: editor?.getJSON() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'document-draft.json'; link.click(); URL.revokeObjectURL(url); }}>Download my draft</button></>}
        </div>
        {/* Top Control Bar: Breadcrumbs on Left, Utility Actions on Right */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="workspace-document-breadcrumbs min-w-0 flex-1">
            <Breadcrumbs page={page} pages={pages} onSelect={onSelectDoc} />
          </div>

          <div className="workspace-document-actions flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
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
              onClick={event => { event.currentTarget.focus(); setIsAiOpen(!isAiOpen); }}
              className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-caption",
                isAiOpen
                  ? "bg-accent text-on-accent"
                  : "bg-accent-subtle hover:bg-accent/20 text-accent-fg border border-accent/30"
              )}
            >
              <Bot className="w-3.5 h-3.5" />
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
                aria-label="More document actions"
                aria-expanded={isMoreMenuOpen}
                title="More document actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-xl py-1.5 w-52 z-30 font-mono text-caption animate-in fade-in zoom-in-95 duration-100">
                  <button onClick={() => { setIsMoreMenuOpen(false); window.dispatchEvent(new CustomEvent('krama:open-task-modal')); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer">
                    <CheckSquare className="w-3.5 h-3.5 text-success-fg" /> Create task from document
                  </button>
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
                              const restored = await api.documents.restore(page.id);
                              queryClient.removeQueries({ queryKey: ['document'], type: 'inactive' });
                              queryClient.setQueryData(['document', page.id], restored);
                              await queryClient.invalidateQueries({ queryKey: ['documents'] });
                              onSelectDoc(page.id);
                            }
                          }
                        });
                        const nextDoc = pages.find(p => !isDescendantOf(page.id, p.id, pages));
                        onSelectDoc(nextDoc?.id || '');
                      } catch (err) {
                        toast.error('Failed to delete document: ' + errorMessage(err, 'Unknown error'));
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
        <details className="workspace-document-properties mb-3 border-b border-border">
          <summary className="min-h-11 flex flex-wrap items-center gap-2 cursor-pointer text-sm text-secondary hover:text-primary rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />Document properties <span className="text-xs ml-auto">{wordCount} words · {readTimeMins} min read</span></summary>
          <div className="flex flex-wrap items-center gap-3 py-3">
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

            {/* Project Linker */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-surface text-caption font-mono">
              <FolderKanban className="w-3.5 h-3.5 text-accent-fg shrink-0" />
              <select
                id="doc-linked-project"
                name="linkedProject"
                aria-label="Linked project"
                disabled={!projectsAvailable}
                value={page.projectId || page.linkedProjectId || ''}
                onChange={(e) => handleLinkProject(e.target.value || null)}
                className="bg-transparent text-primary text-caption font-medium outline-none cursor-pointer max-w-[110px] truncate pr-1"
                title="Link to project"
              >
                <option value="" className="bg-surface text-secondary">No Project</option>
                {(page.projectId || page.linkedProjectId) && !projects.some(project => project.id === (page.projectId || page.linkedProjectId)) && <option value={page.projectId || page.linkedProjectId || ''}>Linked project unavailable</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-primary">{p.name}</option>
                ))}
              </select>
            </div>

            {/* Document Type Picker */}
            <select
              id="doc-type-picker"
              name="docTypePicker"
              aria-label="Document type"
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
              id="doc-status-picker"
              name="docStatusPicker"
              aria-label="Document lifecycle status"
              value={lifecycleStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={cn(
                "px-2 py-1 rounded-lg border text-caption font-mono font-bold outline-none cursor-pointer transition-colors",
                lifecycleStatus === 'DRAFT' && "bg-warning-bg text-warning-fg border-warning-border",
                lifecycleStatus === 'IN_REVIEW' && "bg-accent-subtle text-accent-fg border-accent/30",
                lifecycleStatus === 'ACCEPTED' && "bg-success-bg text-success-fg border-success-border",
                lifecycleStatus === 'DEPRECATED' && "bg-danger-bg text-danger-fg border-danger-border"
              )}
            >
              <option value="DRAFT" className="bg-surface text-warning-fg">DRAFT</option>
              <option value="IN_REVIEW" className="bg-surface text-accent-fg">IN_REVIEW</option>
              <option value="ACCEPTED" className="bg-surface text-success-fg">ACCEPTED</option>
              <option value="DEPRECATED" className="bg-surface text-danger-fg">DEPRECATED</option>
            </select>

          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {page.tags?.map((item) => {
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
                    aria-label={`Remove #${tag.name} tag`}
                    title={`Remove #${tag.name} tag`}
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
                  id="new-tag-input"
                  name="newTagInput"
                  aria-label="New tag name"
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
                <button
                  onClick={handleAddTag}
                  aria-label="Save tag"
                  title="Save tag"
                  className="text-accent-fg hover:text-accent cursor-pointer"
                >
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
        </details>

        {/* Writing Canvas Container */}
        <div className="flex-1 v4-card rounded-2xl border border-border shadow-xs bg-surface flex flex-col w-full overflow-hidden min-h-[580px] relative mb-8">
          {/* Command Ribbon */}
          {editor && <EditorFormattingToolbar editor={editor} />}

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


        <DocumentReferences page={page} pages={pages} projects={projects} tasks={tasks} links={linksData} onSelectDoc={onSelectDoc} onAddLink={() => setIsLinkModalOpen(true)} onDeleteLink={handleDeleteLink} />
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
          if (restoredDoc) queryClient.setQueryData(['document', page.id], restoredDoc);
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
        beforeAction={async () => {
          await save.whenIdle();
          if (save.state === 'error' || save.state === 'conflict') throw new Error('Save your document changes before creating a task.');
          await save.flush();
        }}
        isOpen={taskModalData.isOpen}
        initialTitle={taskModalData.initialTitle}
        onClose={() => setTaskModalData({ isOpen: false, initialTitle: '' })}
        onSuccess={handleTaskCreated}
      />
    </div>
  );
}
