// UI-only refactor — no data/logic changes
import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Check, Flame, TrendingUp, Plus, Clock, Sun, Sunset, Moon, Trash2, 
  Pin, PinOff, Edit2, Sparkles, X, ChevronLeft, ChevronRight, Brain, 
  Activity, Calendar, Target, Zap, Heart, BookOpen, ClipboardList, Leaf, ArrowRight 
} from 'lucide-react';
import { ConfirmDeleteButton } from "./ui/ConfirmDeleteButton";
import { toast } from "sonner";
import { BaseButton } from "./ui/BaseButton";
import { EmptyStateInline } from "./ui/EmptyStateInline";
import { LoadingState } from "./ui/LoadingState";
import { ErrorState } from "./ui/ErrorState";
import { cn } from "../lib/utils";
import { resolveIcon } from "../lib/iconResolver";
import { IconPicker } from "./ui/IconPicker";
import { useHabitCompletion, isHabitCompletedToday } from "../hooks/useHabitCompletion";
import { isHabitScheduledToday } from "../lib/habitFilters";

function RadialProgress({ pct = 0, size = 76, strokeWidth = 6 }: { pct: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
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
          stroke="#EA580C"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          fill="transparent"
        />
      </svg>
      <span className="absolute text-sm font-bold font-mono text-primary">{pct}%</span>
    </div>
  );
}

