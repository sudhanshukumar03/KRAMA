import { useModalA11y } from '../hooks/useModalA11y';
// UI-only refactor — no data/logic changes
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, Flame, TrendingUp, Plus, Clock, Sun, Sunset, Moon,
  Pin, PinOff, Edit2, X, Award,
  Calendar, Target, Zap, Heart, ClipboardList, ArrowRight,
  ChevronLeft, ChevronRight, MoreVertical, Trash2
} from 'lucide-react';
import { toast } from "sonner";
import { BaseButton } from "./ui/BaseButton";
import { PageHeader } from "./ui/PageHeader";
import { EmptyStateInline } from "./ui/EmptyStateInline";
import { LoadingState } from "./ui/LoadingState";
import { ErrorState } from "./ui/ErrorState";
import { cn, formatLocalDate } from "../lib/utils";
import { resolveIcon } from "../lib/iconResolver";
import { IconPicker } from "./ui/IconPicker";
import { useHabitCompletion, isHabitCompletedToday } from "../hooks/useHabitCompletion";
import {
  isHabitLoggableToday,
  isWeeklyHabit,
  getWeeklyTarget,
  weeklyCompletionCount,
} from "../lib/habitFilters";

function RadialProgress({ pct = 0, size = 76, strokeWidth = 6 }: { pct: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const gradId = `habit-radial-grad-${size}`;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 filter drop-shadow-[0_2px_8px_var(--cat-projects-bg)]">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--cat-projects)" />
            <stop offset="50%" stopColor="var(--warning-fg)" />
            <stop offset="100%" stopColor="var(--danger-fg)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border/40"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          fill="transparent"
        />
      </svg>
      <span className="absolute text-sm font-bold font-mono text-primary tabular-nums tracking-tight">{pct}%</span>
    </div>
  );
}

function PlantIllustration() {
  return (
    <div className="w-20 h-20 rounded-full bg-surface-hover border border-border flex items-center justify-center mb-4 shadow-2xs">
      <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="text-primary" xmlns="http://www.w3.org/2000/svg">
        {/* Pot */}
        <path d="M22 40H42L39.5 54H24.5L22 40Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="20" y1="40" x2="44" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Center stem */}
        <path d="M32 40V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Top leaf */}
        <path d="M32 19C32 13 37 11 41 13C41 18 37 21 32 19Z" fill="currentColor" />
        {/* Left upper leaf */}
        <path d="M32 24C32 18 27 16 23 18C23 23 27 26 32 24Z" fill="currentColor" />
        {/* Right lower leaf */}
        <path d="M32 29C32 25 38 23 43 26C42 31 37 32 32 29Z" fill="currentColor" />
        {/* Left lower leaf */}
        <path d="M32 33C32 30 27 28 22 31C23 36 28 37 32 33Z" fill="currentColor" />
      </svg>
    </div>
  );
}



function HabitTrackerRow({ habit, index }: { habit: any; index: number }) {
 const { isCompletedToday, toggleHabit, isPending } = useHabitCompletion(habit);

 return (
 <div
 onClick={() => {
 if (isPending) return;
 toggleHabit();
 }}
 className={cn(
 "flex items-center gap-3 group p-2 rounded-lg transition-all border",
 isCompletedToday
 ? "bg-surface-hover border-transparent cursor-pointer"
 : "bg-surface border-border hover:border-primary shadow-2xs cursor-pointer",
 isPending && "opacity-50 cursor-not-allowed"
 )}
 >
 <div className="w-5 text-right text-badge font-mono text-muted tabular-nums">
 {(index + 1).toString().padStart(2, "0")}
 </div>
 <button
 type="button"
 className="focus:outline-none"
 disabled={isPending}
 onClick={(e) => {
 e.stopPropagation();
 if (isPending) return;
 toggleHabit();
 }}
 >
 {isCompletedToday ? (
 <div className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center shadow-2xs transition-all animate-in zoom-in-50 duration-150">
 <Check className="w-3.5 h-3.5 stroke-[2.5]" />
 </div>
 ) : (
 <div className="w-5 h-5 rounded-md border border-border bg-surface group-hover:border-primary transition-all flex items-center justify-center shadow-2xs" />
 )}
 </button>
 <div className="min-w-0 flex-1">
 <span
 className={cn(
 "text-caption font-medium transition-colors min-w-0 truncate block",
 isCompletedToday
 ? "text-muted line-through decoration-border"
 : "text-primary group-hover:text-primary",
 )}
 >
 {habit.name}
 </span>
 <span className="text-[10px] text-secondary font-mono">
 {habit.category} • {habit.expectedDurationMinutes || 15}m
 </span>
 </div>
 </div>
 );
}

