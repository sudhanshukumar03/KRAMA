import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { getClockDisplay } from '../runtime';
import type { ClockDisplay } from '../types';
import type { useFocusSession } from './useFocusSession';

export interface FocusDialogs {
  showWallpaperModal: boolean;
  showLayoutModal: boolean;
  showSettingsModal: boolean;
  setShowWallpaperModal: (open: boolean | ((previous: boolean) => boolean)) => void;
  setShowLayoutModal: (open: boolean) => void;
  setShowSettingsModal: (open: boolean | ((previous: boolean) => boolean)) => void;
}
/** Browser-only presentation effects never own a running session or write. */
export function useFocusViewport(session: ReturnType<typeof useFocusSession>, dialogs: FocusDialogs) {
  const { mode, timeLeft } = session;
  const { showWallpaperModal, showLayoutModal, showSettingsModal } = dialogs;
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

  // Guarantee canvas background and prevent body bounce/scroll on Focus page
  useEffect(() => {
    const origBg = document.body.style.backgroundColor;
    const origOverflow = document.body.style.overflow;
    document.body.style.backgroundColor = 'var(--bg-base)';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.backgroundColor = origBg;
      document.body.style.overflow = origOverflow;
    };
  }, []);

  const [controlsVisible, setControlsVisible] = useState(!isFullscreen);
  const [noticePanel, setNoticePanel] = useState<HTMLDivElement | null>(null);
  const [noticeInset, setNoticeInset] = useState(0);
  useLayoutEffect(() => {
    if (!noticePanel) { setNoticeInset(0); return; }
    // Timer controls must clear the actual notice height, including wrapped
    // task names, rather than assuming a fixed footer size on small screens.
    const measure = () => setNoticeInset(Math.ceil(noticePanel.getBoundingClientRect().height) + 32);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(noticePanel);
    return () => observer.disconnect();
  }, [noticePanel]);

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
      document.title = 'Krama';
    };
  }, [timeLeft, mode, clock]);

  return { clock, isFullscreen, toggleFullscreen, controlsVisible, setControlsVisible, setNoticePanel, noticeInset };
}
