import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock, ExternalLink, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export interface NotificationItem {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string | null;
  metadata?: any;
  createdAt: string;
}

export function NotificationCenter({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query notifications
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: api.notifications.list,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
    if (n.actionUrl) {
      setIsOpen(false);
      navigate(n.actionUrl);
    }
  };

  // Close on outside click or escape
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

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors outline-none cursor-pointer border border-transparent relative",
          isOpen && "text-primary bg-surface-hover border-border"
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-[10px] font-mono font-bold text-on-accent flex items-center justify-center shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-level-2 z-50 overflow-hidden flex flex-col max-h-[480px] animate-in fade-in zoom-in-95 duration-150">
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
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="h-3 bg-surface-hover rounded w-3/4" />
                    <div className="h-2.5 bg-surface-hover rounded w-1/2" />
                  </div>
                ))}
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
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "p-3 flex items-start gap-2.5 transition-colors group cursor-pointer",
                      !n.read ? "bg-accent-subtle/20 hover:bg-accent-subtle/30" : "hover:bg-surface-hover"
                    )}
                  >
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
                        <span className={cn(
                          "text-caption truncate",
                          !n.read ? "font-semibold text-primary" : "font-medium text-secondary"
                        )}>
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

                      {n.actionUrl && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline mt-1">
                          <span>View details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Mark read button */}
                    {!n.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface text-muted hover:text-primary transition-all shrink-0 cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
