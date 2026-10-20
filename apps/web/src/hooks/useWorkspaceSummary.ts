import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { WORKSPACE_CHANGED } from '../lib/workspaceChanges';

export function useWorkspaceSummary() {
  const { workspaceId } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changed = (event: Event) => {
      const scope = (event as CustomEvent<{ workspaceId?: string | null }>).detail?.workspaceId;
      if (scope && scope !== workspaceId) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void client.invalidateQueries({ queryKey: ['workspace-summary'] });
        void client.invalidateQueries({ queryKey: ['search', 'recent'] });
      }, 60);
    };
    window.addEventListener(WORKSPACE_CHANGED, changed);
    return () => { clearTimeout(timer); window.removeEventListener(WORKSPACE_CHANGED, changed); };
  }, [client, workspaceId]);
  return useQuery({ queryKey: ['workspace-summary', workspaceId], queryFn: api.workspaces.summary, enabled: !!workspaceId, refetchInterval: 60000 });
}
