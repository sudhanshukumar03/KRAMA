import { getClockDisplay, playAudioChime, buildScheduledSessions, plannerResumeTime } from './focus/runtime';
import { focusStorageKey, readPendingFocusPreferences, rememberFocusPreferences, acknowledgeFocusPreferences, enqueueFocusPreferences } from '../lib/focusStorage';
import type { PreferencesInput } from '@krama/types/api';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusSchedule, type CompleteSessionParams } from '../hooks/useFocusSchedule';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { usePlannerFocus } from '../hooks/usePlannerFocus';
import { PlannerFocusDialog } from './focus/PlannerFocusDialog';
import { errorMessage } from '../lib/utils';
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

type RecoverableFocusCompletion = CompleteSessionParams & { plannerSelectionKey?: string };

export const FocusPage: React.FC = () => {
  const { user, workspaceId } = useAuth();
  const [params] = useSearchParams();
  // Each selection owns its timer and pending writes. Browser Back restores its
  // saved plan instead of reusing another task's active session or completion.
  const selectionKey = JSON.stringify([user?.id, workspaceId, params.get('task'), params.get('block'), params.get('date')]);
  return <AccountFocusPage key={selectionKey} />;
};

const AccountFocusPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, status, workspaceId, updateUser } = useAuth();
  const preferencesMounted = useRef(true);
  useEffect(() => { preferencesMounted.current = true; return () => { preferencesMounted.current = false; }; }, []);
  const queryClient = useQueryClient();
  const { schedule, refetchSchedule, completeSession, isCompleting } = useFocusSchedule();

  const plannerFocus = usePlannerFocus();
  const selectedSlotRef = useRef<SessionSlot | null>(null);
  const selectedBlockEndRef = useRef<string | undefined>(undefined);
  const appliedSelection = useRef('');
  const [selectedSessions, setSelectedSessions] = useState<Pick<SessionSlot, 'type' | 'durationMin'>[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDialog, setSelectedDialog] = useState<'setup' | 'decision' | null>(null);
  const [selectedFinished, setSelectedFinished] = useState(false);
  const [selectedBusy, setSelectedBusy] = useState(false);
  const selectedWrite = useRef(false);
  const selectedExtensionIntent = useRef<import('../types/planner').TimeBlockExtensionInput | null>(null);
  const [selectedError, setSelectedError] = useState('');
  const selectedPlanKey = 'krama.focus.plan.' + user?.id + '.' + plannerFocus.key;

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

  // Operating Mode
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(() => {
    try {
      const saved = localStorage.getItem(focusStorageKey(user?.id, 'mode')) as OperatingMode;
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
  /**
   * Freeze the started session's identity, task and slot across Planner refreshes.
   * elapsedMs accumulates running time only, so paused time is excluded from logs.
   */
  const sessionRef = useRef<{ id: string; startTime: Date; elapsedMs: number; runningSince: number | null; targetSeconds: number; slot: SessionSlot | null; type: TimerMode } | null>(null);
  /**
   * Scope recovery to both account and workspace so an unsaved completion is
   * retried against its original owner after reload.
   */
  const pendingStorageKey = `krama.focus.unsaved.${user?.id}.${workspaceId}`;
  const [pendingCompletion, setPendingCompletion] = useState<RecoverableFocusCompletion | null>(() => {
    try { const saved = JSON.parse(localStorage.getItem(pendingStorageKey) || 'null'); return saved?.completionId && saved?.startTime && saved?.duration ? saved : null; } catch { return null; }
  });
  const pendingCompletionRef = useRef<RecoverableFocusCompletion | null>(pendingCompletion);
  const completionInFlightRef = useRef(false);
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

    sock.on('notification', (data: { title: string; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(data.title, { description: data.message });
    });
    sock.on('connect_error', (error) => {
      if (error.message.includes('Token expired')) {
        api.auth.refresh().catch(() => window.dispatchEvent(new Event('krama:logout')));
      }
    });
    sock.on('session:ended', ({ reason }: { reason: string }) => {
      if (reason === 'revoked') window.dispatchEvent(new Event('krama:logout'));
      else api.auth.refresh({ reuseExisting: reason === 'rotated' }).catch(() => window.dispatchEvent(new Event('krama:logout')));
    });

    const refreshSchedule = () => queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
    for (const event of ['connect', 'task:created', 'task:updated', 'task:deleted', 'project:updated', 'project:deleted', 'project:restored', 'planner:changed', 'preferences:updated', 'focus:session:completed']) sock.on(event, refreshSchedule);

    socketRef.current = sock;

    return () => {
      sock.disconnect();
    };
  }, [status, accessToken, queryClient]);

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

  useEffect(() => {
    if (!plannerFocus.requested || plannerFocus.loading || plannerFocus.invalid || appliedSelection.current === plannerFocus.key) return;
    if (plannerFocus.task?.status === 'DONE' || plannerFocus.task?.status === 'CANCELED') { setSelectedFinished(true); return; }
    appliedSelection.current = plannerFocus.key;
    const task = plannerFocus.task, block = plannerFocus.block;
    selectedBlockEndRef.current = block?.endTime;
    selectedSlotRef.current = { index: 0, type: 'custom', durationMin: plannerFocus.totalMinutes, taskId: task?.id || null, taskTitle: task?.title || block?.title || 'Scheduled focus', projectId: block?.projectId || task?.projectId || null, projectName: task?.project?.name || null, label: task?.title || block?.title || 'Scheduled focus', timeBlockId: block?.id || null };
    let sessions = buildScheduledSessions(plannerFocus.totalMinutes, plannerFocus.totalMinutes <= 60 ? plannerFocus.totalMinutes : 45, plannerFocus.totalMinutes <= 60 ? 0 : 5);
    let index = 0, finished = false;
    let restoredSession = false;
    try {
      const extension = JSON.parse(localStorage.getItem(selectedPlanKey + '.extension') || 'null');
      if (extension?.extensionId && Number.isInteger(extension.minutes) && extension.minutes > 0 && extension.expectedEndTime) selectedExtensionIntent.current = extension;
      const saved = JSON.parse(localStorage.getItem(selectedPlanKey) || 'null');
      if (saved && (saved.blockEndTime === block?.endTime || saved.blockEndTime === selectedExtensionIntent.current?.expectedEndTime) && Array.isArray(saved.sessions) && saved.sessions.length && saved.sessions.every((item: Pick<SessionSlot, 'type' | 'durationMin'>) => ['custom', 'short_break'].includes(item.type) && Number.isInteger(item.durationMin) && item.durationMin > 0 && item.durationMin <= 1440) && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < saved.sessions.length) { sessions = saved.sessions; index = saved.index; finished = saved.finished === true;
        const active = saved.session;
        if (!pendingCompletionRef.current && active?.id && active.slot?.taskId === selectedSlotRef.current.taskId && active.slot?.timeBlockId === selectedSlotRef.current.timeBlockId && typeof active.elapsedMs === 'number' && active.elapsedMs >= 0 && Number.isInteger(active.targetSeconds) && active.targetSeconds > 0 && active.targetSeconds <= 86400 && Number.isFinite(new Date(active.startTime).getTime()) && ['custom', 'short_break'].includes(active.type) && (active.runningSince === null || (Number.isFinite(active.runningSince) && Number.isFinite(saved.deadline))) && typeof saved.remaining === 'number' && saved.remaining >= 0 && saved.remaining <= active.targetSeconds) {
          sessionRef.current = { ...active, startTime: new Date(active.startTime) };
          const running = typeof active.runningSince === 'number' && Number.isFinite(active.runningSince);
          const remaining = running ? Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)) : saved.remaining;
          timeLeftRef.current = remaining; modeRef.current = active.type;
          setMode(active.type); setDuration(active.targetSeconds); setTimeLeft(remaining); setStartTime(new Date(active.startTime));
          targetEndTimeRef.current = running ? saved.deadline : null; setIsActive(running);
          restoredSession = true;
        }
      }
    } catch { /* A new bounded plan remains available when storage is unavailable. */ }
    setSelectedSessions(sessions); setSelectedIndex(index);
    setSelectedDialog(restoredSession ? null : finished ? 'decision' : 'setup');
    setOperatingMode('manual');
    if (!restoredSession) { setMode(sessions[index].type); setDuration(sessions[index].durationMin * 60); setTimeLeft(finished ? 0 : sessions[index].durationMin * 60); }
  }, [plannerFocus.key, plannerFocus.requested, plannerFocus.loading, plannerFocus.invalid, plannerFocus.task, plannerFocus.block, plannerFocus.totalMinutes, selectedPlanKey]);

  useEffect(() => {
    if (selectedSessions.length && appliedSelection.current === plannerFocus.key) {
      try { localStorage.setItem(selectedPlanKey, JSON.stringify({ sessions: selectedSessions, index: selectedIndex, blockEndTime: selectedBlockEndRef.current, finished: timeLeft === 0 && !pendingCompletion, session: sessionRef.current, remaining: timeLeft, deadline: targetEndTimeRef.current })); } catch { /* In-memory choices still work. */ }
    }
  }, [selectedSessions, selectedIndex, selectedPlanKey, plannerFocus.key, timeLeft, pendingCompletion, isActive]);

  // Keep an active/paused session and an unsaved completion bound to its original
  // task. Apply incoming schedule changes only when the timer is idle.
  useEffect(() => {
    if (plannerFocus.requested || !schedule || sessionRef.current || pendingCompletionRef.current || completionInFlightRef.current) return;
    const incoming = schedule.plan || [];
    const previous = planRef.current[currentSlotIndexRef.current];
    const sameSlot = (slot: SessionSlot) => previous && slot.taskId === previous.taskId && slot.timeBlockId === previous.timeBlockId && slot.type === previous.type && slot.label === previous.label;
    const match = incoming.findIndex(sameSlot);
    const nextIndex = match >= 0 ? match : 0;
    setPlan(incoming);
    setCurrentSlotIndex(nextIndex);
    if (operatingModeRef.current === 'planner' && incoming[nextIndex]) {
      const slot = incoming[nextIndex]; setMode(slot.type);
      setTimeLeft(slot.durationMin * 60); setDuration(slot.durationMin * 60);
    }
  }, [schedule, pendingCompletion, plannerFocus.requested]);

  // Timer complete — uses refs for stable values, no stale closure risk
  const handleCompleteSession = useCallback(async () => {
    if (completionInFlightRef.current) return;
    const activeSession = sessionRef.current;
    if (!activeSession && !pendingCompletionRef.current) return;
    completionInFlightRef.current = true;
    if (activeSession?.runningSince !== null && activeSession?.runningSince !== undefined) {
      activeSession.elapsedMs += Math.max(0, Date.now() - activeSession.runningSince);
      activeSession.runningSince = null;
    }
    const snap_startTime = activeSession?.startTime || startTime;
    const snap_duration = duration;
    const snap_settings = settingsRef.current;
    const snap_operatingMode = operatingModeRef.current;
    const snap_plan = planRef.current;
    const snap_slotIndex = currentSlotIndexRef.current;
    const snap_mode = modeRef.current;

    const elapsedSeconds = activeSession ? Math.max(1, Math.min(activeSession.targetSeconds, Math.floor(activeSession.elapsedMs / 1000))) : snap_duration;

    // Trigger audio chime
    if (snap_settings.soundEnabled) {
      playAudioChime();
    }

    const currentSlot = activeSession?.slot;
    const payload = pendingCompletionRef.current || {
      completionId: activeSession!.id, startTime: (snap_startTime || new Date()).toISOString(),
      endTime: new Date().toISOString(), duration: elapsedSeconds, type: activeSession?.type || snap_mode,
      taskId: currentSlot?.taskId || undefined, projectId: currentSlot?.projectId || undefined,
      plannerSelectionKey: plannerFocus.requested ? plannerFocus.key : undefined,
    };
    pendingCompletionRef.current = payload;
    setPendingCompletion(payload);
    try { localStorage.setItem(pendingStorageKey, JSON.stringify(payload)); } catch { /* The in-memory draft remains available. */ }
    targetEndTimeRef.current = null; setIsActive(false);
    try {
      // Selection metadata is only for local recovery; the API accepts the
      // original completion contract, and an earlier task cannot advance this one.
      const { plannerSelectionKey: _selectionKey, ...sessionPayload } = payload;
      await completeSession(sessionPayload);
    } catch {
      // Keep the identical payload and slot for explicit retry; never advance on failure.
      completionInFlightRef.current = false;
      return;
    }
    completionInFlightRef.current = false;
    pendingCompletionRef.current = null; setPendingCompletion(null); sessionRef.current = null;
    try { localStorage.removeItem(pendingStorageKey); } catch { }

    setStartTime(null);
    sessionRef.current = null;
    targetEndTimeRef.current = null;

    if (plannerFocus.requested) {
      if (selectedSlotRef.current && payload.plannerSelectionKey === plannerFocus.key) {
        timeLeftRef.current = 0; setTimeLeft(0); setSelectedDialog('decision');
      }
      return;
    }

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
            const began = new Date();
            sessionRef.current = { id: crypto.randomUUID(), startTime: began, elapsedMs: 0, runningSince: Date.now(), targetSeconds: secs, slot: nextSlot, type: nextSlot.type };
            setStartTime(began);
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
          : snap_mode === 'short_break' ? snap_settings.shortBreak * 60
            : snap_mode === 'custom' ? snap_settings.customDuration * 60 : snap_settings.longBreak * 60;
      setTimeLeft(defaultSecs);
      setDuration(defaultSecs);
    }
  }, [startTime, duration, completeSession, pendingStorageKey, plannerFocus.requested, plannerFocus.key]);

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
      document.title = 'Krama';
    };
  }, [timeLeft, mode, clock]);

  const handleSkip = useCallback(() => {
    if (selectedSlotRef.current) return;
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    targetEndTimeRef.current = null;
    setIsActive(false);
    setStartTime(null);
    sessionRef.current = null;
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

  // Control handlers
  const handleStart = useCallback(() => {
    if (plannerFocus.requested && (plannerFocus.loading || plannerFocus.invalid || selectedDialog || selectedFinished || timeLeftRef.current <= 0 || selectedBusy)) return;
    if (isActiveRef.current || mode === 'clock' || pendingCompletionRef.current || completionInFlightRef.current) return;
    if (!sessionRef.current) {
      const began = new Date();
      sessionRef.current = { id: crypto.randomUUID(), startTime: began, elapsedMs: 0, runningSince: null, targetSeconds: duration, slot: selectedSlotRef.current || (operatingModeRef.current === 'planner' ? planRef.current[currentSlotIndexRef.current] || null : null), type: modeRef.current };
      setStartTime(began);
    }
    sessionRef.current.runningSince = Date.now();
    targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
    setIsActive(true);
  }, [mode, duration, plannerFocus.requested, plannerFocus.loading, plannerFocus.invalid, selectedDialog, selectedFinished, selectedBusy]);

  const handlePause = useCallback(() => {
    const active = sessionRef.current;
    if (active?.runningSince !== null && active?.runningSince !== undefined) {
      active.elapsedMs += Math.max(0, Date.now() - active.runningSince); active.runningSince = null;
    }
    if (targetEndTimeRef.current) { const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000)); timeLeftRef.current = remaining; setTimeLeft(remaining); }
    targetEndTimeRef.current = null;
    setIsActive(false);
  }, []);

  const handleStop = () => {
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    targetEndTimeRef.current = null;
    setIsActive(false);
    // In planner mode, let handleCompleteSession handle the advance + reset.
    // In manual mode, reset the current slot.
    if (selectedSlotRef.current || (operatingModeRef.current === 'planner' && planRef.current.length > 0)) {
      handleCompleteSession();
    } else {
      setStartTime(null); sessionRef.current = null;
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
    if (plannerFocus.requested) { toast.info("Use the task session plan, or return to Planner."); return; }
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    if (operatingMode === 'planner') {
      setOperatingMode('manual');
      localStorage.setItem(focusStorageKey(user?.id, 'mode'), 'manual');
    }
    targetEndTimeRef.current = null;
    setMode(newMode);
    setIsActive(false);
    setStartTime(null);
    sessionRef.current = null;
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

  const prepareSelectedSession = (next: Pick<SessionSlot, 'type' | 'durationMin'>) => {
    targetEndTimeRef.current = null; sessionRef.current = null; setStartTime(null); setIsActive(false);
    const seconds = next.durationMin * 60;
    timeLeftRef.current = seconds; modeRef.current = next.type;
    setMode(next.type); setTimeLeft(seconds); setDuration(seconds);
    setSelectedDialog(null); setSelectedError('');
  };
  const configureSelected = (work: number, rest: number) => {
    if (sessionRef.current || pendingCompletionRef.current || selectedWrite.current) return;
    try { const sessions = buildScheduledSessions(plannerFocus.totalMinutes, work, rest); setSelectedSessions(sessions); setSelectedIndex(0); prepareSelectedSession(sessions[0]); } catch (error) { setSelectedError(errorMessage(error, 'Could not configure sessions')); }
  };
  const finishSelectedTask = async () => {
    if (selectedWrite.current) return;
    selectedWrite.current = true; setSelectedBusy(true); setSelectedError('');
    try {
      if (plannerFocus.task) {
        const fresh = await api.tasks.get(plannerFocus.task.id);
        await api.tasks.update(fresh.id, { status: 'DONE', version: fresh.version });
      }
      setSelectedFinished(true); setSelectedDialog(null); selectedSlotRef.current = null;
      localStorage.removeItem(selectedPlanKey);
      await Promise.all(['planner', 'focus-schedule', 'issues', 'dashboard'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success('Task completed');
    } catch (error) { setSelectedError(errorMessage(error, 'Could not complete task')); }
    finally { selectedWrite.current = false; setSelectedBusy(false); }
  };
  const extendSelected = async (minutes: number, rescheduleBlockId?: string) => {
    if (selectedWrite.current || !plannerFocus.block) return;
    selectedWrite.current = true; setSelectedBusy(true); setSelectedError('');
    try {
      const previousIntent = selectedExtensionIntent.current;
      const input = previousIntent && previousIntent.minutes === minutes && previousIntent.rescheduleBlockId === rescheduleBlockId ? previousIntent : { extensionId: crypto.randomUUID(), minutes, expectedEndTime: plannerFocus.block.endTime, resumeAt: plannerResumeTime(plannerFocus.date), rescheduleBlockId };
      selectedExtensionIntent.current = input;
      try { localStorage.setItem(selectedPlanKey + '.extension', JSON.stringify(input)); } catch { /* Keep the same intent in memory for retry. */ }
      const result = await api.planner.extendTimeBlock(plannerFocus.block.id, input);
      selectedExtensionIntent.current = null;
      try { localStorage.removeItem(selectedPlanKey + '.extension'); } catch { }
      selectedBlockEndRef.current = result.block.endTime;
      queryClient.setQueryData(['planner', 'focus-selection', workspaceId, plannerFocus.date], (previous: import('../types/planner').PlannerData | undefined) => previous ? { ...previous, timeBlocks: previous.timeBlocks.map(block => block.id === result.block.id ? result.block : block.id === result.rescheduledBlock?.id ? result.rescheduledBlock : block) } : previous);
      const next = { type: 'custom' as const, durationMin: minutes };
      setSelectedSessions(previous => [...previous, next]); setSelectedIndex(selectedSessions.length);
      prepareSelectedSession(next);
      await queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success(rescheduleBlockId ? 'Next block rescheduled. Extra focus time is ready.' : 'Extra focus time is ready.');
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) { selectedExtensionIntent.current = null; try { localStorage.removeItem(selectedPlanKey + '.extension'); } catch { } }
      setSelectedError(errorMessage(error, 'Could not extend focus time')); void plannerFocus.refetch();
    }
    finally { selectedWrite.current = false; setSelectedBusy(false); }
  };

  const handleSetCustomDuration = (mins: number) => {
    if (plannerFocus.requested) { if (!sessionRef.current && selectedIndex === 0 && !pendingCompletionRef.current) configureSelected(mins, 0); return; }
    const validMins = Math.max(1, mins);
    const updated = { ...settings, customDuration: validMins };
    setSettings(updated);
    localStorage.setItem(focusStorageKey(user?.id, 'settings'), JSON.stringify(updated));
    if (mode === 'custom' && !isActive && !sessionRef.current && !pendingCompletionRef.current) {
      setTimeLeft(validMins * 60);
      setDuration(validMins * 60);
    }
  };

  const handleSelectSlot = (idx: number) => {
    if (plannerFocus.requested) return;
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
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
    sessionRef.current = null;
  };

  const handleToggleMode = () => {
    if (plannerFocus.requested) return;
    if (pendingCompletionRef.current || completionInFlightRef.current) return;
    if (operatingMode === 'planner') {
      setOperatingMode('manual');
      localStorage.setItem(focusStorageKey(user?.id, 'mode'), 'manual');
      // Directly reset timer — can't call handleChangeMode here because
      // operatingMode state hasn't updated yet (it still reads 'planner')
      targetEndTimeRef.current = null;
      setMode('pomodoro');
      setIsActive(false);
      setStartTime(null);
    sessionRef.current = null;
      const secs = settingsRef.current.focusDuration * 60;
      setTimeLeft(secs);
      setDuration(secs);
    } else {
      setOperatingMode('planner');
      localStorage.setItem(focusStorageKey(user?.id, 'mode'), 'planner');
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
    localStorage.setItem(focusStorageKey(user?.id, 'settings'), JSON.stringify(newSettings));
    if (!plannerFocus.requested && !isActive && !sessionRef.current && !pendingCompletionRef.current) {
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
    syncPreferences({ timerPreferences: {
      focusDuration: newSettings.focusDuration, shortBreak: newSettings.shortBreak,
      longBreak: newSettings.longBreak, longBreakAfter: newSettings.longBreakAfter,
    } }, 'Settings saved on this device. Account sync failed; try saving again.');
  };

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // The task dialog owns focus and Escape while it is open.
      if (selectedDialog) return;
      // Dialog dismissal must work even when a modal control has focus.
      if (e.key === 'Escape') {
        if (showWallpaperModal || showSettingsModal || showLayoutModal) {
          e.preventDefault();
          setShowWallpaperModal(false);
          setShowSettingsModal(false);
          setShowLayoutModal(false);
        } else if (isFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
        return;
      }

      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, button, a, [contenteditable=true], [role=button]')) return;
      if (showSettingsModal || showWallpaperModal || showLayoutModal) return;

      if (e.code === 'Enter' || e.key === 'Enter' || e.code === 'Space') {
        if (mode !== 'clock') {
          e.preventDefault();
          if (isActiveRef.current) handlePause(); else handleStart();
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
  }, [selectedDialog, showWallpaperModal, showSettingsModal, showLayoutModal, mode, isFullscreen, handleSkip, handleStart, handlePause]);

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
  const currentTaskTitle = selectedSlotRef.current?.taskTitle || activeSlot?.taskTitle || null;
  const currentProjectName = selectedSlotRef.current?.projectName || activeSlot?.projectName || null;

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
    customDuration: plannerFocus.requested ? duration / 60 : settings.customDuration || 45,
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
      localStorage.setItem(focusStorageKey(user?.id, 'settings'), JSON.stringify(updated));
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

      {plannerFocus.requested && !selectedDialog && <div className="fixed bottom-4 left-4 right-4 z-[120] mx-auto max-w-lg rounded-xl border border-border bg-surface p-3 text-primary shadow-xl select-text">
        <p className="text-sm font-medium">{plannerFocus.loading ? 'Loading scheduled task…' : plannerFocus.invalid ? 'This scheduled task is unavailable. Return to Planner.' : selectedFinished ? 'Task completed' : (currentTaskTitle || 'Scheduled focus') + ' · Session ' + (selectedIndex + 1) + ' of ' + selectedSessions.length}</p>
        {!plannerFocus.loading && !plannerFocus.invalid && !selectedFinished && <button type="button" disabled={isActive || !!sessionRef.current || !!pendingCompletion || selectedBusy} onClick={() => setSelectedDialog(timeLeft === 0 ? 'decision' : 'setup')} className="min-h-11 mt-1 px-3 rounded-lg border border-border disabled:opacity-50">{timeLeft === 0 ? 'Review session' : 'Configure sessions'}</button>}
        <button type="button" disabled={selectedBusy} onClick={() => navigate('/app/planner?mode=day&date=' + plannerFocus.date)} className="min-h-11 ml-3 underline">Back to Planner</button>
      </div>}
      {plannerFocus.requested && selectedDialog && !pendingCompletion && !plannerFocus.loading && !plannerFocus.invalid && <PlannerFocusDialog key={selectedDialog + selectedIndex} kind={selectedDialog} title={currentTaskTitle || 'Scheduled focus'} totalMinutes={plannerFocus.totalMinutes} next={selectedSessions[selectedIndex + 1]} block={plannerFocus.block} blocks={plannerFocus.blocks} busy={selectedBusy} error={selectedError} canComplete={!!plannerFocus.task} date={plannerFocus.date} onClose={() => setSelectedDialog(null)} started={selectedIndex > 0} onResume={() => prepareSelectedSession(selectedSessions[selectedIndex])} onConfigure={configureSelected} onDone={() => void finishSelectedTask()} onContinue={() => { const next = selectedSessions[selectedIndex + 1]; if (next) { setSelectedIndex(index => index + 1); prepareSelectedSession(next); } }} onExtend={(minutes, blockId) => void extendSelected(minutes, blockId)} />}

      {pendingCompletion && <div role={isCompleting ? 'status' : 'alert'} className="fixed bottom-4 left-4 right-4 z-[150] mx-auto max-w-lg rounded-xl border border-border bg-surface p-4 text-primary shadow-xl select-text">
        <p className="text-sm font-medium">{isCompleting ? 'Saving your session...' : 'Your session has not been saved.'}</p>
        <p className="text-xs text-secondary mt-1">Your work time is retained. Save it before starting another session.</p>
        {!isCompleting && <button type="button" disabled={plannerFocus.requested && (plannerFocus.loading || plannerFocus.invalid)} onClick={() => void handleCompleteSession()} className="min-h-11 mt-3 px-4 rounded-lg bg-accent text-on-accent text-sm">Retry saving session</button>}
      </div>}

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
