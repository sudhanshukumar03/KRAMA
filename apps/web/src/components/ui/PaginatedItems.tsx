import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Keep large lists navigable without mounting every row or removing keyboard access. */
export function PaginatedItems<T extends { id: string }>({ items, label, activeId, pageSize = 50, className, scrollable = false, children }: {
  items: readonly T[];
  label: string;
  activeId?: string | null;
  pageSize?: number;
  className?: string;
  scrollable?: boolean;
  children: (visible: readonly T[]) => ReactNode;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const manualChange = useRef(false);
  const selectedIndex = activeId ? items.findIndex(item => item.id === activeId) : -1;
  const selectedPage = selectedIndex < 0 ? -1 : Math.floor(selectedIndex / pageSize);
  useEffect(() => { if (selectedPage >= 0) setRequestedPage(selectedPage); }, [activeId, selectedPage]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages - 1);
  const start = currentPage * pageSize;
  const changePage = (page: number) => { manualChange.current = true; setRequestedPage(page); };
  useLayoutEffect(() => {
    if (!manualChange.current) return;
    manualChange.current = false;
    let parent: HTMLElement | null = contentRef.current;
    while (parent && !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) parent = parent.parentElement;
    if (parent) parent.scrollTop = 0;
    contentRef.current?.querySelector<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')?.focus({ preventScroll: true });
  }, [currentPage]);
  return <div className={scrollable ? 'flex h-full min-h-0 flex-col' : undefined}>
    <div ref={contentRef} role="group" aria-label={label} className={`${scrollable ? 'flex-1 min-h-0 overflow-y-auto' : ''} ${className || ''}`}>{children(items.slice(start, start + pageSize))}</div>
    {totalPages > 1 && <nav aria-label={`${label} pages`} className="flex shrink-0 flex-wrap items-center justify-between gap-2 py-3 text-xs text-secondary">
      <span role="status" aria-live="polite">{start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Previous ${label}`} disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}
          className="min-h-11 min-w-11 rounded-md border border-border px-3 text-primary disabled:opacity-40 hover:enabled:bg-surface-hover">Previous</button>
        <button type="button" aria-label={`Next ${label}`} disabled={currentPage === totalPages - 1} onClick={() => changePage(currentPage + 1)}
          className="min-h-11 min-w-11 rounded-md border border-border px-3 text-primary disabled:opacity-40 hover:enabled:bg-surface-hover">Next</button>
      </div>
    </nav>}
  </div>;
}
