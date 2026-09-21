import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import { WikiLinkMenu, type WikiLinkMenuRef } from '../components/editor/WikiLinkMenu';
import type { DocumentWithRelations } from '../types/schema';

export const WikiLinkPluginKey = new PluginKey('wikiLink');

export interface WikiLinkOptions {
  getDocuments: () => DocumentWithRelations[];
  onDocumentSelected?: (doc: DocumentWithRelations) => void;
}

export const WikiLinkExtension = Extension.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      getDocuments: () => [],
      onDocumentSelected: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor as any,
        pluginKey: WikiLinkPluginKey,
        char: '[',
        findSuggestionMatch: ({ $position }) => {
          const textBefore = $position.parent.textBetween(
            Math.max(0, $position.parentOffset - 60),
            $position.parentOffset,
            undefined,
            '\ufffc'
          );
          const match = textBefore.match(/(?:^|\s)\[\[([^\]]*)$/);
          if (!match) return null;

          const query = match[1];
          // match[0] might have leading whitespace from (?:^|\s)
          const leadingSpaceOffset = match[0].startsWith(' ') ? 1 : 0;
          const from = $position.pos - query.length - 2;
          const to = $position.pos;

          return {
            range: { from, to },
            query,
            text: match[0].slice(leadingSpaceOffset),
          };
        },
        command: ({ editor, range, props }: any) => {
          const doc = props as DocumentWithRelations;
          const label = `[[${doc.title || 'Untitled'}]]`;

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
                      href: `#doc-${doc.id}`,
                      class: 'mention mention-wikilink',
                      'data-doc-id': doc.id,
                    },
                  },
                ],
              },
            ])
            .run();

          // Dispatch event for auto-link & query invalidation
          window.dispatchEvent(new CustomEvent('krama:entity-linked', {
            detail: { targetType: 'DOCUMENT', targetId: doc.id }
          }));

          if (this.options.onDocumentSelected) {
            this.options.onDocumentSelected(doc);
          }
        },
        items: ({ query }) => {
          const allDocs = this.options.getDocuments();
          const q = query.toLowerCase().trim();
          if (!q) return allDocs.slice(0, 15);

          return allDocs.filter((doc) => {
            return (
              (doc.title && doc.title.toLowerCase().includes(q)) ||
              (doc.documentType && doc.documentType.toLowerCase().includes(q))
            );
          }).slice(0, 15);
        },
        render: () => {
          let component: ReactRenderer<WikiLinkMenuRef> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props) => {
              document.querySelectorAll('.krama-wikilink-popup').forEach((el) => el.remove());

              component = new ReactRenderer(WikiLinkMenu, {
                props,
                editor: props.editor,
              });

              popup = document.createElement('div');
              popup.classList.add('krama-wikilink-popup');
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
