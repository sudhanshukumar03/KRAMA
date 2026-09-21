import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';

export interface OutlineHeading {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function useDocumentOutline(editor: Editor | null): OutlineHeading[] {
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);

  useEffect(() => {
    if (!editor) {
      setHeadings([]);
      return;
    }

    const extractHeadings = () => {
      const items: OutlineHeading[] = [];
      const json = editor.getJSON();

      if (!json.content) {
        setHeadings([]);
        return;
      }

      for (const node of json.content) {
        if (node.type === 'heading' && node.attrs?.level && node.content) {
          const level = Math.min(Math.max(node.attrs.level, 1), 3) as 1 | 2 | 3;
          const text = node.content
            .map((child: any) => child.text || '')
            .join('')
            .trim();

          if (text) {
            const id = slugify(text);
            items.push({ id, text, level });
          }
        }
      }

      setHeadings(items);
    };

    extractHeadings();

    // Re-extract on editor updates (debounced lightly via transaction listener)
    const handleUpdate = () => {
      extractHeadings();
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  return headings;
}
