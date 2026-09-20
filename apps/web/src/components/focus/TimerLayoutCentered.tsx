
import { Sliders, Maximize, Minimize } from 'lucide-react';
import type { TimerLayoutProps } from './types';
import { TimerMoreMenu } from './TimerMoreMenu';

const CUSTOM_PRESETS = [15, 25, 45, 60, 90];

export const TimerLayoutCentered: React.FC<TimerLayoutProps> = ({
  timeLeft,
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

  const handleToggleTimer = () => {
    if (mode === 'clock') return;
    if (isActive) {
      onPause();
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col justify-between items-center p-6 md:p-10 select-none overflow-hidden z-10">
      {/* Top Header Overlay: Always visible in normal tab, hidden by default in fullscreen */}
      <div
        className={`w-full flex items-center justify-between transition-all duration-300 z-30 ${controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
      >
        {/* Left: Mode Tabs & Planned Session Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-2xl rounded-full border border-white/15 shadow-2xl">
            <button type="button" onClick={() => onChangeMode('pomodoro')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'pomodoro' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              Focus
            </button>
            <button type="button" onClick={() => onChangeMode('short_break')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'short_break' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              Short Break
            </button>
            <button type="button" onClick={() => onChangeMode('long_break')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'long_break' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              Long Break
            </button>
            <button type="button" onClick={() => onChangeMode('custom')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-1 ${mode === 'custom' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              <Sliders className="w-3 h-3" /><span>Custom</span>
            </button>
            <button type="button" onClick={() => onChangeMode('clock')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${mode === 'clock' ? 'bg-white text-black font-semibold shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              Normal Clock
            </button>
          </div>

          {operatingMode === 'planner' && (
            <div className="flex items-center gap-2 p-1 bg-black/40 backdrop-blur-2xl rounded-full border border-emerald-500/20 shadow-2xl px-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-mono text-emerald-300 tracking-wide">
                {mode === 'pomodoro' ? 'Focus' : mode === 'short_break' ? 'Short Break' : mode === 'long_break' ? 'Long Break' : 'Break'}
              </span>
              {taskTitle && (
                <><span className="text-white/20 text-xs">•</span>
                <span className="text-[11px] font-mono text-white/70 max-w-[200px] truncate">{taskTitle}</span></>
              )}
              <span className="text-[10px] font-mono text-white/40 ml-1">({currentSlotIndex + 1}/{totalSlots})</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Full Screen Button */}
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

      {/* Center: Pure Borderless Typography (Blends with Wallpaper) */}
      <div className="flex flex-col items-center justify-center my-auto text-center w-full max-w-4xl">
        {mode === 'clock' ? (
          /* Normal Clock Section */
          <div className="flex flex-col items-center select-none">
            <div className="flex items-baseline justify-center font-light font-mono tracking-tighter drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] leading-none">
              <span className="text-[7rem] sm:text-[10rem] md:text-[13rem]" style={{ color: digitsColor || '#ffffff' }}>{clock.timeStr}</span>
              <span className="text-3xl sm:text-5xl md:text-6xl text-white/50 ml-3 font-mono">{clock.secondsStr}</span>
              <span className="text-xl sm:text-3xl md:text-4xl font-sans font-medium text-teal-400/95 ml-4 tracking-wider">
                {clock.ampm}
              </span>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm sm:text-base font-light tracking-widest text-white/80 drop-shadow-md">
              <span>{clock.dayStr}</span>
              <span>•</span>
              <span>{clock.dateStr}</span>
            </div>
          </div>
        ) : (
          /* Countdown Timer Section */
          <div className="flex flex-col items-center select-none">
            {/* Clickable Pure Typography — Zero Boxes or Borders */}
            <button
              type="button"
              onClick={handleToggleTimer}
              className="group relative focus:outline-none cursor-pointer bg-transparent border-0 p-0 text-center transition-transform duration-200 active:scale-98"
              title={isActive ? 'Click or press Enter to pause' : 'Click or press Enter to start'}
            >
              <span
                className={`text-[8rem] sm:text-[11rem] md:text-[15rem] font-light font-mono tracking-tighter leading-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.92)] transition-opacity duration-300 block ${isActive ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'
                  }`}
                style={{ color: digitsColor || '#ffffff' }}
              >
                {timeStr}
              </span>
            </button>

            {/* Stable Status / Task Line — Fixed Height to Prevent Any Layout Jump */}
            <div className="h-10 mt-3 flex items-center justify-center gap-3">
              {taskTitle ? (
                <div className="flex items-center gap-2 text-sm font-light text-white/90 drop-shadow-md max-w-md truncate">
                  {projectName && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/20 text-white shrink-0">
                      {projectName}
                    </span>
                  )}
                  <span className="truncate">{taskTitle}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/60 drop-shadow-md">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-teal-400 animate-pulse' : 'bg-white/40'}`} />
                  <span>
                    {mode === 'pomodoro'
                      ? 'Focus'
                      : mode === 'custom'
                        ? `${customDuration}m Custom`
                        : 'Break'}
                  </span>
                </div>
              )}
            </div>

            {/* Custom Presets shown only in Custom Mode when controls are toggled */}
            {mode === 'custom' && controlsVisible && !isActive && (
              <div className="flex items-center gap-2 mt-3 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 animate-in fade-in duration-150">
                <span className="text-xs text-white/50 font-mono">Sprint:</span>
                {CUSTOM_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSetCustomDuration(p)}
                    className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${customDuration === p
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
