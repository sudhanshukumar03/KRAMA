import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { LandingPage } from './components/LandingPage';
import { useTheme } from './lib/theme';

function App() {
  useTheme();
  return (
    <>
      <Toaster 
        position="bottom-right" 
        duration={2500}
        toastOptions={{
          style: {
            background: '#FFFFFF',
            border: '1px solid #E5E8EC',
            color: '#111827',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
          }
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<AppShell />} />
      </Routes>
    </>
  );
}

export default App;
