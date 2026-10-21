import type { JsonRequest } from './request';
import type { FocusCompletionInput, FocusSession, WallpaperResponse } from '../types/schema';
import type { FocusScheduleData } from '../components/focus/types';

/** Domain contract behind the shared authenticated transport. */
export function createFocusSessionsApi(fetchApi: JsonRequest) {
  return {
    complete: (data: FocusCompletionInput) => fetchApi<{ session: FocusSession }>('/focus-sessions', { method: 'POST', body: JSON.stringify(data) }),
    getSchedule: () => fetchApi<FocusScheduleData>('/focus-sessions/schedule'),
    getWallpaper: (category: string) => fetchApi<WallpaperResponse>(`/focus-sessions/wallpaper?category=${encodeURIComponent(category)}`),
    };
}
