import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Star, Copy, FolderInput, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import type { DocumentWithRelations } from '../../types/schema';
import { resolveIcon } from '../../lib/iconResolver';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface PageTreeNodeProps {
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  level?: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onMoveDoc?: (doc: DocumentWithRelations) => void;
  onCreateDoc?: (target: { parentId?: string; parentTitle?: string }) => void;
}

export function PageTreeNode({ 
  page, 
  pages, 
  level = 0, 
  onSelect, 
  selectedId,
  onMoveDoc,
  onCreateDoc
}: PageTreeNodeProps) {
  const [expanded, setExpanded] = useState(level === 0 || selectedId === page.id);
  const queryClient = useQueryClient();
  const children = pages.filter(p => p.parentId === page.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === page.id;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.documents.favorite(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(page.isFavorite ? `Removed "${page.title}" from favorites` : `Added "${page.title}" to favorites`);
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const copy = await api.documents.duplicate(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (copy?.id) onSelect(copy.id);
      toast.success(`Duplicated "${page.title}"`);
    } catch (err: any) {
      toast.error('Failed to duplicate: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  const handleDeletePage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.documents.delete(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (isSelected) onSelect(pages.find(p => p.id !== page.id)?.id || '');
      toast.success(`Deleted "${page.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.documents.restore(page.id);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success(`Restored "${page.title}"`);
          }
        }
      });
    } catch {
      toast.error('Failed to delete page');
    }
  };

  const handleCreateChildPage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newPage = await api.documents.create({
        title: 'Untitled Child Document',
        spaceId: page.spaceId || undefined,
        parentId: page.id,
        blocks: []
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setExpanded(true);
      if (newPage?.id) onSelect(newPage.id);
      toast.success(`Created sub-page under "${page.title}"`);
    } catch (err: any) {
      toast.error('Failed to create sub-page: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };
  
  return (
    <div className="font-sans">
      <div 
        className={cn("group relative flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-caption transition-all duration-150 select-none my-0.5",
          isSelected 
            ? "bg-accent-subtle text-accent-fg font-semibold border border-accent/20 shadow-2xs" 
            : "text-secondary hover:text-primary hover:bg-surface-hover"
        )}
        style={{ paddingLeft: `${(level * 14) + 10}px` }}
        onClick={() => onSelect(page.id)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button 
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="w-4 h-4 flex items-center justify-center text-muted hover:text-primary transition-colors focus:outline-none shrink-0"
            >
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-150", expanded && "rotate-90 text-accent-fg")} />
            </button>
          ) : (
            <div className="w-4 h-4 shrink-0 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-muted transition-colors" />
            </div>
          )}

          <div className="w-4 h-4 flex items-center justify-center shrink-0 relative">
            {React.createElement(resolveIcon(page.icon), { className: cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-accent-fg" : "text-muted group-hover:text-secondary") })}
            {page.isFavorite && (
              <span className="absolute -top-1 -right-1 text-amber-500">
                <Star className="w-2.5 h-2.5 fill-amber-500" />
              </span>
            )}
          </div>

          <span className="truncate text-[13px] tracking-tight">{page.title || 'Untitled Document'}</span>

          {page.documentType && page.documentType !== 'GENERAL' && (
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-border/80 text-muted font-bold shrink-0">
              {page.documentType}
            </span>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-surface/95 backdrop-blur-xs py-0.5 px-1 rounded-lg border border-border shadow-xs z-10">
          <button
            onClick={handleToggleFavorite}
            className={cn("p-1 rounded transition-colors",
              page.isFavorite ? "text-amber-500 hover:text-amber-600" : "text-muted hover:text-amber-500"
            )}
            title={page.isFavorite ? "Favorited" : "Favorite"}
          >
            <Star className={cn("w-3.5 h-3.5", page.isFavorite && "fill-amber-500")} />
          </button>
          <button
            onClick={handleDuplicate}
            className="p-1 rounded text-muted hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
            title="Duplicate subtree"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDoc?.(page);
            }}
            className="p-1 rounded text-muted hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
            title="Move document"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>
          {level < 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCreateDoc) {
                  onCreateDoc({ parentId: page.id, parentTitle: page.title });
                } else {
                  handleCreateChildPage(e);
                }
              }}
              className="p-1 rounded text-muted hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer"
              title="Add sub-document"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDeletePage}
            className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Children Container */}
      {hasChildren && expanded && (
        <div className="space-y-0.5">
          {children.map(child => (
            <PageTreeNode 
              key={child.id} 
              page={child} 
              pages={pages} 
              level={level + 1} 
              onSelect={onSelect} 
              selectedId={selectedId}
              onMoveDoc={onMoveDoc}
              onCreateDoc={onCreateDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
}
