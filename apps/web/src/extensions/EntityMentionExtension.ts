import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import { EntityMentionMenu, type EntityMentionMenuRef, type MentionEntityItem } from '../components/editor/EntityMentionMenu';

export const EntityMentionPluginKey = new PluginKey('entityMention');

export interface EntityMentionOptions {
  getEntities: () => MentionEntityItem[];
  onEntitySelected?: (item: MentionEntityItem) => void;
}

export const EntityMentionExtension = Extension.create<EntityMentionOptions>({
  name: 'entityMention',

  addOptions() {
    return {
      getEntities: () => [],
      onEntitySelected: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor as any,
        pluginKey: EntityMentionPluginKey,
        char: '@',
        command: ({ editor, range, props }: any) => {
          const item = props as MentionEntityItem;
          const prefix = item.type === 'DOCUMENT' ? 'Doc' : item.type === 'TASK' ? 'Task' : 'Project';
          const label = `@${prefix}: ${item.title}`;
          const badgeClass = item.type === 'DOCUMENT' 
            ? 'mention mention-wikilink' 
            : item.type === 'TASK' 
            ? 'mention mention-task' 
            : 'mention mention-project';

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'text',
                text: `${label} `,
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: '#',
                      class: badgeClass,
                      'data-entity-type': item.type,
                      'data-entity-id': item.id,
                    },
                  },
                ],
              },
            ])
            .run();

          // Dispatch event for auto-link & query invalidation
          window.dispatchEvent(new CustomEvent('krama:entity-linked', {
            detail: { targetType: item.type, targetId: item.id }
          }));

          if (this.options.onEntitySelected) {
            this.options.onEntitySelected(item);
          }
        },
        items: ({ query }) => {
          const allEntities = this.options.getEntities();
          const q = query.toLowerCase().trim();
          if (!q) return allEntities.slice(0, 15);

          return allEntities.filter((item) => {
            const matchTitle = item.title.toLowerCase().includes(q);
            const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
            const matchType = item.type.toLowerCase().includes(q) || 
              (q.startsWith('task') && item.type === 'TASK') ||
              (q.startsWith('doc') && item.type === 'DOCUMENT') ||
              (q.startsWith('proj') && item.type === 'PROJECT');
            return matchTitle || matchSubtitle || matchType;
          }).slice(0, 15);
        },
        render: () => {
          let component: ReactRenderer<EntityMentionMenuRef> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props) => {
              document.querySelectorAll('.krama-mention-popup').forEach((el) => el.remove());

              component = new ReactRenderer(EntityMentionMenu, {
                props,
                editor: props.editor,
              });

              popup = document.createElement('div');
              popup.classList.add('krama-mention-popup');
              popup.style.position = 'fixed';
              popup.style.zIndex = '9999';
              document.body.appendChild(popup);
              popup.appendChild(component.element);

              const rect = props.clientRect?.();
              if (rect) {
                const top = Math.min(rect.bottom + 8, window.innerHeight - 300);
                const left = Math.min(rect.left, window.innerWidth - 320);
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
                  const top = Math.min(rect.bottom + 8, window.innerHeight - 300);
                  const left = Math.min(rect.left, window.innerWidth - 320);
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
