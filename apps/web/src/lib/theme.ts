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
        const resolved = currentTheme === 'system' ? getSystemTheme() : currentTheme;
        const next = resolved === 'light' ? 'dark' : 'light';
        setGlobalTheme(next, true);
      }
    },
    { capture: true }
  );

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (currentTheme === 'system') {
      applyThemeToDOM(e.matches ? 'dark' : 'light');
      listeners.forEach(listener => listener(currentTheme));
    }
  });
}

export function useTheme() {
  const [appearance, setAppearance] = useState(() => ({
    theme: currentTheme,
    resolvedTheme: currentTheme === 'system' ? getSystemTheme() : currentTheme,
  }));

  useEffect(() => {
    const updateAppearance = (nextTheme: Theme) => setAppearance({
      theme: nextTheme,
      resolvedTheme: nextTheme === 'system' ? getSystemTheme() : nextTheme,
    });
    listeners.add(updateAppearance);
    updateAppearance(currentTheme);
    const resolvedTheme = currentTheme === 'system' ? getSystemTheme() : currentTheme;
    applyThemeToDOM(resolvedTheme);
    
    return () => {
      listeners.delete(updateAppearance);
    };
  }, []);

  const toggleTheme = () => {
    const resolved = currentTheme === 'system' ? getSystemTheme() : currentTheme;
    const next = resolved === 'light' ? 'dark' : 'light';
    setGlobalTheme(next, false);
  };

  const setTheme = (next: Theme) => {
    setGlobalTheme(next, false);
  };

  return { ...appearance, setTheme, toggleTheme };
}
