import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, type Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { SlashCommandsExtension } from '../../../extensions/SlashCommands';
import { WikiLinkExtension } from '../../../extensions/WikiLinkExtension';
import { EntityMentionExtension } from '../../../extensions/EntityMentionExtension';
import { CustomLink } from '../../../extensions/CustomLink';
import type { MentionEntityItem } from '../../editor/EntityMentionMenu';
import type { DocumentWithRelations } from '../../../types/schema';
import type { DocumentSaveQueue } from '../../../lib/documentSaveQueue';

interface DocumentEditorInput {
  pages: DocumentWithRelations[];
  mentionEntities: MentionEntityItem[];
  save: DocumentSaveQueue;
  onSelectDoc: (id: string) => void;
}
/** Tiptap setup and entity navigation consume current data without recreating the editor. */
export function useDocumentEditor({ pages, mentionEntities, save, onSelectDoc }: DocumentEditorInput) {
  const navigate = useNavigate();
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const mentionEntitiesRef = useRef(mentionEntities);
  mentionEntitiesRef.current = mentionEntities;

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

  return editor;
}
