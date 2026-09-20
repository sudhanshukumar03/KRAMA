import { Sliders, Maximize, Minimize } from 'lucide-react';
import type { TimerLayoutProps } from './types';
import { TimerMoreMenu } from './TimerMoreMenu';

const CUSTOM_PRESETS = [15, 25, 45, 60, 90];

interface BrokenDigitProps {
  value: string;
  sizeClass: string;
  gapClass: string;
  color?: string;
}

/**
 * Floating digits with an authentic horizontal breaking slit / gap in 60:40 ratio.
 * Absolutely NO background card / box container.
 */
const BrokenDigit: React.FC<BrokenDigitProps> = ({ value, sizeClass, gapClass, color }) => {
  return (
    <div className="relative inline-flex items-center justify-center select-none">
      {/* Floating digits with customizable color */}
      <span
        className={`font-bold font-sans tracking-tight leading-none select-none ${sizeClass}`}
        style={{ color: color || '#ffffff' }}
      >
        {value}
      </span>

      {/* Horizontal breaking gap cut in 53.5:47.5 ratio */}
      <div
        className={`absolute inset-x-[-2px] sm:inset-x-[-4px] top-[53.5%] -translate-y-1/2 ${gapClass} bg-black z-10 pointer-events-none`}
      />
    </div>
  );
};