function PlantIllustration() {
  return (
    <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center mb-4 shadow-2xs">
      <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="text-zinc-800 dark:text-zinc-100" xmlns="http://www.w3.org/2000/svg">
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

const STARTER_HABITS = [
  {
    name: "Morning Sunlight & Hydration",
    category: "HEALTH",
    difficulty: "EASY",
    expectedDurationMinutes: 15,
    timeOfDay: "morning",
    icon: "Sun",
    description: "Hydrate and get 15 min natural morning light.",
  },
  {
    name: "Deep Work Focus Block",
    category: "PRODUCTIVITY",
    difficulty: "HARD",
    expectedDurationMinutes: 90,
    timeOfDay: "morning",
    icon: "Brain",
    description: "90 minutes of distraction-free strategic output.",
  },
  {
    name: "Daily Movement & Fitness",
    category: "HEALTH",
    difficulty: "MEDIUM",
    expectedDurationMinutes: 45,
    timeOfDay: "afternoon",
    icon: "Activity",
    description: "Workout, run, yoga, or active movement.",
  },
  {
    name: "Evening Review & Shutdown",
    category: "MINDFULNESS",
    difficulty: "EASY",
    expectedDurationMinutes: 15,
    timeOfDay: "evening",
    icon: "Moon",
    description: "Reflect on wins and plan tomorrow's top 3.",
  },
];

function HabitMainListItem({ habit, deleteMutation }: { habit: any; deleteMutation: any }) {
 const { isCompletedToday, toggleHabit, isPending } = useHabitCompletion(habit);

 return (
 <div
 onClick={() => {
 if (isPending) return;
 toggleHabit();
 }}
 className={cn(
 "flex justify-between items-center p-3 rounded-lg transition-colors group cursor-pointer border",
 isCompletedToday
 ? "bg-surface-hover border-transparent"
 : "bg-surface-hover border-border hover:border-primary",
 isPending && "opacity-50 cursor-not-allowed"
 )}
 >
 <div className="flex items-center gap-3">
 <button
 type="button"
 data-testid="habit-checkbox"
 className="focus:outline-none"
 disabled={isPending}
 onClick={(e) => {
 e.stopPropagation();
 if (isPending) return;
 toggleHabit();
 }}
 >
 {isCompletedToday ? (
 <div className="w-5 h-5 rounded-md bg-[#EA580C] text-white flex items-center justify-center shadow-2xs transition-all animate-in zoom-in-50 duration-150">
 <Check className="w-3.5 h-3.5 stroke-[2.5]" />
 </div>
 ) : (
 <div className="w-5 h-5 rounded-md border border-border bg-surface group-hover:border-accent transition-all flex items-center justify-center shadow-2xs" />
 )}
 </button>
 <span className={cn("text-body font-medium transition-colors", isCompletedToday ? "text-muted line-through" : "text-primary group-hover:text-primary")}>
 {habit.name}
 </span>
 </div>

 <div className="flex items-center gap-3">
 <span className="text-badge text-secondary font-mono">
 {habit.expectedDurationMinutes || 15}m
 </span>
 <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 font-mono text-[10px] font-bold tracking-tight">
 <Flame className="w-3 h-3 text-orange-500 stroke-[2]" />{" "}
 {habit.streak}d
 </span>
 <ConfirmDeleteButton
 onConfirm={(e) => {
 e.stopPropagation();
 deleteMutation.mutate(habit.id);
 }}
 className="opacity-0 group-hover:opacity-100"
 iconClassName="w-3.5 h-3.5"
 />
 </div>
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
 <div className="w-5 text-right text-badge font-mono text-muted">
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
 <div className="w-5 h-5 rounded-md border border-[#D1D5DB] bg-surface group-hover:border-primary transition-all flex items-center justify-center shadow-2xs" />
 )}
 </button>
 <div className="min-w-0 flex-1">
 <span
 className={cn(
 "text-body transition-colors min-w-0 truncate block",
 isCompletedToday
 ? "text-muted line-through decoration-[#D1D5DB]"
 : "text-primary font-medium group-hover:text-primary",
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

// Helper to generate a 30-day contribution heatmap pattern for a habit from real completions
function generate30DayPattern(habit: any) {
 const days = [];
 const today = new Date();
 const createdAt = habit.createdAt ? new Date(habit.createdAt) : new Date(0);
 const createdAtStart = new Date(
 createdAt.getFullYear(),
 createdAt.getMonth(),
 createdAt.getDate(),
 ).getTime();
 const scheduled = habit.scheduledDays && habit.scheduledDays.length > 0
 ? habit.scheduledDays
 : [0, 1, 2, 3, 4, 5, 6];

 for (let i = 29; i >= 0; i--) {
 const d = new Date(
 today.getFullYear(),
 today.getMonth(),
 today.getDate() - i,
 );
 if (d.getTime() < createdAtStart || !scheduled.includes(d.getDay())) {
 days.push({
 level: -1,
 offset: i,
 dateStr: d.toISOString().split("T")[0],
 });
 continue;
 }
 const dStr = d.toISOString().split("T")[0] || "";
 const completed =
 habit.completions?.some(
 (c: any) => c.completedAt && c.completedAt.toString().startsWith(dStr)
 );

 days.push({ level: completed ? 3 : 0, offset: i, dateStr: dStr });
 }
 return days;
}

function HabitCreateModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  goals,
  defaultTimeOfDay = "morning",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    icon?: string;
    linkedGoalId?: string;
    cadence: string;
    category: string;
    difficulty: string;
    expectedDurationMinutes: number;
    scheduledDays: number[];
    timeOfDay: string;
    pinnedToPlanner?: boolean;
  }) => void;
  isSubmitting: boolean;
  goals: any[];
  defaultTimeOfDay?: string;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [linkedGoalId, setLinkedGoalId] = useState<string>("");
  const [cadence, setCadence] = useState("daily");
  const [category, setCategory] = useState("PRODUCTIVITY");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [expectedDurationMinutes, setDuration] = useState(15);
  const [timeOfDay, setTimeOfDay] = useState(defaultTimeOfDay);
  const [scheduledDays, setScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (open) {
      setTimeOfDay(defaultTimeOfDay);
    }
  }, [open, defaultTimeOfDay]);

  if (!open) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) return;
 onSubmit({
 name: name.trim(),
 icon: icon || undefined,
 linkedGoalId: linkedGoalId || undefined,
 cadence,
 category,
 difficulty,
 expectedDurationMinutes,
 scheduledDays,
 timeOfDay,
 });
 };

 const daysOfWeek = [
 { label: 'S', value: 0 }, { label: 'M', value: 1 }, { label: 'T', value: 2 },
 { label: 'W', value: 3 }, { label: 'T', value: 4 }, { label: 'F', value: 5 }, { label: 'S', value: 6 }
 ];

 const toggleDay = (day: number) => {
 setScheduledDays(prev =>
 prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
 );
 };

 return (
 <div
 onClick={onClose}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
 >
 <div
 onClick={(e) => e.stopPropagation()}
 className="v4-card w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
 <Flame className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">
 Create New Routine / Habit
 </h3>
 </div>
 <button
 onClick={onClose}
 type="button"
 className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
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
 Routine Name <span className="text-[#DC2626]">*</span>
 </label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g., 45m Focused Deep Work"
 required
 autoFocus
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary placeholder:text-muted focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Cadence
 </label>
 <select
 value={cadence}
 onChange={(e) => setCadence(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Scheduled Days
 </label>
 <div className="flex gap-2">
 {daysOfWeek.map(day => {
 const isSelected = scheduledDays.includes(day.value);
 return (
 <button
 key={day.value}
 type="button"
 onClick={() => toggleDay(day.value)}
 className={cn(
 "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors border",
 isSelected
 ? "bg-[#EA580C] text-white border-[#EA580C]"
 : "bg-surface text-secondary border-border hover:border-[#EA580C]/50"
 )}
 >
 {day.label}
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Difficulty
 </label>
 <select
 value={difficulty}
 onChange={(e) => setDifficulty(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 >
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
 value={linkedGoalId}
 onChange={(e) => setLinkedGoalId(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Time of Day
 </label>
 <select
 value={timeOfDay}
 onChange={(e) => setTimeOfDay(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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
 value={expectedDurationMinutes}
 onChange={(e) => setDuration(Number(e.target.value))}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 />
 </div>
 </div>

 <div className="pt-4 border-t border-border flex justify-end gap-3">
 <BaseButton
 type="button"
 variant="secondary"
 onClick={onClose}
 disabled={isSubmitting}
 >
 Cancel
 </BaseButton>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            {isSubmitting ? "Creating..." : "Create Habit"}
          </button>
 </div>
 </form>
 </div>
 </div>
 );
}

function HabitEditModal({
 open,
 onClose,
 onSubmit,
 isSubmitting,
 goals,
 initialData,
}: {
 open: boolean;
 onClose: () => void;
 onSubmit: (data: {
 name: string;
 icon?: string;
 linkedGoalId?: string;
 cadence: string;
 category: string;
 difficulty: string;
 expectedDurationMinutes: number;
 scheduledDays: number[];
 timeOfDay: string;
 version: number;
 }) => void;
 isSubmitting: boolean;
 goals: any[];
 initialData: any;
}) {
 const [name, setName] = useState(initialData?.name || "");
 const [icon, setIcon] = useState<string | null>(initialData?.icon || null);
 const [linkedGoalId, setLinkedGoalId] = useState<string>(initialData?.linkedGoalId || "");
 const [cadence, setCadence] = useState(initialData?.cadence || "daily");
 const [category, setCategory] = useState(initialData?.category || "PRODUCTIVITY");
 const [difficulty, setDifficulty] = useState(initialData?.difficulty || "MEDIUM");
 const [expectedDurationMinutes, setDuration] = useState(initialData?.expectedDurationMinutes || 15);
 const [timeOfDay, setTimeOfDay] = useState(initialData?.metadata?.timeOfDay || initialData?.timeOfDay || "morning");
 const [scheduledDays, setScheduledDays] = useState<number[]>(initialData?.scheduledDays || [0, 1, 2, 3, 4, 5, 6]);

 if (!open) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) return;
 onSubmit({
 name: name.trim(),
 icon: icon || undefined,
 linkedGoalId: linkedGoalId || undefined,
 cadence,
 category,
 difficulty,
 expectedDurationMinutes,
 scheduledDays,
 timeOfDay,
 version: initialData?.version || 1,
 });
 };

 const daysOfWeek = [
 { label: 'S', value: 0 }, { label: 'M', value: 1 }, { label: 'T', value: 2 },
 { label: 'W', value: 3 }, { label: 'T', value: 4 }, { label: 'F', value: 5 }, { label: 'S', value: 6 }
 ];

 const toggleDay = (day: number) => {
 setScheduledDays(prev =>
 prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
 );
 };

 return (
 <div
 onClick={onClose}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
 >
 <div
 onClick={(e) => e.stopPropagation()}
 className="v4-card w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
 <Flame className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">
 Edit Routine / Habit
 </h3>
 </div>
 <button
 onClick={onClose}
 type="button"
 className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
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
 Routine Name <span className="text-[#DC2626]">*</span>
 </label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g., 45m Focused Deep Work"
 required
 autoFocus
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary placeholder:text-muted focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Cadence
 </label>
 <select
 value={cadence}
 onChange={(e) => setCadence(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Scheduled Days
 </label>
 <div className="flex gap-2">
 {daysOfWeek.map(day => {
 const isSelected = scheduledDays.includes(day.value);
 return (
 <button
 key={day.value}
 type="button"
 onClick={() => toggleDay(day.value)}
 className={cn(
 "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors border",
 isSelected
 ? "bg-[#EA580C] text-white border-[#EA580C]"
 : "bg-surface text-secondary border-border hover:border-[#EA580C]/50"
 )}
 >
 {day.label}
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Difficulty
 </label>
 <select
 value={difficulty}
 onChange={(e) => setDifficulty(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 >
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
 value={linkedGoalId}
 onChange={(e) => setLinkedGoalId(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Time of Day
 </label>
 <select
 value={timeOfDay}
 onChange={(e) => setTimeOfDay(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
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
 value={expectedDurationMinutes}
 onChange={(e) => setDuration(Number(e.target.value))}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
 />
 </div>
 </div>

 <div className="pt-4 border-t border-border flex justify-end gap-3">
 <BaseButton
 type="button"
 variant="secondary"
 onClick={onClose}
 disabled={isSubmitting}
 >
 Cancel
 </BaseButton>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
 </div>
 </form>
 </div>
 </div>
 );
}

function LearnHabitsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="v4-card w-full max-w-lg shadow-2xl overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-primary">Mastering Daily Habits & Routines</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-xs text-secondary leading-relaxed">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-hover/60 border border-border">
            <Flame className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary mb-0.5">Streaks & Momentum</p>
              <p>Check off habits daily to build streaks. The system tracks your 30-day activity horizon so you never lose momentum.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-hover/60 border border-border">
            <Sun className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary mb-0.5">Routines by Time of Day</p>
              <p>Organize habits into Morning, Afternoon, Evening, or Anytime buckets to structure your day effortlessly.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-hover/60 border border-border">
            <Pin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary mb-0.5">Weekly Planner Synchronization</p>
              <p>Use the 📌 pin button to bring your core rituals directly into your 7-Day Planner Matrix for cohesive execution.</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-border bg-surface-hover/30 flex justify-end">
          <BaseButton onClick={onClose} variant="secondary">Got it</BaseButton>
        </div>
      </div>
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
 const { data: goals = [] } = useQuery({
 queryKey: ["goals"],
 queryFn: api.goals.list,
 });
 const [activeCategory, setActiveCategory] = useState<string | null>(null);
 const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);

 const restoreMutation = useMutation({
 mutationFn: (id: string) => api.habits.restore(id),
 onSuccess: (restoredHabit) => {
 queryClient.invalidateQueries({ queryKey: ["habits"] });
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
 const [learnModalOpen, setLearnModalOpen] = useState(false);
 const [defaultTimeOfDay, setDefaultTimeOfDay] = useState("morning");

 const [todayTrackerOpen, setTodayTrackerOpen] = useState(() => {
   if (typeof window !== 'undefined') {
     const saved = localStorage.getItem('krama_habit_today_tracker_open');
     return saved !== null ? saved === 'true' : false;
   }
   return false;
 });

 const toggleTodayTracker = () => {
   setTodayTrackerOpen(prev => {
     const next = !prev;
     localStorage.setItem('krama_habit_today_tracker_open', String(next));
     return next;
   });
 };

 const [touchStartX, setTouchStartX] = useState<number | null>(null);

 const handleWheel = (e: React.WheelEvent) => {
   if (!todayTrackerOpen && e.deltaX > 25) {
     setTodayTrackerOpen(true);
     localStorage.setItem('krama_habit_today_tracker_open', 'true');
   } else if (todayTrackerOpen && e.deltaX < -25) {
     setTodayTrackerOpen(false);
     localStorage.setItem('krama_habit_today_tracker_open', 'false');
   }
 };

 const handleTouchStart = (e: React.TouchEvent) => {
   setTouchStartX(e.touches[0].clientX);
 };

 const handleTouchEnd = (e: React.TouchEvent) => {
   if (touchStartX === null) return;
   const touchEndX = e.changedTouches[0].clientX;
   const diff = touchStartX - touchEndX;
   if (!todayTrackerOpen && diff > 50) {
     setTodayTrackerOpen(true);
     localStorage.setItem('krama_habit_today_tracker_open', 'true');
   } else if (todayTrackerOpen && diff < -50) {
     setTodayTrackerOpen(false);
     localStorage.setItem('krama_habit_today_tracker_open', 'false');
   }
   setTouchStartX(null);
 };

 const createHabitMutation = useMutation({
 mutationFn: (data: {
 name: string;
 icon?: string;
 linkedGoalId?: string;
 cadence: string;
 category: string;
 difficulty: string;
 expectedDurationMinutes: number;
 scheduledDays: number[];
 timeOfDay: string;
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
 streak: 0,
 }),
 onSuccess: (newHabit) => {
 queryClient.invalidateQueries({ queryKey: ["habits"] });
 setCreateModalOpen(false);
 toast.success(`Created "${newHabit?.name || "Habit"}"`);
 },
 onError: () => {
 toast.error("Failed to create habit");
 },
 });


 const togglePinHabitMutation = useMutation({
 mutationFn: (data: { id: string; pinned: boolean }) => api.habits.update(data.id, { pinnedToPlanner: data.pinned }),
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
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: ["habits"] });
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
 setEditModalOpen(false);
 setEditingHabit(null);
 toast.success("Habit updated successfully");
 },
 onError: () => {
 toast.error("Failed to update habit");
 },
 });

 const handleCreateHabit = () => {
 setCreateModalOpen(true);
 };

 const handleCreateFromStarter = (starter: (typeof STARTER_HABITS)[0]) => {
   createHabitMutation.mutate({
     name: starter.name,
     category: starter.category,
     difficulty: starter.difficulty,
     expectedDurationMinutes: starter.expectedDurationMinutes,
     timeOfDay: starter.timeOfDay,
     cadence: "daily",
     scheduledDays: [0, 1, 2, 3, 4, 5, 6],
     pinnedToPlanner: true,
   });
 };

 const handleEditHabit = (habit: any) => {
 setEditingHabit(habit);
 setEditModalOpen(true);
 };

 if (isLoading)
 return (
 <LoadingState
 variant="habit-tracker"
 title="Loading Habits..."
 description="Syncing streak logs and daily routines..."
 />
 );
 if (isError) {
 return (
 <div className="p-8">
 <ErrorState
 title="Failed to load Habits"
 message="Could not retrieve habit and streak logs from the server. Please check your connection."
 onRetry={() =>
 queryClient.invalidateQueries({ queryKey: ["habits"] })
 }
 />
 </div>
 );
 }

 const categoriesMap = new Map<string, number>();
 habits.forEach((h) => {
 const cat = h.category || "Uncategorized";
 categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
 });
 const categories = Array.from(categoriesMap.entries()).sort(
 (a, b) => b[1] - a[1],
 );

 const difficulties = ["EASY", "MEDIUM", "HARD", "EXTREME"];

 const filteredHabits = habits.filter((h) => {
 if (activeCategory && (h.category || "Uncategorized") !== activeCategory)
 return false;
 if (activeDifficulty && (h.difficulty || "MEDIUM") !== activeDifficulty)
 return false;
 return true;
 });

 const getHabitTime = (h: any) => h.metadata?.timeOfDay || h.timeOfDay || "anytime";

 const morningHabits = habits.filter((h) => getHabitTime(h) === "morning" && isHabitScheduledToday(h));
 const afternoonHabits = habits.filter((h) => getHabitTime(h) === "afternoon" && isHabitScheduledToday(h));
 const eveningHabits = habits.filter((h) => getHabitTime(h) === "evening" && isHabitScheduledToday(h));
 const anytimeHabits = habits.filter((h) => getHabitTime(h) === "anytime" && isHabitScheduledToday(h));

 const today = new Date().toLocaleDateString("en-US", {
 weekday: "long",
 month: "long",
 day: "numeric",
 });

 const todaysHabits = habits.filter(isHabitScheduledToday);

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
        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">Habit</h1>
              <p className="text-xs text-secondary mt-0.5">
                Manage, track, and maintain consistency across your daily routines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLearnModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary text-xs font-medium flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-secondary" />
              <span>Learn about habits</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreateWithTime("morning")}
              className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>Create Habit</span>
            </button>
          </div>
        </div>

        {/* Filter Pills row - ALWAYS present per screenshot */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveCategory(null);
              setActiveDifficulty(null);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shadow-2xs",
              activeDifficulty === null && activeCategory === null
                ? "bg-[#18181B] text-white dark:bg-white dark:text-zinc-900"
                : "bg-surface text-secondary border border-border hover:border-primary hover:text-primary"
            )}
          >
            All ({habits.length})
          </button>

          <button
            onClick={() => setActiveDifficulty(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs",
              activeDifficulty === null && activeCategory !== null
                ? "bg-primary text-white border-primary"
                : "bg-surface text-secondary border-border hover:border-primary hover:text-primary"
            )}
          >
            All Diff
          </button>

          {difficulties.map((diff) => {
            const isSelected = activeDifficulty === diff;
            const label = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
            return (
              <button
                key={diff}
                onClick={() => setActiveDifficulty(isSelected ? null : diff)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs",
                  isSelected
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-secondary border-border hover:border-primary hover:text-primary"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Main Empty State Card (when habits.length === 0) */}
        {habits.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 sm:p-12 shadow-xs flex flex-col items-center text-center max-w-3xl mx-auto my-2">
            <PlantIllustration />
            <h2 className="text-base sm:text-lg font-bold text-primary tracking-tight">No habits created yet</h2>
            <p className="text-xs text-secondary mt-1 max-w-sm">
              Create your first routine to start building streaks and establishing consistency.
            </p>

            <button
              type="button"
              onClick={() => handleOpenCreateWithTime("morning")}
              className="mt-5 px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>Create Habit</span>
            </button>

            {/* 4 Value propositions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border/60 w-full">
              <div className="flex items-center justify-center gap-2 text-xs text-secondary font-medium">
                <Target className="w-4 h-4 text-orange-500 stroke-[1.75]" />
                <span>Build better routines</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-secondary font-medium">
                <TrendingUp className="w-4 h-4 text-orange-500 stroke-[1.75]" />
                <span>Track your progress</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-secondary font-medium">
                <Zap className="w-4 h-4 text-orange-500 stroke-[1.75]" />
                <span>Stay consistent</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-secondary font-medium">
                <Heart className="w-4 h-4 text-orange-500 stroke-[1.75]" />
                <span>A better you</span>
              </div>
            </div>
          </div>
        ) : filteredHabits.length === 0 ? (
          <EmptyStateInline
            icon={Flame}
            title="No matching habits"
            description="No habits match your active difficulty or category filters."
          />
        ) : (
          /* Habit Cards Grid with 30-Day Activity Heatmap */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredHabits.map((habit) => {
              const Icon = resolveIcon(habit.icon);
              const heatmap = generate30DayPattern(habit);

              const difficultyLevel =
                habit.difficulty === "EASY"
                  ? 1
                  : habit.difficulty === "MEDIUM"
                  ? 2
                  : habit.difficulty === "HARD"
                  ? 3
                  : habit.difficulty === "EXTREME"
                  ? 4
                  : 2;
              const dots = Array.from({ length: 4 }).map((_, i) => i < difficultyLevel);
              const linkedGoal = goals.find((g) => g.id === habit.linkedGoalId);

              return (
                <div
                  key={habit.id}
                  className="v4-card p-5 hover:border-primary transition-all cursor-pointer group flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-surface-hover rounded-xl border border-border flex items-center justify-center shrink-0 group-hover:border-primary group-hover:bg-primary transition-all shadow-2xs">
                      <Icon className="w-5 h-5 text-primary group-hover:text-white transition-colors stroke-[1.75]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-card text-primary mb-1 truncate group-hover:text-primary transition-colors">
                          {habit.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-mono text-badge font-bold tracking-tight">
                            <Flame className="w-3.5 h-3.5 text-orange-500 stroke-[2]" />{" "}
                            {habit.streak}d
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinHabitMutation.mutate({ id: habit.id, pinned: !habit.pinnedToPlanner });
                            }}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer",
                              habit.pinnedToPlanner
                                ? "bg-accent/10 border-accent/30 text-accent font-semibold"
                                : "bg-surface border-border text-muted hover:text-primary hover:border-primary/40"
                            )}
                            title={habit.pinnedToPlanner ? "Pinned to Planner (click to unpin)" : "Pin to Planner"}
                          >
                            {habit.pinnedToPlanner ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditHabit(habit);
                            }}
                            className="p-1.5 rounded-lg border border-border bg-surface text-muted hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                            title="Edit Habit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <ConfirmDeleteButton
                            onConfirm={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(habit.id);
                            }}
                            className="opacity-70 hover:opacity-100"
                            iconClassName="w-3.5 h-3.5"
                          />
                        </div>
                      </div>
                      {linkedGoal && (
                        <div className="text-[11px] font-medium text-secondary truncate mb-2">
                          Goal: {linkedGoal.title}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-caption text-secondary font-medium">
                          {habit.category || "Uncategorized"}
                        </span>
                        <span className="text-[#E5E8EC] font-light">•</span>
                        <div
                          className="flex items-center gap-0.5"
                          title={`Difficulty: ${habit.difficulty || "MEDIUM"}`}
                        >
                          {dots.map((active, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                active ? "bg-secondary" : "bg-border",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[#E5E8EC] font-light">•</span>
                        <span className="text-badge text-secondary font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 stroke-[1.5]" />{" "}
                          {habit.expectedDurationMinutes || 15}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 30-Day Activity Heatmap */}
                  <div className="pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between text-[10px] text-muted uppercase font-mono mb-1.5">
                      <span>30-Day Activity Horizon</span>
                      <span>Last 30d</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      {heatmap.map((item, i) => (
                        <div
                          key={i}
                          title={`Day ${item.dateStr}: ${item.level === -1 ? "Not created yet" : item.level === 0 ? "No activity" : "Completed"}`}
                          className={cn(
                            "w-2 h-4 rounded-xs transition-colors",
                            item.level === 3
                              ? "bg-[#EA580C]"
                              : item.level === -1
                              ? "bg-surface-hover border border-border/40 opacity-40"
                              : "bg-surface-hover border border-border/60",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Daily Routines Breakdown Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-primary">Daily Routines Breakdown</h2>
              <p className="text-xs text-secondary mt-0.5">Organize your habits into routines for a more structured day.</p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateWithTime("morning")}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-primary flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Routine</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Morning Routine Card */}
            <div 
              onClick={() => handleOpenCreateWithTime("morning")}
              className="rounded-xl border border-border bg-surface p-4 hover:border-border/80 transition-all shadow-xs cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                    <Sun className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary">Morning Routine</h3>
                    {morningHabits.length === 0 ? (
                      <>
                        <p className="text-[11px] text-muted mt-0.5">No morning habits configured.</p>
                        <p className="text-[11px] text-secondary font-medium">Start your day with intention</p>
                      </>
                    ) : (
                      <p className="text-[11px] text-secondary mt-0.5">{morningHabits.length} habits configured</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted font-mono">
                  <span>{morningHabits.length} habits</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              {morningHabits.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {morningHabits.map((habit) => (
                    <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                  ))}
                </div>
              )}
            </div>

            {/* Afternoon Routine Card */}
            <div 
              onClick={() => handleOpenCreateWithTime("afternoon")}
              className="rounded-xl border border-border bg-surface p-4 hover:border-border/80 transition-all shadow-xs cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <Sunset className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary">Afternoon Routine</h3>
                    {afternoonHabits.length === 0 ? (
                      <>
                        <p className="text-[11px] text-muted mt-0.5">No afternoon habits configured.</p>
                        <p className="text-[11px] text-secondary font-medium">Keep your energy and focus high</p>
                      </>
                    ) : (
                      <p className="text-[11px] text-secondary mt-0.5">{afternoonHabits.length} habits configured</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted font-mono">
                  <span>{afternoonHabits.length} habits</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              {afternoonHabits.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {afternoonHabits.map((habit) => (
                    <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                  ))}
                </div>
              )}
            </div>

            {/* Evening Routine Card */}
            <div 
              onClick={() => handleOpenCreateWithTime("evening")}
              className="rounded-xl border border-border bg-surface p-4 hover:border-border/80 transition-all shadow-xs cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                    <Moon className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary">Evening Routine</h3>
                    {eveningHabits.length === 0 ? (
                      <>
                        <p className="text-[11px] text-muted mt-0.5">No evening habits configured.</p>
                        <p className="text-[11px] text-secondary font-medium">Wind down and reflect</p>
                      </>
                    ) : (
                      <p className="text-[11px] text-secondary mt-0.5">{eveningHabits.length} habits configured</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted font-mono">
                  <span>{eveningHabits.length} habits</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              {eveningHabits.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {eveningHabits.map((habit) => (
                    <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                  ))}
                </div>
              )}
            </div>

            {/* Anytime Habits Card */}
            <div 
              onClick={() => handleOpenCreateWithTime("anytime")}
              className="rounded-xl border border-border bg-surface p-4 hover:border-border/80 transition-all shadow-xs cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <Leaf className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary">Anytime Habits</h3>
                    {anytimeHabits.length === 0 ? (
                      <>
                        <p className="text-[11px] text-muted mt-0.5">No anytime habits configured.</p>
                        <p className="text-[11px] text-secondary font-medium">Habits you can do anytime</p>
                      </>
                    ) : (
                      <p className="text-[11px] text-secondary mt-0.5">{anytimeHabits.length} habits configured</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted font-mono">
                  <span>{anytimeHabits.length} habits</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              {anytimeHabits.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {anytimeHabits.map((habit) => (
                    <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Today's Tracker Rail */}
      <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-surface/40 p-6 space-y-4 lg:h-full lg:overflow-y-auto">
        {/* Rail Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider font-mono">
              TODAY'S TRACKER
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
            <Calendar className="w-3.5 h-3.5 text-muted" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Circular Progress Gauge Card */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <RadialProgress pct={progressPct} size={76} strokeWidth={6} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-secondary font-medium">Daily Completion Rate</div>
              <div className="text-2xl font-bold text-primary font-mono mt-0.5">{progressPct}%</div>
              <div className="text-[11px] text-muted mt-0.5">
                {completedCount} of {todaysHabits.length} habits completed
              </div>
              <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden mt-2.5 border border-border/40">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Habits Section */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-primary">Today's Habits</h3>
            <button
              type="button"
              onClick={() => {
                setActiveDifficulty(null);
                setActiveCategory(null);
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
                <Plus className="w-3.5 h-3.5 text-orange-500" />
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

        {/* Motivational Quote Card */}
        <div className="rounded-2xl border border-border/80 bg-surface/60 p-4 shadow-xs flex items-center gap-3">
          <span className="text-3xl text-muted/30 font-serif leading-none select-none">❝</span>
          <p className="text-xs italic text-secondary leading-relaxed">
            Small steps every day lead to big changes.
          </p>
        </div>
      </div>

      <LearnHabitsModal
        open={learnModalOpen}
        onClose={() => setLearnModalOpen(false)}
      />

      <HabitCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultTimeOfDay={defaultTimeOfDay}
        onSubmit={(data) => createHabitMutation.mutate(data)}
        isSubmitting={createHabitMutation.isPending}
        goals={goals}
      />

      {editingHabit && (
        <HabitEditModal
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
