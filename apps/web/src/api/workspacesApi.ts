import type { JsonRequest } from './request';
import type { Workspace, WorkspaceSummary, WorkspaceCreateInput, WorkspaceUpdateInput, WorkspaceExport } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createWorkspacesApi(fetchApi: JsonRequest) {
  return {
    list: () => fetchApi<Workspace[]>('/workspaces'),
    summary: () => fetchApi<WorkspaceSummary>('/workspaces/summary'),
    create: (data: WorkspaceCreateInput) => fetchApi<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: WorkspaceUpdateInput) => fetchApi<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    export: () => fetchApi<WorkspaceExport>('/workspaces/export'),
    restore: (backup: WorkspaceExport) => fetchApi<Workspace>('/workspaces/restore', { method: 'POST', body: JSON.stringify(backup) }),
    };
}