export const TimerLayoutStandby: React.FC<TimerLayoutProps> = ({
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
  const isClock = mode === 'clock';

  // Digits calculation for HR, MIN, and SEC
  let hoursStr: string;
  let minsStr: string;
  let secsStr: string;
  let leftBadge: string;
  const showHours = isClock || timeLeft >= 3600;

  if (isClock) {
    const parts = clock.timeStr.split(':');
    hoursStr = parts[0] || '12';
    minsStr = parts[1] || '00';
    secsStr = clock.secondsStr || '00';
    leftBadge = clock.ampm; // AM or PM
  } else {
    const hrs = Math.floor(timeLeft / 3600);
    const mins = Math.floor((timeLeft % 3600) / 60);
    const secs = timeLeft % 60;
    hoursStr = hrs.toString().padStart(2, '0');
    minsStr = mins.toString().padStart(2, '0');
    secsStr = secs.toString().padStart(2, '0');
    leftBadge = mode === 'pomodoro' ? 'FOCUS' : mode === 'custom' ? 'CUSTOM' : 'BREAK';
  }

  const handleToggleTimer = () => {
    if (isClock) return;
    if (isActive) {
      onPause();
    } else {
      onStart();
    }
  };

  // Typography scaling: larger when 2 units, proportional when 3 units
  const threeUnitsFont = 'text-[5rem] sm:text-[7.5rem] md:text-[10.5rem] lg:text-[13.5rem] xl:text-[15.5rem]';
  const threeUnitsGap = 'h-[2px] sm:h-[2.5px] md:h-[3.5px] lg:h-[4.5px] xl:h-[5.5px]';

  const twoUnitsFont = 'text-[8rem] sm:text-[12rem] md:text-[16rem] lg:text-[21rem] xl:text-[24rem]';
  const twoUnitsGap = 'h-[2.5px] sm:h-[3.5px] md:h-[5px] lg:h-[6.5px] xl:h-[8px]';

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col justify-between items-center p-6 md:p-10 select-none overflow-hidden z-10 bg-black">
      {/* Top Header Overlay: Visible in normal tab, hidden by default in fullscreen */}
      <div
        className={`w-full flex items-center justify-between transition-all duration-300 z-30 ${
          controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        {/* Left: Mode Tabs & Planned Session Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-black/50 backdrop-blur-2xl rounded-full border border-white/15 shadow-2xl">
            <button
              type="button"
              onClick={() => onChangeMode('pomodoro')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                mode === 'pomodoro'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('short_break')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                mode === 'short_break'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Short Break
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('long_break')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                mode === 'long_break'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Long Break
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('custom')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'custom'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Custom</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('clock')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                mode === 'clock'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Normal Clock
            </button>
          </div>

          {operatingMode === 'planner' && (
            <div className="flex items-center gap-2 p-1 bg-black/50 backdrop-blur-2xl rounded-full border border-emerald-500/20 shadow-2xl px-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-mono text-emerald-300 tracking-wide">
                {mode === 'pomodoro' ? 'Focus' : mode === 'short_break' ? 'Short Break' : mode === 'long_break' ? 'Long Break' : 'Break'}
              </span>
              {taskTitle && (
                <>
                  <span className="text-white/20 text-xs">•</span>
                  <span className="text-[11px] font-mono text-white/70 max-w-[200px] truncate">{taskTitle}</span>
                </>
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

      {/* Center: Pure Boxless Floating Typography with Breaking and Gap in Numbers in 60:40 Ratio */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-7xl">
        <button
          type="button"
          onClick={handleToggleTimer}
          className={`group flex flex-col items-center justify-center focus:outline-none bg-transparent border-0 p-0 select-none ${
            isClock ? 'cursor-default' : 'cursor-pointer active:scale-[0.99] transition-transform duration-150'
          }`}
        >
          {/* Top-Left Badge (AM/PM in Clock mode or FOCUS in Timer mode) */}
          {leftBadge && (
            <div className="w-full flex justify-start mb-2 sm:mb-4 px-3 sm:px-6">
              <span className="font-bold font-sans text-sm sm:text-base md:text-xl lg:text-2xl tracking-widest text-[#8e8e93] uppercase select-none">
                {leftBadge}
              </span>
            </div>
          )}

          {/* Time Units with 60:40 Ratio Breaking and Gap in Numbers, and Proper Distance */}
          {showHours ? (
            /* 3 Units: Hours, Minutes, Seconds with Proper Distance */
            <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 select-none">
              {/* Hours */}
              <BrokenDigit value={hoursStr} sizeClass={threeUnitsFont} gapClass={threeUnitsGap} color={digitsColor} />

              {/* Separator Colon */}
              <span
                className="font-light text-[3.5rem] sm:text-[5.5rem] md:text-[8rem] lg:text-[10.5rem] select-none pb-2 sm:pb-4 md:pb-6 opacity-40"
                style={{ color: digitsColor || '#ffffff' }}
              >
                :
              </span>

              {/* Minutes */}
              <BrokenDigit value={minsStr} sizeClass={threeUnitsFont} gapClass={threeUnitsGap} color={digitsColor} />

              {/* Separator Colon */}
              <span
                className="font-light text-[3.5rem] sm:text-[5.5rem] md:text-[8rem] lg:text-[10.5rem] select-none pb-2 sm:pb-4 md:pb-6 opacity-40"
                style={{ color: digitsColor || '#ffffff' }}
              >
                :
              </span>

              {/* Seconds */}
              <BrokenDigit value={secsStr} sizeClass={threeUnitsFont} gapClass={threeUnitsGap} color={digitsColor} />
            </div>
          ) : (
            /* 2 Units: Minutes, Seconds with Proper Distance */
            <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 lg:gap-12 select-none">
              {/* Minutes */}
              <BrokenDigit value={minsStr} sizeClass={twoUnitsFont} gapClass={twoUnitsGap} color={digitsColor} />

              {/* Separator Colon */}
              <span
                className="font-light text-[5rem] sm:text-[8rem] md:text-[11rem] lg:text-[15rem] select-none pb-3 sm:pb-6 md:pb-8 opacity-40"
                style={{ color: digitsColor || '#ffffff' }}
              >
                :
              </span>

              {/* Seconds */}
              <BrokenDigit value={secsStr} sizeClass={twoUnitsFont} gapClass={twoUnitsGap} color={digitsColor} />
            </div>
          )}
        </button>

        {/* Normal Tab Info (Date / Task Title) — Hidden in Fullscreen */}
        {!isFullscreen && (
          <div className="mt-8 sm:mt-10 flex flex-col items-center select-none">
            {isClock ? (
              <div className="flex items-center gap-3 text-sm sm:text-base font-light tracking-widest text-white/50">
                <span>{clock.dayStr}</span>
                <span>•</span>
                <span>{clock.dateStr}</span>
              </div>
            ) : taskTitle ? (
              <div className="flex items-center gap-2 text-sm font-light text-white/80 max-w-md truncate">
                {projectName && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/15 text-white shrink-0">
                    {projectName}
                  </span>
                )}
                <span className="truncate">{taskTitle}</span>
              </div>
            ) : null}

            {/* Custom Mode Presets shown only in custom mode */}
            {mode === 'custom' && controlsVisible && !isActive && (
              <div className="flex items-center gap-2 mt-4 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 animate-in fade-in duration-150">
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

      {/* Subtle Bottom Spacer */}
      <div className="h-4" />
    </div>
  );
};

export default TimerLayoutStandby;
