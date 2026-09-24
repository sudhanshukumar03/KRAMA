import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface WorkspaceSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function WorkspaceSwitcher({ compact = false, className }: WorkspaceSwitcherProps) {
  const { user, workspaceId, switchWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const memberships = user?.memberships || [];
  const activeMembership = memberships.find((m) => m.workspaceId === workspaceId) || memberships[0];
  const activeName = activeMembership?.workspace?.name || 'Workspace';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (selectedId: string) => {
    setIsOpen(false);
    if (selectedId !== workspaceId) {
      switchWorkspace(selectedId);
    }
  };

  if (!user || memberships.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={`Active Workspace: ${activeName}`}
        className={cn(
          "flex items-center justify-between rounded-md border border-border/80 bg-surface/90 hover:bg-surface-hover hover:border-border-strong text-primary transition-all duration-150 outline-none cursor-pointer select-none",
          compact
            ? "px-2 py-1 text-caption gap-1.5 max-w-[200px]"
            : "w-full px-2.5 py-1.5 text-caption gap-2 shadow-2xs"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-accent-tint border border-accent/25 flex items-center justify-center text-accent text-[11px] font-mono font-semibold shrink-0">
            {activeName.charAt(0).toUpperCase() || <Building2 className="w-3 h-3" />}
          </div>
          <span className="font-medium truncate text-primary leading-tight">
            {activeName}
          </span>
          {!compact && activeMembership?.role && (
            <span className="text-[10px] font-mono text-muted uppercase bg-surface-hover px-1.5 py-0.5 rounded border border-border shrink-0">
              {activeMembership.role}
            </span>
          )}
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted shrink-0 ml-1 opacity-70 group-hover:opacity-100" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Workspaces"
          className="absolute left-0 top-full mt-1.5 w-64 max-h-72 overflow-y-auto bg-surface border border-border rounded-lg shadow-level-2 z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted flex items-center justify-between border-b border-border/60 mb-1">
            <span>Workspaces</span>
            <span>{memberships.length} available</span>
          </div>

          {memberships.map((m) => {
            const isSelected = m.workspaceId === (workspaceId || activeMembership?.workspaceId);
            const wsName = m.workspace?.name || `Workspace (${m.workspaceId.slice(0, 6)})`;

            return (
              <button
                key={m.workspaceId}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(m.workspaceId)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-caption transition-colors duration-150 cursor-pointer text-left select-none",
                  isSelected
                    ? "bg-accent-tint/60 text-primary font-medium border border-accent/20"
                    : "text-secondary hover:text-primary hover:bg-surface-hover border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 mr-2">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-semibold shrink-0 border",
                    isSelected
                      ? "bg-accent text-white border-accent"
                      : "bg-surface-hover text-muted border-border"
                  )}>
                    {wsName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-caption leading-tight text-primary">
                      {wsName}
                    </div>
                    {m.role && (
                      <div className="text-[10px] font-mono text-muted uppercase leading-tight mt-0.5">
                        {m.role}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-accent shrink-0 ml-1 stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
