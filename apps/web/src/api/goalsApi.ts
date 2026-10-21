import type { GoalCreateInput, GoalUpdateInput, GoalWithRelations } from '../types/schema';
import type { JsonRequest } from './request';

/** Keep goal HTTP contracts independent of session and browser coordination. */
export function createGoalsApi(request: JsonRequest) {
  return {
    list: () => request<GoalWithRelations[]>('/goals'),
    // Scalar projection for dropdowns, navigation counts and command search.
    listLite: () => request<GoalWithRelations[]>('/goals/lite'),
    get: (id: string) => request<GoalWithRelations>(`/goals/${id}`),
    create: (data: GoalCreateInput) => request<GoalWithRelations>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: GoalUpdateInput) => request<GoalWithRelations>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/goals/${id}`, { method: 'DELETE' }),
    restore: (id: string) => request<GoalWithRelations>(`/goals/${id}/restore`, { method: 'POST' }),
  };
}
