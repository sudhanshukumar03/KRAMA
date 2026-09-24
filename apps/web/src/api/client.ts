import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, SearchResult
} from '../types/schema';
import { toast } from 'sonner';

const API_BASE = '/api/v1';

let currentAccessToken: string | null = null;
let currentWorkspaceId: string | null = typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : null;
let globalLogoutHandler: (() => void) | null = null;

// The single in-flight refresh promise to prevent race conditions during concurrent 401s
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    currentAccessToken = data.accessToken;
    return data.accessToken;
  } catch (error) {
    currentAccessToken = null;
    if (globalLogoutHandler) globalLogoutHandler();
    throw error;
  } finally {
    refreshPromise = null;
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const executeRequest = async (token: string | null) => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (currentWorkspaceId) headers.set('x-workspace-id', currentWorkspaceId);
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE}${endpoint}`, { 
      ...options, 
      headers,
      credentials: 'include'
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      
      const errorText = await res.text();
      let errorMessage = errorText;
      try {
        const json = JSON.parse(errorText);
        errorMessage = json.message || errorText;
      } catch {}

      if (res.status === 403) {
        toast.error(`Permission Denied: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      if (res.status === 409) {
        toast.error(`Update Conflict: ${errorMessage}`, {
          description: 'This record was modified elsewhere. Please refresh to see the latest changes.',
          duration: 5000,
        });
        throw new Error(errorMessage);
      }
      if (res.status === 429) {
        toast.error('Too Many Requests', { description: 'Please slow down.' });
        throw new Error(errorMessage);
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (res.status === 204) return {} as T;

    return res.json();
  };

  try {
    return await executeRequest(currentAccessToken);
  } catch (error: any) {
    // If we get a 401 and we aren't already hitting an auth route, attempt a refresh
    if (error.status === 401 && !endpoint.startsWith('/auth/')) {
      if (!refreshPromise) {
        refreshPromise = doRefresh();
      }
      const newToken = await refreshPromise;
      if (newToken) {
        return await executeRequest(newToken);
      }
    }
    throw error;
  }
}

async function streamDocumentAi(
  url: string,
  body: Record<string, any>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: any) => void,
  signal?: AbortSignal
) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentAccessToken) headers['Authorization'] = `Bearer ${currentAccessToken}`;
    if (currentWorkspaceId) headers['x-workspace-id'] = currentWorkspaceId;

    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Stream request failed');
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No readable stream');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) onChunk(parsed.text);
          } catch {}
        }
      }
    }
    onDone();
  } catch (err: any) {
    if (signal?.aborted) return;
    onError(err);
  }
}

