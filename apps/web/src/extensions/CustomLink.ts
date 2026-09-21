import Link from '@tiptap/extension-link';

export const CustomLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-doc-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-doc-id'),
        renderHTML: (attributes) => {
          if (!attributes['data-doc-id']) return {};
          return { 'data-doc-id': attributes['data-doc-id'] };
        },
      },
      'data-entity-type': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-type'),
        renderHTML: (attributes) => {
          if (!attributes['data-entity-type']) return {};
          return { 'data-entity-type': attributes['data-entity-type'] };
        },
      },
      'data-entity-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-id'),
        renderHTML: (attributes) => {
          if (!attributes['data-entity-id']) return {};
          return { 'data-entity-id': attributes['data-entity-id'] };
        },
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});
