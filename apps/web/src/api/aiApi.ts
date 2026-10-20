import type { JsonRequest } from './request';
import type { TelemetryInput, AiConfiguration, AiResponse } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createAiApi(fetchApi: JsonRequest) {
  return {
    complete: (data: { message: string; ragEnabled?: boolean }) => fetchApi<AiResponse>('/ai/complete', { method: 'POST', body: JSON.stringify(data) }),
    ragQuery: (data: { message: string; ragEnabled?: boolean }) => fetchApi<AiResponse>('/ai/rag-query', { method: 'POST', body: JSON.stringify(data) }),
    config: () => fetchApi<AiConfiguration>('/ai/config'),
    analyzeTelemetry: (data: TelemetryInput) => fetchApi<{ insight: string }>('/ai/analyze-telemetry', { method: 'POST', body: JSON.stringify(data) }),
    getDashboardInsight: (force?: boolean) => fetchApi<{ insight: string }>(`/ai/dashboard-insight${force ? '?force=true' : ''}`)
    };
}
