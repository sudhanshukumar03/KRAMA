import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, RoadmapItem, GoalProgressSnapshot, DecisionWithRelations, SearchResult
} from '../types/schema';

let cachedToken: string | null = null;
let authPromise: Promise<string | null> | null = null;

// Ensure authentication against Express backend
async function ensureAuth(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  
  // Prevent concurrent login requests
  if (authPromise) return authPromise;
  
  authPromise = (async () => {
    if (cachedToken) return cachedToken;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'engineer', password: 'secure_password' }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('krama:api-online'));
        const data = await res.json();
        cachedToken = data.token;
        authPromise = null;
        return cachedToken;
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('krama:api-offline'));
      console.warn('Auto-auth connection failed (is backend server running?):', err);
    }
    authPromise = null;
    return null;
  })();
  
  return authPromise;
}

// Universal fetch wrapper with token injection and 401 retry
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  await ensureAuth();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (cachedToken) {
    headers.set('Authorization', `Bearer ${cachedToken}`);
  }

  let res: Response;
  try {
    res = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    window.dispatchEvent(new CustomEvent('krama:api-online'));
  } catch (netErr) {
    window.dispatchEvent(new CustomEvent('krama:api-offline'));
    throw netErr;
  }

  if (res.status === 401) {
    cachedToken = null;
    await ensureAuth();
    if (cachedToken) {
      headers.set('Authorization', `Bearer ${cachedToken}`);
      try {
        res = await fetch(`/api/v1${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        window.dispatchEvent(new CustomEvent('krama:api-online'));
      } catch (netErr) {
        window.dispatchEvent(new CustomEvent('krama:api-offline'));
        throw netErr;
      }
    }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Network response was not ok');
    throw new Error(`API Error (${res.status}): ${errText}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json();
}

export const api = {
  workspaces: {
    list: () => fetchApi<Workspace[]>('/workspaces'),
    create: (data: Record<string, any>) => fetchApi<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Workspace>(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    export: () => fetchApi<any>('/workspaces/export'),
  },
  spaces: {
    list: () => fetchApi<Space[]>('/spaces'),
    create: (data: Record<string, any>) => fetchApi<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Space>(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/spaces/${id}`, { method: 'DELETE' }),
  },
  pages: {
    list: () => fetchApi<PageWithRelations[]>('/pages'),
    get: (id: string) => fetchApi<PageWithRelations>(`/pages/${id}`),
    create: (data: Record<string, any>) => fetchApi<PageWithRelations>('/pages', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<PageWithRelations>(`/pages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string; snapshot: any }>(`/pages/${id}`, { method: 'DELETE' }),
    restore: (snapshot: Record<string, any>) => fetchApi<PageWithRelations>('/pages/restore', { method: 'POST', body: JSON.stringify(snapshot) }),
  },
  goals: {
    list: () => fetchApi<GoalWithRelations[]>('/goals'),
    create: (data: Record<string, any>) => fetchApi<GoalWithRelations>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<GoalWithRelations>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string; snapshot: any }>(`/goals/${id}`, { method: 'DELETE' }),
    restore: (snapshot: Record<string, any>) => fetchApi<GoalWithRelations>('/goals/restore', { method: 'POST', body: JSON.stringify(snapshot) }),
  },
  projects: {
    list: () => fetchApi<ProjectWithRelations[]>('/projects'),
    create: (data: Record<string, any>) => fetchApi<ProjectWithRelations>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<ProjectWithRelations>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string; snapshot: any }>(`/projects/${id}`, { method: 'DELETE' }),
    restore: (snapshot: Record<string, any>) => fetchApi<ProjectWithRelations>('/projects/restore', { method: 'POST', body: JSON.stringify(snapshot) }),
  },
  issues: {
    list: () => fetchApi<IssueWithRelations[]>('/issues'),
    create: (data: Record<string, any> & { title: string }) => fetchApi<IssueWithRelations>('/issues', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<IssueWithRelations>(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string; snapshot: any }>(`/issues/${id}`, { method: 'DELETE' }),
    restore: (snapshot: Record<string, any>) => fetchApi<IssueWithRelations>('/issues/restore', { method: 'POST', body: JSON.stringify(snapshot) }),
  },
  sprints: {
    list: () => fetchApi<Sprint[]>('/sprints'),
    create: (data: Record<string, any>) => fetchApi<Sprint>('/sprints', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Sprint>(`/sprints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/sprints/${id}`, { method: 'DELETE' }),
  },
  roadmapItems: {
    list: () => fetchApi<RoadmapItem[]>('/roadmap-items'),
    create: (data: Record<string, any>) => fetchApi<RoadmapItem>('/roadmap-items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<RoadmapItem>(`/roadmap-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/roadmap-items/${id}`, { method: 'DELETE' }),
  },
  habits: {
    list: () => fetchApi<Habit[]>('/habits'),
    create: (data: Record<string, any>) => fetchApi<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Habit>(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string; snapshot: any }>(`/habits/${id}`, { method: 'DELETE' }),
    restore: (snapshot: any) => fetchApi<Habit>('/habits/restore', { method: 'POST', body: JSON.stringify(snapshot) }),
    complete: (id: string, date?: string) => fetchApi<Habit>(`/habits/${id}/complete`, { method: 'POST', ...(date ? { body: JSON.stringify({ date }) } : {}) }),
  },
  dailyLogs: {
    list: () => fetchApi<DailyLog[]>('/daily-logs'),
    create: (data: Record<string, any>) => fetchApi<DailyLog>('/daily-logs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<DailyLog>(`/daily-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/daily-logs/${id}`, { method: 'DELETE' }),
  },
  snapshots: {
    list: () => fetchApi<GoalProgressSnapshot[]>('/snapshots'),
    create: (data: Record<string, any>) => fetchApi<GoalProgressSnapshot>('/snapshots', { method: 'POST', body: JSON.stringify(data) }),
  },
  search: {
    query: (q: string) => fetchApi<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),
  },
  decisions: {
    list: (params?: { projectId?: string; q?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.projectId) searchParams.set('projectId', params.projectId);
      if (params?.q) searchParams.set('q', params.q);
      const qs = searchParams.toString();
      return fetchApi<DecisionWithRelations[]>(`/decisions${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => fetchApi<DecisionWithRelations>(`/decisions/${id}`),
    create: (data: Record<string, any>) => fetchApi<DecisionWithRelations>('/decisions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<DecisionWithRelations>(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string; snapshot: any }>(`/decisions/${id}`, { method: 'DELETE' }),
    restore: (snapshot: Record<string, any>) => fetchApi<DecisionWithRelations>('/decisions/restore', { method: 'POST', body: JSON.stringify(snapshot) }),
  },

};

