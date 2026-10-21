import type { JsonRequest } from './request';
import type { PlannerData, TimeBlock, TimeBlockInput, TimeBlockUpdate, TimeBlockExtensionInput, TimeBlockExtensionResult, Milestone, MilestoneInput, MilestoneUpdate, MilestoneRange, HolidayCalendar } from '../types/planner';

/** Domain contract behind the shared authenticated transport. */
export function createPlannerApi(fetchApi: JsonRequest) {
  return {
    getWeek: (start: string, end: string, workspaceId?: string | null) => {
      let url = `/planner/week?start=${start}&end=${end}`;
      if (workspaceId) url += `&workspaceId=${workspaceId}`;
      return fetchApi<PlannerData>(url);
    },
    getHolidays: (country: string, region: string | null, start: string, end: string) => {
      let url = `/planner/holidays?country=${country}&start=${start}&end=${end}`;
      if (region) url += `&region=${region}`;
      return fetchApi<HolidayCalendar>(url);
    },
    createTimeBlock: (data: TimeBlockInput) => fetchApi<TimeBlock>('/planner/time-blocks', { method: 'POST', body: JSON.stringify(data) }),
    updateTimeBlock: (id: string, data: TimeBlockUpdate) => fetchApi<TimeBlock>(`/planner/time-blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    extendTimeBlock: (id: string, data: TimeBlockExtensionInput) => fetchApi<TimeBlockExtensionResult>(`/planner/time-blocks/${id}/extend`, { method: 'POST', body: JSON.stringify(data) }),
    deleteTimeBlock: (id: string) => fetchApi<void>(`/planner/time-blocks/${id}`, { method: 'DELETE' }),
    getMilestones: (start: string, end: string, workspaceId?: string | null) => {
      let url = `/planner/milestones?start=${start}&end=${end}`;
      if (workspaceId) url += `&workspaceId=${workspaceId}`;
      return fetchApi<MilestoneRange>(url);
    },
    createMilestone: (data: MilestoneInput) => fetchApi<Milestone>('/planner/milestones', { method: 'POST', body: JSON.stringify(data) }),
    updateMilestone: (id: string, data: MilestoneUpdate) => fetchApi<Milestone>(`/planner/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteMilestone: (id: string) => fetchApi<{ success: boolean }>(`/planner/milestones/${id}`, { method: 'DELETE' })
    };
}
