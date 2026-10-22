import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock, ExternalLink, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import type { Notification as NotificationItem } from '../types/schema';

function notificationTarget(notification: NotificationItem) {
  const metadata = notification.metadata;
  const taskId = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>).taskId : null;
  return notification.actionUrl || (typeof taskId === 'string' && taskId ? `/app/board?task=${encodeURIComponent(taskId)}` : null);
}

export function NotificationCenter({
  className,
  align = 'auto',
}: {
  className?: string;
  align?: 'left' | 'right' | 'auto';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [focusAfterRender, setFocusAfterRender] = useState<{ id?: string } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query notifications
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ['notifications', 'pages'],
    queryFn: ({ pageParam }) => api.notifications.listPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    refetchInterval: 180000, // 3-minute fallback cadence; primary delivery is real-time via SocketProvider
  });

  const notifications = data?.pages.flatMap(page => page.items) ?? [];
  const unreadCount = data?.pages[0]?.unreadCount ?? 0;
  const loadOlder = async () => {
    const pageCount = data?.pages.length ?? 0;
    const result = await fetchNextPage();
    const firstNew = result.data?.pages[pageCount]?.items[0];
    if (firstNew && panelRef.current) setFocusAfterRender({ id: firstNew.id });
  };
  // Query completion can precede React's commit. Move keyboard focus after the
  // corresponding row is present, including when the load-more button vanishes.
  useLayoutEffect(() => {
    if (!isOpen || !focusAfterRender) return;
    const target = panelRef.current?.querySelector<HTMLButtonElement>(focusAfterRender.id
      ? `[data-notification-id="${CSS.escape(focusAfterRender.id)}"]` : 'button');
    if (target) { target.focus(); setFocusAfterRender(null); }
  }, [isOpen, focusAfterRender, data]);

  // Viewport-aware positioning directly anchored to the trigger button
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 640;
    const menuWidth = isMobile ? Math.min(360, viewportWidth - 24) : 384;

    // Determine horizontal positioning
    let left: number;
    if (align === 'left') {
      left = rect.left;
    } else if (align === 'right') {
      left = rect.right - menuWidth;
    } else {
      // Auto: if right-alignment overflows off-screen or button is in left half of screen, anchor left
      if (rect.right - menuWidth < 12 || rect.left < viewportWidth / 2) {
        left = rect.left;
      } else {
        left = rect.right - menuWidth;
      }
    }

    // Safety clamp to ensure dropdown stays within screen boundaries
    if (left + menuWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - menuWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    const below = Math.max(0, viewportHeight - rect.bottom - 24);
    const above = Math.max(0, rect.top - 24);
    const openAbove = below < 200 && above > below;
    const maxHeight = Math.min(480, Math.max(0, viewportHeight - 24), openAbove ? above : below);
    const top = Math.max(12, openAbove ? rect.top - 8 - maxHeight : Math.min(rect.bottom + 8, viewportHeight - 12 - maxHeight));

    setDropdownStyle({
      position: 'fixed',
      ...(openAbove ? { bottom: `${Math.max(12, viewportHeight - rect.top + 8)}px` } : { top: `${top}px` }),
      left: `${left}px`,
      width: `${menuWidth}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 9999,
    });
  }, [align]);

  // Synchronously compute position before browser paints and listen to scroll/resize
  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [isOpen, isLoading]);

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: async (_result, id) => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (panelRef.current) setFocusAfterRender({ id });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (panelRef.current) setFocusAfterRender({});
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all as read');
    },
  });

  // Handle clicking a notification
  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) {
      markReadMutation.mutate(n.id);
    }
    const target = notificationTarget(n);
    if (target) {
      setIsOpen(false);
      navigate(target);
    }
  };

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          "min-h-9 min-w-9 p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors outline-none cursor-pointer border border-transparent relative inline-flex items-center justify-center",
          isOpen && "text-primary bg-surface-hover border-border"
        )}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-[10px] font-mono font-bold text-on-accent flex items-center justify-center shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="region"
            aria-label="Notifications"
            style={dropdownStyle}
            className="workspace-popover bg-surface border border-border rounded-xl shadow-level-2 z-[9999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-surface-hover/40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-body font-semibold text-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-badge font-mono px-1.5 py-0.5 rounded-full bg-accent-subtle text-accent-fg font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-caption text-secondary hover:text-accent flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {isError && notifications.length > 0 && (
              <div className="p-3 text-caption text-secondary" role="alert">
                Showing saved notifications.{' '}
                <button className="text-accent" onClick={() => refetch()}>
                  Try again
                </button>
              </div>
            )}
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="h-3 bg-surface-hover rounded w-3/4" />
                    <div className="h-2.5 bg-surface-hover rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : isError && notifications.length === 0 ? (
              <div className="p-6 text-center" role="alert">
                <p className="text-body text-primary">Notifications could not be loaded.</p>
                <button onClick={() => refetch()} className="mt-3 text-sm text-accent">
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-muted mb-2.5">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-body font-medium text-primary">All caught up!</p>
                <p className="text-caption text-secondary mt-0.5">No notifications in this workspace.</p>
              </div>
            ) : (
              notifications.map((n) => {
                let timeAgo = '';
                try {
                  timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });
                } catch {
                  timeAgo = 'recently';
                }

                return (
                  <div
                    key={n.id}
                    className={cn(
                      "p-3 flex items-start gap-2.5 transition-colors group cursor-pointer",
                      !n.read ? "bg-accent-subtle/20 hover:bg-accent-subtle/30" : "hover:bg-surface-hover"
                    )}
                  >
                    <button type="button" data-notification-id={n.id} aria-label={`${notificationTarget(n) ? 'Open' : 'Read'} notification: ${n.title}. ${n.message}`} onClick={() => handleNotificationClick(n)} className="flex flex-1 min-w-0 min-h-11 items-start gap-2.5 text-left rounded">
                    {/* Unread indicator / status dot */}
                    <div className="mt-1 shrink-0">
                      {!n.read ? (
                        <span className="w-2 h-2 rounded-full bg-accent inline-block animate-pulse" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-transparent inline-block" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={cn(
                            "text-caption truncate",
                            !n.read ? "font-semibold text-primary" : "font-medium text-secondary"
                          )}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] font-mono text-muted flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo}
                        </span>
                      </div>

                      <p className="text-caption text-secondary line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      {notificationTarget(n) && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline mt-1">
                          <span>View details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    </button>
                    {/* Mark read button */}
                    {!n.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(n.id);
                        }}
                        className="min-h-11 min-w-11 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded hover:bg-surface text-muted hover:text-primary transition-all shrink-0 cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
            {hasNextPage && <div className="p-3 border-t border-border">
              <button type="button" disabled={isFetchingNextPage} onClick={() => { void loadOlder(); }} className="min-h-11 w-full rounded-lg border border-border text-caption text-accent-fg hover:bg-surface-hover disabled:opacity-50">
                {isFetchingNextPage ? 'Loading older notifications...' : isFetchNextPageError ? 'Retry older notifications' : 'Load older notifications'}
              </button>
            </div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
