import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import '@tiptap/starter-kit';
import '@tiptap/extension-task-list';
import { 
  Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, 
  Code, Quote, Minus, Sparkles
} from 'lucide-react';
import { SlashCommandMenu, type SlashCommandMenuRef, type SlashCommandItem } from '../components/editor/SlashCommandMenu';

const SlashCommandsPluginKey = new PluginKey('slashCommands');
export type { SlashCommandItem };

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Top-level section title',
    icon: Heading1,
    keywords: ['h1', 'heading', 'title', 'large'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium subsection header',
    icon: Heading2,
    keywords: ['h2', 'heading', 'subtitle', 'section'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small subsection header',
    icon: Heading3,
    keywords: ['h3', 'heading', 'sub'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'task_list',
    title: 'Interactive Checklist',
    description: 'Track items with checkboxes',
    icon: CheckSquare,
    keywords: ['todo', 'task', 'checklist', 'check', '[]'],
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'bullet_list',
    title: 'Bullet List',
    description: 'Create an unorganized bulleted list',
    icon: List,
    keywords: ['ul', 'bullet', 'list', 'point'],
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered_list',
    title: 'Numbered List',
    description: 'Create an ordered sequence',
    icon: ListOrdered,
    keywords: ['ol', 'numbered', 'sequence', '1.'],
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'code_block',
    title: 'Code Block',
    description: 'Syntax-highlighted code snippet',
    icon: Code,
    keywords: ['code', 'pre', 'snippet', 'syntax'],
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'blockquote',
    title: 'Quote',
    description: 'Capture a callout or quote',
    icon: Quote,
    keywords: ['quote', 'callout', 'cite'],
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visual horizontal line',
    icon: Minus,
    keywords: ['hr', 'divider', 'line', 'separator'],
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'create_kanban_task',
    title: 'Create Execution Task',
    description: 'Promote thoughts to an actionable Kanban issue',
    icon: Sparkles,
    keywords: ['task', 'issue', 'ticket', 'kanban', 'action'],
    command: (_editor) => {
      window.dispatchEvent(new CustomEvent('krama:open-task-modal', {
        detail: { defaultTitle: '' }
      }));
    },
  },
];

export const SlashCommandsExtension = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor as any,
        pluginKey: SlashCommandsPluginKey,
        char: '/',
        startOfLine: true,
        command: ({ editor, range, props }: any) => {
          editor.chain().focus().deleteRange(range).run();
          props.command(editor);
        },
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          if (!q) return SLASH_COMMANDS;
          return SLASH_COMMANDS.filter((item) => {
            return (
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.keywords.some((k) => k.includes(q))
            );
          });
        },
        render: () => {
          let component: ReactRenderer<SlashCommandMenuRef> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props) => {
              document.querySelectorAll('.krama-slash-popup').forEach((el) => el.remove());

              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              });

              popup = document.createElement('div');
              popup.classList.add('krama-slash-popup');
              popup.style.position = 'fixed';
              popup.style.zIndex = '9999';
              document.body.appendChild(popup);
              popup.appendChild(component.element);

              const rect = props.clientRect?.();
              if (rect) {
                const top = Math.min(rect.bottom + 8, window.innerHeight - 340);
                const left = Math.min(rect.left, window.innerWidth - 300);
                popup.style.top = `${Math.max(16, top)}px`;
                popup.style.left = `${Math.max(16, left)}px`;
              } else {
                popup.style.top = '120px';
                popup.style.left = '240px';
              }
            },

            onUpdate: (props) => {
              component?.updateProps(props);

              if (popup) {
                const rect = props.clientRect?.();
                if (rect) {
                  const top = Math.min(rect.bottom + 8, window.innerHeight - 340);
                  const left = Math.min(rect.left, window.innerWidth - 300);
                  popup.style.top = `${Math.max(16, top)}px`;
                  popup.style.left = `${Math.max(16, left)}px`;
                }
              }
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.remove();
                component?.destroy();
                popup = null;
                component = null;
                return true;
              }
              return component?.ref?.onKeyDown(props.event) || false;
            },

            onExit: () => {
              popup?.remove();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
