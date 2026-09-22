// UI-only refactor — no data/logic changes
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Check, Flame, TrendingUp, Plus, Clock, Sun, Sunset, Moon, 
  Pin, PinOff, Edit2, X, 
  Calendar, Target, Zap, Heart, ClipboardList, ArrowRight,
  ChevronLeft, ChevronRight, MoreVertical, Trash2 
} from 'lucide-react';
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

  const resetForm = useCallback(() => {
    setName("");
    setIcon(null);
    setLinkedGoalId("");
    setCadence("daily");
    setCategory("PRODUCTIVITY");
    setDifficulty("MEDIUM");
    setDuration(15);
    setTimeOfDay(defaultTimeOfDay);
    setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
  }, [defaultTimeOfDay]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, defaultTimeOfDay, resetForm]);

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
    resetForm();
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
  const [activeTimeOfDay, setActiveTimeOfDay] = useState<string | null>(null);

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
      linkedGoalId?: string;
      cadence: string;
      category: string;
      difficulty: string;
      expectedDurationMinutes: number;
      scheduledDays: number[];
      timeOfDay: string;
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
        pinnedToPlanner: data.pinnedToPlanner,
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
    onSuccess: (_, variables) => {
      toast.success(variables.pinned ? "Habit pinned to Planner" : "Habit unpinned from Planner");
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

  const getHabitTime = (h: any) => h.metadata?.timeOfDay || h.timeOfDay || "anytime";

  const morningHabits = habits.filter((h) => getHabitTime(h) === "morning");
  const afternoonHabits = habits.filter((h) => getHabitTime(h) === "afternoon");
  const eveningHabits = habits.filter((h) => getHabitTime(h) === "evening");
  const anytimeHabits = habits.filter((h) => getHabitTime(h) === "anytime");

  const TIME_FILTERS = [
    { id: "morning", label: "Morning", icon: Sun, iconColor: "text-amber-500", count: morningHabits.length },
    { id: "afternoon", label: "Afternoon", icon: Sunset, iconColor: "text-orange-500", count: afternoonHabits.length },
    { id: "evening", label: "Evening", icon: Moon, iconColor: "text-purple-500", count: eveningHabits.length },
    { id: "anytime", label: "Anytime", icon: Clock, iconColor: "text-emerald-500", count: anytimeHabits.length },
  ];

  const filteredHabits = habits.filter((h) => {
    if (activeTimeOfDay && getHabitTime(h) !== activeTimeOfDay)
      return false;
    return true;
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
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 text-accent-fg flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">Habit</h1>
              <p className="text-xs text-secondary mt-0.5">
                Manage, track, and maintain consistency across your daily routines.
              </p>
            </div>
          </div>

          {habits.length > 0 && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenCreateWithTime(activeTimeOfDay || "morning")}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Create Habit</span>
              </button>
            </div>
          )}
        </div>

        {/* Time of Day Filter Pills row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTimeOfDay(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
              activeTimeOfDay === null
                ? "bg-primary text-text-inverse font-semibold shadow-xs"
                : "bg-surface text-secondary border border-border hover:border-primary hover:text-primary"
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
                    ? "bg-primary text-text-inverse border-primary font-semibold shadow-xs"
                    : "bg-surface text-secondary border-border hover:border-primary hover:text-primary"
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
            description={activeTimeOfDay ? `No ${activeTimeOfDay} habits configured.` : "No habits match the selected filter."}
          />
        ) : (
          /* Habit Cards Grid */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredHabits.map((habit) => {
              const Icon = resolveIcon(habit.icon);

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
                  className="v4-card p-5 hover:border-primary transition-all cursor-pointer group flex flex-col justify-between gap-3"
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
                          {habit.pinnedToPlanner && (
                            <span 
                              className="p-1 rounded-md bg-accent/10 text-accent font-semibold"
                              title="Pinned to Planner"
                            >
                              <Pin className="w-3.5 h-3.5 fill-current" />
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-bg border border-warning-border text-warning-fg font-mono text-badge font-bold tracking-tight">
                            <Flame className="w-3.5 h-3.5 text-warning-fg stroke-[2]" />{" "}
                            {habit.streak}d
                          </span>
                          <HabitCardMenu
                            habit={habit}
                            onTogglePin={() =>
                              togglePinHabitMutation.mutate({
                                id: habit.id,
                                pinned: !habit.pinnedToPlanner,
                              })
                            }
                            onEdit={() => handleEditHabit(habit)}
                            onDelete={() => deleteMutation.mutate(habit.id)}
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
                        <span className="text-caption text-secondary font-mono">
                          {habit.expectedDurationMinutes || 15}m
                        </span>
                        <span className="text-[#E5E8EC] font-light">•</span>
                        <div className="flex items-center gap-0.5" title={`Difficulty: ${habit.difficulty || "MEDIUM"}`}>
                          {dots.map((active, i) => (
                            <span
                              key={i}
                              className={cn(
                                "w-1 h-2 rounded-2xs transition-colors",
                                active ? "bg-[#EA580C]" : "bg-surface-hover border border-border/60"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
            "w-5 h-9 rounded-full border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-orange-500 shadow-sm flex items-center justify-center cursor-pointer transition-all duration-200",
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
        <HabitCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          defaultTimeOfDay={defaultTimeOfDay}
          onSubmit={(data) => createHabitMutation.mutate(data)}
          isSubmitting={createHabitMutation.isPending}
          goals={goals}
        />
      )}

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
