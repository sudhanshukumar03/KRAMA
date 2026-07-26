import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { LandingPage } from './components/LandingPage';
import { useTheme } from './lib/theme';

function App() {
  useTheme();
  return (
    <>
      <Toaster position="bottom-right" richColors closeButton />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<AppShell />} />
      </Routes>
    </>
  );
}

export default App;
