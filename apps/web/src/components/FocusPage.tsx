import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusSchedule } from '../hooks/useFocusSchedule';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { TimerLayoutStandby } from './focus/TimerLayoutStandby';
import { TimerLayoutCentered } from './focus/TimerLayoutCentered';
import { TimerLayoutOverlay } from './focus/TimerLayoutOverlay';
import { TimerLayoutSidebar } from './focus/TimerLayoutSidebar';
import { TimerLayoutCard } from './focus/TimerLayoutCard';
import { TimerLayoutZen } from './focus/TimerLayoutZen';
import { WallpaperPicker } from './focus/WallpaperPicker';
import { TimerLayoutPicker } from './focus/TimerLayoutPicker';
import { BUNDLED_WALLPAPERS } from './focus/constants';
import { SettingsPanel } from './focus/SettingsPanel';
import type { TimerMode, OperatingMode, SessionSlot, TimerSettings, WallpaperConfig, LayoutName, ClockDisplay } from './focus/types';

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

function getClockDisplay(): ClockDisplay {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const secondsStr = seconds.toString().padStart(2, '0');
  const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const dayStr = now.toLocaleDateString(undefined, { weekday: 'long' });
  return { timeStr, ampm, secondsStr, dateStr, dayStr };
}

function playAudioChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.18); // A5

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch (e) {
    console.warn('Could not play audio chime:', e);
  }
}

