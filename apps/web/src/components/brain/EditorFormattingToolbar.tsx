import type { Editor } from '@tiptap/react';
import { Heading1, Heading2, List, ListOrdered, Code, Quote, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export function EditorFormattingToolbar({ editor }: { editor: Editor }) {
  return (
            <div className="bg-surface-hover/80 backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-border">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('heading', { level: 1 }) ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('heading', { level: 2 }) ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('bulletList') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('orderedList') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Ordered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('codeBlock') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer active:scale-[0.98]",
                    editor.isActive('blockquote') ? "bg-accent text-on-accent shadow-xs" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer bg-surface text-primary border border-border hover:bg-surface-hover active:scale-[0.98]"
                  title="Horizontal Rule"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
  );
}
