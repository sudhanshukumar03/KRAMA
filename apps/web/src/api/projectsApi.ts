import type { JsonRequest } from './request';
import type { ProjectCreateInput, ProjectUpdateInput, ProjectWithRelations } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createProjectsApi(fetchApi: JsonRequest) {
  return {
    list: () => fetchApi<ProjectWithRelations[]>('/projects'),
    get: (id: string) => fetchApi<ProjectWithRelations>(`/projects/${id}`),
    create: (data: ProjectCreateInput) => fetchApi<ProjectWithRelations>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProjectUpdateInput) => fetchApi<ProjectWithRelations>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
    reorder: (id: string, data: { position: number; version: number; workspaceId?: string }) =>
      fetchApi<ProjectWithRelations>(`/projects/${id}/reorder`, { method: 'PATCH', body: JSON.stringify(data) }),
    restore: (id: string) => fetchApi<ProjectWithRelations>(`/projects/${id}/restore`, { method: 'POST' }),
    };
}
