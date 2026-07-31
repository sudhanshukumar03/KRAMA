import type { 
  Workspace, Space, ProjectWithRelations, IssueWithRelations, PageWithRelations, GoalWithRelations, Habit, Sprint, DailyLog, RoadmapItem, GoalProgressSnapshot, DecisionWithRelations, SearchResult
} from '../types/schema';

async function fetchApi<T>(endpoint: string, _options: RequestInit = {}): Promise<T> {
  // Mock data for UI presentation without Postgres
  if (endpoint.includes('/issues')) return [] as any;
  if (endpoint.includes('/projects')) return [{ id: 'p1', name: 'Core Architecture', status: 'active', updatedAt: new Date().toISOString() }] as any;
  if (endpoint.includes('/habits')) return [] as any;
  if (endpoint.includes('/pages')) return [] as any;
  if (endpoint.includes('/goals')) return [] as any;
  if (endpoint.includes('/daily-logs')) return [] as any;
  if (endpoint.includes('/sprints')) return [] as any;
  if (endpoint.includes('/roadmap-items')) return [] as any;
  if (endpoint.includes('/snapshots')) return [] as any;
  if (endpoint.includes('/decisions')) {
    return [
      {
        id: 'd1',
        title: 'Adopt God-Level UI Scale',
        context: 'The UI felt cramped and lacked premium spacing.',
        reasoning: 'Increased typography scale by 20% and padding to 24px/32px creates a more breathable layout. Soft noise and ambient glow elevate the experience.',
        alternativesConsidered: ['Keep Tailwind Defaults', 'Use Dark Mode Only'],
        outcome: 'Adopted God-Level typography and spacing scale globally.',
        status: 'accepted',
        date: new Date().toISOString(),
        linkedProjectId: 'p1',
        linkedProject: { id: 'p1', name: 'Core Architecture' }
      },
      {
        id: 'd2',
        title: 'Deprecate Neon Glows for Flat Avionics',
        context: 'We had too many glowing borders making it look like a gaming site.',
        reasoning: 'Avionics interfaces rely on flat, high-contrast, crisp elements.',
        alternativesConsidered: ['Retain subtle glows'],
        outcome: 'Removed heavy glows, kept 1px borders.',
        status: 'deprecated',
        date: new Date(Date.now() - 86400000).toISOString(),
        linkedProjectId: 'p1',
        linkedProject: { id: 'p1', name: 'Core Architecture' }
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

