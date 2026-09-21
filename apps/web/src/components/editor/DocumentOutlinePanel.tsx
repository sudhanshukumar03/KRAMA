import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { ListTree, X } from 'lucide-react';
import { useDocumentOutline, type OutlineHeading } from '../../hooks/useDocumentOutline';
import { cn } from '../../lib/utils';

interface DocumentOutlinePanelProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentOutlinePanel({ editor, isOpen, onClose }: DocumentOutlinePanelProps) {
  const headings = useDocumentOutline(editor);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleHeadingClick = (heading: OutlineHeading) => {
    if (!editor) return;

    // Search for matching heading text in DOM
    const editorDom = editor.view.dom;
    const elements = editorDom.querySelectorAll('h1, h2, h3');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      if (el.innerText.trim() === heading.text) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Briefly highlight target heading
        el.classList.add('outline-target-highlight');
        setTimeout(() => el.classList.remove('outline-target-highlight'), 1200);
        break;
      }
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-16 right-6 z-30 w-72 max-h-[70vh] bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-4 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-3 border-b border-border/80 text-secondary">
        <div className="flex items-center gap-2 text-caption font-mono font-bold uppercase tracking-wider text-primary">
          <ListTree className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Table of Contents</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          title="Close Outline (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-2 space-y-1 py-1 pr-1 text-caption font-sans">
        {headings.length === 0 ? (
          <div className="py-6 text-center text-secondary text-caption font-mono">
            No headings yet.<br />
            <span className="text-[11px] text-muted">Use /h1, /h2 or # to structure.</span>
          </div>
        ) : (
          headings.map((h, idx) => (
            <button
              key={`${h.id}-${idx}`}
              onClick={() => handleHeadingClick(h)}
              className={cn(
                "w-full text-left py-1.5 px-2 rounded-lg transition-colors truncate block cursor-pointer group",
                h.level === 1 && "font-semibold text-primary hover:bg-surface-hover",
                h.level === 2 && "pl-5 text-secondary hover:text-primary hover:bg-surface-hover text-[12px]",
                h.level === 3 && "pl-8 text-muted hover:text-primary hover:bg-surface-hover text-[11px]"
              )}
            >
              <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {h.text}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
