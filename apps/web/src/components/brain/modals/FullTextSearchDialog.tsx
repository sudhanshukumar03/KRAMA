import { useState, useEffect } from 'react';
import { Search, RefreshCw, X, FileText } from 'lucide-react';
import { api } from '../../../api/client';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { cn } from '../../../lib/utils';
import type { DocumentSearchResult, Tag } from '../../../types/schema';

export interface FullTextSearchDialogProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
  projects?: { id: string; name: string }[];
}

export function FullTextSearchDialog({
  workspaceId,
  isOpen,
  onClose,
  onSelectDoc,
  projects = [],
}: FullTextSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [tags, setTags] = useState<Tag[]>([]);
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const modalRef = useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedType('ALL');
      setSelectedProject('ALL');
      setSelectedStatus('ALL');
      setSelectedTag('ALL');
      setResults([]);
      return;
    }

    const targetWid = workspaceId || (typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : '');
    if (targetWid) {
      api.documents.getTags(targetWid)
        .then((fetched) => setTags(fetched || []))
        .catch(() => setTags([]));
    }
  }, [isOpen, workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setSearchError('');
    setIsSearching(isOpen && !!query.trim());
    if (!isOpen || !query.trim()) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const targetWid = workspaceId || localStorage.getItem('krama_active_workspace');
        if (!targetWid) throw new Error('Choose a workspace before searching.');
        const res = await api.documents.search(targetWid, query, {
          type: selectedType, projectId: selectedProject, status: selectedStatus, tag: selectedTag,
        }, controller.signal);
        if (!controller.signal.aborted) setResults(res || []);
      } catch (error: any) {
        if (!controller.signal.aborted) setSearchError(error?.message || 'Could not search documents.');
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isOpen, query, selectedType, selectedProject, selectedStatus, selectedTag, workspaceId, retryCount]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-24 px-4 animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search Workspace Documents"
        className="krama-dialog w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
      >
        <div className="p-4 border-b border-border flex items-center gap-3 bg-surface">
          <Search className="w-5 h-5 text-accent-fg shrink-0" />
          <input
            aria-label="Search documents"
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search document titles and content…"
            className="flex-1 bg-transparent border-none outline-none text-primary placeholder:text-muted text-body"
          />
          {isSearching && <RefreshCw className="w-4 h-4 text-muted animate-spin shrink-0" />}
          <button
            aria-label="Close document search"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-Dimensional Search Filters */}
        <div className="px-4 py-2 border-b border-border/60 bg-surface-hover/30 flex items-center gap-2 overflow-x-auto text-caption font-mono">
          {/* Type Filter */}
          <select
            aria-label="Document type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-surface text-secondary hover:text-primary px-2 py-1 rounded-lg border border-border outline-none cursor-pointer font-bold"
          >
            <option value="ALL">All Types</option>
            <option value="SPEC">SPEC</option>
            <option value="RFC">RFC</option>
            <option value="MEETING">MEETING</option>
            <option value="IDEA">IDEA</option>
            <option value="NOTE">NOTE</option>
            <option value="GENERAL">GENERAL</option>
          </select>

          {/* Project Filter */}
          {projects.length > 0 && (
            <select
              aria-label="Project"
            value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-surface text-secondary hover:text-primary px-2 py-1 rounded-lg border border-border outline-none cursor-pointer font-medium max-w-[150px] truncate"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Lifecycle Status Filter */}
          <select
            aria-label="Lifecycle status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-surface text-secondary hover:text-primary px-2 py-1 rounded-lg border border-border outline-none cursor-pointer font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="DEPRECATED">DEPRECATED</option>
          </select>

          {/* Tag Filter */}
          {tags.length > 0 && (
            <select
              aria-label="Tag"
            value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-surface text-secondary hover:text-primary px-2 py-1 rounded-lg border border-border outline-none cursor-pointer font-bold max-w-[130px] truncate"
            >
              <option value="ALL">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.name}>#{t.name}</option>
              ))}
            </select>
          )}

          {(selectedType !== 'ALL' || selectedProject !== 'ALL' || selectedStatus !== 'ALL' || selectedTag !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedType('ALL');
                setSelectedProject('ALL');
                setSelectedStatus('ALL');
                setSelectedTag('ALL');
              }}
              className="text-accent-fg hover:underline px-1 py-0.5 ml-auto text-badge cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto p-3 divide-y divide-border/40">
          {searchError && <div role="alert" className="p-3 text-danger-fg text-caption">{searchError}<button className="min-h-11 px-3 underline" onClick={() => setRetryCount(n => n + 1)}>Retry search</button></div>}
          {query.trim() && results.length === 0 && !isSearching && !searchError && (
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
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onSelectDoc(item.id);
                onClose();
              }}
              className="w-full text-left py-3 px-3 hover:bg-surface-hover rounded-xl cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-primary group-hover:text-accent-fg flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-fg" />
                  {item.title}
                </span>
                <div className="flex items-center gap-1.5">
                  {item.statusBadges?.[0] && (
                    <span className={cn(
                      "text-badge font-mono uppercase px-1.5 py-0.2 rounded font-bold border",
                      item.statusBadges[0] === 'DRAFT' && "bg-warning-bg text-warning-fg border-warning-border",
                      item.statusBadges[0] === 'IN_REVIEW' && "bg-accent-subtle text-accent-fg border-accent/30",
                      item.statusBadges[0] === 'ACCEPTED' && "bg-success-bg text-success-fg border-success-border",
                      item.statusBadges[0] === 'DEPRECATED' && "bg-danger-bg text-danger-fg border-danger-border"
                    )}>
                      {item.statusBadges[0]}
                    </span>
                  )}
                  <span className="text-badge font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-secondary border border-border">
                    {item.documentType || 'DOC'}
                  </span>
                </div>
              </div>
              {item.snippet && (
                <span
                  className="text-secondary text-[12px] line-clamp-2 font-mono leading-relaxed pl-6"
                >{item.snippet.split(/(<b>.*?<\/b>)/gi).map((part, i) => {
                  const highlighted = /^<b>/i.test(part);
                  const text = part.replace(/<[^>]*>/g, '');
                  return highlighted ? <mark key={i} className="bg-accent-subtle text-accent-fg">{text}</mark> : text;
                })}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
