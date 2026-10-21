import { useEffect } from 'react';
import { hasOpenModal } from '../../../lib/keyboardShortcuts';
import type { useFocusSession } from './useFocusSession';
import type { FocusDialogs, useFocusViewport } from './useFocusViewport';

export function useFocusShortcuts(session: ReturnType<typeof useFocusSession>, viewport: ReturnType<typeof useFocusViewport>, dialogs: FocusDialogs) {
  const { selectedDialog, mode, isActiveRef, operatingModeRef, handlePause, handleStart, handleSkip } = session;
  const { isFullscreen } = viewport;
  const { showWallpaperModal, showSettingsModal, showLayoutModal, setShowWallpaperModal, setShowSettingsModal, setShowLayoutModal } = dialogs;
  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
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
      if (hasOpenModal()) return;
      if (target.closest('input, textarea, select, [contenteditable=true]')) return;
      if (showSettingsModal || showWallpaperModal || showLayoutModal) return;

      if (e.code === 'Enter' || e.key === 'Enter' || e.code === 'Space') {
        // Native controls own Enter/Space. Letter shortcuts remain available
        // after a menu/dialog returns focus to a button or link.
        if (target.closest('button, a, [role=button]')) return;
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
  }, [selectedDialog, showWallpaperModal, showSettingsModal, showLayoutModal, mode, isFullscreen, handleSkip, handleStart, handlePause, setShowLayoutModal, setShowSettingsModal, setShowWallpaperModal, operatingModeRef, isActiveRef]);

}
