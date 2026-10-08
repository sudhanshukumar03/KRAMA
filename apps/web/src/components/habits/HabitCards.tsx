// UI-only refactor — no data/logic changes
import {
    Award,
    Check,
    Edit2,
    Flame,
    MoreVertical,
    Pin, PinOff,
    Target,
    Trash2,
    TrendingUp
} from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { useHabitCompletion } from "../../hooks/useHabitCompletion";
import {
    getWeeklyTarget,
    isHabitLoggableToday,
    isWeeklyHabit,
    weeklyCompletionCount,
} from "../../lib/habitFilters";
import { resolveIcon } from "../../lib/iconResolver";
import { cn, formatLocalDate } from "../../lib/utils";


export function RadialProgress({ pct = 0, size = 76, strokeWidth = 6 }: { pct: number; size?: number; strokeWidth?: number }) {
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

export function PlantIllustration() {
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



export function HabitTrackerRow({ habit, index }: { habit: any; index: number }) {
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

export function HabitGridCard({
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
