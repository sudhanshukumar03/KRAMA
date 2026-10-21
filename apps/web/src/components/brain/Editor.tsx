import { DocumentActionsBar } from './DocumentActionsBar';
import { DocumentProperties } from './DocumentProperties';
import { useDocumentActions } from './hooks/useDocumentActions';
import { useDocumentLinks } from './hooks/useDocumentLinks';
import { useDocumentEditor } from './hooks/useDocumentEditor';
import { DocumentReferences } from './DocumentReferences';
import { EditorFormattingToolbar } from './EditorFormattingToolbar';
import { useState, useEffect, useMemo } from 'react';
import { hasOpenModal } from '../../lib/keyboardShortcuts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EditorContent } from '@tiptap/react';
import type { Content } from '@tiptap/react';
import { SelectionToTaskModal } from '../editor/SelectionToTaskModal';
import type { MentionEntityItem } from '../editor/EntityMentionMenu';
import { DocumentOutlinePanel } from '../editor/DocumentOutlinePanel';
import type { DocumentWithRelations, ProjectWithRelations, IssueWithRelations } from '../../types/schema';
import { toast } from 'sonner';
import { GroundedAIPanel } from './GroundedAIPanel';
import { VersionHistoryModal } from './modals/VersionHistoryModal';
import { AddEntityLinkModal } from './modals/AddEntityLinkModal';
import { api } from '../../api/client';
import { useDocumentDraft } from './hooks/useDocumentDraft';


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
  const queryClient = useQueryClient();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [taskModalData, setTaskModalData] = useState<{ isOpen: boolean; initialTitle: string }>({
    isOpen: false,
    initialTitle: '',
  });
  const { save, saveState } = useDocumentDraft(page);

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

  const { linksData, refetchLinks } = useDocumentLinks(page.id);
  const actions = useDocumentActions({ page, save, onSelectDoc, refetchLinks });
  const { title, setTitle, handleTitleChange, handleTitleBlur, handleDeleteLink } = actions;

  const editor = useDocumentEditor({ pages, mentionEntities, save, onSelectDoc });

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
        <DocumentActionsBar page={page} pages={pages} onSelectDoc={onSelectDoc} onMoveDoc={onMoveDoc} save={save} actions={actions} isOutlineOpen={isOutlineOpen} setIsOutlineOpen={setIsOutlineOpen} isAiOpen={isAiOpen} setIsAiOpen={setIsAiOpen} setIsVersionModalOpen={setIsVersionModalOpen} />

        <DocumentProperties page={page} projects={projects} projectsAvailable={projectsAvailable} save={save} actions={actions} wordCount={wordCount} readTimeMins={readTimeMins} />

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
