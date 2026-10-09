import type { 
  Workspace, Space, WorkspaceCreateInput, WorkspaceUpdateInput, SpaceCreateInput, SpaceUpdateInput,
  ProjectCreateInput, ProjectUpdateInput, GoalCreateInput, GoalUpdateInput, HabitCreateInput, HabitUpdateInput, TaskUpdateInput, TelemetryInput, ProjectWithRelations, IssueWithRelations, GoalWithRelations, Habit, SearchResult,
  AuthUser, AuthResponse, PreferencesInput, TaskComment, Notification, TaskCreateInput, FocusCompletionInput,
  DocumentWithRelations, DocumentDetail, DocumentVersion, DocumentVersionSummary, DocumentMetadataInput,
  DocumentCreateInput, DocumentContentResult, DocumentSearchResult, DocumentGraph, Tag, EntityLink,
  FocusSession, WallpaperResponse, AnalyticsDay, FocusHistory, DashboardData, AiConfiguration, AiResponse, WorkspaceExport
} from '../types/schema';
import type { FocusScheduleData } from '../components/focus/types';
import { toast } from 'sonner';
import type { PlannerData, TimeBlock, TimeBlockInput, TimeBlockUpdate, Milestone, MilestoneInput, MilestoneUpdate, MilestoneRange, HolidayCalendar } from '../types/planner';

const API_BASE = '/api/v1';

let currentAccessToken: string | null = null;
let currentWorkspaceId: string | null = typeof window !== 'undefined' ? localStorage.getItem('krama_active_workspace') : null;
let globalLogoutHandler: (() => void) | null = null;
const tokenListeners = new Set<(token: string | null) => void>();
let sessionGeneration = 0;

// Same-origin tabs share a refresh cookie, so coordinate its rotation without
// persisting access tokens in browser storage. Account changes stay local.
const sessionChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('krama.session.v1') : null;
function tokenIdentity(token: string | null): { sub: string; exp: number } | null {
  try {
    if (!token) return null;
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const identity = JSON.parse(atob(payload));
    return typeof identity.sub === 'string' && typeof identity.exp === 'number' ? identity : null;
  } catch { return null; }
}
sessionChannel?.addEventListener('message', event => {
  const message = event.data;
  const identity = tokenIdentity(currentAccessToken);
  if (message?.type === 'request' && identity && identity.exp * 1000 > Date.now() + 10000) {
    sessionChannel.postMessage({ type: 'response', id: message.id, token: currentAccessToken });
  } else if (message?.type === 'rotation' && identity && message.previousToken === currentAccessToken) {
    const replacement = tokenIdentity(message.token);
    if (replacement?.sub === identity.sub && replacement.exp * 1000 > Date.now()) publishAccessToken(message.token);
  } else if (message?.type === 'logout' && identity && message.sub === identity.sub) {
    sessionGeneration++;
    publishAccessToken(null);
    globalLogoutHandler?.();
  }
});

function peerAccessToken(accountId?: string): Promise<string | null> {
  if (!sessionChannel) return Promise.resolve(null);
  return new Promise(resolve => {
    const id = crypto.randomUUID();
    const finish = (token: string | null) => {
      clearTimeout(timeout); sessionChannel.removeEventListener('message', receive); resolve(token);
    };
    const receive = (event: MessageEvent) => {
      if (event.data?.type !== 'response' || event.data.id !== id) return;
      const identity = tokenIdentity(event.data.token);
      if (identity && (!accountId || identity.sub === accountId) && identity.exp * 1000 > Date.now() + 10000) finish(event.data.token);
    };
    const timeout = setTimeout(() => finish(null), 100);
    sessionChannel.addEventListener('message', receive);
    sessionChannel.postMessage({ type: 'request', id });
  });
}

function publishAccessToken(token: string | null) {
  currentAccessToken = token;
  tokenListeners.forEach(listener => listener(token));
}

function setAccessToken(token: string | null) {
  // Explicit login/logout invalidates pending work even when the value stays null.
  const previous = tokenIdentity(currentAccessToken);
  sessionGeneration++;
  publishAccessToken(token);
  if (!token && previous) sessionChannel?.postMessage({ type: 'logout', sub: previous.sub });
}

// The single in-flight refresh promise to prevent race conditions during concurrent 401s
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const generation = sessionGeneration;
  const previousToken = currentAccessToken;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    if (sessionGeneration !== generation) return null;
    publishAccessToken(data.accessToken);
    sessionChannel?.postMessage({ type: 'rotation', previousToken, token: data.accessToken });
    return data.accessToken;
  } catch (error) {
    if (sessionGeneration !== generation) return null;
    publishAccessToken(null);
    throw error;
  }
}

