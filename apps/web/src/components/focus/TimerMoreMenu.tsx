import React, { useState, useRef, useEffect } from 'react';
import { 
  Palette, Settings, Calendar, 
  X, LayoutGrid, Volume2, VolumeX, SkipForward, Clock, Sliders
} from 'lucide-react';
import type { OperatingMode, LayoutName, TimerMode } from './types';

interface TimerMoreMenuProps {
  operatingMode: OperatingMode;
  layout?: LayoutName;
  onSelectLayout?: (layout: LayoutName) => void;
  onOpenLayoutPicker?: () => void;
  onToggleMode: () => void;
  onChangeMode?: (mode: TimerMode) => void;
  onSkip?: () => void;
  onOpenWallpaper: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TimerMoreMenu: React.FC<TimerMoreMenuProps> = ({
  operatingMode,
  onOpenLayoutPicker,
  onToggleMode,
  onChangeMode,
  onSkip,
  onOpenWallpaper,
  onOpenSettings,
  onClose,
  soundEnabled,
  onToggleSound,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Settings Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all backdrop-blur-md border border-white/15 focus:outline-none cursor-pointer"
        title="Settings & Options"
        aria-label="Settings and options"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl krama-dialog shadow-2xl p-2 z-50 text-primary animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-accent-fg" />
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-primary">
                Timer Options
              </span>
            </div>
          </div>

          {/* Section: Customization & Controls */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onChangeMode?.('pomodoro');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-surface-hover text-secondary hover:text-primary transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-accent-fg" />
                <span>Focus (Pomodoro)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenLayoutPicker) onOpenLayoutPicker();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-surface-hover text-secondary hover:text-primary transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <LayoutGrid className="w-3.5 h-3.5 text-accent-fg" />
                <span>Timer Layout</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenWallpaper();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-surface-hover text-secondary hover:text-primary transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Palette className="w-3.5 h-3.5 text-accent-fg" />
                <span>Wallpaper & Layout</span>
              </span>
              <kbd className="text-[10px] font-mono text-muted">W</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-surface-hover text-secondary hover:text-primary transition-colors text-left"
            >
              <span className="flex items-center gap-2.5">
                <Sliders className="w-3.5 h-3.5 text-accent-fg" />
                <span>Customize</span>
              </span>
              <kbd className="text-[10px] font-mono text-muted">S</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onToggleSound();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-surface-hover text-secondary hover:text-primary transition-colors text-left"
            >
              <span className="flex items-center gap-2.5">
                {soundEnabled
                  ? <Volume2 className="w-3.5 h-3.5 text-accent-fg" />
                  : <VolumeX className="w-3.5 h-3.5 text-muted" />}
                <span>Audio Chimes</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                soundEnabled
                  ? 'text-accent-fg bg-accent/10 border border-accent/20'
                  : 'text-muted bg-surface-2 border border-border'
              }`}>
                {soundEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onToggleMode();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-surface-hover text-secondary hover:text-primary transition-colors text-left"
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-cat-timeblocks" />
                <span>{operatingMode === 'planner' ? 'Switch to Manual' : "Load Today's Plan"}</span>
              </span>
            </button>

            {operatingMode === 'planner' && onSkip && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSkip();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-surface-hover text-secondary hover:text-primary transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <SkipForward className="w-3.5 h-3.5 text-warning-fg" />
                  <span>Skip to Next Session</span>
                </span>
                <kbd className="text-[10px] font-mono text-muted">N</kbd>
              </button>
            )}
          </div>

          <div className="my-1 border-t border-border/70" />

          {/* Exit */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-danger-bg text-secondary hover:text-danger-fg transition-colors text-left mt-1 cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <X className="w-3.5 h-3.5 text-danger-fg" />
                <span>Exit Focus Session</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