export const FocusPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, status } = useAuth();
  const queryClient = useQueryClient();
  const { schedule, refetchSchedule, completeSession } = useFocusSchedule();

  // Settings
  const [settings, setSettings] = useState<TimerSettings>(() => {
    try {
      const saved = localStorage.getItem('krama.focus.settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch { }
    return DEFAULT_SETTINGS;
  });

  // Wallpaper
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(() => {
    try {
      const saved = localStorage.getItem('krama.focus.wallpaper');
      if (saved) return JSON.parse(saved);
    } catch { }
    return DEFAULT_WALLPAPER;
  });

  // Layout
  const [layout, setLayout] = useState<LayoutName>(() => {
    try {
      const saved = localStorage.getItem('krama.focus.layout') as LayoutName;
      if (saved && ['standby', 'centered', 'overlay', 'sidebar', 'card', 'zen'].includes(saved)) {
        return saved;
      }
    } catch { }
    return 'standby';
  });

  // Live Clock & Fullscreen State
  const [clock, setClock] = useState<ClockDisplay>(getClockDisplay);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !!document.fullscreenElement : false;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getClockDisplay());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Guarantee black canvas and prevent body bounce/scroll on Focus page
  useEffect(() => {
    const origBg = document.body.style.backgroundColor;
    const origOverflow = document.body.style.overflow;
    document.body.style.backgroundColor = '#000000';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.backgroundColor = origBg;
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // Operating Mode
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(() => {
    try {
      const saved = localStorage.getItem('krama.focus.mode') as OperatingMode;
      if (saved === 'manual' || saved === 'planner') return saved;
    } catch { }
    return 'planner';
  });

  // Planner Schedule State
  const [plan, setPlan] = useState<SessionSlot[]>([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);

  // Timer Machine State
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(() => settings.focusDuration * 60);
  const [duration, setDuration] = useState<number>(() => settings.focusDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  const timeLeftRef = useRef<number>(timeLeft);
  // Stable refs so countdown tick always reads latest values (avoids stale closure)
  const currentSlotIndexRef = useRef<number>(0);
  const planRef = useRef<SessionSlot[]>([]);
  const modeRef = useRef<TimerMode>('pomodoro');
  const settingsRef = useRef<TimerSettings>(settings);
  const operatingModeRef = useRef<OperatingMode>('planner');
  const isActiveRef = useRef<boolean>(false);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { currentSlotIndexRef.current = currentSlotIndex; }, [currentSlotIndex]);
  useEffect(() => { planRef.current = plan; }, [plan]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { operatingModeRef.current = operatingMode; }, [operatingMode]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // Modals & Controls
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(!isFullscreen);

  // Visibility logic:
  // Normal Tab (!isFullscreen): All tabs, controls, and Full Screen button are ALWAYS visible.
  // Full Screen (isFullscreen): NO tabs visible instead of timer by default. Hovering top reveals controls.
  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      return;
    }

    if (showWallpaperModal || showLayoutModal || showSettingsModal) {
      setControlsVisible(true);
      return;
    }

    setControlsVisible(false);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleMouseMove = () => {
      setControlsVisible(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isFullscreen, showWallpaperModal, showLayoutModal, showSettingsModal]);

  // Socket
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket for this tab using in-memory accessToken from useAuth()
  useEffect(() => {
    if (status !== 'authed' || !accessToken) return;

    const sock = io('/', {
      auth: { token: accessToken },
      reconnection: true,
    });

    sock.on('notification', (data: any) => {
      toast(data.title, { description: data.message });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    sock.on('task:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
    });

    sock.on('focus:session:completed', () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
    });

    socketRef.current = sock;

    return () => {
      sock.disconnect();
    };
  }, [status, accessToken, queryClient]);

  // Sync user preferences if loaded from backend
  useEffect(() => {
    if (!user?.metadata) return;
    if (user.metadata.timerPreferences) {
      const tp = user.metadata.timerPreferences;
      setSettings((prev) => ({
        ...prev,
        focusDuration: tp.focusDuration || prev.focusDuration,
        shortBreak: tp.shortBreak || prev.shortBreak,
        longBreak: tp.longBreak || prev.longBreak,
        longBreakAfter: tp.longBreakAfter || prev.longBreakAfter,
      }));
    }
    if (user.metadata.focusWallpaper) {
      setWallpaper(user.metadata.focusWallpaper as WallpaperConfig);
    }
    if (user.metadata.focusLayout) {
      const validLayouts: LayoutName[] = ['standby', 'centered', 'overlay', 'sidebar', 'card', 'zen'];
      if (validLayouts.includes(user.metadata.focusLayout as LayoutName)) {
        setLayout(user.metadata.focusLayout as LayoutName);
      } else {
        setLayout('standby');
        localStorage.setItem('krama.focus.layout', 'standby');
      }
    }
  }, [user]);

  // Sync schedule plan into local timer machine state from React Query cache
  useEffect(() => {
    if (schedule?.plan && schedule.plan.length > 0) {
      setPlan(schedule.plan);
      // Initialize slot and countdown if timer is idle and plan was not set yet
      if (!isActiveRef.current && planRef.current.length === 0) {
        setCurrentSlotIndex(0);
        const firstSlot = schedule.plan[0];
        if (firstSlot) {
          setMode(firstSlot.type);
          const initialSecs = firstSlot.durationMin * 60;
          setTimeLeft(initialSecs);
          setDuration(initialSecs);
        }
      }
    } else if (schedule && (!schedule.plan || schedule.plan.length === 0)) {
      setPlan([]);
    }
  }, [schedule]);

  // Timer complete — uses refs for stable values, no stale closure risk
  const handleCompleteSession = useCallback(async () => {
    const snap_startTime = startTime;
    const snap_duration = duration;
    const snap_settings = settingsRef.current;
    const snap_operatingMode = operatingModeRef.current;
    const snap_plan = planRef.current;
    const snap_slotIndex = currentSlotIndexRef.current;
    const snap_mode = modeRef.current;

    const elapsedSeconds = snap_startTime
      ? Math.max(1, Math.floor((Date.now() - snap_startTime.getTime()) / 1000))
      : snap_duration;

    // Trigger audio chime
    if (snap_settings.soundEnabled) {
      playAudioChime();
    }

    const currentSlot = snap_operatingMode === 'planner' ? snap_plan[snap_slotIndex] : null;

    try {
      await completeSession({
        startTime: (snap_startTime || new Date()).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedSeconds,
        type: snap_mode,
        taskId: currentSlot?.taskId || undefined,
        projectId: currentSlot?.projectId || undefined,
      });
    } catch {
      // Error notifications and retries are managed by useMutation
    }

    setStartTime(null);
    targetEndTimeRef.current = null;

    // Planner auto-advance or Manual reset
    if (snap_operatingMode === 'planner' && snap_plan.length > 0) {
      const nextIndex = snap_slotIndex + 1;
      if (nextIndex < snap_plan.length) {
        const nextSlot = snap_plan[nextIndex];
        if (nextSlot) {
          setCurrentSlotIndex(nextIndex);
          setMode(nextSlot.type);
          const secs = nextSlot.durationMin * 60;
          setTimeLeft(secs);
          setDuration(secs);

          const shouldAutoStart =
            (nextSlot.type !== 'pomodoro' && snap_settings.autoStartBreaks) ||
            (nextSlot.type === 'pomodoro' && snap_settings.autoStartPomodoros);

          if (shouldAutoStart) {
            setStartTime(new Date());
            targetEndTimeRef.current = Date.now() + secs * 1000;
            setIsActive(true);
          } else {
            setIsActive(false);
          }
        }
      } else {
        // Plan fully completed
        setIsActive(false);
        toast.success('🏆 All planned sessions for today completed!');
        setOperatingMode('manual');
        const defaultSecs = snap_settings.focusDuration * 60;
        setMode('pomodoro');
        setTimeLeft(defaultSecs);
        setDuration(defaultSecs);
      }
    } else {
      // Manual reset
      setIsActive(false);
      const defaultSecs =
        snap_mode === 'pomodoro'
          ? snap_settings.focusDuration * 60
          : snap_mode === 'short_break'
            ? snap_settings.shortBreak * 60
            : snap_settings.longBreak * 60;
      setTimeLeft(defaultSecs);
      setDuration(defaultSecs);
    }
  }, [startTime, duration, completeSession]);

  // Drift-free countdown loop using timestamp deltas
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
      }

      const tick = () => {
        if (!targetEndTimeRef.current) return;
        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          targetEndTimeRef.current = null;
          setIsActive(false);
          handleCompleteSession();
        }
      };

      tick();
      interval = setInterval(tick, 500);
    } else {
      targetEndTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, handleCompleteSession]);

  // Immediately recalculate on tab visibility change (e.g. user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && targetEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          targetEndTimeRef.current = null;
          setIsActive(false);
          handleCompleteSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, handleCompleteSession]);

  // Document title updates with live time
  useEffect(() => {
    if (mode === 'clock') {
      document.title = `(${clock.timeStr} ${clock.ampm}) KRAMA - Desk Clock`;
    } else {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const label = mode === 'pomodoro' ? 'Focus' : mode === 'custom' ? 'Custom' : 'Break';
      document.title = `(${timeStr}) ${label} - KRAMA`;
    }
    return () => {
      document.title = 'KRAMA - Focus';
    };
  }, [timeLeft, mode, clock]);

  const handleSkip = useCallback(() => {
    targetEndTimeRef.current = null;
    setIsActive(false);
    setStartTime(null);
    if (operatingMode === 'planner' && plan.length > 0) {
      // Linear advance — same logic as handleCompleteSession, no wrap-around
      const nextIndex = currentSlotIndex + 1;
      if (nextIndex < plan.length) {
        const targetSlot = plan[nextIndex];
        if (!targetSlot) return;
        setCurrentSlotIndex(nextIndex);
        setMode(targetSlot.type);
        const secs = targetSlot.durationMin * 60;
        setTimeLeft(secs);
        setDuration(secs);
      } else {
        // Was last slot — finish plan
        toast.success('🏆 All planned sessions for today completed!');
        setOperatingMode('manual');
        const defaultSecs = settings.focusDuration * 60;
        setMode('pomodoro');
        setTimeLeft(defaultSecs);
        setDuration(defaultSecs);
      }
    }
  }, [operatingMode, plan, currentSlotIndex, settings.focusDuration]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Enter' || e.key === 'Enter' || e.code === 'Space') {
        if (mode !== 'clock') {
          e.preventDefault();
          setIsActive((prev) => {
            if (!prev) {
              if (!startTime) setStartTime(new Date());
              targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
              return true;
            } else {
              targetEndTimeRef.current = null;
              return false;
            }
          });
        }
      } else if (e.key === 'Escape') {
        if (showWallpaperModal) {
          e.preventDefault();
          setShowWallpaperModal(false);
        } else if (showSettingsModal) {
          e.preventDefault();
          setShowSettingsModal(false);
        } else if (isFullscreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
          }
        }
      } else if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.metaKey) {
        setShowWallpaperModal((prev) => !prev);
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        setShowSettingsModal((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        if (operatingModeRef.current === 'planner') {
          e.preventDefault();
          handleSkip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startTime, showWallpaperModal, showSettingsModal, mode, isFullscreen, handleSkip]);

  // Control handlers
  const handleStart = () => {
    if (mode === 'clock') return;
    if (!startTime) setStartTime(new Date());
    targetEndTimeRef.current = Date.now() + timeLeft * 1000;
    setIsActive(true);
  };

  const handlePause = () => {
    targetEndTimeRef.current = null;
    setIsActive(false);
  };

  const handleStop = () => {
    targetEndTimeRef.current = null;
    setIsActive(false);
    setStartTime(null);
    // In planner mode, let handleCompleteSession handle the advance + reset.
    // In manual mode, reset the current slot.
    if (operatingModeRef.current === 'planner' && planRef.current.length > 0) {
      handleCompleteSession();
    } else {
      const secs =
        modeRef.current === 'pomodoro'
          ? settingsRef.current.focusDuration * 60
          : modeRef.current === 'short_break'
            ? settingsRef.current.shortBreak * 60
            : modeRef.current === 'long_break'
              ? settingsRef.current.longBreak * 60
              : modeRef.current === 'custom'
                ? (settingsRef.current.customDuration || 45) * 60
                : 0;
      setTimeLeft(secs);
      setDuration(secs);
    }
  };

  const handleChangeMode = (newMode: TimerMode) => {
    if (operatingMode === 'planner') {
      setOperatingMode('manual');
      localStorage.setItem('krama.focus.mode', 'manual');
    }
    targetEndTimeRef.current = null;
    setMode(newMode);
    setIsActive(false);
    setStartTime(null);
    let secs = 0;
    if (newMode === 'pomodoro') {
      secs = settings.focusDuration * 60;
    } else if (newMode === 'short_break') {
      secs = settings.shortBreak * 60;
    } else if (newMode === 'long_break') {
      secs = settings.longBreak * 60;
    } else if (newMode === 'custom') {
      secs = (settings.customDuration || 45) * 60;
    } else if (newMode === 'clock') {
      secs = 0;
    }
    setTimeLeft(secs);
    setDuration(secs);
  };

  const handleSetCustomDuration = (mins: number) => {
    const validMins = Math.max(1, mins);
    const updated = { ...settings, customDuration: validMins };
    setSettings(updated);
    localStorage.setItem('krama.focus.settings', JSON.stringify(updated));
    if (mode === 'custom' && !isActive) {
      setTimeLeft(validMins * 60);
      setDuration(validMins * 60);
    }
  };

  const handleSelectSlot = (idx: number) => {
    targetEndTimeRef.current = null;
    const targetSlot = plan[idx];
    if (!targetSlot) return;
    setCurrentSlotIndex(idx);
    setMode(targetSlot.type);
    const secs = targetSlot.durationMin * 60;
    setTimeLeft(secs);
    setDuration(secs);
    setIsActive(false);
    setStartTime(null);
  };

  const handleToggleMode = () => {
    if (operatingMode === 'planner') {
      setOperatingMode('manual');
      localStorage.setItem('krama.focus.mode', 'manual');
      // Directly reset timer — can't call handleChangeMode here because
      // operatingMode state hasn't updated yet (it still reads 'planner')
      targetEndTimeRef.current = null;
      setMode('pomodoro');
      setIsActive(false);
      setStartTime(null);
      const secs = settingsRef.current.focusDuration * 60;
      setTimeLeft(secs);
      setDuration(secs);
    } else {
      setOperatingMode('planner');
      localStorage.setItem('krama.focus.mode', 'planner');
      refetchSchedule().then((res) => {
        const planData = res.data?.plan;
        if (planData && planData.length > 0) {
          setPlan(planData);
          setCurrentSlotIndex(0);
          const firstSlot = planData[0];
          if (firstSlot) {
            setMode(firstSlot.type);
            const initialSecs = firstSlot.durationMin * 60;
            setTimeLeft(initialSecs);
            setDuration(initialSecs);
          }
        }
      });
    }
  };

  const handleSaveSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    localStorage.setItem('krama.focus.settings', JSON.stringify(newSettings));
    if (!isActive) {
      const secs =
        mode === 'pomodoro'
          ? newSettings.focusDuration * 60
          : mode === 'short_break'
            ? newSettings.shortBreak * 60
            : mode === 'long_break'
              ? newSettings.longBreak * 60
              : mode === 'custom'
                ? (newSettings.customDuration || 45) * 60
                : 0;
      setTimeLeft(secs);
      setDuration(secs);
    }
    // Sync to backend preferences
    api.auth.updatePreferences({
      timerPreferences: {
        focusDuration: newSettings.focusDuration,
        shortBreak: newSettings.shortBreak,
        longBreak: newSettings.longBreak,
        longBreakAfter: newSettings.longBreakAfter,
      },
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
    }).catch(() => { });
  };

  const handleSelectWallpaper = (newWallpaper: WallpaperConfig) => {
    setWallpaper(newWallpaper);
    localStorage.setItem('krama.focus.wallpaper', JSON.stringify(newWallpaper));
    api.auth.updatePreferences({ focusWallpaper: newWallpaper }).catch(() => { });
  };

  const handleSelectLayout = (newLayout: LayoutName) => {
    setLayout(newLayout);
    localStorage.setItem('krama.focus.layout', newLayout);
    api.auth.updatePreferences({ focusLayout: newLayout }).catch(() => { });
  };

  // Get active wallpaper background styling
  const getWallpaperStyle = (): React.CSSProperties => {
    if (wallpaper.type === 'gradient') {
      const found = BUNDLED_WALLPAPERS.find((g) => g.id === wallpaper.value);
      return { background: found?.css || BUNDLED_WALLPAPERS[0]?.css };
    }
    if (wallpaper.type === 'unsplash' || wallpaper.type === 'upload' || wallpaper.type === 'curated') {
      return {
        backgroundImage: `url("${wallpaper.value}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { background: BUNDLED_WALLPAPERS[0]?.css };
  };

  const activeSlot = operatingMode === 'planner' ? plan[currentSlotIndex] : null;
  const currentTaskTitle = activeSlot?.taskTitle || null;
  const currentProjectName = activeSlot?.projectName || null;

  const layoutProps = {
    timeLeft,
    duration,
    isActive,
    mode,
    operatingMode,
    layout,
    onSelectLayout: handleSelectLayout,
    taskTitle: currentTaskTitle,
    projectName: currentProjectName,
    currentSlotIndex,
    totalSlots: plan.length,
    plan,
    clock,
    customDuration: settings.customDuration || 45,
    digitsColor: settings.digitsColor || '#ffffff',
    onStart: handleStart,
    onPause: handlePause,
    onStop: handleStop,
    onSkip: handleSkip,
    onChangeMode: handleChangeMode,
    onSelectSlot: handleSelectSlot,
    onSetCustomDuration: handleSetCustomDuration,
    soundEnabled: settings.soundEnabled,
    onToggleSound: () => setSettings((prev) => {
      const updated = { ...prev, soundEnabled: !prev.soundEnabled };
      localStorage.setItem('krama.focus.settings', JSON.stringify(updated));
      return updated;
    }),
    onOpenSettings: () => setShowSettingsModal(true),
    onOpenWallpaper: () => setShowWallpaperModal(true),
    onOpenLayoutPicker: () => setShowLayoutModal(true),
    onToggleMode: handleToggleMode,
    isFullscreen,
    onToggleFullscreen: toggleFullscreen,
    controlsVisible,
    onToggleControls: () => setControlsVisible((prev) => !prev),
    onClose: () => {
      try {
        if (window.opener || window.history.length <= 1) {
          window.close();
        }
      } catch { }
      navigate('/app/');
    },
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden select-none bg-black text-white">
      {/* Background Wallpaper (Disabled for StandBy layout to enforce pure OLED black screen) */}
      {layout !== 'standby' && (
        <>
          <div
            className="absolute inset-0 transition-all duration-700 z-0 scale-100"
            style={getWallpaperStyle()}
          />
          {/* Dark Vignette Overlay for Crisp Readability */}
          <div className="absolute inset-0 bg-black/35 backdrop-brightness-[0.92] pointer-events-none z-0" />
        </>
      )}

      {/* Render Active Layout with Standby as solid fallback */}
      {layout === 'centered' ? (
        <TimerLayoutCentered {...layoutProps} />
      ) : layout === 'overlay' ? (
        <TimerLayoutOverlay {...layoutProps} />
      ) : layout === 'sidebar' ? (
        <TimerLayoutSidebar {...layoutProps} />
      ) : layout === 'card' ? (
        <TimerLayoutCard {...layoutProps} />
      ) : layout === 'zen' ? (
        <TimerLayoutZen {...layoutProps} />
      ) : (
        <TimerLayoutStandby {...layoutProps} />
      )}

      {/* Timer Layout Gallery Modal */}
      {showLayoutModal && (
        <TimerLayoutPicker
          currentLayout={layout}
          onSelectLayout={(newLayout) => {
            handleSelectLayout(newLayout);
            setShowLayoutModal(false);
          }}
          onClose={() => setShowLayoutModal(false)}
        />
      )}

      {/* Wallpaper & Layout Modal */}
      {showWallpaperModal && (
        <WallpaperPicker
          currentWallpaper={wallpaper}
          currentLayout={layout}
          onSelectWallpaper={handleSelectWallpaper}
          onSelectLayout={handleSelectLayout}
          onClose={() => setShowWallpaperModal(false)}
        />
      )}

      {/* Settings Configuration Modal */}
      {showSettingsModal && (
        <SettingsPanel
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
export default FocusPage;
