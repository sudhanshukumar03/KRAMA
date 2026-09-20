import React from 'react';
import { Sliders, Maximize, Minimize } from 'lucide-react';
import type { TimerLayoutProps } from './types';
import { TimerMoreMenu } from './TimerMoreMenu';

const CUSTOM_PRESETS = [15, 25, 45, 60, 90];

export const TimerLayoutOverlay: React.FC<TimerLayoutProps> = ({
  timeLeft,
  duration,
  isActive,
  mode,
  operatingMode,
  layout,
  onSelectLayout,
  taskTitle,
  projectName,
  currentSlotIndex,
  totalSlots,
  clock,
  customDuration,
  digitsColor,
  onStart,
  onPause,
  onSkip,
  onChangeMode,
  onSetCustomDuration,
  onOpenSettings,
  onOpenWallpaper,
  onOpenLayoutPicker,
  onToggleMode,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  controlsVisible,
  onClose,
}) => {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progress = duration > 0 ? Math.min(100, Math.max(0, ((duration - timeLeft) / duration) * 100)) : 0;

  const handleToggleTimer = () => {
    if (mode === 'clock') return;
    if (isActive) {
      onPause();
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden z-10">
      {/* Top Controls Overlay: Always visible in normal tab, hidden by default in fullscreen */}
      <div
        className={`w-full flex items-center justify-between transition-all duration-300 z-30 ${
          controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        {/* Left: Mode Tabs & Planned Session Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-2xl rounded-full border border-white/15 shadow-2xl">
            <button type="button" onClick={() => onChangeMode('pomodoro')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'pomodoro' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white'}`}>Focus</button>
            <button type="button" onClick={() => onChangeMode('short_break')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'short_break' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white'}`}>Short Break</button>
            <button type="button" onClick={() => onChangeMode('long_break')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'long_break' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white'}`}>Long Break</button>
            <button type="button" onClick={() => onChangeMode('custom')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-1 ${mode === 'custom' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white'}`}>
              <Sliders className="w-3 h-3" /><span>Custom</span>
            </button>
            <button type="button" onClick={() => onChangeMode('clock')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'clock' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white'}`}>Normal Clock</button>
          </div>

          {operatingMode === 'planner' && (
            <div className="flex items-center gap-2 p-1 bg-black/40 backdrop-blur-2xl rounded-full border border-emerald-500/20 shadow-2xl px-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-mono text-emerald-300 tracking-wide">
                {mode === 'pomodoro' ? 'Focus' : mode === 'short_break' ? 'Short Break' : mode === 'long_break' ? 'Long Break' : 'Break'}
              </span>
              {taskTitle && (<><span className="text-white/20 text-xs">•</span><span className="text-[11px] font-mono text-white/70 max-w-[200px] truncate">{taskTitle}</span></>)}
              <span className="text-[10px] font-mono text-white/40 ml-1">({currentSlotIndex + 1}/{totalSlots})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Full Screen Action Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all backdrop-blur-md border border-white/15 cursor-pointer text-xs font-medium"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>

          {/* Three-Dot Menu */}
          <TimerMoreMenu
            operatingMode={operatingMode}
            layout={layout}
            onSelectLayout={onSelectLayout}
            onToggleMode={onToggleMode}
            onChangeMode={onChangeMode}
            onSkip={onSkip}
            onOpenWallpaper={onOpenWallpaper}
            onOpenLayoutPicker={onOpenLayoutPicker}
            onOpenSettings={onOpenSettings}
            onClose={onClose}
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
          />
        </div>
      </div>

      {/* Bottom Floating Typographic Overlay — Borderless directly over wallpaper */}
      <div className="mt-auto mb-4 flex flex-col items-start select-none">
        {mode === 'clock' ? (
          <div className="flex flex-col select-none">
            <div className="flex items-baseline gap-3 font-bold font-mono tracking-tight drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)] leading-none">
              <span className="text-6xl sm:text-8xl md:text-9xl" style={{ color: digitsColor || '#ffffff' }}>{clock.timeStr}</span>
              <span className="text-2xl sm:text-3xl md:text-4xl text-white/50">{clock.secondsStr}</span>
              <span className="text-lg sm:text-2xl font-semibold text-teal-400 uppercase">{clock.ampm}</span>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs sm:text-sm text-white/80 font-mono tracking-wider drop-shadow-md">
              <span className="font-semibold">{clock.dayStr}</span>
              <span>•</span>
              <span className="text-white/60">{clock.dateStr}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col select-none">
            {/* Clickable Typography */}
            <button
              type="button"
              onClick={handleToggleTimer}
              className="group relative focus:outline-none cursor-pointer bg-transparent border-0 p-0 text-left transition-transform duration-200 active:scale-98"
              title={isActive ? 'Click or press Enter to pause' : 'Click or press Enter to start'}
            >
              <div className="flex items-baseline gap-4">
                <span className="text-7xl sm:text-9xl md:text-[10rem] font-bold font-mono tracking-tight leading-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]" style={{ color: digitsColor || '#ffffff' }}>
                  {timeStr}
                </span>
                <span className="text-xs sm:text-sm uppercase font-mono tracking-widest text-white/60 drop-shadow-md">
                  {mode === 'pomodoro'
                    ? 'Focus'
                    : mode === 'custom'
                    ? `${customDuration}m Custom`
                    : 'Break'}
                </span>
              </div>
            </button>

            {/* Subtle Progress Bar & Status — Hidden in Fullscreen */}
            {!isFullscreen && (
              <>
                <div className="w-56 sm:w-72 h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden backdrop-blur-md">
                  <div
                    className="h-full bg-teal-400 transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Task Info & Status */}
                <div className="h-8 mt-2 flex items-center gap-3">
                  {taskTitle ? (
                    <div className="flex items-center gap-2 text-sm text-white/90 drop-shadow-md max-w-md truncate">
                      {projectName && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/20 text-white shrink-0">
                          {projectName}
                        </span>
                      )}
                      <span className="truncate">{taskTitle}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-mono uppercase tracking-wider text-white/50 drop-shadow-md">
                      {mode === 'pomodoro'
                        ? 'Focus'
                        : mode === 'custom'
                        ? `${customDuration}m Custom`
                        : 'Break'}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Custom Presets shown when controls are toggled */}
            {mode === 'custom' && controlsVisible && !isActive && (
              <div className="flex items-center gap-2 mt-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 animate-in fade-in duration-150">
                <span className="text-xs text-white/50 font-mono">Sprint:</span>
                {CUSTOM_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSetCustomDuration(p)}
                    className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                      customDuration === p
                        ? 'bg-teal-500 text-black font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {p}m
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Spacer */}
      <div className="h-4" />
    </div>
  );
};
