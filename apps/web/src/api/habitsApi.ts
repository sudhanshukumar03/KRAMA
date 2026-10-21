import type { JsonRequest } from './request';
import type { HabitCreateInput, HabitUpdateInput, Habit } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createHabitsApi(fetchApi: JsonRequest) {
  return {
    list: () => fetchApi<Habit[]>('/habits?view=tracker'),
    create: (data: HabitCreateInput) => fetchApi<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: HabitUpdateInput) => fetchApi<Habit>(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/habits/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<Habit>(`/habits/${id}/restore`, { method: 'POST' }),
    complete: (id: string, date?: string, dateIso?: string) => fetchApi<Habit>(`/habits/${id}/log`, { method: 'POST', ...(date || dateIso ? { body: JSON.stringify({ date, dateIso }) } : {}) }),
    uncomplete: (id: string, date?: string, dateIso?: string) => fetchApi<Habit>(`/habits/${id}/log?date=${date || ''}&dateIso=${dateIso || ''}`, { method: 'DELETE' }),
    };
}
