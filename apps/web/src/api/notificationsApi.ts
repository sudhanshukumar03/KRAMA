import type { JsonRequest } from './request';
import type { Notification, NotificationPage } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createNotificationsApi(fetchApi: JsonRequest) {
  return {
    list: () => fetchApi<Notification[]>('/notifications', { method: 'GET' }),
    listPage: async (cursor?: string): Promise<NotificationPage> => {
      const params = new URLSearchParams({ page: 'true', limit: '50' });
      if (cursor) params.set('cursor', cursor);
      const result = await fetchApi<NotificationPage | Notification[]>(`/notifications?${params.toString()}`);
      // Existing servers return an array during a rolling deployment.
      return Array.isArray(result) ? { items: result, nextCursor: null, unreadCount: result.filter(item => !item.read).length } : result;
    },
    markAsRead: (id: string) => fetchApi<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () => fetchApi<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' })
    };
}
