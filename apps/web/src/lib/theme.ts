import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export type Theme = 'light' | 'dark' | 'system';

const listeners = new Set<(theme: Theme) => void>();

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

let currentTheme: Theme = (() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('krama-theme') as Theme;
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  }
  return 'system';
})();

function applyThemeToDOM(themeToApply: 'light' | 'dark') {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    if (themeToApply === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

function setGlobalTheme(nextTheme: Theme, notify = false) {
  currentTheme = nextTheme;
  if (typeof window !== 'undefined') {
    localStorage.setItem('krama-theme', nextTheme);
    const resolvedTheme = nextTheme === 'system' ? getSystemTheme() : nextTheme;
    applyThemeToDOM(resolvedTheme);
    
    if (notify && typeof toast !== 'undefined' && toast.success) {
      toast.success(`Switched to ${nextTheme} Mode (F5 Shortcut)`, {
        duration: 2500,
      });
    }
  }
  listeners.forEach((listener) => listener(nextTheme));
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'F5' || e.keyCode === 116) {
        e.preventDefault();
        e.stopPropagation();
        const next = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
        setGlobalTheme(next, true);
      }
    },
    { capture: true }
  );

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (currentTheme === 'system') {
      applyThemeToDOM(e.matches ? 'dark' : 'light');
    }
  });
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  useEffect(() => {
    listeners.add(setThemeState);
    const resolvedTheme = currentTheme === 'system' ? getSystemTheme() : currentTheme;
    applyThemeToDOM(resolvedTheme);
    
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);

  const toggleTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
    setGlobalTheme(next, false);
  };

  const setTheme = (next: Theme) => {
    setGlobalTheme(next, false);
  };

  return { theme, setTheme, toggleTheme, resolvedTheme: theme === 'system' ? getSystemTheme() : theme };
}