// Bootstrap and expired-request recovery share one rotation, including React's
// development remount. Competing rotations can invalidate the just-issued JWT.
async function refreshAccessToken(reuseExisting = false) {
  if (!refreshPromise) {
    const generation = sessionGeneration;
    const requestedToken = currentAccessToken;
    const rotate = async () => {
      if (generation !== sessionGeneration) return null;
      if (currentAccessToken && currentAccessToken !== requestedToken) return currentAccessToken;
      if (reuseExisting) {
        const token = await peerAccessToken(tokenIdentity(requestedToken)?.sub);
        if (generation !== sessionGeneration) return null;
        if (token) { publishAccessToken(token); return token; }
      }
      return doRefresh();
    };
    const locks = typeof window !== 'undefined' ? navigator.locks : undefined;
    const coordinatedRefresh = async (): Promise<string | null> =>
      locks ? await locks.request('krama.session.refresh', rotate) : await rotate();
    refreshPromise = coordinatedRefresh()
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// One recovery path for JSON, streams, downloads and multipart uploads.
async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const execute = (token: string | null) => {
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (currentWorkspaceId) headers.set('x-workspace-id', currentWorkspaceId);
    headers.set('x-timezone-offset', String(new Date().getTimezoneOffset()));
    headers.set('x-timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
    return fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });
  };
  const requestedToken = currentAccessToken;
  const generation = sessionGeneration;
  const response = await execute(requestedToken);
  const sessionEndpoint = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'].includes(endpoint);
  if (response.status !== 401 || sessionEndpoint || sessionGeneration !== generation) return response;
  if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
  let token: string | null;
  try {
    token = currentAccessToken !== requestedToken && currentAccessToken
      ? currentAccessToken : await refreshAccessToken();
  } catch (error) {
    if (sessionGeneration === generation && !currentAccessToken) globalLogoutHandler?.();
    throw error;
  }
  if (!token || sessionGeneration !== generation) return response;
  if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
  const retried = await execute(token);
  if (retried.status === 401 && sessionGeneration === generation && currentAccessToken === token) {
    setAccessToken(null);
    globalLogoutHandler?.();
  }
  return retried;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const executeRequest = async () => {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await authenticatedFetch(endpoint, {
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
        const issues = Array.isArray(json.errors) ? json.errors : [];
        if (issues.length) {
          errorMessage = issues.map((issue: { message?: string }) => issue.message).filter(Boolean).join(' ');
        }
      } catch {}

      if (res.status === 403) {
        toast.error(`Permission Denied: ${errorMessage}`);
      } else if (res.status === 409) {
        toast.error(`Update Conflict: ${errorMessage}`, {
          description: 'This record was modified elsewhere. Please refresh to see the latest changes.',
          duration: 5000,
        });
      } else if (res.status === 429) {
        toast.error('Too Many Requests', { description: 'Please slow down.' });
      }

      // Attach the HTTP status so callers can branch on it (e.g. 429 handling).
      const err = new Error(errorMessage) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    // Handle 204 No Content
    if (res.status === 204) return {} as T;

    return res.json();
  };

  return executeRequest();
}

async function streamDocumentAi(
  url: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  signal?: AbortSignal
) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentAccessToken) headers['Authorization'] = `Bearer ${currentAccessToken}`;
    if (currentWorkspaceId) headers['x-workspace-id'] = currentWorkspaceId;

    const res = await authenticatedFetch(url, {
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
            // The server streams `data: {"error": "..."}` before its final
            // [DONE] when generation fails. Surface it instead of silently
            // ending the stream with an empty response.
            if (parsed.error) {
              onError(new Error(parsed.error));
              return;
            }
            if (parsed.text) onChunk(parsed.text);
          } catch {}
        }
      }
    }
    onDone();
  } catch (err) {
    if (signal?.aborted) return;
    onError(err instanceof Error ? err : new Error('Stream request failed'));
  }
}

