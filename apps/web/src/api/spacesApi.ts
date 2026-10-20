import type { JsonRequest } from './request';
import type { Space, SpaceCreateInput, SpaceUpdateInput } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createSpacesApi(fetchApi: JsonRequest) {
  return {
    list: () => fetchApi<Space[]>('/spaces'),
    create: (data: SpaceCreateInput) => fetchApi<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: SpaceUpdateInput) => fetchApi<Space>(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ success: boolean }>(`/spaces/${id}`, { method: 'DELETE' }),
    };
}
