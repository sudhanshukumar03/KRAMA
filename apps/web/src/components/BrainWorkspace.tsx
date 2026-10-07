import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Brain, BookOpen, Plus, Search, FileText, Network, Upload, 
  ListTree, Star, Clock, FileSignature, FolderKanban, Trash2, RotateCcw, Settings2
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
import { ManageSpaceModal } from './brain/modals/ManageSpaceModal';

export function BrainWorkspace() {
  const queryClient = useQueryClient();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('krama_brain_selected_space') || 'ALL';
    }
    return 'ALL';
  });

  const handleSelectSpace = (val: string) => {
    setSelectedSpaceId(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('krama_brain_selected_space', val);
    }
  };

  const [spaceModalConfig, setSpaceModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    space?: { id: string; name: string; icon?: string | null } | null;
  }>({ isOpen: false, mode: 'create', space: null });

  const handleOpenCreateSpace = () => {
    setSpaceModalConfig({ isOpen: true, mode: 'create', space: null });
  };

  const handleOpenEditSpace = (spaceObj: { id: string; name: string; icon?: string | null }) => {
    setSpaceModalConfig({ isOpen: true, mode: 'edit', space: spaceObj });
  };

  const { data: pages = [], isLoading, isError } = useQuery({ 
    queryKey: ['documents', selectedSpaceId], 
    queryFn: () => api.documents.list(selectedSpaceId === 'ALL' ? undefined : selectedSpaceId) 
  });
  const { data: deletedPages = [] } = useQuery({
    queryKey: ['documents', 'deleted', selectedSpaceId],
    queryFn: () => api.documents.listDeleted(selectedSpaceId === 'ALL' ? undefined : selectedSpaceId),
  });
  const { data: spaces = [] } = useQuery({ 
    queryKey: ['spaces'], 
    queryFn: api.spaces.list 
  });
  const { data: projects = [], isLoading: projectsLoading, isError: projectsError, refetch: retryProjects } = useQuery({
    queryKey: ['projects'], 
    queryFn: api.projects.list 
  });
  const { workspaceId } = useAuth();
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: api.workspaces.list
  });

  const activeWorkspaceId = workspaceId || workspaces[0]?.id || (typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : '') || '';

  const activeSpace = useMemo(() => {
    return spaces.find(s => s.id === selectedSpaceId) || null;
  }, [spaces, selectedSpaceId]);

  const [searchParams, setSearchParams] = useSearchParams();
  const docParam = searchParams.get('doc');
  const projectParam = searchParams.get('projectId');

  const selectedPageId = docParam || pages[0]?.id || null;
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>(() => docParam ? 'editor' : 'list');
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [moveDocTarget, setMoveDocTarget] = useState<DocumentWithRelations | null>(null);
  const [createDocTarget, setCreateDocTarget] = useState<{ parentId?: string; parentTitle?: string; projectId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!projectParam || projectsLoading || projectsError) return;
    if (projects.some(project => project.id === projectParam)) {
      setCreateDocTarget({ projectId: projectParam });
    } else {
      toast.error('This project is unavailable in the current workspace');
    }
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('projectId'); return next; }, { replace: true });
  }, [projectParam, projects, projectsLoading, projectsError, setSearchParams]);

  const handleSelectDoc = async (id: string) => {
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (id) next.set('doc', id); else next.delete('doc'); return next; });
    setMobilePane('editor');
    setViewMode('editor');
    if (!pages.some(p => p.id === id) && selectedSpaceId !== 'ALL') {
      try {
        const fetched = await api.documents.get(id);
        if (fetched?.spaceId) {
          handleSelectSpace(fetched.spaceId);
        } else {
          handleSelectSpace('ALL');
        }
      } catch {
        handleSelectSpace('ALL');
      }
    }
  };

  useEffect(() => {
    if (docParam) { setMobilePane('editor'); setViewMode('editor'); }
  }, [docParam]);
  useEffect(() => {
    if (docParam && !isLoading && !pages.some(p => p.id === docParam) && selectedSpaceId !== 'ALL') handleSelectSpace('ALL');
  }, [docParam, isLoading, pages, selectedSpaceId]);

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
          handleSelectDoc(res.document.id);
          setViewMode('editor');
        }
        toast.success(res.message || `Spec "${file.name}" imported successfully`);
      } catch (err: any) {
        toast.error('Import failed: ' + (err?.message || 'Unknown error'));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const [sidebarTab, setSidebarTab] = useState<'tree' | 'favorites' | 'recent' | 'trash'>('tree');
  const favoritePages = useMemo(() => pages.filter(p => p.isFavorite), [pages]);
  const recentPages = useMemo(() => {
    return [...pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 20);
  }, [pages]);

  if (isLoading) return <LoadingState variant="brain" title="Loading Knowledge Base..." description="Compiling technical specs and document hierarchy..." />;
  if (projectParam && projectsError) return <div className="p-8"><ErrorState title="Could not load project context" onRetry={() => { retryProjects(); }} /></div>;
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

  const rootPages = pages.filter(p => !p.parentId || !pages.some(parent => parent.id === p.parentId));
  const selectedPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="flex flex-col h-full w-full bg-canvas font-sans text-primary select-none overflow-hidden animate-in fade-in duration-150">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSpecFileSelected}
        aria-label="Import document file"
        accept=".md,.spec.md,.txt"
        className="hidden"
      />

      <PageHeader
        icon={Brain}
        iconColorClass="bg-accent-subtle text-accent-fg border border-accent/20"
        title="Brain Workspace"
        description="Engineering specs, RFCs, technical notes, and linked knowledge — your second brain."
        className="mb-0 rounded-none border-x-0 border-t-0 border-b bg-surface shadow-none px-6 py-3.5"
      >
        {/* Actions & View Mode Toggle & Search trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Import Spec Button */}
          <BaseButton
            variant="secondary"
            aria-label="Import document"
            onClick={handleImportSpecClick}
            className="text-caption py-1.5 px-3 flex items-center gap-1.5 font-mono font-bold"
          >
            <Upload className="w-3.5 h-3.5 text-accent-fg" />
            <span className="hidden sm:inline">Import Spec</span>
          </BaseButton>

          <button
            aria-label="Search Specs..."
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary text-caption font-mono transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-accent-fg" />
            <span className="hidden sm:inline">Search Specs...</span>
          </button>

          <div className="flex items-center p-1 rounded-xl bg-surface-hover border border-border">
            <button
              onClick={() => setViewMode('editor')}
              className={cn("px-3 py-1 rounded-lg text-caption font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === 'editor' 
                  ? "bg-surface text-accent-fg shadow-2xs border border-border/80" 
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
                  ? "bg-surface text-accent-fg shadow-2xs border border-border/80" 
                  : "text-secondary hover:text-primary"
              )}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Graph</span>
            </button>
          </div>
        </div>
      </PageHeader>

      {viewMode === 'editor' && (
        <nav aria-label="Document view" className="flex gap-2 px-3 py-2 border-b border-border md:hidden">
          <button type="button" aria-pressed={mobilePane === 'list'} onClick={() => setMobilePane('list')} className="min-h-11 flex-1 rounded-lg border border-border text-caption text-primary aria-pressed:bg-accent-subtle aria-pressed:text-accent-fg aria-pressed:border-accent">Documents</button>
          <button type="button" aria-pressed={mobilePane === 'editor'} onClick={() => setMobilePane('editor')} className="min-h-11 flex-1 rounded-lg border border-border text-caption text-primary aria-pressed:bg-accent-subtle aria-pressed:text-accent-fg aria-pressed:border-accent">Editor</button>
        </nav>
      )}
      {/* Main Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-surface">
        {viewMode === 'graph' ? (
          <KnowledgeGraphCanvas
            workspaceId={activeWorkspaceId}
            onSelectDoc={handleSelectDoc}
          />
        ) : (
          <>
            {/* Sidebar Column */}
            <div className={cn("w-full md:w-80 border-r border-border bg-surface-hover/30 flex-col h-full shrink-0 select-none", mobilePane === "list" ? "flex" : "hidden md:flex")}>
              <div className="px-3.5 py-2.5 border-b border-border flex flex-col gap-2 bg-surface">
                <div className="flex justify-between items-center">
                  <span className="text-badge font-mono font-semibold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-accent-fg stroke-[1.75]" /> Documents
                  </span>
                  <button 
                    onClick={() => setCreateDocTarget({})}
                    className="text-secondary hover:text-accent-fg hover:bg-accent-subtle border border-transparent hover:border-accent/20 transition-all rounded-lg p-1 cursor-pointer"
                    title="Add Document"
                  >
                    <Plus className="w-4 h-4 stroke-[1.5]" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center gap-1.5 bg-canvas rounded-lg px-2 py-1 border border-border min-w-0">
                    {React.createElement(activeSpace?.icon ? resolveIcon(activeSpace.icon) : FolderKanban, {
                      className: "w-3 h-3 text-secondary shrink-0"
                    })}
                    <select
                      aria-label="Document space"
                      value={selectedSpaceId}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          handleOpenCreateSpace();
                        } else {
                          setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('doc'); return next; });
                          handleSelectSpace(e.target.value);
                        }
                      }}
                      className="bg-transparent text-caption font-mono text-primary font-semibold outline-none w-full cursor-pointer truncate"
                    >
                      <option value="ALL">All Spaces ({pages.length})</option>
                      {spaces.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="__NEW__">+ New Space...</option>
                    </select>
                  </div>
                  {selectedSpaceId !== 'ALL' && activeSpace && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditSpace(activeSpace)}
                      className="p-1 text-muted hover:text-accent-fg hover:bg-accent-subtle rounded-lg border border-border/60 transition-colors cursor-pointer shrink-0"
                      title={`Manage Space "${activeSpace.name}"`}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenCreateSpace}
                    className="p-1 text-muted hover:text-accent-fg hover:bg-accent-subtle rounded-lg border border-border/60 transition-colors cursor-pointer shrink-0"
                    title="Create New Space"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tab Switcher: Tree | Favorites | Recent | Trash */}
              <div className="flex items-center px-2 py-1.5 border-b border-border/70 bg-surface/50 gap-1 text-caption font-mono">
                <button
                  onClick={() => setSidebarTab('tree')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-bold transition-all cursor-pointer",
                    sidebarTab === 'tree'
                      ? "bg-surface text-accent-fg shadow-2xs border border-border/80"
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
                    "flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-bold transition-all cursor-pointer",
                    sidebarTab === 'favorites'
                      ? "bg-surface text-accent-fg shadow-2xs border border-border/80"
                      : "text-secondary hover:text-primary hover:bg-surface-hover/50"
                  )}
                  title="Starred Favorites"
                >
                  <Star className="w-3.5 h-3.5 text-warning-fg" />
                  <span>Favs</span>
                  {favoritePages.length > 0 && (
                    <span className="text-badge px-1 rounded-full bg-warning-bg text-warning-fg border border-warning-border font-mono font-bold">
                      {favoritePages.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSidebarTab('recent')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-bold transition-all cursor-pointer",
                    sidebarTab === 'recent'
                      ? "bg-surface text-accent-fg shadow-2xs border border-border/80"
                      : "text-secondary hover:text-primary hover:bg-surface-hover/50"
                  )}
                  title="Recently Modified Documents"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent</span>
                </button>

                <button
                  onClick={() => setSidebarTab('trash')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-bold transition-all cursor-pointer",
                    sidebarTab === 'trash'
                      ? "bg-surface text-danger-fg shadow-2xs border border-border/80"
                      : "text-secondary hover:text-danger-fg hover:bg-surface-hover/50"
                  )}
                  title="Soft-Deleted Documents (Trash)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Trash</span>
                  {deletedPages.length > 0 && (
                    <span className="text-badge px-1 rounded-full bg-danger-bg text-danger-fg border border-danger-border font-mono font-bold">
                      {deletedPages.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
                {sidebarTab === 'tree' && (
                  rootPages.map(page => (
                    <PageTreeNode 
                      key={page.id} 
                      page={page} 
                      pages={pages} 
                      onSelect={handleSelectDoc} 
                      selectedId={selectedPage?.id || null} 
                      onMoveDoc={setMoveDocTarget}
                      onCreateDoc={setCreateDocTarget}
                    />
                  ))
                )}

                {sidebarTab === 'favorites' && (
                  favoritePages.length === 0 ? (
                    <div className="py-8 text-center text-secondary font-mono text-caption px-3">
                      <Star className="w-6 h-6 text-muted mx-auto mb-2 opacity-40" />
                      <p>No favorited documents.</p>
                      <p className="text-muted mt-1 text-badge">Click the star in any document to bookmark it here.</p>
                    </div>
                  ) : (
                    favoritePages.map(p => {
                      const IconComp = resolveIcon(p.icon);
                      const isSelected = p.id === selectedPage?.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectDoc(p.id)}
                          className={cn(
                            "w-full text-left flex items-center justify-between px-2.5 py-1.5 min-h-11 rounded-lg text-body font-sans cursor-pointer transition-colors group",
                            isSelected
                              ? "bg-accent-subtle text-accent-fg font-medium"
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
                                "text-badge font-mono uppercase px-1 rounded font-bold border",
                                p.statusBadges[0] === 'DRAFT' && "bg-warning-bg text-warning-fg border-warning-border",
                                p.statusBadges[0] === 'IN_REVIEW' && "bg-accent-subtle text-accent-fg border-accent/30",
                                p.statusBadges[0] === 'ACCEPTED' && "bg-success-bg text-success-fg border-success-border",
                                p.statusBadges[0] === 'DEPRECATED' && "bg-danger-bg text-danger-fg border-danger-border"
                              )}>
                                {p.statusBadges[0]}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )
                )}

                {sidebarTab === 'recent' && (
                  recentPages.length === 0 ? (
                    <div className="py-8 text-center text-secondary font-mono text-caption px-3">
                      <Clock className="w-6 h-6 text-muted mx-auto mb-2 opacity-40" />
                      <p>No recent documents.</p>
                    </div>
                  ) : (
                    recentPages.map(p => {
                      const IconComp = resolveIcon(p.icon);
                      const isSelected = p.id === selectedPage?.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectDoc(p.id)}
                          className={cn(
                            "w-full text-left flex items-center justify-between px-2.5 py-1.5 min-h-11 rounded-lg text-body font-sans cursor-pointer transition-colors group",
                            isSelected
                              ? "bg-accent-subtle text-accent-fg font-medium"
                              : "text-secondary hover:text-primary hover:bg-surface-hover/70"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <IconComp className="w-3.5 h-3.5 shrink-0 text-muted group-hover:text-primary" />
                            <span className="truncate text-[12px]">{p.title || 'Untitled Document'}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2 text-badge font-mono text-muted">
                            {p.documentType || 'DOC'}
                          </div>
                        </button>
                      );
                    })
                  )
                )}

                {sidebarTab === 'trash' && (
                  deletedPages.length === 0 ? (
                    <div className="py-8 text-center text-secondary font-mono text-caption px-3">
                      <Trash2 className="w-6 h-6 text-muted mx-auto mb-2 opacity-40" />
                      <p>Trash is empty.</p>
                      <p className="text-muted mt-1 text-badge">
                        Soft-deleted documents will appear here. You can restore them or permanently purge them.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {deletedPages.map((p) => {
                        const IconComp = resolveIcon(p.icon);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded-xl border border-border/80 bg-surface hover:bg-surface-hover/50 text-caption font-sans transition-all group"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <IconComp className="w-3.5 h-3.5 shrink-0 text-muted opacity-60" />
                              <div className="min-w-0 flex-1">
                                <span className="truncate block text-[12px] text-muted line-through">
                                  {p.title || 'Untitled Document'}
                                </span>
                                <span className="text-badge font-mono text-muted/70 block">
                                  Deleted {new Date(p.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await api.documents.restore(p.id);
                                    queryClient.invalidateQueries({ queryKey: ['documents'] });
                                    toast.success(`Restored "${p.title}"`);
                                    handleSelectDoc(p.id);
                                    setSidebarTab('tree');
                                  } catch (err: any) {
                                    toast.error('Failed to restore: ' + (err?.message || 'Unknown error'));
                                  }
                                }}
                                className="p-1.5 rounded-lg text-secondary hover:text-accent-fg hover:bg-accent-subtle transition-colors cursor-pointer"
                                title="Restore Document"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`Permanently purge "${p.title}" and all its subdocuments? This CANNOT be undone.`)) {
                                    return;
                                  }
                                  try {
                                    await api.documents.purge(p.id);
                                    queryClient.invalidateQueries({ queryKey: ['documents'] });
                                    toast.success(`Permanently purged "${p.title}"`);
                                    if (selectedPageId === p.id) {
                                      handleSelectDoc(pages[0]?.id || '');
                                    }
                                  } catch (err: any) {
                                    toast.error('Failed to purge: ' + (err?.message || 'Admin privileges required'));
                                  }
                                }}
                                className="p-1.5 rounded-lg text-muted hover:text-danger-fg hover:bg-danger-bg transition-colors cursor-pointer"
                                title="Permanently Purge"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Editor Area Column */}
            <div className={cn("flex-1 min-w-0 h-full bg-surface relative overflow-hidden flex-col", mobilePane === "editor" ? "flex" : "hidden md:flex")}>
              {selectedPage ? (
                <Editor 
                  key={selectedPage.id} 
                  page={selectedPage} 
                  pages={pages} 
                  projects={projects}
                  onSelectDoc={handleSelectDoc}
                  onMoveDoc={setMoveDocTarget}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-8">
                  <EmptyState 
                    icon={FileSignature}
                    title={docParam ? "Document unavailable" : "No Specification Selected"}
                    description={docParam ? "This document may have been moved to Trash or is unavailable in this workspace. Choose another document or create one." : "Select a document from the page tree on the left or create a new specification to start writing."}
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
        onSelectDoc={handleSelectDoc}
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
        defaultSpaceId={selectedSpaceId === 'ALL' ? undefined : selectedSpaceId}
        onSuccess={handleSelectDoc}
      />

      {/* Manage / Create Space Dialog */}
      <ManageSpaceModal
        isOpen={spaceModalConfig.isOpen}
        mode={spaceModalConfig.mode}
        space={spaceModalConfig.space}
        onClose={() => setSpaceModalConfig(prev => ({ ...prev, isOpen: false }))}
        onSuccess={(targetSpaceId) => {
          queryClient.invalidateQueries({ queryKey: ['spaces'] });
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          if (targetSpaceId) {
            handleSelectSpace(targetSpaceId);
          }
        }}
      />
    </div>
  );
}
