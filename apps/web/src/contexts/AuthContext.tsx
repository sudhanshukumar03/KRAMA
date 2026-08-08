import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
interface User {
  id: string;
  email: string;
  name: string;
  memberships: { workspaceId: string; role: string }[];
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  workspaceId: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  switchWorkspace: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set the global token in the API client
  useEffect(() => {
    api.setAccessToken(accessToken);
    api.setWorkspaceId(workspaceId);
  }, [accessToken, workspaceId]);

  const handleLogout = useCallback(async () => {
    try {
      if (accessToken) {
        await api.auth.logout();
      }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
      setAccessToken(null);
      setWorkspaceId(null);
      api.setAccessToken(null);
      api.setWorkspaceId(null);
    }
  }, [accessToken]);

  // Expose the global logout function to the API client for 401s that fail to refresh
  useEffect(() => {
    api.setGlobalLogoutHandler(handleLogout);
  }, [handleLogout]);

  // Session Bootstrap on mount
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        // We start with no in-memory token, but we assume there might be a refresh cookie.
        // We call refresh directly (which will fail gracefully if no cookie exists).
        const data = await api.auth.refresh();
        if (mounted && data.accessToken) {
          setAccessToken(data.accessToken);
          
          // Now fetch the user profile using the new token
          api.setAccessToken(data.accessToken);
          const meData = await api.auth.me();
          if (mounted && meData.user) {
            setUser(meData.user);
            let wid = meData.user.memberships?.[0]?.workspaceId || null;
            if (!wid) {
              const savedWid = localStorage.getItem('krama_active_workspace');
              wid = savedWid || null;
            }
            setWorkspaceId(wid);
            api.setWorkspaceId(wid); // Synchronously set to avoid race condition with React Query mounts
            if (wid) localStorage.setItem('krama_active_workspace', wid);
          }
        }
      } catch {
        // No valid session, stay logged out
        console.debug('No valid session found during bootstrap.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrap();
    return () => { mounted = false; };
  }, []);

  const login = (token: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    const wid = userData.memberships?.[0]?.workspaceId || null;
    setWorkspaceId(wid);
    api.setAccessToken(token);
    api.setWorkspaceId(wid);
    if (wid) localStorage.setItem('krama_active_workspace', wid);
  };
  
  const switchWorkspace = (id: string) => {
    setWorkspaceId(id);
    api.setWorkspaceId(id);
    localStorage.setItem('krama_active_workspace', id);
    window.location.reload(); // Quick way to wipe all React Query state for the old workspace
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, workspaceId, isLoading, login, logout: handleLogout, switchWorkspace }}>
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
