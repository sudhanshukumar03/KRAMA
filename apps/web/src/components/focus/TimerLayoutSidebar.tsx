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
    <div className="fixed inset-0 w-screen h-screen flex select-none overflow-hidden z-10">
      {/* Left Sidebar Panel - visible in normal tab, hidden when in full screen unless controls are revealed */}
      <div
        className={`w-full md:w-[440px] h-full flex flex-col justify-between bg-black/40 backdrop-blur-2xl border-r border-white/10 p-6 md:p-8 text-white z-20 transition-all duration-300 ${
          isFullscreen && !controlsVisible ? 'opacity-0 -translate-x-full pointer-events-none' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div />
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
          {controlsVisible && (
            operatingMode === 'manual' ? (
              <div className="flex flex-wrap gap-1 p-1 bg-white/10 rounded-xl mt-4 animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={() => onChangeMode('pomodoro')}
                  className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    mode === 'pomodoro' ? 'bg-white text-black font-semibold shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Focus
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMode('short_break')}
                  className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    mode === 'short_break' ? 'bg-white text-black font-semibold shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Short
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMode('long_break')}
                  className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    mode === 'long_break' ? 'bg-white text-black font-semibold shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMode('custom')}
                  className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    mode === 'custom' ? 'bg-white text-black font-semibold shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Custom</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMode('clock')}
                  className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    mode === 'clock' ? 'bg-white text-black font-semibold shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Clock
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-black/40 backdrop-blur-2xl rounded-xl border border-emerald-500/20 shadow-lg px-3 mt-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-mono text-emerald-300 tracking-wide uppercase">
                    {mode === 'pomodoro' ? 'Focus' : mode === 'short_break' ? 'Short Break' : mode === 'long_break' ? 'Long Break' : 'Break'}
                  </span>
                  {taskTitle && (
                    <>
                      <span className="text-white/20 text-xs">•</span>
                      <span className="text-[11px] font-mono text-white/70 truncate">{taskTitle}</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/40 ml-2 shrink-0">({currentSlotIndex + 1}/{totalSlots})</span>
              </div>
            )
          )}
        </div>

        {/* Center Timer Typography */}
        <div className="flex flex-col items-center my-auto py-6">
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
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-teal-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Status */}
              <div className="h-8 mt-3 flex items-center justify-center">
                {taskTitle ? (
                  <div className="flex items-center gap-1.5 text-xs text-white/90 truncate max-w-[280px]">
                    {projectName && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white shrink-0">
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
              {mode === 'custom' && controlsVisible && !isActive && (
                <div className="flex items-center gap-1.5 mt-2">
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

          {/* Planner Queue or Task info */}
          {operatingMode === 'planner' && plan.length > 0 && (
            <div className="w-full mt-6 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1">
                Queue ({currentSlotIndex + 1}/{totalSlots})
              </div>
              {plan.slice(0, 5).map((slot, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectSlot(idx)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    idx === currentSlotIndex
                      ? 'bg-white/20 text-white font-medium border border-white/20'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    {idx < currentSlotIndex ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    )}
                    <span className="truncate">{slot.taskTitle || slot.label}</span>
                  </span>
                  <span className="font-mono text-[10px] text-white/50 shrink-0 ml-2">
                    {slot.durationMin}m
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Right Area: Pure Wallpaper view */}
      <div className="hidden md:flex flex-1 items-center justify-center p-12 text-center select-none" />

      {/* Center floating typography in Fullscreen when sidebar is hidden */}
      {isFullscreen && !controlsVisible && (
        <div className="absolute inset-0 flex flex-col items-center justify-center my-auto text-center w-full z-10 select-none animate-in fade-in duration-300 pointer-events-none">
          <div className="flex items-baseline justify-center font-bold font-mono tracking-tight leading-none drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]">
            <span className="text-8xl sm:text-9xl" style={{ color: digitsColor || '#ffffff' }}>{timeStr}</span>
          </div>
        </div>
      )}
    </div>
  );
};
