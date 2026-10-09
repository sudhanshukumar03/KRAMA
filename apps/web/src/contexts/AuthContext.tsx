import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AuthUser as User } from '../types/schema';

type AuthState = 
  | { status: 'loading' }
  | { status: 'authed'; user: User; accessToken: string; workspaceId: string | null }
  | { status: 'anon' };

interface AuthContextType {
  status: 'loading' | 'authed' | 'anon';
  user: User | null;
  accessToken: string | null;
  workspaceId: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  switchWorkspace: (id: string) => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const authActionVersion = useRef(0);
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  // Token rotations update React consumers, including both socket connections.
  useEffect(() => api.subscribeAccessToken(token => {
    if (token) setAuthState(previous => previous.status === 'authed' && previous.accessToken !== token
      ? { ...previous, accessToken: token } : previous);
  }), []);

  const activeWorkspaceId = authState.status === 'authed' ? authState.workspaceId : null;
  useEffect(() => {
    api.setWorkspaceId(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const handleLogout = useCallback(async () => {
    authActionVersion.current++;
    try {
      if (authState.status === 'authed') {
        await api.auth.logout();
      }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      api.setAccessToken(null);
      api.setWorkspaceId(null);
      localStorage.removeItem('krama_active_workspace');
      localStorage.removeItem('krama_user');
      queryClient.clear();
      setAuthState({ status: 'anon' });
    }
  }, [authState, queryClient]);

  // Listen for the global logout event dispatched by centralized 401 handler
  useEffect(() => {
    const onGlobalLogout = () => {
      authActionVersion.current++;
      api.setAccessToken(null);
      api.setWorkspaceId(null);
      localStorage.removeItem('krama_active_workspace');
      localStorage.removeItem('krama_user');
      queryClient.clear();
      setAuthState({ status: 'anon' });
    };
    window.addEventListener('krama:logout', onGlobalLogout);
    return () => {
      window.removeEventListener('krama:logout', onGlobalLogout);
    };
  }, [queryClient]);

  // Expose the global logout function to the API client for 401s that fail to refresh
  useEffect(() => {
    api.setGlobalLogoutHandler(() => {
      window.dispatchEvent(new Event('krama:logout'));
    });
  }, []);

  // Session Bootstrap on mount
  useEffect(() => {
    let mounted = true;
    const actionVersion = authActionVersion.current;
    const isCurrent = () => mounted && actionVersion === authActionVersion.current;
    async function bootstrap() {
      try {
        const data = await api.auth.refresh({ reuseExisting: true });
        if (isCurrent() && data.accessToken) {
          api.setAccessToken(data.accessToken);
          const meData = await api.auth.me();
          if (isCurrent() && meData.user) {
            const savedWid = localStorage.getItem('krama_active_workspace');
            const memberships = meData.user.memberships || [];
            const hasSavedMembership = memberships.some((m) => m.workspaceId === savedWid);
            const wid = (hasSavedMembership ? savedWid : null) || memberships[0]?.workspaceId || null;

            api.setWorkspaceId(wid); // Synchronously set to avoid race condition with React Query mounts
            if (wid) localStorage.setItem('krama_active_workspace', wid);
            else localStorage.removeItem('krama_active_workspace');
            
            setAuthState({
              status: 'authed',
              user: meData.user,
              accessToken: data.accessToken,
              workspaceId: wid,
            });
          }
        } else if (isCurrent()) {
          setAuthState({ status: 'anon' });
        }
      } catch {
        if (isCurrent()) {
          setAuthState({ status: 'anon' });
        }
        console.debug('No valid session found during bootstrap.');
      }
    }

    bootstrap();
    return () => { mounted = false; };
  }, []);

  const login = (token: string, userData: User) => {
    authActionVersion.current++;
    // Clearing destroys pending queries as well as cached account data.
    queryClient.clear();
    const savedWid = localStorage.getItem('krama_active_workspace');
    const memberships = userData.memberships || [];
    const hasSavedMembership = memberships.some((m) => m.workspaceId === savedWid);
    const wid = (hasSavedMembership ? savedWid : null) || memberships[0]?.workspaceId || null;

    api.setAccessToken(token);
    api.setWorkspaceId(wid);
    if (wid) localStorage.setItem('krama_active_workspace', wid);
    else localStorage.removeItem('krama_active_workspace');
    
    setAuthState({
      status: 'authed',
      user: userData,
      accessToken: token,
      workspaceId: wid,
    });
  };
  
  const switchWorkspace = (id: string) => {
    if (authState.status === 'authed') {
      setAuthState({ ...authState, workspaceId: id });
    }
    api.setWorkspaceId(id);
    localStorage.setItem('krama_active_workspace', id);
    window.location.reload(); // Quick way to wipe all React Query state for the old workspace
  };

  const updateUser = (newUser: User) => {
    if (authState.status === 'authed') {
      setAuthState(previous => previous.status === 'authed' ? { ...previous, user: newUser } : previous);
      localStorage.setItem('krama_user', JSON.stringify(newUser));
    }
  };

  const value: AuthContextType = {
    status: authState.status,
    user: authState.status === 'authed' ? authState.user : null,
    accessToken: authState.status === 'authed' ? authState.accessToken : null,
    workspaceId: authState.status === 'authed' ? authState.workspaceId : null,
    isLoading: authState.status === 'loading',
    login,
    logout: handleLogout,
    switchWorkspace,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
