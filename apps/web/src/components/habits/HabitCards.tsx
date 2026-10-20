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
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
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
        aria-expanded={open}
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

// Rows are weekdays (Sun→Sat); the rightmost column is the current week.
// Keep inactive days visible without presenting them as missed completions.
function HabitHeatmap({ habit }: { habit: any }) {
  const WEEKS = 13;
  const completed = completedDateKeys(habit);
  const weekly = isWeeklyHabit(habit);
  const scheduledDays: number[] =
    habit?.scheduledDays && habit.scheduledDays.length > 0 ? habit.scheduledDays : [0, 1, 2, 3, 4, 5, 6];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = formatLocalDate(today);
  const createdKey = habit.createdAt ? formatLocalDate(new Date(habit.createdAt)) : null;
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
  const total = WEEKS * 7;

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, r) => {
      const offsetFromEnd = total - 1 - (w * 7 + r);
      const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - offsetFromEnd);
      const key = formatLocalDate(d);
      let state = 'inactive';
      let label = `${key}: not scheduled`;
      if (key && createdKey && key < createdKey) {
        label = `${key}: before this habit was created`;
      } else if (key && todayKey && key > todayKey) {
        state = 'future';
        label = '';
      } else if (key && completed.has(key)) {
        state = 'done';
        label = `${key} · done`;
      } else if (weekly || scheduledDays.includes(d.getDay())) {
        state = !weekly && key !== todayKey ? 'missed' : 'pending';
        label = `${key} · ${state === 'missed' ? 'missed' : 'not logged'}`;
      }
      return { state, label };
    })
  );

  return (
    <div className="habit-history">
      <p className="habit-history-heading">Last 13 weeks</p>
      <div className="habit-history-grid" role="img" aria-label={`${habit.name}: completion history for the last 13 weeks; ${columns.flat().filter(cell => cell.state === 'done').length} recorded days.`}>
        {columns.map((col, ci) => (
          <div key={ci} className="habit-history-column" aria-hidden="true">
            {col.map((cell, ri) => (
              <span key={ri} title={cell.label || undefined} data-history-state={cell.state} className="habit-history-cell" />
            ))}
          </div>
        ))}
      </div>
      <div className="habit-history-legend" aria-hidden="true">
        <span><i className="habit-history-cell" data-history-state="done" />Done</span>
        <span><i className="habit-history-cell" data-history-state="pending" />No log</span>
        <span><i className="habit-history-cell" data-history-state="inactive" />Inactive</span>
      </div>
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
  const linkedGoal = goals.find((g) => g.id === habit.linkedGoalId);
  const weekly = isWeeklyHabit(habit);
  const weeklyDone = weekly ? weeklyCompletionCount(habit) : 0;
  const weeklyGoal = weekly ? getWeeklyTarget(habit) : 0;
  const loggable = isHabitLoggableToday(habit);
  const consistency = consistencyRate(habit);
  const best = habit.bestStreak ?? 0;
  const canToggle = loggable || isCompletedToday;

  return (
    <div className="workspace-habit-card relative krama-card p-5 group flex flex-col gap-3.5">
      <header className="workspace-habit-card-heading">
        <span className="workspace-habit-card-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span>
        <h3>{habit.name}</h3>
        <HabitCardMenu habit={habit} onTogglePin={onTogglePin} onEdit={onEdit} onDelete={onDelete} />
      </header>
      <div className="workspace-habit-metadata">
        <span><Flame size={14} aria-hidden="true" /> {habit.streak}{weekly ? 'w' : 'd'} streak</span>
        <span>{habit.expectedDurationMinutes || 15} min</span>
        <span className="workspace-habit-category">{habit.category || 'Uncategorized'}</span>
        {habit.pinnedToPlanner && <span title="Pinned to Planner"><Pin size={13} aria-hidden="true" /> Planner</span>}

      </div>
      {linkedGoal && <div className="workspace-habit-goal"><Target size={14} aria-hidden="true" /><span>{linkedGoal.title}</span></div>}
      <button type="button" onClick={event => { event.stopPropagation(); if (canToggle) toggleHabit(); }}
        disabled={isPending || !canToggle} aria-pressed={isCompletedToday} aria-busy={isPending}
        aria-label={isPending ? `Saving: ${habit.name}` : isCompletedToday ? `Completed today: ${habit.name}. Undo completion.` : `Complete for today: ${habit.name}`}
        title={isCompletedToday ? 'Completed today \u2014 click to undo' : loggable ? 'Mark complete for today' : 'Not scheduled today'}
        className={cn('workspace-habit-complete krama-btn', isCompletedToday ? 'workspace-habit-completed' : 'krama-btn-secondary')}>
        <Check size={17} aria-hidden="true" />
        {isPending ? 'Saving...' : isCompletedToday ? 'Completed today' : loggable ? 'Complete for today' : 'Not scheduled today'}
      </button>
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-secondary">
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
