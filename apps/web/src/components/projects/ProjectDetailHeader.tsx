import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MoreHorizontal, ExternalLink, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { BaseButton } from '../ui/BaseButton';
import type { ProjectWithRelations } from '../../types/schema';

interface ProjectDetailHeaderProps {
  project: ProjectWithRelations;
  projects: ProjectWithRelations[];
  onEdit: () => void;
  onDelete: () => void;
}
/** Project navigation and its menu own their local interaction state. */
export function ProjectDetailHeader({ project, projects, onEdit, onDelete }: ProjectDetailHeaderProps) {
  const navigate = useNavigate();
  // Top header search & more menu
  const [initiativeSearch, setInitiativeSearch] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);
  const filteredInitiatives = projects.filter(p =>
    p.id !== project.id && p.name.toLowerCase().includes(initiativeSearch.toLowerCase())
  );

  return (
    <>
      {/* 1. TOP BREADCRUMB & UTILITY HEADER */}
      <header className="flex items-center justify-between px-6 md:px-8 py-3.5 border-b border-border bg-surface shrink-0">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2.5 text-caption font-medium">
          <Link
            to="/app/projects"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
            title="Return to Projects"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
          </Link>
          <Link to="/app/projects" className="text-secondary hover:text-primary transition-colors text-caption font-semibold uppercase tracking-wider font-mono">
            Projects
          </Link>
          <span className="text-muted/60 text-caption">›</span>
          <span className="font-bold text-primary tracking-tight text-body uppercase font-mono">{project.name}</span>
        </div>

        {/* Right: Search, Notifications, More, Edit Project */}
        <div className="flex items-center gap-3">
          <div className="relative w-56 sm:w-64 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="project-project-search"
              name="initiativeSearch"
              aria-label="Search projects"
              type="text"
              placeholder="Search projects... (press /)"
              value={initiativeSearch}
              onChange={(e) => {
                setInitiativeSearch(e.target.value);
                setSearchDropdownOpen(Boolean(e.target.value));
                setSearchSelectedIndex(0);
              }}
              onFocus={() => {
                if (initiativeSearch) setSearchDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (!searchDropdownOpen || filteredInitiatives.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSearchSelectedIndex(prev => (prev + 1) % filteredInitiatives.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSearchSelectedIndex(prev => (prev - 1 + filteredInitiatives.length) % filteredInitiatives.length);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const selected = filteredInitiatives[searchSelectedIndex];
                  if (selected) {
                    setInitiativeSearch('');
                    setSearchDropdownOpen(false);
                    navigate(`/app/projects/${selected.id}`);
                  }
                } else if (e.key === 'Escape') {
                  setSearchDropdownOpen(false);
                }
              }}
              className="w-full pl-8 pr-3 py-1.5 text-caption bg-surface-hover/60 border border-border/70 rounded-full focus:outline-none focus:border-accent focus:bg-surface transition-all placeholder:text-muted text-primary"
              aria-autocomplete="list"
              aria-expanded={searchDropdownOpen && Boolean(initiativeSearch)}
              aria-controls="project-search-listbox"
            />
            {searchDropdownOpen && initiativeSearch && (
              <div
                id="project-search-listbox"
                role="listbox"
                aria-label="Matching projects"
                className="absolute right-0 top-full mt-1.5 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption max-h-48 overflow-y-auto"
              >
                {filteredInitiatives.map((p, idx) => (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected={idx === searchSelectedIndex}
                    onClick={() => {
                      setInitiativeSearch('');
                      setSearchDropdownOpen(false);
                      navigate(`/app/projects/${p.id}`);
                    }}
                    className={cn(
                      "px-3.5 py-2 cursor-pointer flex items-center justify-between text-primary truncate transition-colors",
                      idx === searchSelectedIndex ? "bg-surface-hover text-accent font-semibold" : "hover:bg-surface-hover"
                    )}
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-badge font-mono text-muted uppercase tabular-nums">{p.status}</span>
                  </div>
                ))}
                {filteredInitiatives.length === 0 && (
                  <div className="p-3 text-center text-muted font-mono text-caption">No other projects match</div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(prev => !prev)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              className="w-8 h-8 rounded-full border border-border/70 bg-surface-hover/40 hover:bg-surface-hover text-secondary hover:text-primary flex items-center justify-center transition-colors shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {moreMenuOpen && (
              <div role="menu" aria-label="More project actions" className="absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-caption animate-in fade-in zoom-in-95 duration-100">

                <button
                  role="menuitem"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Project link copied to clipboard');
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-primary cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted" /> Copy Link
                </button>
                <div className="my-1 border-t border-border/60" />
                <button
                  role="menuitem"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full px-3.5 py-2 text-left text-danger-fg hover:bg-danger-bg flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                </button>
              </div>
            )}
          </div>

          <BaseButton
            variant="primary"
            size="sm"
            onClick={() => onEdit()}
            className="gap-2 text-caption"
            title="Edit Project"
          >
            <Pencil className="w-3.5 h-3.5 stroke-[2]" />
            Edit Project
          </BaseButton>
        </div>
      </header>

    </>
  );
}
