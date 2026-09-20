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
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/90">
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
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Focus (Pomodoro)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenLayoutPicker) onOpenLayoutPicker();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
                <span>Timer Layout</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenWallpaper();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>Wallpaper & Layout</span>
              </span>
              <kbd className="text-[10px] font-mono text-white/40">W</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-white/10 transition-colors text-left"
            >
              <span className="flex items-center gap-2.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>Customize</span>
              </span>
              <kbd className="text-[10px] font-mono text-white/40">S</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onToggleSound();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-white/10 transition-colors text-left"
            >
              <span className="flex items-center gap-2.5">
                {soundEnabled
                  ? <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                  : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
                <span>Audio Chimes</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                soundEnabled
                  ? 'text-teal-400 bg-teal-950/60 border border-teal-500/20'
                  : 'text-white/40 bg-white/5 border border-white/10'
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
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-white/10 transition-colors text-left"
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
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
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>Skip to Next Session</span>
                </span>
                <kbd className="text-[10px] font-mono text-white/40">N</kbd>
              </button>
            )}
          </div>

          <div className="my-1 border-t border-white/10" />

          {/* Exit */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl hover:bg-red-500/20 text-white/80 hover:text-red-300 transition-colors text-left mt-1"
            >
              <span className="flex items-center gap-2.5">
                <X className="w-3.5 h-3.5 text-red-400" />
                <span>Exit Focus Session</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
