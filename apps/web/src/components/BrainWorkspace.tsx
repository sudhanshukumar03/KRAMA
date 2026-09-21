import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Brain, BookOpen, Plus, Search, FileText, Network, Upload, 
  ListTree, Star, Clock, FileSignature
} from 'lucide-react';
import type { DocumentWithRelations } from '../types/schema';
import { cn } from '../lib/utils';
import { EmptyState } from './ui/EmptyState';
import { BaseButton } from './ui/BaseButton';
import { PageHeader } from './ui/PageHeader';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { toast } from 'sonner';
import { resolveIcon } from '../lib/iconResolver';

import { PageTreeNode } from './brain/PageTreeNode';
import { Editor } from './brain/Editor';
import { KnowledgeGraphCanvas } from './brain/KnowledgeGraphCanvas';
import { MoveDocumentModal } from './brain/modals/MoveDocumentModal';
import { CreateDocumentModal } from './brain/modals/CreateDocumentModal';
import { FullTextSearchDialog } from './brain/modals/FullTextSearchDialog';

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

  const [searchParams] = useSearchParams();
  const docParam = searchParams.get('doc');

  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => searchParams.get('doc') || pages[0]?.id || null);
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [moveDocTarget, setMoveDocTarget] = useState<DocumentWithRelations | null>(null);
  const [createDocTarget, setCreateDocTarget] = useState<{ parentId?: string; parentTitle?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync selection from ?doc= URL parameter or default to first page
  useEffect(() => {
    if (docParam && pages.some(p => p.id === docParam)) {
      setSelectedPageId(docParam);
      setViewMode('editor');
    } else if (!selectedPageId && pages.length > 0) {
      setSelectedPageId(pages[0].id);
    }
  }, [docParam, pages, selectedPageId]);

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

  const [sidebarTab, setSidebarTab] = useState<'tree' | 'favorites' | 'recent'>('tree');
  const favoritePages = useMemo(() => pages.filter(p => p.isFavorite), [pages]);
  const recentPages = useMemo(() => {
    return [...pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 20);
  }, [pages]);

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
        description="Engineering specs, RFCs, and notes."
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
                  onClick={() => setCreateDocTarget({})}
                  className="text-secondary hover:text-blue-600 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all rounded-lg p-1 cursor-pointer"
                  title="Add Document"
                >
                  <Plus className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>
              {/* Tab Switcher: Tree | Favorites | Recent */}
              <div className="flex items-center px-3 py-1.5 border-b border-border/70 bg-surface/50 gap-1 text-[11px] font-mono">
                <button
                  onClick={() => setSidebarTab('tree')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-bold transition-all cursor-pointer",
                    sidebarTab === 'tree'
                      ? "bg-surface text-blue-600 dark:text-blue-400 shadow-2xs border border-border/80"
                      : "text-secondary hover:text-primary hover:bg-surface-hover/50"
                  )}
                  title="Hierarchical Document Tree"
                >
                  <ListTree className="w-3.5 h-3.5" />
                  <span>Tree</span>
                </button>

                <button
                  onClick={() => setSidebarTab('favorites')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-bold transition-all cursor-pointer",
                    sidebarTab === 'favorites'
                      ? "bg-surface text-blue-600 dark:text-blue-400 shadow-2xs border border-border/80"
                      : "text-secondary hover:text-primary hover:bg-surface-hover/50"
                  )}
                  title="Starred Favorites"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Favs</span>
                  {favoritePages.length > 0 && (
                    <span className="text-[9px] px-1 rounded-full bg-amber-500/10 text-amber-600 font-mono font-bold">
                      {favoritePages.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSidebarTab('recent')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-bold transition-all cursor-pointer",
                    sidebarTab === 'recent'
                      ? "bg-surface text-blue-600 dark:text-blue-400 shadow-2xs border border-border/80"
                      : "text-secondary hover:text-primary hover:bg-surface-hover/50"
                  )}
                  title="Recently Modified Documents"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
                {sidebarTab === 'tree' && (
                  rootPages.map(page => (
                    <PageTreeNode 
                      key={page.id} 
                      page={page} 
                      pages={pages} 
                      onSelect={setSelectedPageId} 
                      selectedId={selectedPage?.id || null} 
                      onMoveDoc={setMoveDocTarget}
                      onCreateDoc={setCreateDocTarget}
                    />
                  ))
                )}

                {sidebarTab === 'favorites' && (
                  favoritePages.length === 0 ? (
                    <div className="py-8 text-center text-secondary font-mono text-[11px] px-3">
                      <Star className="w-6 h-6 text-muted mx-auto mb-2 opacity-40" />
                      <p>No favorited documents.</p>
                      <p className="text-muted mt-1 text-[10px]">Click the star in any document to bookmark it here.</p>
                    </div>
                  ) : (
                    favoritePages.map(p => {
                      const IconComp = resolveIcon(p.icon);
                      const isSelected = p.id === selectedPage?.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPageId(p.id)}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-body font-sans cursor-pointer transition-colors group",
                            isSelected
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                              : "text-secondary hover:text-primary hover:bg-surface-hover/70"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <IconComp className="w-3.5 h-3.5 shrink-0 text-muted group-hover:text-primary" />
                            <span className="truncate text-[12px]">{p.title || 'Untitled Document'}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {p.statusBadges?.[0] && (
                              <span className={cn(
                                "text-[9px] font-mono uppercase px-1 rounded font-bold border",
                                p.statusBadges[0] === 'DRAFT' && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                                p.statusBadges[0] === 'IN_REVIEW' && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                                p.statusBadges[0] === 'ACCEPTED' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                                p.statusBadges[0] === 'DEPRECATED' && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              )}>
                                {p.statusBadges[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {sidebarTab === 'recent' && (
                  recentPages.length === 0 ? (
                    <div className="py-8 text-center text-secondary font-mono text-[11px] px-3">
                      <Clock className="w-6 h-6 text-muted mx-auto mb-2 opacity-40" />
                      <p>No recent documents.</p>
                    </div>
                  ) : (
                    recentPages.map(p => {
                      const IconComp = resolveIcon(p.icon);
                      const isSelected = p.id === selectedPage?.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPageId(p.id)}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-body font-sans cursor-pointer transition-colors group",
                            isSelected
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                              : "text-secondary hover:text-primary hover:bg-surface-hover/70"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <IconComp className="w-3.5 h-3.5 shrink-0 text-muted group-hover:text-primary" />
                            <span className="truncate text-[12px]">{p.title || 'Untitled Document'}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2 text-[10px] font-mono text-muted">
                            {p.documentType || 'DOC'}
                          </div>
                        </div>
                      );
                    })
                  )
                )}
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
                    onAction={() => setCreateDocTarget({})}
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
        projects={projects}
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

      {/* Create Document Dialog */}
      <CreateDocumentModal
        isOpen={createDocTarget !== null}
        onClose={() => setCreateDocTarget(null)}
        target={createDocTarget}
        projects={projects}
        spaces={spaces}
        activeWorkspaceId={activeWorkspaceId}
        onSuccess={(newPageId) => {
          setSelectedPageId(newPageId);
          setViewMode('editor');
        }}
      />
    </div>
  );
}
