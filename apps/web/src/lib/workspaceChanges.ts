export const WORKSPACE_CHANGED = 'krama:workspace-changed';
export function publishWorkspaceChange(workspaceId?: string | null) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED, { detail: { workspaceId } }));
}
export function affectsWorkspaceSummary(endpoint: string, method = 'GET') {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) &&
    /^\/(tasks|goals|projects|habits|spaces|documents)(?:\/[^/?]+)?(?:\/(restore|purge|complete))?(?:\?|$)/.test(endpoint);
}
