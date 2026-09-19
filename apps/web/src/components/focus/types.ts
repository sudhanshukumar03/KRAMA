export type TimerMode = 'pomodoro' | 'short_break' | 'long_break' | 'custom' | 'clock';
export type OperatingMode = 'manual' | 'planner';
export type LayoutName = 'standby' | 'centered' | 'overlay' | 'sidebar' | 'card' | 'zen';

export interface SessionSlot {
  index: number;
  type: TimerMode;
  durationMin: number;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  label: string;
  timeBlockId: string | null;
  scheduledStart?: string;
}

export interface FocusScheduleData {
  mode: 'planner' | 'empty';
  plan: SessionSlot[];
  totalFocusMinutes: number;
  dailyCapMinutes: number;
  alreadyLoggedMinutes: number;
  remainingMinutes: number;
  taskBreakdown: { taskId: string; title: string; pomodoroCount: number }[];
  generatedAt: string;
}

export interface TimerSettings {
  focusDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakAfter: number;
  customDuration: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  digitsColor?: string;
}

export interface WallpaperConfig {
  type: 'gradient' | 'unsplash' | 'upload' | 'curated';
  value: string; // gradient ID or full image URL
  thumb?: string;
  credit?: string;
  creditUrl?: string;
}

export interface ClockDisplay {
  timeStr: string;
  ampm: string;
  secondsStr: string;
  dateStr: string;
  dayStr: string;
}

export interface TimerLayoutProps {
  timeLeft: number;
  duration: number;
  isActive: boolean;
  mode: TimerMode;
  operatingMode: OperatingMode;
  layout: LayoutName;
  onSelectLayout: (layout: LayoutName) => void;
  taskTitle: string | null;
  projectName: string | null;
  currentSlotIndex: number;
  totalSlots: number;
  plan: SessionSlot[];
  clock: ClockDisplay;
  customDuration: number;
  digitsColor?: string;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onSkip: () => void;
  onChangeMode: (mode: TimerMode) => void;
  onSelectSlot: (index: number) => void;
  onSetCustomDuration: (mins: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenWallpaper: () => void;
  onOpenLayoutPicker?: () => void;
  onToggleMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  controlsVisible: boolean;
  onToggleControls: () => void;
  onClose: () => void;
}

