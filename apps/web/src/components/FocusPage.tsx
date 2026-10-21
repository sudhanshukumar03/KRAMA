import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TimerLayoutStandby } from './focus/TimerLayoutStandby';
import { TimerLayoutCentered } from './focus/TimerLayoutCentered';
import { TimerLayoutOverlay } from './focus/TimerLayoutOverlay';
import { TimerLayoutSidebar } from './focus/TimerLayoutSidebar';
import { TimerLayoutCard } from './focus/TimerLayoutCard';
import { TimerLayoutZen } from './focus/TimerLayoutZen';
import { PlannerFocusDialog } from './focus/PlannerFocusDialog';
import { WallpaperPicker } from './focus/WallpaperPicker';
import { TimerLayoutPicker } from './focus/TimerLayoutPicker';
import { SettingsPanel } from './focus/SettingsPanel';
import { BUNDLED_WALLPAPERS } from './focus/constants';
import { useFocusPreferences } from './focus/hooks/useFocusPreferences';
import { useFocusSession } from './focus/hooks/useFocusSession';
import { useFocusViewport } from './focus/hooks/useFocusViewport';
import { useFocusShortcuts } from './focus/hooks/useFocusShortcuts';
import { useFocusRealtime } from './focus/hooks/useFocusRealtime';

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
  const preferences = useFocusPreferences();
  const { settings, wallpaper, layout, handleSelectLayout, handleSelectWallpaper } = preferences;
  const session = useFocusSession(preferences);
  const { timeLeft, duration, isActive, mode, operatingMode, plan, currentSlotIndex, sessionRef,
    selectedSlotRef, plannerFocus, pendingCompletion, pendingCount, isCompleting,
    selectedDialog, setSelectedDialog, selectedFinished, selectedBusy, selectedIndex, setSelectedIndex,
    selectedSessions, selectedError, prepareSelectedSession, configureSelected, finishSelectedTask, extendSelected,
    handleCompleteSession, handleStart, handlePause, handleStop, handleSkip, handleChangeMode,
    handleSelectSlot, handleSetCustomDuration, handleToggleMode, handleSaveSettings } = session;
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const dialogs = { showWallpaperModal, setShowWallpaperModal, showLayoutModal, setShowLayoutModal, showSettingsModal, setShowSettingsModal };
  const viewport = useFocusViewport(session, dialogs);
  const { clock, isFullscreen, toggleFullscreen, controlsVisible, setControlsVisible, setNoticePanel, noticeInset } = viewport;
  useFocusShortcuts(session, viewport, dialogs);
  useFocusRealtime();

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
    onToggleSound: preferences.toggleSound,
    onOpenSettings: () => setShowSettingsModal(true),
    onOpenWallpaper: () => setShowWallpaperModal(true),
    onOpenLayoutPicker: () => setShowLayoutModal(true),
    onToggleMode: handleToggleMode,
    isFullscreen,
    onToggleFullscreen: toggleFullscreen,
    controlsVisible,
    bottomInset: noticeInset,
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
    <div className="krama-focus-workspace fixed inset-0 w-full h-full min-h-screen overflow-hidden select-none bg-black text-white">
      <div className="sr-only">
        <span role="timer" aria-live="off" aria-label={mode === 'clock' ? 'Current time' : 'Time remaining'}>
          {mode === 'clock' ? `${clock.timeStr} ${clock.ampm}` : `${Math.floor(timeLeft / 60)} minutes ${timeLeft % 60} seconds`}
        </span>
        <p role="status" aria-label="Timer status" aria-live="polite" aria-atomic="true">
          {mode === 'clock' ? 'Clock mode.' : pendingCompletion ? 'Session waiting to save.' : isActive ? 'Timer running.' : timeLeft === 0 ? 'Timer complete.' : sessionRef.current ? 'Timer paused.' : 'Timer ready.'}
        </p>
      </div>
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

      {(plannerFocus.requested && (!selectedDialog || plannerFocus.blocker) || pendingCompletion) && <div ref={setNoticePanel} className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg space-y-3 select-text">
      {plannerFocus.requested && (!selectedDialog || plannerFocus.blocker) && <div className="rounded-xl border border-border bg-surface p-3 text-primary shadow-xl">
        <p className="text-sm font-medium">{plannerFocus.loading ? 'Loading scheduled task…' : plannerFocus.invalid ? 'This scheduled task is unavailable. Return to Planner.' : plannerFocus.blocker ? plannerFocus.task?.title || 'Task waiting on a prerequisite' : selectedFinished ? 'Task completed' : (currentTaskTitle || 'Scheduled focus') + ' · Session ' + (selectedIndex + 1) + ' of ' + selectedSessions.length}</p>
        {plannerFocus.blocker && <p role="status" className="text-sm text-warning-fg mt-1">Waiting for {plannerFocus.blocker.title}. Finish this prerequisite in Tasks before starting Focus.</p>}
        {!plannerFocus.loading && !plannerFocus.invalid && !plannerFocus.blocker && !selectedFinished && <button type="button" disabled={isActive || !!sessionRef.current || !!pendingCompletion || selectedBusy} onClick={() => setSelectedDialog(timeLeft === 0 ? 'decision' : 'setup')} className="min-h-11 mt-1 px-3 rounded-lg border border-border disabled:opacity-50">{timeLeft === 0 ? 'Review session' : 'Configure sessions'}</button>}
        <button type="button" disabled={selectedBusy} onClick={() => navigate('/app/planner?mode=day&date=' + plannerFocus.date)} className="min-h-11 ml-3 underline">Back to Planner</button>
      </div>}
      {pendingCompletion && <div role={isCompleting ? 'status' : 'alert'} className="rounded-xl border border-border bg-surface p-4 text-primary shadow-xl">
        <p className="text-sm font-medium">{isCompleting ? 'Saving your session...' : 'Your session has not been saved.'}</p>
        <p className="text-xs text-secondary mt-1">Your work time is retained. Save it before starting another session.{pendingCount > 1 ? ` ${pendingCount} sessions are waiting to save.` : ''}</p>
        {/* Recovery saves the account/workspace-scoped original payload. A changed
            reservation can prevent a new timer, but must not strand completed work. */}
        {!isCompleting && <button type="button" onClick={() => void handleCompleteSession()} className="min-h-11 mt-3 px-4 rounded-lg bg-accent text-on-accent text-sm">Retry saving session</button>}
      </div>}
      </div>}
      {plannerFocus.requested && selectedDialog && !plannerFocus.blocker && !pendingCompletion && !plannerFocus.loading && !plannerFocus.invalid && <PlannerFocusDialog key={selectedDialog + selectedIndex} kind={selectedDialog} title={currentTaskTitle || 'Scheduled focus'} totalMinutes={plannerFocus.totalMinutes} next={selectedSessions[selectedIndex + 1]} block={plannerFocus.block} blocks={plannerFocus.blocks} busy={selectedBusy} error={selectedError} canComplete={!!plannerFocus.task} date={plannerFocus.date} onClose={() => setSelectedDialog(null)} started={selectedIndex > 0} onResume={() => prepareSelectedSession(selectedSessions[selectedIndex])} onConfigure={configureSelected} onDone={() => void finishSelectedTask()} onContinue={() => { const next = selectedSessions[selectedIndex + 1]; if (next) { setSelectedIndex(index => index + 1); prepareSelectedSession(next); } }} onExtend={(minutes, blockId) => void extendSelected(minutes, blockId)} />}

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
