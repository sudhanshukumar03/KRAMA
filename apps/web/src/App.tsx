import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthGuard } from './components/AuthGuard';
import { useTheme } from './lib/theme';
import { SocketProvider } from './providers/SocketProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFound } from './components/NotFound';
import { LoadingState } from './components/ui/LoadingState';

const AppShell = lazy(() => import('./components/AppShell').then(m => ({ default: m.AppShell })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./components/Signup').then(m => ({ default: m.Signup })));
const FocusPage = lazy(() => import('./components/FocusPage').then(m => ({ default: m.FocusPage })));

function App() {
  useTheme();
  return (
    <>
      <Toaster 
        position="bottom-right" 
        duration={4000}
      />
      <Suspense fallback={<LoadingState variant="default" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<AuthGuard />}>
            <Route path="/app/*" element={
              <ErrorBoundary>
                <SocketProvider>
                  <AppShell />
                </SocketProvider>
              </ErrorBoundary>
            } />
            <Route path="/focus" element={
              <ErrorBoundary>
                <FocusPage />
              </ErrorBoundary>
            } />
            <Route path="/dashboard" element={<Navigate to="/app/" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