async function downloadDocumentExport(id: string, format: 'md' | 'spec', filename?: string) {
  const headers: Record<string, string> = {};
  if (currentAccessToken) headers['Authorization'] = `Bearer ${currentAccessToken}`;
  if (currentWorkspaceId) headers['x-workspace-id'] = currentWorkspaceId;

  const res = await fetch(`${API_BASE}/documents/${id}/export?format=${format}`, {
    headers,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to export document');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `document-${id}.${format === 'spec' ? 'spec.md' : 'md'}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export const api = {
  setAccessToken: (token: string | null) => { currentAccessToken = token; },
  setWorkspaceId: (wid: string | null) => { currentWorkspaceId = wid; },
  setGlobalLogoutHandler: (handler: () => void) => { globalLogoutHandler = handler; },

  upload: {
    file: async (file: File): Promise<{ success: boolean; url: string; key: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          ...(currentWorkspaceId ? { 'x-workspace-id': currentWorkspaceId } : {})
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload file');
      return res.json();
    }
  },
  auth: {
    signup: (data: Record<string, any>) => fetchApi<any>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: Record<string, any>) => fetchApi<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => fetchApi<any>('/auth/logout', { method: 'POST' }),
    refresh: () => fetchApi<any>('/auth/refresh', { method: 'POST' }),
    me: () => fetchApi<any>('/auth/me', { method: 'GET' }),
    updatePreferences: (body: Record<string, any>) => fetchApi<any>('/auth/me/preferences', { method: 'PATCH', body: JSON.stringify(body) }),
  },
  workspaces: {
    list: () => fetchApi<Workspace[]>('/workspaces'),
    create: (data: Record<string, any>) => fetchApi<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    export: () => fetchApi<any>('/workspaces/export'),
  },
  spaces: {
    list: () => fetchApi<Space[]>('/spaces'),
    create: (data: Partial<Space>) => fetchApi<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Space>) => fetchApi<Space>(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ success: boolean }>(`/spaces/${id}`, { method: 'DELETE' }),
  },

  documents: {
    list: () => fetchApi<any[]>('/documents'),
    get: (id: string) => fetchApi<any>(`/documents/${id}`),
    create: (data: Record<string, any>) => fetchApi<any>('/documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<any>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateContent: (id: string, contentJson: any) => fetchApi<any>(`/documents/${id}/content`, { method: 'PATCH', body: JSON.stringify({ contentJson }) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<any>(`/documents/${id}/restore`, { method: 'POST' }),
    move: (id: string, data: { targetFolderId?: string | null; targetParentId?: string | null }) => 
      fetchApi<any>(`/documents/${id}/move`, { method: 'POST', body: JSON.stringify(data) }),
    duplicate: (id: string) => fetchApi<any>(`/documents/${id}/duplicate`, { method: 'POST' }),
    favorite: (id: string) => fetchApi<any>(`/documents/${id}/favorite`, { method: 'POST' }),
    importSpec: (data: { content: string; spaceId?: string; parentId?: string }) => 
      fetchApi<any>('/documents/import', { method: 'POST', body: JSON.stringify(data) }),
    getVersions: (id: string) => fetchApi<any[]>(`/documents/${id}/versions`),
    createVersion: (id: string) => fetchApi<any>(`/documents/${id}/versions`, { method: 'POST' }),
    restoreVersion: (id: string, versionId: string) => fetchApi<any>(`/documents/${id}/versions/${versionId}/restore`, { method: 'POST' }),
    getTags: (workspaceId: string) => fetchApi<any[]>(`/workspaces/${workspaceId}/tags`),
    addTag: (id: string, tagName: string, color?: string) => fetchApi<any>(`/documents/${id}/tags`, { method: 'POST', body: JSON.stringify({ tagName, color }) }),
    removeTag: (id: string, tagId: string) => fetchApi<any>(`/documents/${id}/tags/${tagId}`, { method: 'DELETE' }),
    getLinks: (id: string) => fetchApi<{ outgoing: any[]; incoming: any[] }>(`/documents/${id}/links`),
    addLink: (id: string, data: { targetType: string; targetId: string; linkType?: string }) => fetchApi<any>(`/documents/${id}/links`, { method: 'POST', body: JSON.stringify(data) }),
    removeLink: (linkId: string) => fetchApi<any>(`/links/${linkId}`, { method: 'DELETE' }),
    createTask: (id: string, data: { title: string; priority?: string; status?: string; description?: string }) =>
      fetchApi<{ task: any; link: any }>(`/documents/${id}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    search: (workspaceId: string, q: string, filters?: { type?: string; projectId?: string; status?: string }) => {

      const params = new URLSearchParams({ q });
      if (filters?.type && filters.type !== 'ALL') params.append('type', filters.type);
      if (filters?.projectId && filters.projectId !== 'ALL') params.append('projectId', filters.projectId);
      if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
      return fetchApi<any[]>(`/workspaces/${workspaceId}/search?${params.toString()}`);
    },


    export: (id: string, format: 'md' | 'spec', filename?: string) => downloadDocumentExport(id, format, filename),
    getGraph: (workspaceId: string) => fetchApi<{ nodes: any[]; links: any[] }>(`/workspaces/${workspaceId}/graph`),
    aiAsk: (id: string, question: string, onChunk: (text: string) => void, onDone: () => void, onError: (err: any) => void, signal?: AbortSignal) =>
      streamDocumentAi(`/documents/${id}/ai/ask`, { question }, onChunk, onDone, onError, signal),
    aiCompose: (id: string, payload: { instruction: string; mode: 'write' | 'improve' | 'explain'; selection?: string }, onChunk: (text: string) => void, onDone: () => void, onError: (err: any) => void, signal?: AbortSignal) =>
      streamDocumentAi(`/documents/${id}/ai/compose`, payload, onChunk, onDone, onError, signal),
  },
  goals: {
    list: () => fetchApi<GoalWithRelations[]>('/goals'),
    create: (data: Record<string, any>) => fetchApi<GoalWithRelations>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<GoalWithRelations>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/goals/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<any>(`/goals/${id}/restore`, { method: 'POST' }),
  },
    projects: {
    list: () => fetchApi<ProjectWithRelations[]>('/projects'),
    create: (data: Record<string, any>) => fetchApi<ProjectWithRelations>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<ProjectWithRelations>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<any>(`/projects/${id}/restore`, { method: 'POST' }),
  },
  tasks: {
    list: (params?: any) => {
      const safeParams = (params && params.queryKey) ? undefined : params;
      const q = new URLSearchParams(safeParams || {}).toString();
      return fetchApi<IssueWithRelations[]>(`/tasks${q ? `?${q}` : ''}`); // Mapped to /tasks
    },
    get: (id: string) => fetchApi<IssueWithRelations>(`/tasks/${id}`),
    create: (data: Record<string, any> & { title: string }) => fetchApi<IssueWithRelations>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<IssueWithRelations>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<any>(`/tasks/${id}/restore`, { method: 'POST' }),
    complete: (id: string) => fetchApi<IssueWithRelations>(`/tasks/${id}/complete`, { method: 'PATCH' }),
      addComment: (id: string, content: string) => fetchApi<any>(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  },
  
  sprints: {
    list: () => fetchApi<Sprint[]>('/sprints'),
    getReport: (id: string) => fetchApi<any>(`/sprints/${id}/reports`),
    create: (data: Record<string, any>) => fetchApi<Sprint>('/sprints', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    complete: (id: string) => fetchApi<any>(`/sprints/${id}/complete`, { method: 'POST' }),
    delete: (id: string) => fetchApi<void>(`/sprints/${id}`, { method: 'DELETE' }),
  },
  habits: {
    list: () => fetchApi<Habit[]>('/habits'),
    create: (data: Record<string, any>) => fetchApi<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Habit>(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/habits/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<any>(`/habits/${id}/restore`, { method: 'POST' }),
    complete: (id: string, date?: string, dateIso?: string) => fetchApi<Habit>(`/habits/${id}/log`, { method: 'POST', ...(date ? { body: JSON.stringify({ date, dateIso }) } : {}) }),
    uncomplete: (id: string, date?: string, dateIso?: string) => fetchApi<Habit>(`/habits/${id}/log?date=${date || ''}&dateIso=${dateIso || ''}`, { method: 'DELETE' }),
  },
  dailyLogs: {
    list: (params?: { date?: string; range?: number }) => {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.range) q.append('range', String(params.range));
      const qs = q.toString();
      return fetchApi<DailyLog[]>(`/daily-logs${qs ? `?${qs}` : ''}`);
    },
    create: (data: Record<string, any>) => fetchApi<DailyLog>('/daily-logs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<DailyLog>(`/daily-logs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/daily-logs/${id}`, { method: 'DELETE' }),
  },
  search: {
    query: (q: string) => fetchApi<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),
  },

  ai: {
    complete: (data: Record<string, any>) => fetchApi<any>('/ai/complete', { method: 'POST', body: JSON.stringify(data) }),
    ragQuery: (data: Record<string, any>) => fetchApi<any>('/ai/rag-query', { method: 'POST', body: JSON.stringify(data) }),
    narrative: (data: Record<string, any>) => fetchApi<any>('/ai/narrative', { method: 'POST', body: JSON.stringify(data) }),
    config: () => fetchApi<any>('/ai/config'),
    analyzeTelemetry: (data: Record<string, any>) => fetchApi<{ insight: string }>('/ai/analyze-telemetry', { method: 'POST', body: JSON.stringify(data) }),
    getDashboardInsight: (force?: boolean) => fetchApi<{ insight: string }>(`/ai/dashboard-insight${force ? '?force=true' : ''}`)
  },
  knowledgeGraph: {
    get: () => fetchApi<any>('/knowledge-graph', { method: 'GET' })
  },
  notifications: {
    list: () => fetchApi<any[]>('/notifications', { method: 'GET' }),
    markAsRead: (id: string) => fetchApi<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () => fetchApi<any>('/notifications/read-all', { method: 'PATCH' })
  },

  dashboard: {
    get: () => fetchApi<any>('/dashboard', { method: 'GET' })
  },
  focusSessions: {
    complete: (data: Record<string, any>) => fetchApi<any>('/focus-sessions', { method: 'POST', body: JSON.stringify(data) }),
    getSchedule: () => fetchApi<any>('/focus-sessions/schedule'),
    getWallpaper: (category: string) => fetchApi<any>(`/focus-sessions/wallpaper?category=${encodeURIComponent(category)}`),
  },
  analytics: {
    overview: (range: string) => fetchApi<any[]>(`/analytics/overview?range=${range}`, { method: 'GET' }),
    focusHistory: (range: string) => fetchApi<any[]>(`/analytics/focus-history?range=${range}`, { method: 'GET' }),
    habitHeatmap: (habitId: string, range: string) => fetchApi<any[]>(`/analytics/habit-heatmap?habitId=${habitId}&range=${range}`, { method: 'GET' })
  },
  planner: {
    getWeek: (start: string, end: string, workspaceId?: string | null) => {
      let url = `/planner/week?start=${start}&end=${end}`;
      if (workspaceId) url += `&workspaceId=${workspaceId}`;
      return fetchApi<any>(url);
    },
    getHolidays: (country: string, region: string | null, start: string, end: string) => {
      let url = `/planner/holidays?country=${country}&start=${start}&end=${end}`;
      if (region) url += `&region=${region}`;
      return fetchApi<any>(url);
    },
    createTimeBlock: (data: any) => fetchApi<any>('/planner/time-blocks', { method: 'POST', body: JSON.stringify(data) }),
    updateTimeBlock: (id: string, data: any) => fetchApi<any>(`/planner/time-blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteTimeBlock: (id: string) => fetchApi<any>(`/planner/time-blocks/${id}`, { method: 'DELETE' }),
    toggleRoutine: (data: any) => fetchApi<any>('/planner/routine-occurrences', { method: 'PATCH', body: JSON.stringify(data) }),
    createMilestone: (data: any) => fetchApi<any>('/planner/milestones', { method: 'POST', body: JSON.stringify(data) }),
    updateMilestone: (id: string, data: any) => fetchApi<any>(`/planner/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteMilestone: (id: string) => fetchApi<any>(`/planner/milestones/${id}`, { method: 'DELETE' })
  }
};

