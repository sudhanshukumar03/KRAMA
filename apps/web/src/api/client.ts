import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, RoadmapItem, GoalProgressSnapshot, DecisionWithRelations, SearchResult
} from '../types/schema';

const API_BASE = 'http://localhost:3000/api/v1';

async function getAuthToken() {
  let token = localStorage.getItem('krama_token');
  if (token) return token;
  
  // Auto-signup a test user for dev if no token exists
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `dev_${Date.now()}@krama.com`, password: 'password123', name: 'Dev User' })
  });
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem('krama_token', data.accessToken);
    // Also we need the workspaceId. Let's fetch /me to get it?
    // Wait, signup doesn't return workspaceId in this simple setup.
    // The spec said "every query scoped by workspaceId from the authenticated session / route param".
    return data.accessToken;
  }
  return null;
}

// We also need the default workspaceId.
async function getWorkspaceId(token: string) {
  let wid = localStorage.getItem('krama_workspace_id');
  if (wid) return wid;
  
  if (token) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user?.memberships?.length > 0) {
        wid = data.user.memberships[0].workspaceId;
        localStorage.setItem('krama_workspace_id', wid!);
        return wid;
      }
    }
  }
  return null;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const wid = await getWorkspaceId(token!);

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (wid) headers.set('x-workspace-id', wid);
  headers.set('Content-Type', 'application/json');

  // Route projects to real backend
  if (endpoint.startsWith('/projects') ||
      endpoint.startsWith('/pages') ||
      endpoint.startsWith('/goals') ||
      endpoint.startsWith('/habits') ||
      endpoint.startsWith('/sprints') ||
      endpoint.startsWith('/daily-logs')) {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
    return res.json();
  }

  // Route issues to real backend tasks
  if (endpoint.startsWith('/issues')) {
    // Map /issues to /tasks
    const taskEndpoint = endpoint.replace('/issues', '/tasks');
    const res = await fetch(`${API_BASE}${taskEndpoint}`, { ...options, headers });
    if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
    return res.json();
  }

  // Mock data for other endpoints (Not in Stage 3)
  if (endpoint.includes('/roadmap-items')) return [] as any;
  if (endpoint.includes('/snapshots')) return [] as any;
  if (endpoint.includes('/decisions')) {
    return [
      {
        id: 'd1',
        title: 'Adopt God-Level UI Scale',
        context: 'The UI felt cramped and lacked premium spacing.',
        reasoning: 'Increased typography scale by 20% and padding to 24px/32px creates a more breathable layout.',
        alternativesConsidered: ['Keep Tailwind Defaults'],
        outcome: 'Adopted God-Level typography.',
        status: 'accepted',
        date: new Date().toISOString(),
      }
    ] as any;
  }
  return [] as any;
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
    update: (id: string, data: Record<string, any>) => fetchApi<PageWithRelations>(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/pages/${id}`, { method: 'DELETE' }),
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
    update: (id: string, data: Record<string, any>) => fetchApi<ProjectWithRelations>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
    reorder: (id: string, position: number, version: number) => fetchApi<ProjectWithRelations>(`/projects/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ position, version }) }),
  },
  issues: {
    list: (params?: any) => {
      const q = new URLSearchParams(params || {}).toString();
      return fetchApi<IssueWithRelations[]>(`/issues${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<IssueWithRelations>(`/issues/${id}`),
    create: (data: Record<string, any> & { title: string }) => fetchApi<IssueWithRelations>('/issues', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<IssueWithRelations>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/issues/${id}`, { method: 'DELETE' }),
    reorder: (id: string, position: number, version: number) => fetchApi<IssueWithRelations>(`/issues/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ position, version }) }),
    complete: (id: string) => fetchApi<IssueWithRelations>(`/issues/${id}/complete`, { method: 'PATCH' }),
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

