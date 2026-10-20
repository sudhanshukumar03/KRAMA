import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api/client';

/** One authenticated connection, replaced on token rotation and disconnected on exit. */
export function useFocusRealtime() {
  const { status, accessToken } = useAuth();
  const queryClient = useQueryClient();
  // Socket

  // Initialize socket for this tab using in-memory accessToken from useAuth()
  useEffect(() => {
    if (status !== 'authed' || !accessToken) return;

    const sock = io('/', {
      auth: { token: accessToken },
      reconnection: true,
    });

    sock.on('notification', (data: { title: string; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(data.title, { description: data.message });
    });
    sock.on('connect_error', (error) => {
      if (error.message.includes('Token expired')) {
        api.auth.refresh().catch(() => window.dispatchEvent(new Event('krama:logout')));
      }
    });
    sock.on('session:ended', ({ reason }: { reason: string }) => {
      if (reason === 'revoked') window.dispatchEvent(new Event('krama:logout'));
      else api.auth.refresh({ reuseExisting: reason === 'rotated' }).catch(() => window.dispatchEvent(new Event('krama:logout')));
    });

    const refreshSchedule = () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['focus-task'] });
    };
    for (const event of ['connect', 'task:created', 'task:updated', 'task:deleted', 'project:updated', 'project:deleted', 'project:restored', 'planner:changed', 'preferences:updated', 'focus:session:completed']) sock.on(event, refreshSchedule);


    return () => {
      sock.disconnect();
    };
  }, [status, accessToken, queryClient]);

}
