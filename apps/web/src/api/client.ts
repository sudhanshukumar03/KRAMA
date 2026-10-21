import { createWorkspacesApi } from './workspacesApi';
import { createSpacesApi } from './spacesApi';
import { createDocumentsApi } from './documentsApi';
import { createProjectsApi } from './projectsApi';
import { createHabitsApi } from './habitsApi';
import { createSearchApi } from './searchApi';
import { createAiApi } from './aiApi';
import { createNotificationsApi } from './notificationsApi';
import { createDashboardApi } from './dashboardApi';
import { createFocusSessionsApi } from './focusSessionsApi';
import { createPlannerApi } from './plannerDomainApi';
import { createTasksApi } from './tasksApi';
import { affectsWorkspaceSummary, publishWorkspaceChange } from '../lib/workspaceChanges';
import { createGoalsApi } from './goalsApi';
import type { AuthUser, AuthResponse, PreferencesInput } from '../types/schema';
import { toast } from 'sonner';

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
/**
 * Decode identity hints for coordination between browser tabs only.
 * The server still verifies JWT signatures and session ownership on requests.
 */
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

/**
 * Ignore a late refresh result after an explicit login/logout changed accounts.
 * The generation counter prevents old asynchronous work from restoring a session.
 */
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
  const requestedWorkspace = currentWorkspaceId;
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

    if (requestedWorkspace === currentWorkspaceId && affectsWorkspaceSummary(endpoint, options.method)) publishWorkspaceChange(requestedWorkspace);
    // Handle 204 No Content
    if (res.status === 204) return {} as T;

    return res.json();
  };

  return executeRequest();
}

/**
 * Read newline-delimited SSE events from document AI endpoints.
 * Keep an unfinished line between reads because network chunks may split an event.
 */
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
  workspaces: createWorkspacesApi(fetchApi),
  spaces: createSpacesApi(fetchApi),

  documents: createDocumentsApi(fetchApi, downloadDocumentExport, streamDocumentAi),
  goals: createGoalsApi(fetchApi),
  projects: createProjectsApi(fetchApi),
  tasks: createTasksApi(fetchApi),

  habits: createHabitsApi(fetchApi),
  search: createSearchApi(fetchApi),

  ai: createAiApi(fetchApi),

  notifications: createNotificationsApi(fetchApi),

  dashboard: createDashboardApi(fetchApi),
  focusSessions: createFocusSessionsApi(fetchApi),
  planner: createPlannerApi(fetchApi),
};

