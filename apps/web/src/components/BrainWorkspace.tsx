import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChevronRight, ChevronDown, Plus, FileSignature, Brain, Clock, AlignLeft, 
  BookOpen, Heading1, Heading2, List, ListOrdered, Quote, Code, 
  Minus, Command, FolderKanban, Link2, 
  Sparkles, Search, Download, X, 
  History, Network, FileText, RefreshCw, Check, 
  Send, Trash2, ZoomIn, ZoomOut, RotateCcw,
  ArrowUpRight, FileCode, Info, Star, Copy, FolderInput, Upload, CheckSquare
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { DocumentWithRelations } from '../types/schema';
import { cn } from '../lib/utils';
import { EmptyState } from './ui/EmptyState';
import { BaseButton } from './ui/BaseButton';
import { PageHeader } from './ui/PageHeader';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { toast } from 'sonner';
import { IconPicker } from './ui/IconPicker';
import { resolveIcon } from '../lib/iconResolver';

// Color definitions for tags
const TAG_COLORS: { name: string; bg: string; text: string; border: string }[] = [
  { name: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  { name: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { name: 'purple', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  { name: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  { name: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  { name: 'cyan', bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' },
];

function getTagColor(colorName?: string | null) {
  const match = TAG_COLORS.find(c => c.name === colorName);
  return match || TAG_COLORS[0];
}

// Tree calculation helpers
function getDocDepth(docId: string, pages: DocumentWithRelations[]): number {
  let depth = 1;
  let curr = pages.find(p => p.id === docId);
  while (curr && curr.parentId && depth < 10) {
    depth++;
    const pid: string = curr.parentId;
    curr = pages.find(p => p.id === pid);
  }
  return depth;
}

function getSubtreeDepth(docId: string, pages: DocumentWithRelations[]): number {
  const children = pages.filter(p => p.parentId === docId);
  if (children.length === 0) return 1;
  let max = 1;
  for (const child of children) {
    const childDepth = getSubtreeDepth(child.id, pages);
    if (childDepth + 1 > max) max = childDepth + 1;
  }
  return max;
}

function isDescendantOf(docId: string, potentialDescendantId: string, pages: DocumentWithRelations[]): boolean {
  if (docId === potentialDescendantId) return true;
  let curr = pages.find(p => p.id === potentialDescendantId);
  let iterations = 0;
  while (curr && curr.parentId && iterations < 10) {
    if (curr.parentId === docId) return true;
    const pid: string = curr.parentId;
    curr = pages.find(p => p.id === pid);
    iterations++;
  }
  return false;
}

// ==========================================
// MOVE DOCUMENT MODAL
// ==========================================
function MoveDocumentModal({
  doc,
  pages,
  isOpen,
  onClose,
  onSuccess
}: {
  doc: DocumentWithRelations | null;
  pages: DocumentWithRelations[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [targetParentId, setTargetParentId] = useState<string>('ROOT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (doc) {
      setTargetParentId(doc.parentId || 'ROOT');
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  const subtreeDepth = getSubtreeDepth(doc.id, pages);

  const candidateParents = pages.filter(p => {
    if (p.id === doc.id) return false;
    if (isDescendantOf(doc.id, p.id, pages)) return false;
    return true;
  });

  const handleMove = async () => {
    setIsSubmitting(true);
    try {
      const newParentId = targetParentId === 'ROOT' ? null : targetParentId;
      await api.documents.move(doc.id, { targetParentId: newParentId });
      toast.success(`Moved "${doc.title}" successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to move document: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <FolderInput className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-primary text-body">Move Document</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 font-sans text-caption">
          <p className="text-secondary text-[13px]">
            Choose a new parent for <strong className="text-primary">{doc.title}</strong> (subtree height: {subtreeDepth}):
          </p>

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Target Parent</label>
            <select
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-mono text-caption"
            >
              <option value="ROOT">📁 Root (Top-Level Document)</option>
              {candidateParents.map(p => {
                const parentDepth = getDocDepth(p.id, pages);
                const wouldExceed = parentDepth + subtreeDepth > 3;
                return (
                  <option 
                    key={p.id} 
                    value={p.id}
                    disabled={wouldExceed}
                  >
                    {'— '.repeat(parentDepth - 1)}{p.title} (Depth {parentDepth}){wouldExceed ? ' - [Exceeds Max Depth 3]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <BaseButton variant="secondary" onClick={onClose} className="text-caption py-1.5">
              Cancel
            </BaseButton>
            <BaseButton disabled={isSubmitting} onClick={handleMove} className="text-caption py-1.5">
              {isSubmitting ? 'Moving...' : 'Move Document'}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1. PAGE TREE NAVIGATION NODE
// ==========================================
function PageTreeNode({ 
  page, 
  pages, 
  level = 0, 
  onSelect, 
  selectedId,
  onMoveDoc
}: { 
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  level?: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onMoveDoc?: (doc: DocumentWithRelations) => void;
}) {
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
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 shadow-2xs" 
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
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-150", expanded && "rotate-90 text-blue-600 dark:text-blue-400")} />
            </button>
          ) : (
            <div className="w-4 h-4 shrink-0 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-muted transition-colors" />
            </div>
          )}

          <div className="w-4 h-4 flex items-center justify-center shrink-0 relative">
            {React.createElement(resolveIcon(page.icon), { className: cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-blue-600 dark:text-blue-400" : "text-muted group-hover:text-secondary") })}
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
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
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
              onClick={handleCreateChildPage}
              className="p-1 rounded text-muted hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
              title="Add child page"
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. BREADCRUMBS
// ==========================================
function Breadcrumbs({ 
  page, 
  pages, 
  onSelect 
}: { 
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  onSelect: (id: string) => void;
}) {
  const trail: DocumentWithRelations[] = [];
  let curr: DocumentWithRelations | undefined = page;
  while (curr) {
    trail.unshift(curr);
    curr = pages.find(p => p.id === curr?.parentId);
  }

  return (
    <div className="flex items-center gap-2 text-caption text-secondary mb-4 font-mono select-none overflow-x-auto py-1 border-b border-border/60 pb-2">
      <span 
        onClick={() => trail[0] && onSelect(trail[0].id)}
        className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors shrink-0 font-bold uppercase tracking-wider text-[11px]"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 stroke-[1.75]" /> Brain Base
      </span>
      {trail.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-2 flex-shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0 stroke-[1.5]" />
          <span 
            onClick={() => onSelect(p.id)}
            className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all text-[12px] cursor-pointer", 
              idx === trail.length - 1 
                ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20" 
                : "hover:text-blue-600 hover:bg-surface-hover text-secondary font-medium"
            )}
          >
            {React.createElement(resolveIcon(p.icon), { className: idx === trail.length - 1 ? "w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" : "w-3 h-3 text-secondary shrink-0" })}
            <span className="font-sans truncate max-w-[140px]">{p.title || 'Untitled Document'}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 3. FULL-TEXT SEARCH POPUP DIALOG
// ==========================================
function FullTextSearchDialog({
  workspaceId,
  isOpen,
  onClose,
  onSelectDoc
}: {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const targetWid = workspaceId || (typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : '');
        if (!targetWid) return;
        const res = await api.documents.search(targetWid, query);
        setResults(res || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  }, [query, workspaceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-24 px-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center gap-3 bg-surface">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search specs, notes, architecture docs with ranked tsvector..."
            className="flex-1 bg-transparent border-none outline-none text-primary placeholder:text-muted text-body"
          />
          {isSearching && <RefreshCw className="w-4 h-4 text-muted animate-spin shrink-0" />}
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 divide-y divide-border/40">
          {query.trim() && results.length === 0 && !isSearching && (
            <div className="py-12 text-center text-secondary font-mono text-caption">
              No matching documents found for "{query}".
            </div>
          )}

          {!query.trim() && (
            <div className="py-8 text-center text-muted font-mono text-caption">
              Type keywords to search across all workspace specifications.
            </div>
          )}

          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onSelectDoc(item.id);
                onClose();
              }}
              className="py-3 px-3 hover:bg-blue-500/5 rounded-xl cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {item.title}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-secondary border border-border">
                  {item.documentType || 'DOC'}
                </span>
              </div>
              {item.snippet && (
                <p 
                  className="text-secondary text-[12px] line-clamp-2 font-mono leading-relaxed pl-6"
                  dangerouslySetInnerHTML={{ __html: item.snippet }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. VERSION HISTORY MODAL
// ==========================================
function VersionHistoryModal({
  documentId,
  isOpen,
  onClose,
  onRestoreSuccess
}: {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => api.documents.getVersions(documentId),
    enabled: isOpen
  });

  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleManualSave = async () => {
    try {
      await api.documents.createVersion(documentId);
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      toast.success('Snapshot created manually');
    } catch {
      toast.error('Failed to create version snapshot');
    }
  };

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId);
    try {
      await api.documents.restoreVersion(documentId, versionId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      toast.success('Restored document to selected snapshot');
      onRestoreSuccess();
      onClose();
    } catch {
      toast.error('Failed to restore version snapshot');
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-primary text-body">Version Snapshots</span>
          </div>
          <div className="flex items-center gap-2">
            <BaseButton onClick={handleManualSave} className="text-caption py-1 px-2.5">
              Snapshot Now
            </BaseButton>
            <button onClick={onClose} className="p-1 text-muted hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          {isLoading && <div className="py-8 text-center text-muted font-mono text-caption">Loading snapshots...</div>}
          {!isLoading && versions.length === 0 && (
            <div className="py-8 text-center text-secondary font-mono text-caption">
              No version snapshots recorded yet. Auto-snapshots fire after 50 mutations or 5 minutes of idle writing.
            </div>
          )}

          {versions.map((v: any) => (
            <div 
              key={v.id}
              className="p-3 rounded-xl border border-border/70 hover:border-blue-500/30 bg-surface-hover/50 flex items-center justify-between gap-3 transition-colors"
            >
              <div>
                <span className="font-bold font-mono text-primary text-caption block">
                  Version #{v.versionNumber}
                </span>
                <span className="text-[11px] text-secondary font-mono">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
              <BaseButton
                disabled={restoringId === v.id}
                onClick={() => handleRestore(v.id)}
                className="text-caption py-1 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20"
              >
                {restoringId === v.id ? 'Restoring...' : 'Restore'}
              </BaseButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. ADD ENTITY LINK MODAL
// ==========================================
function AddEntityLinkModal({
  documentId,
  pages,
  projects,
  isOpen,
  onClose,
  onSuccess
}: {
  documentId: string;
  pages: DocumentWithRelations[];
  projects: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [targetType, setTargetType] = useState<'DOCUMENT' | 'PROJECT' | 'TASK'>('DOCUMENT');
  const [linkType, setLinkType] = useState<'REFERENCE' | 'RELATED'>('REFERENCE');
  const [targetId, setTargetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch workspace tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list(),
    enabled: isOpen
  });

  // Available documents excluding current
  const availableDocs = pages.filter(p => p.id !== documentId);

  useEffect(() => {
    if (targetType === 'DOCUMENT' && availableDocs[0]) setTargetId(availableDocs[0].id);
    else if (targetType === 'PROJECT' && projects[0]) setTargetId(projects[0].id);
    else if (targetType === 'TASK' && tasks[0]) setTargetId(tasks[0].id);
    else setTargetId('');
  }, [targetType, tasks, projects]);

  const handleCreate = async () => {
    if (!targetId) {
      toast.error('Please select an entity to link');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.documents.addLink(documentId, {
        targetType,
        targetId,
        linkType
      });
      toast.success('Bidirectional entity link created');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to link entity: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-primary text-body">Link Document</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 font-sans text-caption">
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Target Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('DOCUMENT')}
                className={cn("py-2 px-2.5 rounded-xl border text-center font-bold transition-all text-[12px]",
                  targetType === 'DOCUMENT' 
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" 
                    : "border-border hover:bg-surface-hover text-secondary"
                )}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => setTargetType('PROJECT')}
                className={cn("py-2 px-2.5 rounded-xl border text-center font-bold transition-all text-[12px]",
                  targetType === 'PROJECT' 
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400" 
                    : "border-border hover:bg-surface-hover text-secondary"
                )}
              >
                Project
              </button>
              <button
                type="button"
                onClick={() => setTargetType('TASK')}
                className={cn("py-2 px-2.5 rounded-xl border text-center font-bold transition-all text-[12px]",
                  targetType === 'TASK' 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" 
                    : "border-border hover:bg-surface-hover text-secondary"
                )}
              >
                Task
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Relation Type</label>
            <select 
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-mono text-caption"
            >
              <option value="REFERENCE">REFERENCE (Grounded 1-hop AI context)</option>
              <option value="RELATED">RELATED (Topological relationship)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Select Target</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-mono text-caption"
            >
              {targetType === 'DOCUMENT' && availableDocs.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
              {targetType === 'PROJECT' && projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {targetType === 'TASK' && tasks.map((t: any) => (
                <option key={t.id} value={t.id}>{t.title} ({t.status || 'TODO'})</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <BaseButton variant="secondary" onClick={onClose} className="text-caption py-1.5">
              Cancel
            </BaseButton>
            <BaseButton disabled={isSubmitting} onClick={handleCreate} className="text-caption py-1.5">
              {isSubmitting ? 'Linking...' : 'Create Link'}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. GROUNDED AI ASSIST SLIDE-OVER PANEL
// ==========================================
function GroundedAIPanel({
  documentId,
  documentTitle,
  editor,
  isOpen,
  onClose
}: {
  documentId: string;
  documentTitle: string;
  editor: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'ask' | 'compose'>('ask');
  const [question, setQuestion] = useState('');
  const [askOutput, setAskOutput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const [composeMode, setComposeMode] = useState<'write' | 'improve' | 'explain'>('write');
  const [composeInstruction, setComposeInstruction] = useState('');
  const [composeOutput, setComposeOutput] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Read selection from editor if any
  const selectionText = useMemo(() => {
    if (!editor || editor.isDestroyed) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }, [editor, isOpen, tab]);

  const handleAsk = () => {
    if (!question.trim()) return;
    setAskOutput('');
    setIsAsking(true);
    abortControllerRef.current = new AbortController();

    api.documents.aiAsk(
      documentId,
      question,
      (chunk) => setAskOutput(prev => prev + chunk),
      () => setIsAsking(false),
      (err) => {
        setIsAsking(false);
        toast.error('AI Q&A failed: ' + (err?.message || 'Check GROQ_API_KEY'));
      },
      abortControllerRef.current.signal
    );
  };

  const handleCompose = () => {
    if (!composeInstruction.trim()) return;
    setComposeOutput('');
    setIsComposing(true);
    abortControllerRef.current = new AbortController();

    api.documents.aiCompose(
      documentId,
      {
        instruction: composeInstruction,
        mode: composeMode,
        selection: selectionText || undefined
      },
      (chunk) => setComposeOutput(prev => prev + chunk),
      () => setIsComposing(false),
      (err) => {
        setIsComposing(false);
        toast.error('AI Compose failed: ' + (err?.message || 'Check GROQ_API_KEY'));
      },
      abortControllerRef.current.signal
    );
  };

  const handleInsertIntoEditor = (text: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
    toast.success('Inserted AI content into editor');
  };

  const handleReplaceSelection = (text: string) => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().insertContent(text).run();
    toast.success('Replaced selection with AI content');
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 border-l border-border bg-surface flex flex-col h-full shrink-0 shadow-xl z-20 font-sans animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-primary text-body">Grounded AI Assist</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-hover">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-border bg-surface-hover/40 text-caption font-mono font-bold">
        <button
          onClick={() => setTab('ask')}
          className={cn("flex-1 py-2.5 text-center transition-all border-b-2",
            tab === 'ask' 
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-surface" 
              : "border-transparent text-secondary hover:text-primary"
          )}
        >
          Ask Notes
        </button>
        <button
          onClick={() => setTab('compose')}
          className={cn("flex-1 py-2.5 text-center transition-all border-b-2",
            tab === 'compose' 
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-surface" 
              : "border-transparent text-secondary hover:text-primary"
          )}
        >
          Compose & Refine
        </button>
      </div>

      {/* Tab 1: Ask Notes */}
      {tab === 'ask' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-caption font-mono text-secondary flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>Grounded in <strong className="text-primary font-sans">{documentTitle}</strong> and its 1-hop reference documents.</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask anything about this spec..."
              className="flex-1 p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-sans text-caption"
            />
            <BaseButton disabled={isAsking || !question.trim()} onClick={handleAsk} className="px-3 py-1.5">
              {isAsking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </BaseButton>
          </div>

          {askOutput && (
            <div className="flex-1 p-3.5 rounded-xl border border-border bg-surface-hover/30 text-caption font-sans leading-relaxed text-primary overflow-y-auto whitespace-pre-wrap">
              {askOutput}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Compose & Refine */}
      {tab === 'compose' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Task Mode</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['write', 'improve', 'explain'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setComposeMode(m)}
                  className={cn("py-1.5 px-2 rounded-lg text-caption font-mono font-bold capitalize transition-all border",
                    composeMode === m 
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" 
                      : "border-border text-secondary hover:bg-surface-hover"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {selectionText && composeMode !== 'write' && (
            <div className="p-2.5 rounded-xl border border-border bg-surface-hover/40 text-caption">
              <span className="font-bold text-secondary font-mono text-[10px] uppercase block mb-1">Target Selection:</span>
              <p className="line-clamp-3 italic text-secondary font-mono text-[11px]">{selectionText}</p>
            </div>
          )}

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Instruction</label>
            <textarea
              rows={3}
              value={composeInstruction}
              onChange={(e) => setComposeInstruction(e.target.value)}
              placeholder={composeMode === 'write' ? 'e.g. Outline deployment architecture checklist...' : 'e.g. Make it more concise and formal...'}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-sans text-caption resize-none"
            />
          </div>

          <BaseButton disabled={isComposing || !composeInstruction.trim()} onClick={handleCompose} className="w-full py-2">
            {isComposing ? 'Generating...' : 'Generate with AI'}
          </BaseButton>

          {composeOutput && (
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="p-3.5 rounded-xl border border-border bg-surface-hover/30 text-caption font-sans leading-relaxed text-primary overflow-y-auto whitespace-pre-wrap max-h-60">
                {composeOutput}
              </div>
              <div className="flex gap-2">
                <BaseButton 
                  onClick={() => handleInsertIntoEditor(composeOutput)} 
                  className="flex-1 text-caption py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                >
                  Insert at Cursor
                </BaseButton>
                {selectionText && (
                  <BaseButton 
                    onClick={() => handleReplaceSelection(composeOutput)} 
                    className="flex-1 text-caption py-1.5"
                  >
                    Replace Selection
                  </BaseButton>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. INTERACTIVE KNOWLEDGE GRAPH VIEW (PHASE 6)
// ==========================================
function KnowledgeGraphCanvas({
  workspaceId,
  onSelectDoc
}: {
  workspaceId: string;
  onSelectDoc: (id: string) => void;
}) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectiveWid = workspaceId || (typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : '') || '';
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['workspace-graph', effectiveWid],
    queryFn: () => api.documents.getGraph(effectiveWid),
    enabled: !!effectiveWid
  });

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Node simulation coordinates
  const nodesRef = useRef<any[]>([]);

  // Initialize node layout
  useEffect(() => {
    if (!graphData?.nodes) return;
    const count = graphData.nodes.length;
    const radius = Math.max(160, count * 28);
    nodesRef.current = graphData.nodes.map((node: any, i: number) => {
      const angle = (i / count) * 2 * Math.PI;
      return {
        ...node,
        x: Math.cos(angle) * radius + (Math.random() * 40 - 20),
        y: Math.sin(angle) * radius + (Math.random() * 40 - 20),
        vx: 0,
        vy: 0,
        radius: 24
      };
    });
  }, [graphData]);

  // Physics animation loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const nodes = nodesRef.current;
      const links = graphData?.links || [];

      // Simple repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.4;
            nodes[i].vx -= dx * force;
            nodes[i].vy -= dy * force;
            nodes[j].vx += dx * force;
            nodes[j].vy += dy * force;
          }
        }
      }

      // Spring attraction for links
      for (const link of links) {
        const source = nodes.find(n => n.id === link.sourceId);
        const target = nodes.find(n => n.id === link.targetId);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 120) * 0.005;
          source.vx += dx * force;
          source.vy += dy * force;
          target.vx -= dx * force;
          target.vy -= dy * force;
        }
      }

      // Center gravity & velocity dampening
      for (const node of nodes) {
        node.vx -= node.x * 0.002;
        node.vy -= node.y * 0.002;
        node.vx *= 0.88;
        node.vy *= 0.88;
        node.x += node.vx;
        node.y += node.vy;
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.scale(zoom, zoom);

      // Draw links
      for (const link of links) {
        const source = nodes.find(n => n.id === link.sourceId);
        const target = nodes.find(n => n.id === link.targetId);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = link.linkType === 'REFERENCE' ? 'rgba(37, 99, 235, 0.45)' : 'rgba(156, 163, 175, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw small arrow head
          const angle = Math.atan2(target.y - source.y, target.x - source.x);
          const arrowDist = 28;
          const arrowX = target.x - Math.cos(angle) * arrowDist;
          const arrowY = target.y - Math.sin(angle) * arrowDist;
          ctx.beginPath();
          ctx.arc(arrowX, arrowY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#2563EB';
          ctx.fill();
        }
      }

      // Draw nodes with multi-entity shapes (DOCUMENT: circle, PROJECT: hexagon/rect, TASK: square)
      for (const node of nodes) {
        const isMatch = !searchFilter || (node.title || '').toLowerCase().includes(searchFilter.toLowerCase());
        const isHover = hoveredNode?.id === node.id;
        const nodeType = node.type || 'DOCUMENT';

        ctx.save();
        if (nodeType === 'PROJECT') {
          // Rounded Hexagon/Box for PROJECT
          const w = node.radius * 2;
          const h = node.radius * 1.5;
          ctx.beginPath();
          if ((ctx as any).roundRect) {
            (ctx as any).roundRect(node.x - w / 2, node.y - h / 2, w, h, 8);
          } else {
            ctx.rect(node.x - w / 2, node.y - h / 2, w, h);
          }
          ctx.fillStyle = isHover ? '#7C3AED' : isMatch ? '#2E1065' : 'rgba(100, 116, 139, 0.3)';
          ctx.fill();
          ctx.strokeStyle = isHover ? '#C084FC' : '#9333EA';
          ctx.lineWidth = isHover ? 3 : 1.5;
          ctx.stroke();
        } else if (nodeType === 'TASK') {
          // Rounded Square for TASK
          const size = node.radius * 1.6;
          ctx.beginPath();
          if ((ctx as any).roundRect) {
            (ctx as any).roundRect(node.x - size / 2, node.y - size / 2, size, size, 6);
          } else {
            ctx.rect(node.x - size / 2, node.y - size / 2, size, size);
          }
          ctx.fillStyle = isHover ? '#D97706' : isMatch ? '#451A03' : 'rgba(100, 116, 139, 0.3)';
          ctx.fill();
          ctx.strokeStyle = isHover ? '#FCD34D' : '#F59E0B';
          ctx.lineWidth = isHover ? 3 : 1.5;
          ctx.stroke();
        } else {
          // Circle for DOCUMENT
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          ctx.fillStyle = isHover ? '#2563EB' : isMatch ? '#1E293B' : 'rgba(100, 116, 139, 0.3)';
          ctx.fill();
          ctx.strokeStyle = isHover ? '#60A5FA' : '#3B82F6';
          ctx.lineWidth = isHover ? 3 : 1.5;
          ctx.stroke();
        }
        ctx.restore();

        // Node Label
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillStyle = isMatch ? '#F8FAFC' : 'rgba(156, 163, 175, 0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.title || 'Untitled', node.x, node.y + node.radius + 6);
      }

      ctx.restore();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [graphData, zoom, offset, hoveredNode, searchFilter]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    // Check hit node
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - canvas.width / 2 - offset.x) / zoom;
    const mouseY = (e.clientY - rect.top - canvas.height / 2 - offset.y) / zoom;

    const hit = nodesRef.current.find(n => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius;
    });

    setHoveredNode(hit || null);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = () => {
    if (hoveredNode) {
      if (hoveredNode.type === 'PROJECT') {
        navigate(`/app/projects/${hoveredNode.id}`);
      } else if (hoveredNode.type === 'TASK') {
        navigate('/app/tasks');
      } else {
        onSelectDoc(hoveredNode.id);
      }
    }
  };

  if (isLoading) return <LoadingState title="Loading Knowledge Graph..." description="Synthesizing document topology..." />;

  const nodesCount = graphData?.nodes?.length || 0;
  const linksCount = graphData?.links?.length || 0;

  return (
    <div className="flex-1 h-full w-full relative bg-canvas overflow-hidden flex flex-col font-sans select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-md">
          <Search className="w-4 h-4 text-muted ml-2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter nodes..."
            className="bg-transparent border-none outline-none text-primary text-caption font-mono w-40 placeholder:text-muted pr-2"
          />
        </div>

        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-md text-caption font-mono text-secondary">
          <span className="px-2 font-bold">{nodesCount} Nodes • {linksCount} Links</span>
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} className="p-1.5 rounded hover:bg-surface-hover text-primary">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="p-1.5 rounded hover:bg-surface-hover text-primary">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-1.5 rounded hover:bg-surface-hover text-primary">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className={cn("flex-1 cursor-grab active:cursor-grabbing w-full h-full", hoveredNode && "cursor-pointer")}
      />
    </div>
  );
}

// ==========================================
// 8. EDITOR COMPONENT
// ==========================================
function Editor({ 
  page, 
  pages, 
  projects,
  onSelectDoc,
  onMoveDoc
}: { 
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  projects: any[];
  onSelectDoc: (id: string) => void;
  onMoveDoc?: (doc: DocumentWithRelations) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page.title || '');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveErrorToastRef = useRef<number>(0);

  // Fetch workspace tasks for entity linking and references
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list()
  });

  // Sync title when active document switches
  useEffect(() => {
    setTitle(page.title || '');
  }, [page.id, page.title]);

  // Fetch links for current document
  const { data: linksData, refetch: refetchLinks } = useQuery({
    queryKey: ['document-links', page.id],
    queryFn: () => api.documents.getLinks(page.id),
    enabled: !!page.id
  });

  const handleToggleFavorite = async () => {
    try {
      await api.documents.favorite(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(page.isFavorite ? 'Removed from favorites' : 'Marked as favorite');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await api.documents.duplicate(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (copy?.id) onSelectDoc(copy.id);
      toast.success(`Duplicated "${page.title}"`);
    } catch (err: any) {
      toast.error('Failed to duplicate document: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      api.documents.update(page.id, { title: newTitle })
        .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
        .catch((err: any) => {
          toast.error('Failed to update page title: ' + (err?.message || 'Unknown error'));
        });
    }, 500);
  };

  const handleLinkProject = async (projectId: string | null) => {
    try {
      await api.documents.update(page.id, { projectId: projectId || null, linkedProjectId: projectId || null });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(projectId ? 'Document linked to project' : 'Document unlinked from project');
    } catch (err: any) {
      toast.error('Failed to update project link: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleDocumentTypeChange = async (type: string) => {
    try {
      await api.documents.update(page.id, { documentType: type });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Document type updated to ${type}`);
    } catch (err: any) {
      toast.error('Failed to update type');
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    try {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].name;
      await api.documents.addTag(page.id, newTagInput.trim(), color);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setNewTagInput('');
      setIsAddingTag(false);
      toast.success(`Tag #${newTagInput.trim()} added`);
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.documents.removeTag(page.id, tagId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Tag removed');
    } catch {
      toast.error('Failed to remove tag');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.documents.removeLink(linkId);
      refetchLinks();
      toast.success('Link removed');
    } catch {
      toast.error('Failed to remove link');
    }
  };

  const handleExport = (format: 'md' | 'spec') => {
    const filename = `${page.title || 'document'}.${format === 'spec' ? 'spec.md' : 'md'}`;
    api.documents.export(page.id, format, filename)
      .then(() => toast.success(`Exported as ${format === 'spec' ? 'Architecture Spec' : 'Markdown'}`))
      .catch(() => toast.error('Export failed'));
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Type / for commands, or start writing clean engineering thoughts...' })
    ],
    content: (page.contentJson ? page.contentJson as Content : ''),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        api.documents.updateContent(page.id, json)
          .catch((err: any) => {
            const now = Date.now();
            if (now - lastSaveErrorToastRef.current > 4000) {
              lastSaveErrorToastRef.current = now;
              toast.error('Failed to save page content: ' + (err?.message || 'Unknown error'));
            }
          });
      }, 500);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[420px] text-primary leading-relaxed font-sans text-body',
      },
    },
  });

  // Sync content on document change
  useEffect(() => {
    if (editor && page.contentJson) {
      editor.commands.setContent(page.contentJson as Content);
    } else if (editor) {
      editor.commands.setContent('');
    }
  }, [page.id, editor]);

  // Word count & metrics
  const textContent = editor ? editor.getText() : (page.title || '');
  const words = textContent.trim().split(/\s+/).filter((w: string) => w.length > 0);
  const wordCount = words.length;
  const charCount = textContent.length;
  const readTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      <div className="flex-1 overflow-y-auto py-6 px-4 md:px-8 max-w-5xl mx-auto flex flex-col font-sans">
        <Breadcrumbs page={page} pages={pages} onSelect={onSelectDoc} />

        {/* Telemetry Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs hover:bg-blue-500/20 transition-colors cursor-pointer">
              <IconPicker
                value={page.icon}
                onChange={(newIcon) => {
                  api.documents.update(page.id, { icon: newIcon })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
                    .catch(() => toast.error('Failed to update icon'));
                }}
                triggerClassName="border-none hover:border-none shadow-none bg-transparent hover:bg-transparent !p-0"
              />
            </div>

            {/* Favorite Star Button */}
            <button
              onClick={handleToggleFavorite}
              className={cn("p-2 rounded-xl border transition-colors cursor-pointer shrink-0",
                page.isFavorite 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20" 
                  : "border-border bg-surface hover:bg-surface-hover text-muted hover:text-primary"
              )}
              title={page.isFavorite ? "Favorited" : "Star as favorite"}
            >
              <Star className={cn("w-4 h-4", page.isFavorite && "fill-amber-500")} />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                {/* Document Type Picker */}
                <select
                  value={page.documentType || 'GENERAL'}
                  onChange={(e) => handleDocumentTypeChange(e.target.value)}
                  className="bg-surface-hover text-secondary hover:text-primary px-2 py-0.5 rounded-md border border-border text-[11px] font-mono font-bold outline-none cursor-pointer"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="SPEC">SPEC</option>
                  <option value="RFC">RFC</option>
                  <option value="MEETING">MEETING</option>
                  <option value="IDEA">IDEA</option>
                  <option value="NOTE">NOTE</option>
                </select>
                <span className="text-secondary font-mono text-[11px]">•</span>
                <span className="text-caption font-mono text-secondary flex items-center gap-2">
                  <span className="flex items-center gap-1 font-bold">
                    <AlignLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[1.5]" /> {wordCount} words ({charCount} chars)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                    <Clock className="w-3.5 h-3.5 stroke-[1.5]" /> ~{readTimeMins}m read
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Project Linker */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface text-caption font-mono">
              <FolderKanban className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <select
                value={page.projectId || page.linkedProjectId || ''}
                onChange={(e) => handleLinkProject(e.target.value || null)}
                className="bg-transparent text-primary text-[11px] font-medium outline-none cursor-pointer pr-1"
              >
                <option value="" className="bg-surface text-secondary">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-primary">{p.name}</option>
                ))}
              </select>
            </div>

            {/* Move Document Button */}
            <button
              onClick={() => onMoveDoc?.(page)}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Move Document..."
            >
              <FolderInput className="w-4 h-4 stroke-[1.5]" />
            </button>

            {/* Duplicate Document Button */}
            <button
              onClick={handleDuplicate}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Duplicate Document Subtree"
            >
              <Copy className="w-4 h-4 stroke-[1.5]" />
            </button>

            {/* Version History Button */}
            <button
              onClick={() => setIsVersionModalOpen(true)}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Version Snapshots & Restore"
            >
              <History className="w-4 h-4 stroke-[1.5]" />
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button 
                className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary text-caption font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-muted" />
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-surface border border-border rounded-xl shadow-xl py-1 w-48 z-30 font-mono text-caption">
                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-3 py-2 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  onClick={() => handleExport('spec')}
                  className="w-full text-left px-3 py-2 hover:bg-surface-hover text-primary flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-500" />
                  <span>Full Spec (.spec.md)</span>
                </button>
              </div>
            </div>

            {/* AI Assistant Button */}
            <button
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={cn("px-3 py-1.5 rounded-xl text-caption font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer",
                isAiOpen 
                  ? "bg-blue-600 text-white" 
                  : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assist</span>
            </button>
          </div>
        </div>

        {/* Tags Bar */}
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          {page.tags?.map((item: any) => {
            const tag = item.tag || item;
            const colorClass = getTagColor(tag.color);
            return (
              <span
                key={tag.id}
                className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border", colorClass.bg, colorClass.text, colorClass.border)}
              >
                <span>#{tag.name}</span>
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:opacity-75 focus:outline-none ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {isAddingTag ? (
            <div className="inline-flex items-center gap-1 bg-surface border border-border rounded-md px-2 py-0.5 text-[11px] font-mono">
              <span>#</span>
              <input
                autoFocus
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setIsAddingTag(false);
                }}
                placeholder="tag name..."
                className="bg-transparent border-none outline-none text-primary w-24 text-[11px]"
              />
              <button onClick={handleAddTag} className="text-blue-600 hover:text-blue-500">
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTag(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-muted hover:text-primary hover:bg-surface-hover border border-dashed border-border"
            >
              <Plus className="w-3 h-3" />
              <span>Tag</span>
            </button>
          )}
        </div>

        {/* Writing Canvas Container */}
        <div className="flex-1 v4-card rounded-2xl border border-border shadow-xs bg-surface flex flex-col w-full overflow-hidden min-h-[580px] relative mb-8">
          {/* Command Ribbon */}
          {editor && (
            <div className="bg-surface-hover/80 backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-border">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-caption font-mono font-bold text-secondary flex items-center gap-1 mr-2 px-1 select-none uppercase tracking-wider text-[11px]">
                  <Command className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[1.75]" /> Insert:
                </span>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('heading', { level: 1 }) ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('heading', { level: 2 }) ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('bulletList') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('orderedList') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Ordered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('codeBlock') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={cn("px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer",
                    editor.isActive('blockquote') ? "bg-blue-600 text-white" : "bg-surface text-primary border border-border hover:bg-surface-hover"
                  )}
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="px-2 py-1 rounded-md text-[12px] font-mono font-bold transition-all cursor-pointer bg-surface text-primary border border-border hover:bg-surface-hover"
                  title="Horizontal Rule"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" /> Auto-saved
              </span>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              <input 
                type="text" 
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-3xl md:text-4xl font-extrabold bg-transparent border-none outline-none text-primary placeholder:text-muted w-full mb-6 font-sans tracking-tight focus:ring-0 px-0 leading-tight"
                placeholder="Untitled Document..."
              />
              {editor && <EditorContent editor={editor} className="flex-1 font-sans" />}
            </div>
          </div>
        </div>

        {/* 9. BIDIRECTIONAL ENTITY LINKS & BACKLINKS SECTION */}
        <div className="pt-6 border-t border-border font-mono text-caption mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-secondary">
              <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[1.75]" /> Bidirectional References & Backlinks
            </div>
            <BaseButton onClick={() => setIsLinkModalOpen(true)} className="text-caption py-1 px-2.5">
              + Link Item
            </BaseButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Incoming Backlinks */}
            <div className="p-4 rounded-xl border border-border bg-surface">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
                Incoming Backlinks ({linksData?.incoming?.length || 0})
              </span>
              {(!linksData?.incoming || linksData.incoming.length === 0) ? (
                <span className="text-muted text-[12px] italic">No documents currently reference this page.</span>
              ) : (
                <div className="space-y-1.5">
                  {linksData.incoming.map((link: any) => {
                    const sourceDoc = pages.find(p => p.id === link.sourceId);
                    return (
                      <div 
                        key={link.id}
                        onClick={() => sourceDoc && onSelectDoc(sourceDoc.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50 hover:bg-blue-500/10 cursor-pointer transition-colors"
                      >
                        <span className="font-sans font-medium text-primary text-[13px] truncate">
                          {sourceDoc?.title || `Doc #${link.sourceId.slice(0, 8)}`}
                        </span>
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {link.linkType}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Outgoing References */}
            <div className="p-4 rounded-xl border border-border bg-surface">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
                Outgoing References ({linksData?.outgoing?.length || 0})
              </span>
              {(!linksData?.outgoing || linksData.outgoing.length === 0) ? (
                <span className="text-muted text-[12px] italic">No outgoing entity links added yet.</span>
              ) : (
                <div className="space-y-1.5">
                  {linksData.outgoing.map((link: any) => {
                    let label = `${link.targetType} #${link.targetId.slice(0, 8)}`;
                    let statusBadge = '';
                    if (link.targetType === 'DOCUMENT') {
                      label = pages.find(p => p.id === link.targetId)?.title || label;
                    } else if (link.targetType === 'PROJECT') {
                      label = projects.find(p => p.id === link.targetId)?.name || label;
                    } else if (link.targetType === 'TASK') {
                      const task = tasks.find((t: any) => t.id === link.targetId);
                      label = task ? task.title : label;
                      statusBadge = task?.status || '';
                    }

                    const handleLinkClick = () => {
                      if (link.targetType === 'DOCUMENT') {
                        onSelectDoc(link.targetId);
                      } else if (link.targetType === 'PROJECT') {
                        navigate(`/app/projects/${link.targetId}`);
                      } else if (link.targetType === 'TASK') {
                        navigate('/app/tasks');
                      }
                    };

                    return (
                      <div 
                        key={link.id}
                        onClick={handleLinkClick}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50 hover:bg-blue-500/10 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {link.targetType === 'DOCUMENT' && <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          {link.targetType === 'PROJECT' && <FolderKanban className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                          {link.targetType === 'TASK' && <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className="font-sans font-medium text-primary text-[13px] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {statusBadge && (
                            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-secondary">
                              {statusBadge}
                            </span>
                          )}
                          <span className={cn("text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold",
                            link.targetType === 'DOCUMENT' && "text-blue-600 dark:text-blue-400 bg-blue-500/10",
                            link.targetType === 'PROJECT' && "text-purple-600 dark:text-purple-400 bg-purple-500/10",
                            link.targetType === 'TASK' && "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                          )}>
                            {link.targetType}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLink(link.id);
                            }}
                            className="p-1 text-muted hover:text-red-500 transition-colors"
                            title="Remove reference"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Transitive Project & Goal Status */}
          {page.linkedProject && (
            <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-primary font-sans">{page.linkedProject.name}</span>
                </div>
                <button
                  onClick={() => window.location.href = `/app/projects/${page.linkedProject?.id}`}
                  className="text-blue-600 hover:text-blue-500 font-bold flex items-center gap-1 text-[12px]"
                >
                  View Project <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over AI Assist Panel */}
      <GroundedAIPanel
        documentId={page.id}
        documentTitle={page.title || 'Untitled Document'}
        editor={editor}
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        documentId={page.id}
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onRestoreSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />

      {/* Add Entity Link Modal */}
      <AddEntityLinkModal
        documentId={page.id}
        pages={pages}
        projects={projects}
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSuccess={() => refetchLinks()}
      />
    </div>
  );
}

// ==========================================
// 10. MAIN BRAIN WORKSPACE CONTROLLER
// ==========================================
export function BrainWorkspace() {
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading, isError } = useQuery({ 
    queryKey: ['documents'], 
    queryFn: api.documents.list 
  });
  const { data: spaces = [] } = useQuery({ 
    queryKey: ['spaces'], 
    queryFn: api.spaces.list 
  });
  const { data: projects = [] } = useQuery({ 
    queryKey: ['projects'], 
    queryFn: api.projects.list 
  });
  const { workspaceId } = useAuth();
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: api.workspaces.list
  });

  const activeWorkspaceId = workspaceId || workspaces[0]?.id || (typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : '') || '';

  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id || null);
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [moveDocTarget, setMoveDocTarget] = useState<DocumentWithRelations | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial selection
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  // Global shortcut for Cmd/Ctrl+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateRootPage = async () => {
    try {
      let defaultSpaceId = pages[0]?.spaceId || spaces[0]?.id;
      if (!defaultSpaceId && spaces.length === 0) {
        try {
          const createdSpace = await api.spaces.create({ name: 'General' });
          defaultSpaceId = createdSpace.id;
          queryClient.invalidateQueries({ queryKey: ['spaces'] });
        } catch {
          // Server will fallback to auto-provisioning
        }
      }
      const newPage = await api.documents.create({
        title: 'Untitled Specification',
        workspaceId: activeWorkspaceId || undefined,
        spaceId: defaultSpaceId,
        blocks: []
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      if (newPage?.id) {
        setSelectedPageId(newPage.id);
        setViewMode('editor');
      }
      toast.success('Created new document');
    } catch (err: any) {
      toast.error('Failed to create document: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  const handleImportSpecClick = () => {
    fileInputRef.current?.click();
  };

  const handleSpecFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      try {
        const res = await api.documents.importSpec({
          content,
          spaceId: selectedPage?.spaceId || spaces[0]?.id || undefined
        });
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        if (res.document?.id) {
          setSelectedPageId(res.document.id);
          setViewMode('editor');
        }
        toast.success(res.message || `Spec "${file.name}" imported successfully`);
      } catch (err: any) {
        toast.error('Import failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) return <LoadingState variant="brain" title="Loading Knowledge Base..." description="Compiling technical specs and document hierarchy..." />;
  if (isError) {
    return (
      <div className="p-8 font-sans">
        <ErrorState
          title="Failed to Load Knowledge Base"
          message="Could not retrieve documents from the server. Please verify network connectivity."
        />
      </div>
    );
  }

  const rootPages = pages.filter(p => !p.parentId);
  const selectedPage = pages.find(p => p.id === selectedPageId) || pages[0];

  return (
    <div className="flex flex-col h-full w-full bg-canvas font-sans text-primary select-none overflow-hidden animate-in fade-in duration-150">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSpecFileSelected}
        accept=".md,.spec.md,.txt"
        className="hidden"
      />

      <PageHeader
        icon={Brain}
        iconColorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
        title="Brain Workspace"
        statPill={{ 
          icon: Sparkles, 
          label: `${pages.length} Specifications`, 
          colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
        }}
        description="Engineering specs, RFCs, and meeting notes with bidirectional entity links, grounded AI, and interactive graph."
        primaryAction={{
          label: "New Document",
          icon: Plus,
          onClick: handleCreateRootPage,
        }}
        className="mb-0 rounded-none border-x-0 border-t-0 border-b bg-surface shadow-none px-6 py-3.5"
      >
        {/* Actions & View Mode Toggle & Search trigger */}
        <div className="flex items-center gap-2">
          {/* Import Spec Button */}
          <BaseButton
            variant="secondary"
            onClick={handleImportSpecClick}
            className="text-caption py-1.5 px-3 flex items-center gap-1.5 font-mono font-bold"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Import Spec</span>
          </BaseButton>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary text-caption font-mono transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Search Specs...</span>
            <kbd className="hidden sm:inline text-[10px] bg-surface-hover px-1.5 py-0.5 rounded border border-border text-muted">⌘K</kbd>
          </button>

          <div className="flex items-center p-1 rounded-xl bg-surface-hover border border-border">
            <button
              onClick={() => setViewMode('editor')}
              className={cn("px-3 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === 'editor' 
                  ? "bg-surface text-blue-600 dark:text-blue-400 shadow-2xs border border-border/80" 
                  : "text-secondary hover:text-primary"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={cn("px-3 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === 'graph' 
                  ? "bg-surface text-blue-600 dark:text-blue-400 shadow-2xs border border-border/80" 
                  : "text-secondary hover:text-primary"
              )}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Graph</span>
            </button>
          </div>
        </div>
      </PageHeader>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden bg-surface">
        {viewMode === 'graph' ? (
          <KnowledgeGraphCanvas
            workspaceId={activeWorkspaceId}
            onSelectDoc={(id) => {
              setSelectedPageId(id);
              setViewMode('editor');
            }}
          />
        ) : (
          <>
            {/* Sidebar Column */}
            <div className="w-72 md:w-80 border-r border-border bg-surface-hover/30 flex flex-col h-full shrink-0 select-none">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-surface">
                <span className="text-caption font-mono font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[1.75]" /> Documents
                </span>
                <button 
                  onClick={handleCreateRootPage}
                  className="text-secondary hover:text-blue-600 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all rounded-lg p-1 cursor-pointer"
                  title="Add Root Document"
                >
                  <Plus className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
                {rootPages.map(page => (
                  <PageTreeNode 
                    key={page.id} 
                    page={page} 
                    pages={pages} 
                    onSelect={setSelectedPageId} 
                    selectedId={selectedPage?.id || null} 
                    onMoveDoc={setMoveDocTarget}
                  />
                ))}
              </div>
            </div>

            {/* Editor Area Column */}
            <div className="flex-1 h-full bg-surface relative overflow-hidden flex flex-col">
              {selectedPage ? (
                <Editor 
                  key={selectedPage.id} 
                  page={selectedPage} 
                  pages={pages} 
                  projects={projects}
                  onSelectDoc={setSelectedPageId}
                  onMoveDoc={setMoveDocTarget}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-8">
                  <EmptyState 
                    icon={FileSignature}
                    title="No Specification Selected"
                    description="Select a document from the page tree on the left or create a new specification to start writing."
                    actionLabel="Create New Spec"
                    onAction={handleCreateRootPage}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Global Search Dialog */}
      <FullTextSearchDialog
        workspaceId={activeWorkspaceId}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDoc={(id) => {
          setSelectedPageId(id);
          setViewMode('editor');
        }}
      />

      {/* Move Document Dialog */}
      <MoveDocumentModal
        doc={moveDocTarget}
        pages={pages}
        isOpen={!!moveDocTarget}
        onClose={() => setMoveDocTarget(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />
    </div>
  );
}
