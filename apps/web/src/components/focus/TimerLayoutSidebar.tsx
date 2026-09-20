import React from 'react';
import { CheckCircle2, Clock, Sliders, Maximize, Minimize } from 'lucide-react';
import type { TimerLayoutProps } from './types';
import { TimerMoreMenu } from './TimerMoreMenu';

const CUSTOM_PRESETS = [15, 25, 45, 60, 90];

export const TimerLayoutSidebar: React.FC<TimerLayoutProps> = ({
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
  plan,
  clock,
  customDuration,
  digitsColor,
  onStart,
  onPause,
  onSkip,
  onChangeMode,
  onSelectSlot,
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
    <div className="fixed inset-0 w-full h-full flex select-none overflow-hidden z-10">
      {/* Left Sidebar Panel - translucent glassmorphism style */}
      <div className="w-full md:w-[440px] h-full flex flex-col justify-between bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-white/[0.05] backdrop-blur-2xl border-r border-white/15 p-6 md:p-8 text-white z-20 transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* Top Header & Controls Overlay: Visible in normal tab, hidden by default in fullscreen */}
        <div
          data-testid="sidebar-header-controls"
          className={`transition-all duration-300 z-30 ${
            controlsVisible
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-3 pointer-events-none max-h-0 overflow-hidden mb-0 pb-0'
          }`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium tracking-wider uppercase text-white/50">Focus Timer</span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
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

          {/* Mode Switcher / Planner Status */}
          {operatingMode === 'manual' ? (
            <div className="flex flex-wrap gap-1 p-1 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl mt-4 shadow-inner">
              <button
                type="button"
                onClick={() => onChangeMode('pomodoro')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'pomodoro' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                Focus
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('short_break')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'short_break' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                Short
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('long_break')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'long_break' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('custom')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  mode === 'custom' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Custom</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('clock')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'clock' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                Clock
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-black/20 backdrop-blur-xl rounded-xl border border-teal-400/25 shadow-lg px-3 mt-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <span className="text-[11px] font-mono text-teal-300 tracking-wide uppercase font-semibold">
                  {mode === 'pomodoro' ? 'Focus' : mode === 'short_break' ? 'Short Break' : mode === 'long_break' ? 'Long Break' : 'Break'}
                </span>
                {taskTitle && (
                  <>
                    <span className="text-white/20 text-xs">•</span>
                    <span className="text-[11px] font-mono text-white/80 truncate">{taskTitle}</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono text-white/50 ml-2 shrink-0">
                ({currentSlotIndex + 1}/{totalSlots})
              </span>
            </div>
          )}
        </div>

        {/* Center Timer Typography */}
        <div className="flex flex-col items-center my-auto py-4">
          {mode === 'clock' ? (
            <div className="flex flex-col items-center select-none">
              <div className="flex items-baseline justify-center font-bold font-mono tracking-tight leading-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
                <span className="text-6xl md:text-7xl" style={{ color: digitsColor || '#ffffff' }}>{clock.timeStr}</span>
                <span className="text-xl md:text-2xl text-white/50 ml-2 font-mono">{clock.secondsStr}</span>
                <span className="text-sm uppercase font-semibold text-teal-400 ml-2">{clock.ampm}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/70 font-mono">
                <span>{clock.dayStr}</span>
                <span>•</span>
                <span>{clock.dateStr}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center select-none w-full">
              {/* Clickable Typography */}
              <button
                type="button"
                onClick={handleToggleTimer}
                className="group relative focus:outline-none cursor-pointer bg-transparent border-0 p-0 text-center transition-transform duration-200 active:scale-98"
                title={isActive ? 'Click or press Enter to pause' : 'Click or press Enter to start'}
              >
                <span
                  className={`text-7xl sm:text-8xl md:text-9xl font-black font-mono tracking-tight leading-none drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] transition-opacity duration-300 block ${
                    isActive ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'
                  }`}
                  style={{ color: digitsColor || '#ffffff' }}
                >
                  {timeStr}
                </span>
              </button>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-teal-400 transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(45,212,191,0.6)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Status */}
              <div className="h-8 mt-3 flex items-center justify-center">
                {taskTitle ? (
                  <div className="flex items-center gap-1.5 text-xs text-white/90 truncate max-w-[280px]">
                    {projectName && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/15 backdrop-blur-md text-white shrink-0 border border-white/10">
                        {projectName}
                      </span>
                    )}
                    <span className="truncate">{taskTitle}</span>
                  </div>
                ) : (
                  <span className="text-xs font-mono uppercase tracking-wider text-white/60">
                    {mode === 'pomodoro'
                      ? 'Focus'
                      : mode === 'custom'
                      ? `${customDuration}m Custom`
                      : 'Break'}
                  </span>
                )}
              </div>

              {/* Custom Presets */}
              {mode === 'custom' && !isActive && (
                <div className={`flex items-center gap-1.5 mt-2 transition-all duration-300 ${
                  controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none max-h-0 overflow-hidden'
                }`}>
                  <span className="text-xs text-white/40 font-mono">Sprint:</span>
                  {CUSTOM_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onSetCustomDuration(p)}
                      className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                        customDuration === p
                          ? 'bg-teal-500 text-black font-semibold'
                          : 'bg-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      {p}m
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Planner Queue / Plan - Frosted Glassmorphism card */}
          {operatingMode === 'planner' && (
            <div className={`w-full mt-5 bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-2xl rounded-2xl p-4 border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] space-y-2.5 transition-all duration-300 ${
              controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none max-h-0 overflow-hidden mt-0 p-0 border-none'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-white/70 px-1 pt-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  Today's Plan {plan.length > 0 ? `(${currentSlotIndex + 1}/${totalSlots})` : ''}
                </span>
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="text-teal-400 hover:text-teal-300 normal-case cursor-pointer text-xs font-sans hover:underline transition-colors"
                  title="Switch or reload schedule"
                >
                  {plan.length === 0 ? 'Reload' : 'Manual'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-0.5">
                {plan.length > 0 ? (
                  plan.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectSlot(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        idx === currentSlotIndex
                          ? 'bg-white/20 text-white font-medium border border-white/30 shadow-md backdrop-blur-md'
                          : idx < currentSlotIndex
                          ? 'bg-black/20 text-white/50 hover:bg-white/[0.06] hover:text-white/80 border border-transparent'
                          : 'bg-black/20 text-white/75 hover:bg-white/[0.09] hover:text-white border border-white/5 hover:border-white/15'
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        {idx < currentSlotIndex ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        ) : idx === currentSlotIndex ? (
                          <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        )}
                        <span className="truncate font-medium">{slot.taskTitle || slot.label}</span>
                      </span>
                      <span className={`font-mono text-[10px] shrink-0 ml-2 px-1.5 py-0.5 rounded-md ${
                        idx === currentSlotIndex ? 'bg-white/20 text-white' : 'text-white/50 bg-black/25'
                      }`}>
                        {slot.durationMin}m
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-black/25 border border-white/10 text-center space-y-1.5 backdrop-blur-md">
                    <p className="text-xs text-white/90 font-medium">No tasks scheduled today</p>
                    <p className="text-[11px] text-white/50 leading-relaxed">Schedule tasks in your Planner to run them automatically in focus sessions.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Right Area: Pure Wallpaper view */}
      <div className="hidden md:flex flex-1 items-center justify-center p-12 text-center select-none" />
    </div>
  );
};
