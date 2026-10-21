import type { JsonRequest } from './request';
import type { DashboardData, PersonalDayPlan } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createDashboardApi(fetchApi: JsonRequest) {
  return {
    dayPlan: (date: string) => fetchApi<PersonalDayPlan>(`/dashboard/day-plan?date=${date}`),
    saveDayPlan: (date: string, input: { taskIds?: string[]; expectedRevision?: number; review?: { taskId: string; version: number; action: 'tomorrow' | 'backlog' | 'cancel' } }) => fetchApi<PersonalDayPlan>(`/dashboard/day-plan?date=${date}`, { method: 'PUT', body: JSON.stringify(input) }),
    get: () => fetchApi<DashboardData>('/dashboard', { method: 'GET' })
    };
}
