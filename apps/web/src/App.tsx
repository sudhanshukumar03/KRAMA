import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { AuthGuard } from './components/AuthGuard';
import { useTheme } from './lib/theme';
import { SocketProvider } from './providers/SocketProvider';

function App() {
  useTheme();
  return (
    <>
      <Toaster 
        position="bottom-right" 
        duration={4000}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<AuthGuard />}>
          <Route path="/app/*" element={<SocketProvider><AppShell /></SocketProvider>} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
