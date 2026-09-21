import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Star, FolderKanban, FolderInput, Copy, History, Sparkles, 
  ChevronDown, FileText, FileCode, CheckSquare, ListTree, Check, Plus, 
  Heading1, Heading2, List, ListOrdered, Code, Quote, Minus, Link2,
  X, ArrowUpRight, MoreHorizontal
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
import type { DocumentWithRelations } from '../../types/schema';
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

export interface EditorProps {
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  projects: any[];
  onSelectDoc: (id: string) => void;
  onMoveDoc?: (doc: DocumentWithRelations) => void;
}

export function Editor({
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveErrorToastRef = useRef<number>(0);
  const currentDocIdRef = useRef(page.id);
  const latestJsonRef = useRef<any>(page.contentJson);
  const latestTitleRef = useRef(title);
  latestTitleRef.current = title;

  // Fetch workspace tasks for entity linking and references
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
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

  // Sync title when active document switches
  useEffect(() => {
    setTitle(page.title || '');
  }, [page.id, page.title]);

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
      await api.documents.favorite(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(page.isFavorite ? 'Removed from favorites' : 'Marked as favorite');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await api.documents.duplicate(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (copy?.id) onSelectDoc(copy.id);
      toast.success(`Duplicated "${page.title}"`);
    } catch (err: any) {
      toast.error('Failed to duplicate document: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      api.documents.update(page.id, { title: newTitle })
        .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
        .catch((err: any) => {
          toast.error('Failed to update page title: ' + (err?.message || 'Unknown error'));
        });
    }, 500);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
    const clean = title.trim();
    if (clean && clean !== page.title) {
      api.documents.update(page.id, { title: clean })
        .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
        .catch((err: any) => {
          toast.error('Failed to update page title: ' + (err?.message || 'Unknown error'));
        });
    }
  };

  const handleLinkProject = async (projectId: string | null) => {
    try {
      await api.documents.update(page.id, { projectId: projectId || null, linkedProjectId: projectId || null });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(projectId ? 'Document linked to project' : 'Document unlinked from project');
    } catch (err: any) {
      toast.error('Failed to update project link: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleDocumentTypeChange = async (type: string) => {
    try {
      await api.documents.update(page.id, { documentType: type });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Document type updated to ${type}`);
    } catch {
      toast.error('Failed to update type');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await api.documents.update(page.id, { statusBadges: [status] });
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

  const handleExport = (format: 'md' | 'spec') => {
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
    content: (page.contentJson ? page.contentJson as Content : ''),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      latestJsonRef.current = json;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        api.documents.updateContent(page.id, json)
          .catch((err: any) => {
            const now = Date.now();
            if (now - lastSaveErrorToastRef.current > 4000) {
              lastSaveErrorToastRef.current = now;
              toast.error('Failed to save page content: ' + (err?.message || 'Unknown error'));
            }
          });
      }, 500);
    },
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

  // Flush pending auto-save on switch or unmount to guarantee zero data loss
  useEffect(() => {
    return () => {
      if (debounceRef.current && currentDocIdRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        if (latestJsonRef.current) {
          api.documents.updateContent(currentDocIdRef.current, latestJsonRef.current).catch(console.error);
        }
      }
      if (titleDebounceRef.current && currentDocIdRef.current) {
        clearTimeout(titleDebounceRef.current);
        titleDebounceRef.current = null;
        const clean = latestTitleRef.current.trim();
        if (clean) {
          api.documents.update(currentDocIdRef.current, { title: clean }).catch(console.error);
        }
      }
    };
  }, []);

  // Sync content strictly on document ID switch, avoiding cursor jumps during debounced save
  useEffect(() => {
    if (currentDocIdRef.current !== page.id) {
      // Flush previous document if dirty
      if (debounceRef.current && currentDocIdRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        if (latestJsonRef.current) {
          api.documents.updateContent(currentDocIdRef.current, latestJsonRef.current).catch(console.error);
        }
      }
      if (titleDebounceRef.current && currentDocIdRef.current) {
        clearTimeout(titleDebounceRef.current);
        titleDebounceRef.current = null;
        const clean = latestTitleRef.current.trim();
        if (clean) {
          api.documents.update(currentDocIdRef.current, { title: clean }).catch(console.error);
        }
      }

      currentDocIdRef.current = page.id;
      latestJsonRef.current = page.contentJson;
      if (editor && !editor.isDestroyed) {
        if (page.contentJson) {
          editor.commands.setContent(page.contentJson as Content);
        } else {
          editor.commands.setContent('');
        }
      }
    }
  }, [page.id, page.contentJson, editor]);

  // Word count & metrics
  const textContent = editor ? editor.getText() : (page.title || '');
  const words = textContent.trim().split(/\s+/).filter((w: string) => w.length > 0);
  const wordCount = words.length;
  const readTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      <div className="flex-1 overflow-y-auto py-5 px-4 md:px-8 max-w-5xl mx-auto flex flex-col font-sans w-full">
        {/* Top Control Bar: Breadcrumbs on Left, Utility Actions on Right */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-border">
          <div className="min-w-0 flex-1">
            <Breadcrumbs page={page} pages={pages} onSelect={onSelectDoc} />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Favorite Star Button */}
            <button
              onClick={handleToggleFavorite}
              className={cn("p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0",
                page.isFavorite
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                  : "border-border bg-surface hover:bg-surface-hover text-muted hover:text-primary"
              )}
              title={page.isFavorite ? "Favorited" : "Star as favorite"}
            >
              <Star className={cn("w-3.5 h-3.5", page.isFavorite && "fill-amber-500")} />
            </button>

            {/* Project Linker */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-surface text-caption font-mono">
              <FolderKanban className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <select
                value={page.projectId || page.linkedProjectId || ''}
                onChange={(e) => handleLinkProject(e.target.value || null)}
                className="bg-transparent text-primary text-[11px] font-medium outline-none cursor-pointer max-w-[110px] truncate pr-1"
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
              className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 text-secondary transition-all cursor-pointer text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-2xs"
              title="Convert Selection or Idea to Task (Ctrl+Shift+T)"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">To Task</span>
            </button>

            {/* Outline Button */}
            <button
              onClick={() => setIsOutlineOpen(!isOutlineOpen)}
              className={cn("px-2.5 py-1 rounded-lg border text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-[11px]",
                isOutlineOpen
                  ? "bg-surface-hover text-blue-600 dark:text-blue-400 border-blue-500/30"
                  : "border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary"
              )}
              title="Table of Contents Outline"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Outline</span>
            </button>

            {/* AI Assistant Button */}
            <button
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-[11px]",
                isAiOpen
                  ? "bg-blue-600 text-white"
                  : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
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
                    ? "border-blue-500/30 bg-surface-hover text-primary"
                    : "border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary"
                )}
                title="More actions (Move, Duplicate, History, Export)"
              >
                <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-xl py-1.5 w-52 z-30 font-mono text-caption animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onMoveDoc?.(page);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-blue-500" />
                    <span>Move Document...</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleDuplicate();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Duplicate Subtree</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsVersionModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-purple-500" />
                    <span>Version History</span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <div className="px-3 py-1 text-[10px] text-muted uppercase font-bold tracking-wider">Export</div>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExport('md');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExport('spec');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-purple-500" />
                    <span>Full Spec (.spec.md)</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Properties & Telemetry Row: Icon, DocType, Non-wrapping Stats Pill, and Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs hover:bg-blue-500/20 transition-colors cursor-pointer">
              <IconPicker
                value={page.icon}
                onChange={(newIcon) => {
                  api.documents.update(page.id, { icon: newIcon })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
                    .catch(() => toast.error('Failed to update icon'));
                }}
                triggerClassName="border-none hover:border-none shadow-none bg-transparent hover:bg-transparent !p-0"
              />
            </div>

            {/* Document Type Picker */}
            <select
              value={page.documentType || 'GENERAL'}
              onChange={(e) => handleDocumentTypeChange(e.target.value)}
              className="bg-surface-hover text-secondary hover:text-primary px-2.5 py-1 rounded-lg border border-border text-[11px] font-mono font-bold outline-none cursor-pointer"
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
                "px-2 py-1 rounded-lg border text-[11px] font-mono font-bold outline-none cursor-pointer transition-colors",
                (page.statusBadges?.[0] === 'DRAFT' || !page.statusBadges?.[0]) && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
                page.statusBadges?.[0] === 'IN_REVIEW' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                page.statusBadges?.[0] === 'ACCEPTED' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                page.statusBadges?.[0] === 'DEPRECATED' && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
              )}
            >
              <option value="DRAFT" className="bg-surface text-amber-600">DRAFT</option>
              <option value="IN_REVIEW" className="bg-surface text-blue-600">IN_REVIEW</option>
              <option value="ACCEPTED" className="bg-surface text-emerald-600">ACCEPTED</option>
              <option value="DEPRECATED" className="bg-surface text-rose-600">DEPRECATED</option>
            </select>

            {/* Simple, clean word count & reading time */}
            <span className="text-muted font-mono text-[11px] select-none">
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
                  className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border", colorClass.bg, colorClass.text, colorClass.border)}
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
              <div className="inline-flex items-center gap-1 bg-surface border border-border rounded-md px-2 py-0.5 text-[11px] font-mono">
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
                  className="bg-transparent border-none outline-none text-primary w-24 text-[11px]"
                />
                <button onClick={handleAddTag} className="text-blue-600 hover:text-blue-500">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-muted hover:text-primary hover:bg-surface-hover border border-dashed border-border"
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
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('heading', { level: 1 }) ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('heading', { level: 2 }) ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('bulletList') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('orderedList') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Ordered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('codeBlock') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('blockquote') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer bg-surface text-primary border border-border hover:bg-surface-hover"
                  title="Horizontal Rule"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" /> Auto-saved
              </span>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto relative">
            <div>
              <input
                type="text"
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
                  <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[1.75]" />
                  <span>References & Backlinks</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover border border-border text-muted font-mono font-bold">
                    {totalReferences}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-muted", !isReferencesOpen && "-rotate-90")} />
                </button>
                <BaseButton onClick={() => setIsLinkModalOpen(true)} className="text-caption py-1 px-2.5">
                  + Link Item
                </BaseButton>
              </div>

              {page.linkedProject && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/20 mb-3 text-[12px] font-sans">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-secondary text-[11px] font-mono">LINKED PROJECT:</span>
                    <span className="font-semibold text-primary">{page.linkedProject.name}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/app/projects/${page.linkedProject?.id}`)}
                    className="text-blue-600 hover:text-blue-500 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    View Project <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isReferencesOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  {/* Incoming Backlinks */}
                  <div className="p-4 rounded-xl border border-border bg-surface">
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
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
                              className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50 hover:bg-blue-500/10 cursor-pointer transition-colors"
                            >
                              <span className="font-sans font-medium text-primary text-[13px] truncate">
                                {sourceDoc?.title || `Doc #${link.sourceId.slice(0, 8)}`}
                              </span>
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">
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
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
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
                              className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50 hover:bg-blue-500/10 cursor-pointer transition-colors group"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {link.targetType === 'DOCUMENT' && <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                {link.targetType === 'PROJECT' && <FolderKanban className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                {link.targetType === 'TASK' && <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                <span className="font-sans font-medium text-primary text-[13px] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {statusBadge && (
                                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-secondary">
                                    {statusBadge}
                                  </span>
                                )}
                                <span className={cn("text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold",
                                  link.targetType === 'DOCUMENT' && "text-blue-600 dark:text-blue-400 bg-blue-500/10",
                                  link.targetType === 'PROJECT' && "text-purple-600 dark:text-purple-400 bg-purple-500/10",
                                  link.targetType === 'TASK' && "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                )}>
                                  {link.targetType}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLink(link.id);
                                  }}
                                  className="p-1 text-muted hover:text-red-500 transition-colors"
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
        onRestoreSuccess={(restoredContentJson) => {
          if (restoredContentJson && editor && !editor.isDestroyed) {
            editor.commands.setContent(restoredContentJson as Content);
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
