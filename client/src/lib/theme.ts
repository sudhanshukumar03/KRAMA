import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export type Theme = 'light' | 'dark';

// Module-level listeners so any useTheme call across the app stays 100% synchronized
const listeners = new Set<(theme: Theme) => void>();

let currentTheme: Theme = (() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('krama-theme') as Theme;
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light';
  }
  return 'light';
})();

function setGlobalTheme(nextTheme: Theme, notify = false) {
  currentTheme = nextTheme;
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('krama-theme', nextTheme);
    if (notify && typeof toast !== 'undefined' && toast.success) {
      toast.success(`Switched to ${nextTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'} (F5 Shortcut)`, {
        duration: 2500,
      });
    }
  }
  listeners.forEach((listener) => listener(nextTheme));
}

// Global F5 keydown listener attached once at module load
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'F5' || e.keyCode === 116) {
        e.preventDefault();
        e.stopPropagation();
        const next = currentTheme === 'light' ? 'dark' : 'light';
        setGlobalTheme(next, true);
      }
    },
    { capture: true }
  );
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  useEffect(() => {
    listeners.add(setThemeState);
    // Ensure initial DOM class is synced
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);

  const toggleTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : 'light';
    setGlobalTheme(next, false);
  };

  const setTheme = (next: Theme) => {
    setGlobalTheme(next, false);
  };

  return { theme, setTheme, toggleTheme };
}
