import type { IssueWithRelations, TaskCreateInput, TaskUpdateInput, TaskComment } from '../types/schema';
import type { JsonRequest } from './request';

type TaskPage = { items: IssueWithRelations[]; nextCursor: string | null };
export function createTasksApi(request: JsonRequest) {
  return {
    // Consumers still receive one complete array. Bounded requests keep the API
    // responsive. Preserve the old list's position order after collecting ID pages.
    list: async (params?: Record<string, string> | { queryKey: readonly unknown[] }) => {
      const query = new URLSearchParams(params && !('queryKey' in params) ? params : {});
      query.set('limit', '500');
      const all: IssueWithRelations[] = [];
      const cursors = new Set<string>();
      for (;;) {
        const page = await request<TaskPage | IssueWithRelations[]>(`/tasks?${query}`);
        // Compatible with existing consumers' test/local adapters and older APIs.
        if (Array.isArray(page)) return page;
        all.push(...page.items);
        if (!page.nextCursor) return all.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
        if (cursors.has(page.nextCursor)) throw new Error('Task loading stopped because the server repeated a page. Try again.');
        cursors.add(page.nextCursor); query.set('cursor', page.nextCursor);
      }
    },
    get: (id: string) => request<IssueWithRelations>(`/tasks/${id}`),
    create: (data: TaskCreateInput) => request<IssueWithRelations>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: TaskUpdateInput) => request<IssueWithRelations>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
    restore: (id: string) => request<IssueWithRelations>(`/tasks/${id}/restore`, { method: 'POST' }),
    complete: (id: string) => request<IssueWithRelations>(`/tasks/${id}/complete`, { method: 'PATCH' }),
    addComment: (id: string, content: string) => request<TaskComment>(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  };
}
