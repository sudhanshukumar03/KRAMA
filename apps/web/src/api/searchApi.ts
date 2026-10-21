import type { JsonRequest } from './request';
import type { SearchResult } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createSearchApi(fetchApi: JsonRequest) {
  return {
    recent: () => fetchApi<{ results: SearchResult[] }>('/search/recent'),
    query: (q: string, signal?: AbortSignal) => fetchApi<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`, { signal }),
    };
}
