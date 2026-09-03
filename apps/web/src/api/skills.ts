import { fetchApi } from './client';

export interface Skill {
  id: string;
  name: string;
  category?: string;
  currentLevel: number;
  targetLevel: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    goals: number;
    projects: number;
    tasks: number;
    habits: number;
  };
}

export interface SkillOverview {
  metrics: {
    totalSkills: number;
    averageLevel: number;
    inProgress: number;
    goalProgress: {
      current: number;
      target: number;
      deadline: string;
    } | null;
  };
  skills: Skill[];
  topGaps: (Skill & { gap: number })[];
  recentActivity: any[];
}

export const skillsApi = {
  getOverview: () => fetchApi<SkillOverview>('/career/overview'),
  getDetail: (id: string) => fetchApi<any>(`/career/${id}`),
  create: (data: Partial<Skill>) => fetchApi<Skill>('/career', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Skill>) => fetchApi<Skill>(`/career/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<{ success: boolean }>(`/career/${id}`, { method: 'DELETE' }),
};