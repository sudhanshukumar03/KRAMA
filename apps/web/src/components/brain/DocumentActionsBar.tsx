import { Star, FolderInput, Copy, History, Bot, FileText, FileCode, CheckSquare, ListTree, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { cn, errorMessage } from '../../lib/utils';
import type { DocumentWithRelations } from '../../types/schema';
import type { DocumentSaveQueue } from '../../lib/documentSaveQueue';
import { isDescendantOf } from './helpers';
import { Breadcrumbs } from './Breadcrumbs';
import type { useDocumentActions } from './hooks/useDocumentActions';

interface DocumentActionsBarProps {
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  onSelectDoc: (id: string) => void;
  onMoveDoc?: (doc: DocumentWithRelations) => void;
  save: DocumentSaveQueue;
  actions: ReturnType<typeof useDocumentActions>;
  isOutlineOpen: boolean;
  setIsOutlineOpen: Dispatch<SetStateAction<boolean>>;
  isAiOpen: boolean;
  setIsAiOpen: Dispatch<SetStateAction<boolean>>;
  setIsVersionModalOpen: Dispatch<SetStateAction<boolean>>;
}
export function DocumentActionsBar({ page, pages, onSelectDoc, onMoveDoc, save, actions, isOutlineOpen, setIsOutlineOpen, isAiOpen, setIsAiOpen, setIsVersionModalOpen }: DocumentActionsBarProps) {
  const queryClient = useQueryClient();
  const { handleToggleFavorite, handleDuplicate, handleExport } = actions;
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
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

  return (
    <>
        {/* Top Control Bar: Breadcrumbs on Left, Utility Actions on Right */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="workspace-document-breadcrumbs min-w-0 flex-1">
            <Breadcrumbs page={page} pages={pages} onSelect={onSelectDoc} />
          </div>

          <div className="workspace-document-actions flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
            {/* Favorite Star Button */}
            <button
              onClick={handleToggleFavorite}
              className={cn("p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0",
                page.isFavorite
                  ? "bg-warning-bg border-warning-border text-warning-fg hover:bg-warning-bg/80"
                  : "border-border bg-surface hover:bg-surface-hover text-muted hover:text-primary"
              )}
              title={page.isFavorite ? "Favorited" : "Star as favorite"}
            >
              <Star className={cn("w-3.5 h-3.5", page.isFavorite && "fill-warning-fg")} />
            </button>

            {/* Outline Button */}
            <button
              aria-expanded={isOutlineOpen}
              onClick={() => setIsOutlineOpen(!isOutlineOpen)}
              className={cn("px-2.5 py-1 rounded-lg border text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-caption",
                isOutlineOpen
                  ? "bg-surface-hover text-accent-fg border-accent/30"
                  : "border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary"
              )}
              title="Table of Contents Outline"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Outline</span>
            </button>

            {/* AI Assistant Button */}
            <button
              aria-label="AI Assist"
              aria-expanded={isAiOpen}
              onClick={event => { event.currentTarget.focus(); setIsAiOpen(!isAiOpen); }}
              className={cn("px-2.5 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer text-caption",
                isAiOpen
                  ? "bg-accent text-on-accent"
                  : "bg-accent-subtle hover:bg-accent/20 text-accent-fg border border-accent/30"
              )}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Assist</span>
            </button>

            {/* More Options Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={cn(
                  "p-1.5 rounded-lg border transition-colors cursor-pointer",
                  isMoreMenuOpen
                    ? "border-accent/40 bg-surface-hover text-primary"
                    : "border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary"
                )}
                aria-label="More document actions"
                aria-expanded={isMoreMenuOpen}
                title="More document actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-xl py-1.5 w-52 z-30 font-mono text-caption animate-in fade-in zoom-in-95 duration-100">
                  <button onClick={() => { setIsMoreMenuOpen(false); window.dispatchEvent(new CustomEvent('krama:open-task-modal')); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer">
                    <CheckSquare className="w-3.5 h-3.5 text-success-fg" /> Create task from document
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      void save.flush().then(() => onMoveDoc?.(page)).catch(() => toast.error('Save your changes before moving this document.'));
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-cat-projects" />
                    <span>Move Document...</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleDuplicate();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-accent-fg" />
                    <span>Duplicate Subtree</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsVersionModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-cat-routines" />
                    <span>Version History</span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <div className="px-3 py-1 text-badge text-muted uppercase font-bold tracking-wider">Export</div>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExport('md');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-cat-projects" />
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExport('spec');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-cat-tasks" />
                    <span>Full Spec (.spec.md)</span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={async () => {
                      setIsMoreMenuOpen(false);
                      if (!window.confirm(`Move "${page.title || 'Untitled'}" to Trash?`)) return;
                      try {
                        await save.flush();
                        await api.documents.delete(page.id);
                        queryClient.invalidateQueries({ queryKey: ['documents'] });
                        toast.success(`Moved "${page.title || 'Untitled'}" to Trash`, {
                          action: {
                            label: 'Undo',
                            onClick: async () => {
                              const restored = await api.documents.restore(page.id);
                              queryClient.removeQueries({ queryKey: ['document'], type: 'inactive' });
                              queryClient.setQueryData(['document', page.id], restored);
                              await queryClient.invalidateQueries({ queryKey: ['documents'] });
                              onSelectDoc(page.id);
                            }
                          }
                        });
                        const nextDoc = pages.find(p => !isDescendantOf(page.id, p.id, pages));
                        onSelectDoc(nextDoc?.id || '');
                      } catch (err) {
                        toast.error('Failed to delete document: ' + errorMessage(err, 'Unknown error'));
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-danger-bg text-danger-fg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

    </>
  );
}
