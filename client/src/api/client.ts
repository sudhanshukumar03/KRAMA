import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, RoadmapItem, GoalProgressSnapshot
} from '../types/schema';

let cachedToken: string | null = null;

// Ensure authentication against Express backend
async function ensureAuth(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'engineer', password: 'secure_password' }),
    });
    if (res.ok) {
      const data = await res.json();
      cachedToken = data.token;
      return cachedToken;
    }
  } catch (err) {
    console.warn('Auto-auth connection failed (is backend server running?):', err);
  }
  return null;
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

  let res = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    cachedToken = null;
    await ensureAuth();
    if (cachedToken) {
      headers.set('Authorization', `Bearer ${cachedToken}`);
      res = await fetch(`/api/v1${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
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
  },
  spaces: {
    list: () => fetchApi<Space[]>('/spaces'),
    create: (data: Record<string, any>) => fetchApi<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<Space>(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/spaces/${id}`, { method: 'DELETE' }),
  },
  pages: {
    list: () => fetchApi<PageWithRelations[]>('/pages'),
    create: (data: Record<string, any>) => fetchApi<PageWithRelations>('/pages', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<PageWithRelations>(`/pages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/pages/${id}`, { method: 'DELETE' }),
  },
  goals: {
    list: () => fetchApi<GoalWithRelations[]>('/goals'),
    create: (data: Record<string, any>) => fetchApi<GoalWithRelations>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<GoalWithRelations>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/goals/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: () => fetchApi<ProjectWithRelations[]>('/projects'),
    create: (data: Record<string, any>) => fetchApi<ProjectWithRelations>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<ProjectWithRelations>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
  issues: {
    list: () => fetchApi<IssueWithRelations[]>('/issues'),
    create: (data: Record<string, any> & { title: string }) => fetchApi<IssueWithRelations>('/issues', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<IssueWithRelations>(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/issues/${id}`, { method: 'DELETE' }),
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
    delete: (id: string) => fetchApi<void>(`/habits/${id}`, { method: 'DELETE' }),
    complete: (id: string) => fetchApi<Habit>(`/habits/${id}/complete`, { method: 'POST' }),
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
  }
};
