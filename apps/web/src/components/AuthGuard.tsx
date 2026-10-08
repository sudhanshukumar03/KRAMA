import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from './ui/LoadingState';

export function AuthGuard() {
 const { user, isLoading, logout } = useAuth();
 const location = useLocation();

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background">
 <LoadingState title="Initializing session..." description="Verifying authentication..." />
 </div>
 );
 }

 if (!user) {
 return <Navigate to="/login" state={{ from: location }} replace />;
 }

 if (!user.memberships?.length) {
 return (
  <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8" aria-labelledby="no-workspace-title">
   <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-level-2 sm:p-8">
    <h1 id="no-workspace-title" className="text-page-title text-primary">No active workspace</h1>
    <p className="mt-3 text-body leading-relaxed text-secondary">
     Your account does not have access to an active workspace. Ask a workspace owner to invite you, then sign in again.
    </p>
    <button
     type="button"
     onClick={() => void logout()}
     className="mt-6 min-h-11 w-full rounded-lg bg-accent px-4 py-2 text-body font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
     Sign out
    </button>
   </section>
  </main>
 );
 }

 return <Outlet />;
}
