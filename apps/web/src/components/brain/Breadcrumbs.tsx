import { BookOpen, ChevronRight } from 'lucide-react';
import type { DocumentWithRelations } from '../../types/schema';
import { cn } from '../../lib/utils';

export interface BreadcrumbsProps {
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  onSelect: (id: string) => void;
}

export function Breadcrumbs({
  page,
  pages,
  onSelect
}: BreadcrumbsProps) {
  const trail: DocumentWithRelations[] = [];
  let curr: DocumentWithRelations | undefined = page;
  const visited = new Set<string>();
  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    trail.unshift(curr);
    curr = pages.find(p => p.id === curr?.parentId);
  }

  return (
    <div className="flex items-center gap-1.5 text-caption text-secondary font-mono select-none overflow-x-auto py-0.5 min-w-0">
      <button type="button"
        onClick={() => trail[0] && onSelect(trail[0].id)}
        className="min-h-11 flex items-center gap-1.5 hover:text-accent cursor-pointer transition-colors shrink-0 font-bold uppercase tracking-wider text-caption"
      >
        <BookOpen className="w-3.5 h-3.5 text-accent-fg shrink-0 stroke-[1.75]" /> Brain Base
      </button>
      {trail.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-1.5 flex-shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0 stroke-[1.5]" />
          <button type="button" aria-current={idx === trail.length - 1 ? 'page' : undefined}
            onClick={() => onSelect(p.id)}
            className={cn("min-h-11 flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all text-[12px] cursor-pointer",
              idx === trail.length - 1
                ? "text-primary font-medium"
                : "hover:text-primary text-muted"
            )}
          >
            <span className="font-sans truncate max-w-[180px]">{p.title || 'Untitled Document'}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
