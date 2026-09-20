import React from 'react';
import { Sliders, Maximize, Minimize } from 'lucide-react';
import type { TimerLayoutProps } from './types';
import { TimerMoreMenu } from './TimerMoreMenu';

const CUSTOM_PRESETS = [15, 25, 45, 60, 90];

export const TimerLayoutZen: React.FC<TimerLayoutProps> = ({
  timeLeft,
  isActive,
  mode,
  operatingMode,
  layout,
  onSelectLayout,
  taskTitle,
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

  const handleToggleTimer = () => {
    if (mode === 'clock') return;
    if (isActive) {
      onPause();
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col justify-between items-center p-6 md:p-12 select-none overflow-hidden z-10">
      {/* Top minimal header — always visible in normal tab, hidden by default in fullscreen */}
      <div
        className={`w-full flex items-center justify-between transition-all duration-300 z-30 ${
          controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        {operatingMode === 'manual' ? (
          <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
            <button type="button" onClick={() => onChangeMode('pomodoro')}
              className={`px-3 py-1 text-xs font-light tracking-wider rounded-full transition-all cursor-pointer ${mode === 'pomodoro' ? 'bg-white text-black font-normal' : 'text-white/60 hover:text-white'}`}>FLOW</button>
            <button type="button" onClick={() => onChangeMode('short_break')}
              className={`px-3 py-1 text-xs font-light tracking-wider rounded-full transition-all cursor-pointer ${mode === 'short_break' ? 'bg-white text-black font-normal' : 'text-white/60 hover:text-white'}`}>REST</button>
            <button type="button" onClick={() => onChangeMode('long_break')}
              className={`px-3 py-1 text-xs font-light tracking-wider rounded-full transition-all cursor-pointer ${mode === 'long_break' ? 'bg-white text-black font-normal' : 'text-white/60 hover:text-white'}`}>RECOVERY</button>
            <button type="button" onClick={() => onChangeMode('custom')}
              className={`px-3 py-1 text-xs font-light tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-1 ${mode === 'custom' ? 'bg-white text-black font-normal' : 'text-white/60 hover:text-white'}`}>
              <Sliders className="w-3 h-3" /><span>CUSTOM</span>
            </button>
            <button type="button" onClick={() => onChangeMode('clock')}
              className={`px-3 py-1 text-xs font-light tracking-wider rounded-full transition-all cursor-pointer ${mode === 'clock' ? 'bg-white text-black font-normal' : 'text-white/60 hover:text-white'}`}>CLOCK</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-1 bg-black/40 backdrop-blur-2xl rounded-full border border-emerald-500/20 shadow-2xl px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-mono text-emerald-300 tracking-wider">
              {mode === 'pomodoro' ? 'FLOW' : mode === 'short_break' ? 'REST' : mode === 'long_break' ? 'RECOVERY' : 'BREAK'}
            </span>
            {taskTitle && (<><span className="text-white/20 text-xs">•</span><span className="text-[11px] font-mono text-white/70 max-w-[220px] truncate">{taskTitle}</span></>)}
            <span className="text-[10px] font-mono text-white/40 ml-1">({currentSlotIndex + 1}/{totalSlots})</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Full Screen Action Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-2 text-white/60 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
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

      {/* Center Zen Focus vs Clock — Ultra-Pure Typography */}
      <div className="flex flex-col items-center justify-center my-auto text-center w-full max-w-4xl">
        {mode === 'clock' ? (
          <div className="flex flex-col items-center select-none">
            <div className="flex items-baseline justify-center font-extralight font-mono tracking-tighter drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] leading-none">
              <span className="text-[8rem] sm:text-[11rem] md:text-[14rem]" style={{ color: digitsColor || '#ffffff' }}>{clock.timeStr}</span>
              <span className="text-3xl sm:text-5xl md:text-6xl text-white/40 ml-3 font-mono">{clock.secondsStr}</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-sans font-light text-teal-400 ml-4">{clock.ampm}</span>
            </div>
            <div className="mt-5 flex items-center gap-3 text-sm font-light tracking-widest text-white/70">
              <span>{clock.dayStr}</span>
              <span>•</span>
              <span>{clock.dateStr}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center select-none">
            {/* Clickable Pure Typography */}
            <button
              type="button"
              onClick={handleToggleTimer}
              className="group relative focus:outline-none cursor-pointer bg-transparent border-0 p-0 text-center transition-transform duration-200 active:scale-98"
              title={isActive ? 'Click or press Enter to pause' : 'Click or press Enter to start'}
            >
              <span
                className={`text-[9rem] sm:text-[12rem] md:text-[16rem] font-extralight font-mono tracking-tighter leading-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-opacity duration-300 block ${
                  isActive ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                }`}
                style={{ color: digitsColor || '#ffffff' }}
              >
                {timeStr}
              </span>
            </button>

            {/* Stable Status / Task Line — Hidden in Fullscreen */}
            {!isFullscreen && (
              <div className="h-8 mt-2 flex items-center justify-center">
                {taskTitle ? (
                  <p className="text-sm md:text-base font-light tracking-wide text-white/80 max-w-md truncate drop-shadow-md">
                    {taskTitle}
                  </p>
                ) : (
                  <span className="text-xs font-light tracking-widest text-white/40 uppercase font-mono">
                    {mode === 'pomodoro' ? 'FLOW' : mode === 'short_break' ? 'REST' : mode === 'long_break' ? 'RECOVERY' : 'BREAK'}
                  </span>
                )}
              </div>
            )}

            {/* Custom Presets shown only when controls toggled in custom mode */}
            {mode === 'custom' && controlsVisible && !isActive && (
              <div className="flex items-center gap-2 mt-4 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 animate-in fade-in duration-150">
                <span className="text-xs text-white/40 font-mono">Sprint:</span>
                {CUSTOM_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSetCustomDuration(p)}
                    className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                      customDuration === p
                        ? 'bg-teal-500 text-black font-medium'
                        : 'text-white/60 hover:text-white'
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