function HabitCardMenu({
  habit,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  habit: any;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          "p-1.5 rounded-lg border transition-all cursor-pointer",
          open
            ? "bg-surface-hover border-border text-primary shadow-2xs"
            : "border-transparent text-muted hover:text-primary hover:bg-surface-hover hover:border-border"
        )}
        title="More options"
        aria-label="Habit options"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-xl shadow-lg z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-border/40"
        >
          <div className="py-0.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onTogglePin();
              }}
              className="w-full px-3 py-2 text-left text-secondary hover:text-primary hover:bg-surface-hover flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              {habit.pinnedToPlanner ? (
                <>
                  <PinOff className="w-3.5 h-3.5 text-accent" />
                  <span>Unpin from Planner</span>
                </>
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5 text-muted" />
                  <span>Pin to Planner</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full px-3 py-2 text-left text-secondary hover:text-primary hover:bg-surface-hover flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted" />
              <span>Edit Habit</span>
            </button>
          </div>
          <div className="py-0.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full px-3 py-2 text-left text-danger-fg hover:bg-danger-bg flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-danger-fg" />
              <span>Delete Habit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HabitFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  goals,
  mode = "create",
  initialData,
  defaultTimeOfDay = "morning",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    icon?: string;
    linkedGoalId?: string | null;
    cadence: string;
    category: string;
    difficulty: string;
    expectedDurationMinutes: number;
    scheduledDays: number[];
    timeOfDay: string;
    weeklyTarget?: number;
    pinnedToPlanner?: boolean;
    version?: number;
  }) => void;
  isSubmitting: boolean;
  goals: any[];
  mode?: "create" | "edit";
  initialData?: any;
  defaultTimeOfDay?: string;
}) {
  const dismiss = () => { if (!isSubmitting) onClose(); };
  const dialogRef = useModalA11y(open, dismiss);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [linkedGoalId, setLinkedGoalId] = useState<string>("");
  const [cadence, setCadence] = useState("daily");
  const [category, setCategory] = useState("PRODUCTIVITY");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [expectedDurationMinutes, setDuration] = useState(15);
  const [timeOfDay, setTimeOfDay] = useState(defaultTimeOfDay);
  const [scheduledDays, setScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [weeklyTarget, setWeeklyTarget] = useState(3);

  const resetForm = useCallback(() => {
    if (mode === "edit" && initialData) {
      setName(initialData.name || "");
      setIcon(initialData.icon || null);
      setLinkedGoalId(initialData.linkedGoalId || "");
      setCadence(initialData.cadence || "daily");
      setCategory(initialData.category || "PRODUCTIVITY");
      setDifficulty(initialData.difficulty || "MEDIUM");
      setDuration(initialData.expectedDurationMinutes || 15);
      setTimeOfDay(initialData.metadata?.timeOfDay || initialData.timeOfDay || "morning");
      setScheduledDays(initialData.scheduledDays || [0, 1, 2, 3, 4, 5, 6]);
      setWeeklyTarget(initialData.weeklyTarget ?? initialData.metadata?.weeklyTarget ?? 3);
      return;
    }
    setName("");
    setIcon(null);
    setLinkedGoalId("");
    setCadence("daily");
    setCategory("PRODUCTIVITY");
    setDifficulty("MEDIUM");
    setDuration(15);
    setTimeOfDay(defaultTimeOfDay);
    setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
    setWeeklyTarget(3);
  }, [mode, initialData, defaultTimeOfDay]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !name.trim() || (cadence === "daily" && scheduledDays.length === 0)) return;
    // Weekly habits are loggable on any day (target is N/week), so persist all
    // 7 days. This keeps the data coherent if the habit is later switched back
    // to daily, and prevents off-day weekly logs from being dropped server-side.
    const effectiveScheduledDays = cadence === "weekly" ? [0, 1, 2, 3, 4, 5, 6] : scheduledDays;
    onSubmit({
      name: name.trim(),
      icon: icon || undefined,
      linkedGoalId: linkedGoalId ? linkedGoalId : (mode === "edit" ? null : undefined),
      cadence,
      category,
      difficulty,
      expectedDurationMinutes,
      scheduledDays: effectiveScheduledDays,
      timeOfDay,
      ...(cadence === "weekly" ? { weeklyTarget } : {}),
      ...(mode === "edit" ? { version: initialData?.version || 1 } : {}),
    });
  };

 const daysOfWeek = [
 { label: 'S', value: 0 }, { label: 'M', value: 1 }, { label: 'T', value: 2 },
 { label: 'W', value: 3 }, { label: 'T', value: 4 }, { label: 'F', value: 5 }, { label: 'S', value: 6 }
 ];

 const toggleDay = (day: number) => {
 if (scheduledDays.length === 1 && scheduledDays.includes(day)) return;
 setScheduledDays(prev =>
 prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
 );
 };

 return (
 <div
 onClick={dismiss}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
 >
 <div
 ref={dialogRef}
 role="dialog" aria-modal="true" aria-labelledby="habit-form-heading"
 onClick={(e) => e.stopPropagation()}
 className="v4-card w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent-fg border border-accent/20 flex items-center justify-center">
 <Flame className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 id="habit-form-heading" className="text-card text-primary mb-2 ">
 {mode === "edit" ? "Edit Routine / Habit" : "Create New Routine / Habit"}
 </h3>
 </div>
 <button
 onClick={dismiss}
 aria-label="Close habit form"
 type="button"
 className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div className="flex gap-3">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Icon
 </label>
 <IconPicker
 value={icon}
 onChange={setIcon}
 triggerClassName="w-10 h-10 px-0 py-0"
 />
 </div>
 <div className="flex-1">
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Routine Name <span className="text-danger-fg">*</span>
 </label>
 <input
 type="text"
 aria-label="Routine name"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g., 45m Focused Deep Work"
 required
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Cadence
 </label>
 <select
 aria-label="Cadence"
 value={cadence}
 onChange={(e) => setCadence(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 >
 <option value="daily">Daily Routine</option>
 <option value="weekly">Weekly Check-in</option>
 </select>
 </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Category
 </label>
 <select
 aria-label="Category"
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 >
 <option value="PRODUCTIVITY">Productivity</option>
 <option value="HEALTH">Health</option>
 <option value="LEARNING">Learning</option>
 <option value="MINDFULNESS">Mindfulness</option>
 <option value="FINANCE">Finance</option>
 <option value="OTHER">Other</option>
 </select>
 </div>
 </div>

 {cadence === "weekly" ? (
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Weekly Target
 </label>
 <div className="flex items-center gap-3">
 <input
 type="number"
 min="1"
 max="7"
 aria-label="Weekly target"
 value={weeklyTarget}
 onChange={(e) => setWeeklyTarget(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
 className="w-24 px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 />
 <span className="text-xs text-secondary">completion{weeklyTarget === 1 ? "" : "s"} per week — log any day.</span>
 </div>
 </div>
 ) : (
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Scheduled Days
 </label>
 <div className="flex flex-wrap gap-2">
 {daysOfWeek.map(day => {
 const isSelected = scheduledDays.includes(day.value);
 return (
 <button
 key={day.value}
 aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.value]}
 aria-pressed={isSelected}
 type="button"
 onClick={() => toggleDay(day.value)}
 className={cn(
 "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors border",
 isSelected
 ? "bg-accent text-on-accent border-accent"
 : "bg-surface text-secondary border-border hover:border-accent/50"
 )}
 >
 {day.label}
 </button>
 );
 })}
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Difficulty
 </label>
 <select
 aria-label="Difficulty"
 value={difficulty}
 onChange={(e) => setDifficulty(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 >
 <option value="VERY_EASY">Very Easy</option>
 <option value="EASY">Easy</option>
 <option value="MEDIUM">Medium</option>
 <option value="HARD">Hard</option>
 <option value="EXTREME">Extreme</option>
 </select>
 </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Linked Goal (Optional)
 </label>
 <select
 aria-label="Linked goal"
 value={linkedGoalId}
 onChange={(e) => setLinkedGoalId(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 >
 <option value="">None</option>
 {goals.map((g) => (
 <option key={g.id} value={g.id}>
 {g.title}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Time of Day
 </label>
 <select
 aria-label="Time of day"
 value={timeOfDay}
 onChange={(e) => setTimeOfDay(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 >
 <option value="morning">Morning</option>
 <option value="afternoon">Afternoon</option>
 <option value="evening">Evening</option>
 <option value="anytime">Anytime</option>
 </select>
 </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Duration (mins)
 </label>
 <input
 type="number"
 min="1"
 max="480"
 aria-label="Duration minutes"
 value={expectedDurationMinutes}
 onChange={(e) => setDuration(Number(e.target.value))}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 />
 </div>
 </div>

 <div className="pt-4 border-t border-border flex justify-end gap-3">
 <BaseButton
 type="button"
 variant="secondary"
 onClick={dismiss}
 disabled={isSubmitting}
 >
 Cancel
 </BaseButton>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="krama-btn krama-btn-primary px-4 py-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            {mode === "edit" ? (isSubmitting ? "Saving..." : "Save Changes") : (isSubmitting ? "Creating..." : "Create Habit")}
          </button>
 </div>
 </form>
 </div>
 </div>
 );
}

// ---- Habit grid card helpers ---------------------------------------------

const DIFFICULTY_LEVEL: Record<string, number> = {
  VERY_EASY: 1,
  EASY: 2,
  MEDIUM: 3,
  HARD: 4,
  EXTREME: 5,
};

function difficultyLevel(difficulty?: string): number {
  return DIFFICULTY_LEVEL[difficulty ?? ""] ?? 3;
}

// Sunday-start week key for a YYYY-MM-DD, matching the server/habitFilters
// UTC-noon keying so client visuals agree with the server's streak week bounds.
function weekStartKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

// Local-date keys (YYYY-MM-DD) of a habit's completions. A completion is keyed
// at UTC-noon of its local day, so slicing the ISO date recovers that day.
function completedDateKeys(habit: any, onlyOnSchedule = false): Set<string> {
  return new Set<string>(
    (habit?.completions || [])
      .filter((c: any) => c && (c.date || c.completedAt) && (!onlyOnSchedule || !c.offSchedule))
      .map((c: any) => new Date(c.date ?? c.completedAt).toISOString().slice(0, 10))
  );
}

// Consistency %: on-schedule completions ÷ scheduled over the last 30 days
// (daily) or weeks on target over the last 8 completed weeks (weekly). Returns
// null when there isn't enough history to be meaningful.
function consistencyRate(habit: any): number | null {
  const completed = completedDateKeys(habit, true);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = formatLocalDate(today);
  const createdKey = habit?.createdAt ? formatLocalDate(new Date(habit.createdAt)) : null;

  if (isWeeklyHabit(habit)) {
    const target = getWeeklyTarget(habit);
    const currentWeek = todayKey ? weekStartKey(todayKey) : null;
    const createdWeek = createdKey ? weekStartKey(createdKey) : null;
    const perWeek: Record<string, number> = {};
    for (const k of completed) {
      const wk = weekStartKey(k);
      if (currentWeek && wk >= currentWeek) continue;
      perWeek[wk] = (perWeek[wk] || 0) + 1;
    }
    const weeks: string[] = [];
    for (let w = 1; w <= 8; w++) {
      const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate() - w * 7);
      const wk = formatLocalDate(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay()));
      if (!wk) continue;
      if (createdWeek && wk < createdWeek) break;
      weeks.push(wk);
    }
    if (weeks.length === 0) return null;
    const met = weeks.filter((wk) => (perWeek[wk] || 0) >= target).length;
    return Math.round((met / weeks.length) * 100);
  }

  const scheduledDays: number[] =
    habit?.scheduledDays && habit.scheduledDays.length > 0 ? habit.scheduledDays : [0, 1, 2, 3, 4, 5, 6];
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = formatLocalDate(d);
    if (!key || (createdKey && key < createdKey)) continue;
    if (!scheduledDays.includes(d.getDay())) continue;
    scheduled++;
    if (completed.has(key)) done++;
  }
  if (scheduled === 0) return null;
  return Math.round((done / scheduled) * 100);
}

// A GitHub-style consistency grid of the last 13 weeks. Rows are weekdays
// (Sun→Sat), the rightmost column is the current week. Completed days are
// filled, scheduled-but-missed days outlined, everything else faint.
function HabitHeatmap({ habit }: { habit: any }) {
  const WEEKS = 13;
  const completed = completedDateKeys(habit);
  const weekly = isWeeklyHabit(habit);
  const scheduledDays: number[] =
    habit?.scheduledDays && habit.scheduledDays.length > 0 ? habit.scheduledDays : [0, 1, 2, 3, 4, 5, 6];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = formatLocalDate(today);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
  const total = WEEKS * 7;

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, r) => {
      const offsetFromEnd = total - 1 - (w * 7 + r);
      const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - offsetFromEnd);
      const key = formatLocalDate(d);
      let cls = "bg-heat-0";
      let label = key ?? "";
      if (key && todayKey && key > todayKey) {
        return { cls: "bg-transparent", label: "" };
      } else if (key && completed.has(key)) {
        cls = "bg-heat-4";
        label = `${key} · done`;
      } else if (!weekly && scheduledDays.includes(d.getDay())) {
        cls = "bg-heat-0 ring-1 ring-inset ring-accent/25";
        label = `${key} · missed`;
      }
      return { cls, label };
    })
  );

  return (
    <div className="flex gap-[3px]" aria-hidden>
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((cell, ri) => (
            <span key={ri} title={cell.label} className={cn("w-2.5 h-2.5 rounded-[3px]", cell.cls)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function HabitGridCard({
  habit,
  goals,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  habit: any;
  goals: any[];
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = resolveIcon(habit.icon);
  const { isCompletedToday, toggleHabit, isPending } = useHabitCompletion(habit);
  const level = difficultyLevel(habit.difficulty);
  const dots = Array.from({ length: 5 }).map((_, i) => i < level);
  const linkedGoal = goals.find((g) => g.id === habit.linkedGoalId);
  const weekly = isWeeklyHabit(habit);
  const weeklyDone = weekly ? weeklyCompletionCount(habit) : 0;
  const weeklyGoal = weekly ? getWeeklyTarget(habit) : 0;
  const loggable = isHabitLoggableToday(habit);
  const consistency = consistencyRate(habit);
  const best = habit.bestStreak ?? 0;
  const canToggle = loggable || isCompletedToday;

  return (
    <div className="relative krama-card p-5 group flex flex-col gap-3.5 backdrop-blur-sm">
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (canToggle) toggleHabit(); }}
          disabled={isPending || !canToggle}
          title={isCompletedToday ? "Completed today — click to undo" : loggable ? "Mark complete for today" : "Not scheduled today"}
          className={cn(
            "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer disabled:cursor-not-allowed",
            isCompletedToday
              ? "bg-gradient-to-br from-success-fg to-accent border-success-border text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] scale-105 active:scale-[0.98]"
              : canToggle
              ? "border-border/80 text-muted hover:border-success-fg hover:text-success-fg active:scale-[0.98] bg-surface"
              : "border-border/40 text-muted/30 bg-surface-hover/30"
          )}
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
        </button>
        <div className="w-11 h-11 bg-surface-hover rounded-xl border border-border/80 flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-all shadow-2xs">
          <Icon className="w-5 h-5 text-primary transition-colors stroke-[1.75]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-primary truncate tracking-tight">{habit.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {habit.pinnedToPlanner && (
                <span className="p-1 rounded-md bg-accent/10 text-accent font-semibold" title="Pinned to Planner">
                  <Pin className="w-3.5 h-3.5 fill-current" />
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-warning-bg border border-warning-border text-warning-fg font-mono text-[11px] font-bold tracking-tight">
                <Flame className="w-3.5 h-3.5 fill-warning-fg/20 text-warning-fg stroke-[2]" /> {habit.streak}{weekly ? "w" : "d"}
              </span>
              <HabitCardMenu habit={habit} onTogglePin={onTogglePin} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
          {linkedGoal && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-subtle border border-accent/20 text-accent-fg text-[10px] font-medium truncate max-w-full mb-2">
              <Target className="w-3 h-3 shrink-0" />
              <span className="truncate">Goal: {linkedGoal.title}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-secondary font-medium">{habit.category || "Uncategorized"}</span>
            <span className="text-border font-light">•</span>
            <span className="text-[11px] text-secondary font-mono">{habit.expectedDurationMinutes || 15}m</span>
            <span className="text-border font-light">•</span>
            <div className="flex items-center gap-0.5" title={`Difficulty: ${habit.difficulty || "MEDIUM"}`}>
              {dots.map((active, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1 h-2 rounded-2xs transition-colors",
                    active ? "bg-accent" : "bg-surface-hover border border-border/60"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-secondary">
        {best > 0 && (
          <span className="inline-flex items-center gap-1" title="Longest streak">
            <Award className="w-3.5 h-3.5 text-warning-fg" /> Best {best}{weekly ? "w" : "d"}
          </span>
        )}
        {consistency !== null && (
          <span
            className="inline-flex items-center gap-1"
            title={weekly ? "Weeks on target (last 8)" : "Completion rate (last 30 days)"}
          >
            <TrendingUp className="w-3.5 h-3.5 text-success-fg" /> {consistency}%
          </span>
        )}
        {weekly && (
          <span className="inline-flex items-center gap-1" title="This week's progress">
            <Target className="w-3.5 h-3.5 text-accent" /> {weeklyDone}/{weeklyGoal} this week
          </span>
        )}
      </div>

      <HabitHeatmap habit={habit} />
    </div>
  );
}

export function HabitTracker() {
 const queryClient = useQueryClient();
 const {
 data: habits = [],
 isLoading,
 isError,
 } = useQuery({ queryKey: ["habits"], queryFn: api.habits.list });
 const { data: goals = [], isError: goalsError, isLoading: goalsLoading, refetch: retryGoals } = useQuery({
 queryKey: ["goals", "lite"],
 queryFn: api.goals.listLite,
 });
  const [activeTimeOfDay, setActiveTimeOfDay] = useState<string | null>(null);

 const restoreMutation = useMutation({
 mutationFn: (id: string) => api.habits.restore(id),
 onSuccess: (restoredHabit) => {
 queryClient.invalidateQueries({ queryKey: ["habits"] });
 queryClient.invalidateQueries({ queryKey: ["planner"] });
 queryClient.invalidateQueries({ queryKey: ["goal"] });
 queryClient.invalidateQueries({ queryKey: ["snapshots"] });
 queryClient.invalidateQueries({ queryKey: ["goals"] });
 toast.success(`Restored "${restoredHabit?.name || "Routine"}"`);
 },
 onError: () => toast.error("Failed to restore routine"),
 });

 const deleteMutation = useMutation({
 mutationFn: (id: string) => api.habits.delete(id),
 onSuccess: (_, deletedId) => {
 queryClient.invalidateQueries({ queryKey: ["habits"] });
 queryClient.invalidateQueries({ queryKey: ["planner"] });
 queryClient.invalidateQueries({ queryKey: ["goal"] });
 queryClient.invalidateQueries({ queryKey: ["snapshots"] });
 queryClient.invalidateQueries({ queryKey: ["goals"] });
 const deletedName =
 habits.find((h) => h.id === deletedId)?.name || "Routine";
 toast.success(`Deleted "${deletedName}"`, {
 action: {
 label: "Undo",
 onClick: () => restoreMutation.mutate(deletedId),
 },
 });
 },
 onError: () => toast.error("Failed to delete routine"),
 });

 const [createModalOpen, setCreateModalOpen] = useState(false);
 const [editModalOpen, setEditModalOpen] = useState(false);
 const [editingHabit, setEditingHabit] = useState<any>(null);
 const [defaultTimeOfDay, setDefaultTimeOfDay] = useState("morning");

 const [todayTrackerOpen, setTodayTrackerOpen] = useState(() => {
 if (typeof window !== 'undefined') {
 const saved = localStorage.getItem('krama_habit_today_tracker_open');
 return saved !== null ? saved === 'true' : true;
 }
 return true;
 });

 const toggleTodayTracker = () => {
 setTodayTrackerOpen(prev => {
 const next = !prev;
 localStorage.setItem('krama_habit_today_tracker_open', String(next));
 return next;
 });
 };

 const createHabitMutation = useMutation({
    mutationFn: (data: {
      name: string;
      icon?: string;
      linkedGoalId?: string | null;
      cadence: string;
      category: string;
      difficulty: string;
      expectedDurationMinutes: number;
      scheduledDays: number[];
      timeOfDay: string;
      weeklyTarget?: number;
      pinnedToPlanner?: boolean;
    }) =>
      api.habits.create({
        name: data.name,
        icon: data.icon,
        linkedGoalId: data.linkedGoalId,
        cadence: data.cadence,
        category: data.category as any,
        difficulty: data.difficulty as any,
        expectedDurationMinutes: data.expectedDurationMinutes,
        scheduledDays: data.scheduledDays,
        timeOfDay: data.timeOfDay,
        ...(data.cadence === "weekly" && data.weeklyTarget ? { weeklyTarget: data.weeklyTarget } : {}),
        pinnedToPlanner: data.pinnedToPlanner,
        streak: 0,
      }),
    onSuccess: (newHabit) => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
 queryClient.invalidateQueries({ queryKey: ["planner"] });
 queryClient.invalidateQueries({ queryKey: ["goal"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setCreateModalOpen(false);
      toast.success(`Created "${newHabit?.name || "Habit"}"`);
    },
    onError: () => {
      toast.error("Failed to create habit");
    },
  });

  const togglePinHabitMutation = useMutation({
    mutationFn: (data: { id: string; pinned: boolean }) => api.habits.update(data.id, { pinnedToPlanner: data.pinned, version: habits.find(h => h.id === data.id)?.version }),
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] });
      const previousHabits = queryClient.getQueryData<any[]>(["habits"]);
      if (previousHabits) {
        queryClient.setQueryData(
          ["habits"],
          previousHabits.map((h) => (h.id === id ? { ...h, pinnedToPlanner: pinned } : h))
        );
      }
      return { previousHabits };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousHabits) {
        queryClient.setQueryData(["habits"], context.previousHabits);
      }
      toast.error("Failed to pin habit");
    },
    onSuccess: (_, variables) => {
      toast.success(variables.pinned ? "Habit pinned to Planner" : "Habit unpinned from Planner");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
 queryClient.invalidateQueries({ queryKey: ["planner"] });
 queryClient.invalidateQueries({ queryKey: ["goal"] });
      queryClient.invalidateQueries({ queryKey: ["planner"] });
    },
  });

  const editHabitMutation = useMutation({
    mutationFn: (data: {
      id: string;
      payload: any;
    }) => api.habits.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
 queryClient.invalidateQueries({ queryKey: ["planner"] });
 queryClient.invalidateQueries({ queryKey: ["goal"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setEditModalOpen(false);
      setEditingHabit(null);
      toast.success("Habit updated successfully");
    },
    onError: () => {
      toast.error("Failed to update habit");
    },
  });

 const handleEditHabit = (habit: any) => {
 setEditingHabit(habit);
 setEditModalOpen(true);
 };

 if (isLoading || goalsLoading)
 return (
 <LoadingState
 variant="habit-tracker"
 title="Loading Habits..."
 description="Syncing streak logs and daily routines..."
 />
 );
 if (isError || goalsError) {
 return (
 <div className="p-8">
 <ErrorState
 title="Failed to load Habits"
 message="Could not retrieve habit and streak logs from the server. Please check your connection."
 onRetry={() =>
 Promise.all([queryClient.invalidateQueries({ queryKey: ["habits"] }), retryGoals()])
 }
 />
 </div>
 );
 }

  const getHabitTime = (h: any) => h.metadata?.timeOfDay || h.timeOfDay || "anytime";

  const morningHabits = habits.filter((h) => getHabitTime(h) === "morning");
  const afternoonHabits = habits.filter((h) => getHabitTime(h) === "afternoon");
  const eveningHabits = habits.filter((h) => getHabitTime(h) === "evening");
  const anytimeHabits = habits.filter((h) => getHabitTime(h) === "anytime");

  const TIME_FILTERS = [
    { id: "morning", label: "Morning", icon: Sun, iconColor: "text-warning-fg", count: morningHabits.length },
    { id: "afternoon", label: "Afternoon", icon: Sunset, iconColor: "text-cat-routines", count: afternoonHabits.length },
    { id: "evening", label: "Evening", icon: Moon, iconColor: "text-cat-projects", count: eveningHabits.length },
    { id: "anytime", label: "Anytime", icon: Clock, iconColor: "text-success-fg", count: anytimeHabits.length },
  ];

  const filteredHabits = habits.filter((h) => {
    if (activeTimeOfDay && getHabitTime(h) !== activeTimeOfDay)
      return false;
    return true;
  });

  const todaysHabits = habits.filter(isHabitLoggableToday);

  const completedCount = todaysHabits.filter((h) => isHabitCompletedToday(h)).length;
  const totalHabits = todaysHabits.length || 1;
  const progressPct = Math.round((completedCount / totalHabits) * 100);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleOpenCreateWithTime = (time: string) => {
    setDefaultTimeOfDay(time);
    setCreateModalOpen(true);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-canvas animate-in fade-in duration-150 overflow-y-auto lg:overflow-hidden relative">
      {/* LEFT COLUMN: Main Content */}
      <div className="flex-1 lg:h-full lg:overflow-y-auto px-6 py-6 space-y-6 relative border-b lg:border-b-0 min-w-0">
        <PageHeader
          icon={Flame}
          title="Habits & Daily Architecture"
          description="Calibrate atomic routines, sustain consistency streaks, and link daily rituals to your strategic life pillars."
          primaryAction={{
            label: 'Create Habit',
            icon: Plus,
            onClick: () => handleOpenCreateWithTime(activeTimeOfDay || 'morning'),
          }}
          className="shrink-0"
        />

        {/* Time of Day Filter Pills row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTimeOfDay(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
              activeTimeOfDay === null
                ? "bg-primary text-text-inverse font-semibold shadow-xs ring-1 ring-primary/20"
                : "bg-surface/70 text-secondary border border-border/80 hover:border-primary/40 hover:text-primary backdrop-blur-sm"
            )}
          >
            <span>All ({habits.length})</span>
          </button>

          {TIME_FILTERS.map((tf) => {
            const isSelected = activeTimeOfDay === tf.id;
            const Icon = tf.icon;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => setActiveTimeOfDay(isSelected ? null : tf.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
                  isSelected
                    ? "bg-primary text-text-inverse border-primary font-semibold shadow-xs ring-1 ring-primary/20"
                    : "bg-surface/70 text-secondary border-border/80 hover:border-primary/40 hover:text-primary backdrop-blur-sm"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-current" : tf.iconColor)} />
                <span>{tf.label}</span>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                  isSelected
                    ? "bg-surface/30 text-text-inverse"
                    : "bg-surface-hover text-muted"
                )}>
                  {tf.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Empty State Card (when habits.length === 0) */}
        {habits.length === 0 ? (
          <div className="relative krama-card p-8 sm:p-12 flex flex-col items-center text-center max-w-3xl mx-auto my-2 backdrop-blur-sm overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            <PlantIllustration />
            <h2 className="text-base sm:text-lg font-bold text-primary tracking-tight">No habits created yet</h2>
            <p className="text-xs text-secondary mt-1 max-w-sm">
              Create your first daily routine to start building streaks, auto-logging into Planner, and establishing consistency.
            </p>

            <button
              type="button"
              onClick={() => handleOpenCreateWithTime("morning")}
              className="mt-5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create First Habit</span>
            </button>

            {/* 4 Value propositions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-border/60 w-full">
              <div className="flex flex-col items-center p-3 rounded-xl bg-surface/60 border border-border/60 text-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent-fg">
                  <Target className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-primary">Atomic Habits</span>
                <span className="text-[10px] text-muted">Micro-actions compound</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-surface/60 border border-border/60 text-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-warning-bg border border-warning-border flex items-center justify-center text-warning-fg">
                  <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-primary">Consistency Matrix</span>
                <span className="text-[10px] text-muted">Visual streak velocity</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-surface/60 border border-border/60 text-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-danger-bg border border-danger-border flex items-center justify-center text-danger-fg">
                  <Zap className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-primary">Planner Sync</span>
                <span className="text-[10px] text-muted">Auto-pin to daily schedule</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-surface/60 border border-border/60 text-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-success-bg border border-success-border flex items-center justify-center text-success-fg">
                  <Heart className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-primary">Life Pillars</span>
                <span className="text-[10px] text-muted">Tied to strategic goals</span>
              </div>
            </div>
          </div>
        ) : filteredHabits.length === 0 ? (
          <EmptyStateInline
            icon={Flame}
            title="No matching habits"
            description={activeTimeOfDay ? `No ${activeTimeOfDay} habits configured.` : "No habits match the selected filter."}
          />
        ) : (
          /* Habit Cards Grid */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredHabits.map((habit) => (
              <HabitGridCard
                key={habit.id}
                habit={habit}
                goals={goals}
                onTogglePin={() =>
                  togglePinHabitMutation.mutate({
                    id: habit.id,
                    pinned: !habit.pinnedToPlanner,
                  })
                }
                onEdit={() => handleEditHabit(habit)}
                onDelete={() => deleteMutation.mutate(habit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Today's Tracker Rail */}
      <div className={cn(
        "w-full shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-surface/40 p-6 space-y-4 lg:h-full lg:overflow-y-auto transition-all duration-300",
        todayTrackerOpen 
          ? "lg:w-[320px] xl:w-[360px] block" 
          : "hidden lg:hidden"
      )}>
        {/* Rail Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-warning-fg" />
            <span className="text-xs font-bold text-warning-fg uppercase tracking-wider font-mono">
              TODAY'S TRACKER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <span>{formattedDate}</span>
            </div>
            <button
              type="button"
              onClick={toggleTodayTracker}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer hidden lg:flex items-center justify-center"
              title="Collapse Today's Tracker"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Circular Progress Gauge Card */}
        <div className="krama-card p-5">
          <div className="flex items-center gap-4">
            <RadialProgress pct={progressPct} size={76} strokeWidth={6} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-secondary font-medium">Daily Completion Rate</div>
              <div className="text-2xl font-bold text-primary font-mono mt-0.5">{progressPct}%</div>
              <div className="text-[11px] text-muted mt-0.5">
                {completedCount} of {todaysHabits.length} habits completed
              </div>
              <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden mt-2.5">
                <div
                  className="h-full bg-gradient-to-r from-cat-routines to-accent rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Habits Section */}
        <div className="krama-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-primary">Today's Habits</h3>
            <button
              type="button"
              onClick={() => {
                setActiveTimeOfDay(null);
              }}
              className="text-[11px] text-muted hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {todaysHabits.length === 0 ? (
            <div className="py-6 px-2 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-hover border border-border flex items-center justify-center mx-auto mb-2 text-muted shadow-2xs">
                <ClipboardList className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h4 className="text-xs font-bold text-primary">No habits for today</h4>
              <p className="text-[11px] text-muted mt-1 max-w-[210px] mx-auto leading-relaxed">
                Create habits and add them to your daily routines to see them here.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateWithTime("morning")}
                className="mt-3 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-primary flex items-center gap-1.5 mx-auto transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-accent-fg" />
                <span>Create Your First Habit</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todaysHabits.map((habit, index) => (
                <HabitTrackerRow key={habit.id} habit={habit} index={index} />
              ))}
            </div>
          )}
        </div>


      </div>

      {/* Small hover-revealed arrow toggle near the grid (<>) */}
      <div 
        className={cn(
          "hidden lg:flex items-center absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300 py-6 px-1 group/divider",
          todayTrackerOpen 
            ? "right-[320px] xl:right-[360px] translate-x-1/2" 
            : "right-0"
        )}
      >
        <button
          type="button"
          onClick={toggleTodayTracker}
          className={cn(
            "w-5 h-9 rounded-full border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-accent-fg shadow-sm flex items-center justify-center cursor-pointer transition-all duration-200",
            todayTrackerOpen
              ? "opacity-0 group-hover/divider:opacity-100 hover:scale-110"
              : "opacity-30 hover:opacity-100 group-hover/divider:opacity-100 rounded-l-md rounded-r-none border-r-0 hover:scale-105"
          )}
          title={todayTrackerOpen ? "Collapse Today's Tracker" : "Expand Today's Tracker"}
        >
          {todayTrackerOpen ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>



      {createModalOpen && (
        <HabitFormModal
          mode="create"
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          defaultTimeOfDay={defaultTimeOfDay}
          onSubmit={(data) => createHabitMutation.mutate(data)}
          isSubmitting={createHabitMutation.isPending}
          goals={goals}
        />
      )}

      {editingHabit && (
        <HabitFormModal
          mode="edit"
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingHabit(null);
          }}
          onSubmit={(data) =>
            editHabitMutation.mutate({ id: editingHabit.id, payload: data })
          }
          isSubmitting={editHabitMutation.isPending}
          goals={goals}
          initialData={editingHabit}
        />
      )}
    </div>
  );
}
