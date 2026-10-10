import type { HabitCreateInput, Habit, GoalWithRelations } from '../../types/schema';
import { useModalA11y } from '../../hooks/useModalA11y';
// UI-only refactor — no data/logic changes
import {
    Flame,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { BaseButton } from "../ui/BaseButton";
import { IconPicker } from "../ui/IconPicker";


export function HabitFormModal({
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
    cadence: NonNullable<HabitCreateInput["cadence"]>;
    category: NonNullable<HabitCreateInput["category"]>;
    difficulty: NonNullable<HabitCreateInput["difficulty"]>;
    expectedDurationMinutes: number;
    scheduledDays: number[];
    timeOfDay: NonNullable<HabitCreateInput["timeOfDay"]>;
    weeklyTarget?: number;
    pinnedToPlanner?: boolean;
    version?: number;
  }) => void;
  isSubmitting: boolean;
  goals: GoalWithRelations[];
  mode?: "create" | "edit";
  initialData?: Habit;
  defaultTimeOfDay?: NonNullable<HabitCreateInput["timeOfDay"]>;
}) {
  const dismiss = () => { if (!isSubmitting) onClose(); };
  const dialogRef = useModalA11y(open, dismiss);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [linkedGoalId, setLinkedGoalId] = useState<string>("");
  const [cadence, setCadence] = useState<NonNullable<HabitCreateInput["cadence"]>>("daily");
  const [category, setCategory] = useState<NonNullable<HabitCreateInput["category"]>>("PRODUCTIVITY");
  const [difficulty, setDifficulty] = useState<NonNullable<HabitCreateInput["difficulty"]>>("MEDIUM");
  const [expectedDurationMinutes, setDuration] = useState(15);
  const [timeOfDay, setTimeOfDay] = useState<NonNullable<HabitCreateInput["timeOfDay"]>>(defaultTimeOfDay);
  const [scheduledDays, setScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [weeklyTarget, setWeeklyTarget] = useState(3);

  const resetForm = useCallback(() => {
    if (mode === "edit" && initialData) {
      const metadata = initialData.metadata && typeof initialData.metadata === 'object' && !Array.isArray(initialData.metadata) ? initialData.metadata : {};
      setName(initialData.name || "");
      setIcon(initialData.icon || null);
      setLinkedGoalId(initialData.linkedGoalId || "");
      setCadence(initialData.cadence === "weekly" ? "weekly" : "daily");
      setCategory(initialData.category || "PRODUCTIVITY");
      setDifficulty(initialData.difficulty || "MEDIUM");
      setDuration(initialData.expectedDurationMinutes || 15);
      setTimeOfDay((['morning', 'afternoon', 'evening', 'anytime'] as const).find(time => time === (metadata.timeOfDay || initialData.timeOfDay)) ?? 'morning');
      setScheduledDays(initialData.scheduledDays || [0, 1, 2, 3, 4, 5, 6]);
      setWeeklyTarget(initialData.weeklyTarget ?? (typeof metadata.weeklyTarget === 'number' ? metadata.weeklyTarget : 3));
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
 onChange={(e) => setCadence(e.target.value as NonNullable<HabitCreateInput["cadence"]>)}
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
 onChange={(e) => setCategory(e.target.value as NonNullable<HabitCreateInput["category"]>)}
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
 onChange={(e) => setDifficulty(e.target.value as NonNullable<HabitCreateInput["difficulty"]>)}
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
 onChange={(e) => setTimeOfDay(e.target.value as NonNullable<HabitCreateInput["timeOfDay"]>)}
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