async function downloadDocumentExport(id: string, format: 'md' | 'spec', filename?: string) {
  const headers: Record<string, string> = {};
  if (currentAccessToken) headers['Authorization'] = `Bearer ${currentAccessToken}`;
  if (currentWorkspaceId) headers['x-workspace-id'] = currentWorkspaceId;

  const res = await authenticatedFetch(`/documents/${id}/export?format=${format}`, {
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

async function fetchDocumentPages(spaceId?: string, deleted = false) {
  const all: DocumentWithRelations[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ limit: '200' });
    if (spaceId && spaceId !== 'ALL') params.set('spaceId', spaceId);
    if (deleted) params.set('deleted', 'true');
    if (cursor) params.set('cursor', cursor);
    const page = await fetchApi<{ items: DocumentWithRelations[]; nextCursor: string | null }>(`/documents?${params.toString()}`);
    all.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return all;
}

export const api = {
  setAccessToken,
  subscribeAccessToken: (listener: (token: string | null) => void) => {
    tokenListeners.add(listener);
    return () => { tokenListeners.delete(listener); };
  },
  setWorkspaceId: (wid: string | null) => { currentWorkspaceId = wid; },
  setGlobalLogoutHandler: (handler: () => void) => { globalLogoutHandler = handler; },

  upload: {
    capabilities: () => fetchApi<{ uploadAvailable: boolean; unsplashAvailable: boolean }>('/upload/capabilities'),
    file: async (file: File): Promise<{ success: boolean; url: string; key: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await authenticatedFetch('/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          ...(currentWorkspaceId ? { 'x-workspace-id': currentWorkspaceId } : {})
        },
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to upload file');
      }
      return res.json();
    }
  },
  auth: {
    signup: (data: { email: string; password: string; name?: string }) => fetchApi<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) => fetchApi<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    changePassword: (data: { currentPassword: string; newPassword: string }) => fetchApi<{ message: string }>('/auth/me/password', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => fetchApi<{ message: string }>('/auth/logout', { method: 'POST' }),
    refresh: async (options?: { reuseExisting?: boolean }) => ({ accessToken: await refreshAccessToken(options?.reuseExisting) }),
    me: () => fetchApi<{ user: AuthUser }>('/auth/me', { method: 'GET' }),
    updatePreferences: (body: PreferencesInput) => fetchApi<{ user: AuthUser }>('/auth/me/preferences', { method: 'PATCH', body: JSON.stringify(body) }),
  },
  workspaces: {
    list: () => fetchApi<Workspace[]>('/workspaces'),
    create: (data: WorkspaceCreateInput) => fetchApi<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: WorkspaceUpdateInput) => fetchApi<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    export: () => fetchApi<WorkspaceExport>('/workspaces/export'),
  },
  spaces: {
    list: () => fetchApi<Space[]>('/spaces'),
    create: (data: SpaceCreateInput) => fetchApi<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: SpaceUpdateInput) => fetchApi<Space>(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ success: boolean }>(`/spaces/${id}`, { method: 'DELETE' }),
  },

  documents: {
    list: (spaceId?: string) => fetchDocumentPages(spaceId, false),
    listDeleted: (spaceId?: string) => fetchDocumentPages(spaceId, true),
    get: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}`),
    create: (data: DocumentCreateInput) => fetchApi<DocumentDetail>('/documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: DocumentMetadataInput) => fetchApi<DocumentDetail>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateContent: (id: string, contentJson: unknown, expectedUpdatedAt?: string) => fetchApi<DocumentContentResult>(`/documents/${id}/content`, { method: 'PATCH', body: JSON.stringify({ contentJson, expectedUpdatedAt }) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}/restore`, { method: 'POST' }),
    purge: (id: string) => fetchApi<{ message: string }>(`/documents/${id}/permanent`, { method: 'DELETE' }),
    move: (id: string, data: { targetFolderId?: string | null; targetParentId?: string | null }) => 
      fetchApi<DocumentDetail>(`/documents/${id}/move`, { method: 'POST', body: JSON.stringify(data) }),
    duplicate: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}/duplicate`, { method: 'POST' }),
    favorite: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}/favorite`, { method: 'POST' }),
    importSpec: (data: { content: string; spaceId?: string; parentId?: string }) => 
      fetchApi<{ document: DocumentDetail; totalImported: number; message: string }>('/documents/import', { method: 'POST', body: JSON.stringify(data) }),
    getVersions: (id: string) => fetchApi<DocumentVersionSummary[]>(`/documents/${id}/versions`),
    createVersion: (id: string) => fetchApi<DocumentVersion>(`/documents/${id}/versions`, { method: 'POST' }),
    restoreVersion: (id: string, versionId: string) => fetchApi<DocumentDetail>(`/documents/${id}/versions/${versionId}/restore`, { method: 'POST' }),
    getTags: (workspaceId: string) => fetchApi<Tag[]>(`/workspaces/${workspaceId}/tags`),
    addTag: (id: string, tagName: string, color?: string) => fetchApi<Tag>(`/documents/${id}/tags`, { method: 'POST', body: JSON.stringify({ tagName, color }) }),
    removeTag: (id: string, tagId: string) => fetchApi<{ message: string }>(`/documents/${id}/tags/${tagId}`, { method: 'DELETE' }),
    getLinks: (id: string) => fetchApi<{ outgoing: EntityLink[]; incoming: EntityLink[] }>(`/documents/${id}/links`),
    addLink: (id: string, data: { targetType: string; targetId: string; linkType?: string }) => fetchApi<EntityLink>(`/documents/${id}/links`, { method: 'POST', body: JSON.stringify(data) }),
    removeLink: (linkId: string) => fetchApi<{ message: string }>(`/links/${linkId}`, { method: 'DELETE' }),
    createTask: (id: string, data: { title: string; priority?: string; status?: string; description?: string }) =>
      fetchApi<{ task: IssueWithRelations; link: EntityLink }>(`/documents/${id}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    search: (workspaceId: string, q: string, filters?: { type?: string; projectId?: string; status?: string; tag?: string }, signal?: AbortSignal) => {
      const params = new URLSearchParams({ q });
      if (filters?.type && filters.type !== 'ALL') params.append('type', filters.type);
      if (filters?.projectId && filters.projectId !== 'ALL') params.append('projectId', filters.projectId);
      if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters?.tag && filters.tag !== 'ALL') params.append('tag', filters.tag);
      return fetchApi<DocumentSearchResult[]>(`/workspaces/${workspaceId}/search?${params.toString()}`, { signal });
    },


    export: (id: string, format: 'md' | 'spec', filename?: string) => downloadDocumentExport(id, format, filename),
    getGraph: (workspaceId: string) => fetchApi<DocumentGraph>(`/workspaces/${workspaceId}/graph`),
    aiAsk: (id: string, question: string, onChunk: (text: string) => void, onDone: () => void, onError: (err: Error) => void, signal?: AbortSignal) =>
      streamDocumentAi(`/documents/${id}/ai/ask`, { question }, onChunk, onDone, onError, signal),
    aiCompose: (id: string, payload: { instruction: string; mode: 'write' | 'improve' | 'explain'; selection?: string }, onChunk: (text: string) => void, onDone: () => void, onError: (err: Error) => void, signal?: AbortSignal) =>
      streamDocumentAi(`/documents/${id}/ai/compose`, payload, onChunk, onDone, onError, signal),
  },
  goals: {
    list: () => fetchApi<GoalWithRelations[]>('/goals'),
    // Scalar-only list (no snapshots / nested childGoals) for link dropdowns,
    // sidebar counts, and the command palette.
    listLite: () => fetchApi<GoalWithRelations[]>('/goals/lite'),
    get: (id: string) => fetchApi<GoalWithRelations>(`/goals/${id}`),
    create: (data: GoalCreateInput) => fetchApi<GoalWithRelations>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: GoalUpdateInput) => fetchApi<GoalWithRelations>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/goals/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<GoalWithRelations>(`/goals/${id}/restore`, { method: 'POST' }),
  },
    projects: {
    list: () => fetchApi<ProjectWithRelations[]>('/projects'),
    get: (id: string) => fetchApi<ProjectWithRelations>(`/projects/${id}`),
    create: (data: ProjectCreateInput) => fetchApi<ProjectWithRelations>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProjectUpdateInput) => fetchApi<ProjectWithRelations>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
    reorder: (id: string, data: { position: number; version: number; workspaceId?: string }) =>
      fetchApi<ProjectWithRelations>(`/projects/${id}/reorder`, { method: 'PATCH', body: JSON.stringify(data) }),
    restore: (id: string) => fetchApi<ProjectWithRelations>(`/projects/${id}/restore`, { method: 'POST' }),
  },
  tasks: {
    list: (params?: Record<string, string> | { queryKey: readonly unknown[] }) => {
      const safeParams = params && 'queryKey' in params ? undefined : params;
      const q = new URLSearchParams(safeParams || {}).toString();
      return fetchApi<IssueWithRelations[]>(`/tasks${q ? `?${q}` : ''}`); // Mapped to /tasks
    },
    get: (id: string) => fetchApi<IssueWithRelations>(`/tasks/${id}`),
    create: (data: TaskCreateInput) => fetchApi<IssueWithRelations>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: TaskUpdateInput) => fetchApi<IssueWithRelations>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<IssueWithRelations>(`/tasks/${id}/restore`, { method: 'POST' }),
    complete: (id: string) => fetchApi<IssueWithRelations>(`/tasks/${id}/complete`, { method: 'PATCH' }),
    addComment: (id: string, content: string) => fetchApi<TaskComment>(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  },

  habits: {
    list: () => fetchApi<Habit[]>('/habits'),
    create: (data: HabitCreateInput) => fetchApi<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: HabitUpdateInput) => fetchApi<Habit>(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/habits/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<Habit>(`/habits/${id}/restore`, { method: 'POST' }),
    complete: (id: string, date?: string, dateIso?: string) => fetchApi<Habit>(`/habits/${id}/log`, { method: 'POST', ...(date ? { body: JSON.stringify({ date, dateIso }) } : {}) }),
    uncomplete: (id: string, date?: string, dateIso?: string) => fetchApi<Habit>(`/habits/${id}/log?date=${date || ''}&dateIso=${dateIso || ''}`, { method: 'DELETE' }),
  },
  search: {
    query: (q: string) => fetchApi<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),
  },

  ai: {
    complete: (data: { message: string; ragEnabled?: boolean }) => fetchApi<AiResponse>('/ai/complete', { method: 'POST', body: JSON.stringify(data) }),
    ragQuery: (data: { message: string; ragEnabled?: boolean }) => fetchApi<AiResponse>('/ai/rag-query', { method: 'POST', body: JSON.stringify(data) }),
    config: () => fetchApi<AiConfiguration>('/ai/config'),
    analyzeTelemetry: (data: TelemetryInput) => fetchApi<{ insight: string }>('/ai/analyze-telemetry', { method: 'POST', body: JSON.stringify(data) }),
    getDashboardInsight: (force?: boolean) => fetchApi<{ insight: string }>(`/ai/dashboard-insight${force ? '?force=true' : ''}`)
  },

  notifications: {
    list: () => fetchApi<Notification[]>('/notifications', { method: 'GET' }),
    markAsRead: (id: string) => fetchApi<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () => fetchApi<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' })
  },

  dashboard: {
    get: () => fetchApi<DashboardData>('/dashboard', { method: 'GET' })
  },
  focusSessions: {
    complete: (data: FocusCompletionInput) => fetchApi<{ session: FocusSession }>('/focus-sessions', { method: 'POST', body: JSON.stringify(data) }),
    getSchedule: () => fetchApi<FocusScheduleData>('/focus-sessions/schedule'),
    getWallpaper: (category: string) => fetchApi<WallpaperResponse>(`/focus-sessions/wallpaper?category=${encodeURIComponent(category)}`),
  },
  analytics: {
    overview: (range: string) => fetchApi<AnalyticsDay[]>(`/analytics/overview?range=${range}`, { method: 'GET' }),
    focusHistory: (range: string, cursor?: string) => fetchApi<FocusHistory>(`/analytics/focus-history?range=${range}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { method: 'GET' })
  },
  planner: {
    getWeek: (start: string, end: string, workspaceId?: string | null) => {
      let url = `/planner/week?start=${start}&end=${end}`;
      if (workspaceId) url += `&workspaceId=${workspaceId}`;
      return fetchApi<PlannerData>(url);
    },
    getHolidays: (country: string, region: string | null, start: string, end: string) => {
      let url = `/planner/holidays?country=${country}&start=${start}&end=${end}`;
      if (region) url += `&region=${region}`;
      return fetchApi<HolidayCalendar>(url);
    },
    createTimeBlock: (data: TimeBlockInput) => fetchApi<TimeBlock>('/planner/time-blocks', { method: 'POST', body: JSON.stringify(data) }),
    updateTimeBlock: (id: string, data: TimeBlockUpdate) => fetchApi<TimeBlock>(`/planner/time-blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteTimeBlock: (id: string) => fetchApi<void>(`/planner/time-blocks/${id}`, { method: 'DELETE' }),
    getMilestones: (start: string, end: string, workspaceId?: string | null) => {
      let url = `/planner/milestones?start=${start}&end=${end}`;
      if (workspaceId) url += `&workspaceId=${workspaceId}`;
      return fetchApi<MilestoneRange>(url);
    },
    createMilestone: (data: MilestoneInput) => fetchApi<Milestone>('/planner/milestones', { method: 'POST', body: JSON.stringify(data) }),
    updateMilestone: (id: string, data: MilestoneUpdate) => fetchApi<Milestone>(`/planner/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteMilestone: (id: string) => fetchApi<{ success: boolean }>(`/planner/milestones/${id}`, { method: 'DELETE' })
  }
};

