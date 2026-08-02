import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, RoadmapItem, GoalProgressSnapshot, DecisionWithRelations, SearchResult
} from '../types/schema';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:3000/api/v1';

let currentAccessToken: string | null = null;
let currentWorkspaceId: string | null = null;
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
    headers.set('Content-Type', 'application/json');

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

export const api = {
  setAccessToken: (token: string | null) => { currentAccessToken = token; },
  setWorkspaceId: (wid: string | null) => { currentWorkspaceId = wid; },
  setGlobalLogoutHandler: (handler: () => void) => { globalLogoutHandler = handler; },

  auth: {
    signup: (data: Record<string, any>) => fetchApi<any>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: Record<string, any>) => fetchApi<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => fetchApi<any>('/auth/logout', { method: 'POST' }),
    refresh: () => fetchApi<any>('/auth/refresh', { method: 'POST' }),
    me: () => fetchApi<any>('/auth/me', { method: 'GET' }),
  },
  workspaces: {
    list: () => fetchApi<Workspace[]>('/workspaces'),
    create: (data: Record<string, any>) => fetchApi<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    export: () => fetchApi<any>('/workspaces/export'),
  },
  spaces: {
    list: async () => [] as Space[], // Stubbed for Stage 6
    create: async () => { throw new Error('Not implemented yet'); },
    update: async () => { throw new Error('Not implemented yet'); },
    delete: async () => { throw new Error('Not implemented yet'); },
  },
  pages: {
    list: () => fetchApi<PageWithRelations[]>('/pages'),
    get: (id: string) => fetchApi<PageWithRelations>(`/pages/${id}`),
    create: (data: Record<string, any>) => fetchApi<PageWithRelations>('/pages', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<PageWithRelations>(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/pages/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<any>(`/pages/${id}/restore`, { method: 'POST' }),
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
  },
  sprints: {
    list: () => fetchApi<Sprint[]>('/sprints'),
    create: (data: Record<string, any>) => fetchApi<Sprint>('/sprints', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/sprints/${id}`, { method: 'DELETE' }),
  },
  roadmapItems: {
    list: async () => [] as RoadmapItem[], // Stubbed for Stage 6
    create: async () => { throw new Error('Not implemented yet'); },
    update: async () => { throw new Error('Not implemented yet'); },
    delete: async () => { throw new Error('Not implemented yet'); },
  },
  habits: {
    list: () => fetchApi<Habit[]>('/habits'),
    create: (data: Record<string, any>) => fetchApi<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Habit>(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/habits/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<any>(`/habits/${id}/restore`, { method: 'POST' }),
    complete: (id: string, date?: string) => fetchApi<Habit>(`/habits/${id}/log`, { method: 'POST', ...(date ? { body: JSON.stringify({ date }) } : {}) }),
  },
  dailyLogs: {
    list: () => fetchApi<DailyLog[]>('/daily-logs'),
    create: (data: Record<string, any>) => fetchApi<DailyLog>('/daily-logs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<DailyLog>(`/daily-logs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/daily-logs/${id}`, { method: 'DELETE' }),
  },
  snapshots: {
    list: async () => [] as GoalProgressSnapshot[], // Stubbed
    create: async () => { throw new Error('Not implemented yet'); },
  },
  search: {
    query: (q: string) => fetchApi<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),
  },
  decisions: {
    list: async () => [] as DecisionWithRelations[], // Stubbed for Stage 6
    create: async (_data?: any) => { throw new Error('Not implemented yet'); },
    update: async (_id?: string, _data?: any) => { throw new Error('Not implemented yet'); },
    delete: async (_id?: string) => { throw new Error('Not implemented yet'); },
    restore: async (_snapshot: any) => { throw new Error('Not implemented yet'); },
  },
  ai: {
    complete: (data: Record<string, any>) => fetchApi<any>('/ai/complete', { method: 'POST', body: JSON.stringify(data) }),
    ragQuery: (data: Record<string, any>) => fetchApi<any>('/ai/rag-query', { method: 'POST', body: JSON.stringify(data) }),
    config: () => fetchApi<any>('/ai/config')
  },
  knowledgeGraph: {
    get: () => fetchApi<any>('/knowledge-graph', { method: 'GET' })
  },
  notifications: {
    list: () => fetchApi<any[]>('/notifications', { method: 'GET' }),
    markAsRead: (id: string) => fetchApi<any>(`/notifications/${id}/read`, { method: 'PATCH' })
  },
  dashboard: {
    get: () => fetchApi<any>('/dashboard', { method: 'GET' })
  },
  focusSessions: {
    complete: (data: Record<string, any>) => fetchApi<any>('/focus-sessions', { method: 'POST', body: JSON.stringify(data) })
  },
  analytics: {
    overview: (range: string) => fetchApi<any[]>(`/analytics/overview?range=${range}`, { method: 'GET' }),
    focusHistory: (range: string) => fetchApi<any[]>(`/analytics/focus-history?range=${range}`, { method: 'GET' }),
    habitHeatmap: (habitId: string, range: string) => fetchApi<any[]>(`/analytics/habit-heatmap?habitId=${habitId}&range=${range}`, { method: 'GET' })
  }
};
