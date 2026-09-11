import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
interface User {
  id: string;
  email: string;
  name: string;
  memberships: { workspaceId: string; role: string }[];
  metadata?: {
    timerPreferences?: {
      sprint?: number;
      deep?: number;
      quick?: number;
    };
    [key: string]: any;
  };
}

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
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  // Set the global token in the API client
  useEffect(() => {
    if (authState.status === 'authed') {
      api.setAccessToken(authState.accessToken);
      api.setWorkspaceId(authState.workspaceId);
    } else {
      api.setAccessToken(null);
      api.setWorkspaceId(null);
    }
  }, [authState]);

  const handleLogout = useCallback(async () => {
    try {
      if (authState.status === 'authed') {
        await api.auth.logout();
      }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setAuthState({ status: 'anon' });
    }
  }, [authState]);

  // Listen for the global logout event dispatched by centralized 401 handler
  useEffect(() => {
    const onGlobalLogout = () => {
      setAuthState({ status: 'anon' });
    };
    window.addEventListener('krama:logout', onGlobalLogout);
    return () => {
      window.removeEventListener('krama:logout', onGlobalLogout);
    };
  }, []);

  // Expose the global logout function to the API client for 401s that fail to refresh
  useEffect(() => {
    api.setGlobalLogoutHandler(() => {
      window.dispatchEvent(new Event('krama:logout'));
    });
  }, []);

  // Session Bootstrap on mount
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const data = await api.auth.refresh();
        if (mounted && data.accessToken) {
          api.setAccessToken(data.accessToken);
          const meData = await api.auth.me();
          if (mounted && meData.user) {
            let wid = meData.user.memberships?.[0]?.workspaceId || null;
            if (!wid) {
              const savedWid = localStorage.getItem('krama_active_workspace');
              wid = savedWid || null;
            }
            api.setWorkspaceId(wid); // Synchronously set to avoid race condition with React Query mounts
            if (wid) localStorage.setItem('krama_active_workspace', wid);
            
            setAuthState({
              status: 'authed',
              user: meData.user,
              accessToken: data.accessToken,
              workspaceId: wid,
            });
          }
        } else if (mounted) {
          setAuthState({ status: 'anon' });
        }
      } catch {
        if (mounted) {
          setAuthState({ status: 'anon' });
        }
        console.debug('No valid session found during bootstrap.');
      }
    }

    bootstrap();
    return () => { mounted = false; };
  }, []);

  const login = (token: string, userData: User) => {
    const wid = userData.memberships?.[0]?.workspaceId || null;
    api.setAccessToken(token);
    api.setWorkspaceId(wid);
    if (wid) localStorage.setItem('krama_active_workspace', wid);
    
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
      setAuthState({ ...authState, user: newUser });
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
