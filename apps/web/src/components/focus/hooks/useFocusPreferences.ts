import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PreferencesInput } from '@krama/types/api';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api/client';
import { focusStorageKey, readPendingFocusPreferences, rememberFocusPreferences, acknowledgeFocusPreferences, enqueueFocusPreferences } from '../../../lib/focusStorage';
import type { TimerSettings, WallpaperConfig, LayoutName } from '../types';

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakAfter: 4,
  customDuration: 45,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  soundEnabled: true,
  digitsColor: '#ffffff',
};

const DEFAULT_WALLPAPER: WallpaperConfig = {
  type: 'curated',
  value: '/wallpapers/interstellar.png',
  credit: 'Deep Space Singularity',
};

/** Account-scoped local preferences and ordered account synchronization. */
export function useFocusPreferences() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const preferencesMounted = useRef(true);
  useEffect(() => { preferencesMounted.current = true; return () => { preferencesMounted.current = false; }; }, []);
  // Settings
  const [settings, setSettings] = useState<TimerSettings>(() => {
    try {
      const saved = localStorage.getItem(focusStorageKey(user?.id, 'settings'));
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch { }
    return DEFAULT_SETTINGS;
  });

  // Wallpaper
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(() => {
    try {
      const saved = localStorage.getItem(focusStorageKey(user?.id, 'wallpaper'));
      if (saved) return JSON.parse(saved);
    } catch { }
    return DEFAULT_WALLPAPER;
  });

  // Layout
  const [layout, setLayout] = useState<LayoutName>(() => {
    try {
      const saved = localStorage.getItem(focusStorageKey(user?.id, 'layout')) as LayoutName;
      if (saved && ['standby', 'centered', 'overlay', 'sidebar', 'card', 'zen'].includes(saved)) {
        return saved;
      }
    } catch { }
    return 'standby';
  });

  // Sync user preferences if loaded from backend
  useEffect(() => {
    if (!user) return;
    const pending = readPendingFocusPreferences(user.id)?.changes;
    const metadata = { ...user.metadata, ...pending };
    if (metadata.timerPreferences) {
      const tp = { ...user.metadata?.timerPreferences, ...pending?.timerPreferences };
      setSettings((prev) => ({
        ...prev,
        focusDuration: tp.focusDuration || prev.focusDuration,
        shortBreak: tp.shortBreak || prev.shortBreak,
        longBreak: tp.longBreak || prev.longBreak,
        longBreakAfter: tp.longBreakAfter || prev.longBreakAfter,
      }));
    }
    if (metadata.focusWallpaper) {
      setWallpaper(metadata.focusWallpaper as WallpaperConfig);
    }
    if (metadata.focusLayout) {
      const validLayouts: LayoutName[] = ['standby', 'centered', 'overlay', 'sidebar', 'card', 'zen'];
      if (validLayouts.includes(metadata.focusLayout as LayoutName)) {
        setLayout(metadata.focusLayout as LayoutName);
      } else {
        setLayout('standby');
        localStorage.setItem(focusStorageKey(user?.id, 'layout'), 'standby');
      }
    }
  }, [user]);

  const syncPreferences = (changes: PreferencesInput, failureMessage: string) => {
    if (!user) return;
    const pending = rememberFocusPreferences(user.id, changes);
    void enqueueFocusPreferences(user.id, async () => {
      if (!preferencesMounted.current) return;
      const result = await api.auth.updatePreferences(pending.changes);
      if (!preferencesMounted.current) return;
      acknowledgeFocusPreferences(user.id, pending.id);
      if (result.user) updateUser(result.user);
      await queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
    }).catch(() => { if (preferencesMounted.current) toast.error(failureMessage); });
  };

  const handleSelectWallpaper = (newWallpaper: WallpaperConfig) => {
    setWallpaper(newWallpaper);
    localStorage.setItem(focusStorageKey(user?.id, 'wallpaper'), JSON.stringify(newWallpaper));
    syncPreferences({ focusWallpaper: newWallpaper }, 'Wallpaper saved on this device. Account sync failed; try selecting it again.');
  };

  const handleSelectLayout = (newLayout: LayoutName) => {
    setLayout(newLayout);
    localStorage.setItem(focusStorageKey(user?.id, 'layout'), newLayout);
    syncPreferences({ focusLayout: newLayout }, 'Layout saved on this device. Account sync failed; try selecting it again.');
  };

  const toggleSound = () => setSettings(previous => {
    const updated = { ...previous, soundEnabled: !previous.soundEnabled };
    localStorage.setItem(focusStorageKey(user?.id, 'settings'), JSON.stringify(updated));
    return updated;
  });
  return { settings, setSettings, wallpaper, layout, syncPreferences, handleSelectWallpaper, handleSelectLayout, toggleSound };
}
