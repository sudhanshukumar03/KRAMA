import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  Flame,
  Sparkles,
  Plus,
  Sun,
  Sunset,
  Moon,
  Check,
  X,
  Trash2,
  Edit2,
} from "lucide-react";
import { ConfirmDeleteButton } from "./ui/ConfirmDeleteButton";
import { toast } from "sonner";
import { BaseButton } from "./ui/BaseButton";
import { EmptyState } from "./ui/EmptyState";
import { LoadingState } from "./ui/LoadingState";
import { ErrorState } from "./ui/ErrorState";
import { cn } from "../lib/utils";
import { resolveIcon } from "../lib/iconResolver";
import { IconPicker } from "./ui/IconPicker";
import { useHabitCompletion, isHabitCompletedToday } from "../hooks/useHabitCompletion";
import { isHabitScheduledToday } from "../lib/habitFilters";

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
            <div className="w-5 h-5 rounded-md border border-border bg-surface group-hover:border-[#EA580C] transition-all flex items-center justify-center shadow-2xs" />
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
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] font-mono text-[10px] font-bold tracking-tight">
          <Flame className="w-3 h-3 text-[#EA580C] stroke-[2]" />{" "}
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
  }) => void;
  isSubmitting: boolean;
  goals: any[];
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [linkedGoalId, setLinkedGoalId] = useState<string>("");
  const [cadence, setCadence] = useState("daily");
  const [category, setCategory] = useState("PRODUCTIVITY");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [expectedDurationMinutes, setDuration] = useState(15);
  const [timeOfDay, setTimeOfDay] = useState("morning");
  const [scheduledDays, setScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

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
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
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
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Creating..." : "Create Habit"}
            </BaseButton>
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
  const [timeOfDay, setTimeOfDay] = useState(initialData?.timeOfDay || "morning");
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
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
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
            <BaseButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </BaseButton>
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

  if (habits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <EmptyState
          icon={Flame}
          title="No habits created."
          description="Create your first routine to start building your streak."
          actionLabel="Create Habit"
          onAction={handleCreateHabit}
        />
        <HabitCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={(data) => createHabitMutation.mutate(data)}
          isSubmitting={createHabitMutation.isPending}
          goals={goals}
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

  const morningHabits = habits.filter((h) => h.timeOfDay === "morning" && isHabitScheduledToday(h));
  const afternoonHabits = habits.filter((h) => h.timeOfDay === "afternoon" && isHabitScheduledToday(h));
  const eveningHabits = habits.filter((h) => h.timeOfDay === "evening" && isHabitScheduledToday(h));
  const anytimeHabits = habits.filter((h) => h.timeOfDay === "anytime" && isHabitScheduledToday(h));

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todaysHabits = habits.filter(isHabitScheduledToday);

  const completedCount = todaysHabits.filter((h) => isHabitCompletedToday(h)).length;
  const totalHabits = todaysHabits.length || 1;
  const progressPct = Math.round((completedCount / totalHabits) * 100);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-canvas animate-in fade-in duration-150 overflow-y-auto lg:overflow-hidden">
      {/* LEFT COLUMN: Main Content */}
      <div className="flex-1 lg:h-full lg:overflow-y-auto p-4 sm:p-6 lg:p-12 relative border-b lg:border-b-0 lg:border-r border-border">
        {/* Header with Category Tile (#EA580C Orange) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-sm">
              <TrendingUp className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-title text-primary mb-4 ">Habits</h1>
                <span className="bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20 px-2 py-0.2 rounded text-[10px] font-medium uppercase tracking-[0.02em] flex items-center gap-1 font-mono">
                  <Flame className="w-3 h-3 text-[#EA580C] stroke-[2]" />{" "}
                  {habits.length} routines
                </span>
              </div>
              <p className="text-[13px] text-secondary">
                Manage, track, and maintain consistency across your daily
                routines.
              </p>
            </div>
          </div>
          <BaseButton onClick={handleCreateHabit}>
            <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> New Habit
          </BaseButton>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-caption font-medium tracking-[0.02em] transition-all border shadow-2xs cursor-pointer",
              activeCategory === null
                ? "bg-primary text-white border-primary"
                : "bg-surface text-secondary border-border hover:border-primary hover:text-primary",
            )}
          >
            All ({habits.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-caption font-medium tracking-[0.02em] transition-all border flex items-center gap-1.5 shadow-2xs cursor-pointer",
                activeCategory === cat
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-secondary border-border hover:border-primary hover:text-primary",
              )}
            >
              {cat}{" "}
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  activeCategory === cat
                    ? "bg-white/20"
                    : "bg-surface-hover text-secondary border border-border",
                )}
              >
                {count}
              </span>
            </button>
          ))}

          <div className="w-px h-6 bg-border mx-2 self-center"></div>

          <button
            onClick={() => setActiveDifficulty(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-caption font-medium tracking-[0.02em] transition-all border shadow-2xs cursor-pointer",
              activeDifficulty === null
                ? "bg-primary text-white border-primary"
                : "bg-surface text-secondary border-border hover:border-primary hover:text-primary",
            )}
          >
            All Diff
          </button>
          {difficulties.map((diff) => (
            <button
              key={diff}
              onClick={() => setActiveDifficulty(diff)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-caption font-medium tracking-[0.02em] transition-all border flex items-center gap-1.5 shadow-2xs cursor-pointer",
                activeDifficulty === diff
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-secondary border-border hover:border-primary hover:text-primary",
              )}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Habit Cards Grid with NEW 30-Day Activity Heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-10">
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
            const dots = Array.from({ length: 4 }).map(
              (_, i) => i < difficultyLevel,
            );
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
                      <h3 className="text-card text-primary mb-1 truncate group-hover: transition-colors">
                        {habit.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] font-mono text-badge font-bold tracking-tight">
                          <Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[2]" />{" "}
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

                {/* NEW: 30-Day Activity Heatmap Grid */}
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
          {filteredHabits.length === 0 && (
            <div className="col-span-full py-12">
              <EmptyState
                icon={CheckCircle2}
                description="No habits found in this category"
                actionLabel="Create Habit"
                onAction={handleCreateHabit}
              />
            </div>
          )}
        </div>

        {/* Routine Section */}
        <div>
          <h2 className="text-section text-primary mb-3 ">
            Daily Routines Breakdown
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Morning */}
            <div className="v4-card p-5">
              <h3 className="text-card text-primary mb-2 uppercase tracking-[0.02em] flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Sun className="w-3.5 h-3.5 text-[#EA580C]" />
                  Morning Routine
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {morningHabits.length} habits
                </span>
              </h3>
              <div className="space-y-2">
                {morningHabits.map((habit) => (
                  <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                ))}
              </div>
              {morningHabits.length === 0 && (
                <span className="text-caption text-muted">
                  No morning habits configured.
                </span>
              )}
            </div>

            {/* Afternoon */}
            <div className="v4-card p-5">
              <h3 className="text-card text-primary mb-2 uppercase tracking-[0.02em] flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Sunset className="w-3.5 h-3.5 text-[#EAB308]" />
                  Afternoon Routine
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {afternoonHabits.length} habits
                </span>
              </h3>
              <div className="space-y-2">
                {afternoonHabits.map((habit) => (
                  <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                ))}
              </div>
              {afternoonHabits.length === 0 && (
                <span className="text-caption text-muted">
                  No afternoon habits configured.
                </span>
              )}
            </div>

            {/* Evening */}
            <div className="v4-card p-5">
              <h3 className="text-card text-primary mb-2 uppercase tracking-[0.02em] flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Moon className="w-3.5 h-3.5 text-[#7C3AED]" />
                  Evening Routine
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {eveningHabits.length} habits
                </span>
              </h3>
              <div className="space-y-2">
                {eveningHabits.map((habit) => (
                  <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                ))}
              </div>
              {eveningHabits.length === 0 && (
                <span className="text-caption text-muted">
                  No evening habits configured.
                </span>
              )}
            </div>
            
            {/* Anytime */}
            <div className="v4-card p-5">
              <h3 className="text-card text-primary mb-2 uppercase tracking-[0.02em] flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                  Anytime Habits
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {anytimeHabits.length} habits
                </span>
              </h3>
              <div className="space-y-2">
                {anytimeHabits.map((habit) => (
                  <HabitMainListItem key={habit.id} habit={habit} deleteMutation={deleteMutation} />
                ))}
              </div>
              {anytimeHabits.length === 0 && (
                <span className="text-caption text-muted">
                  No anytime habits configured.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* NEW: Dedicated Delete & Manage Routines Section */}
        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-section text-primary mb-3 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#DC2626]" /> Manage & Delete
                Routines
              </h2>
              <p className="text-caption text-secondary mt-0.5">
                Audit, archive, or permanently remove daily routines. All
                deletions support transactional 1-click Undo.
              </p>
            </div>
          </div>

          <div className="v4-card overflow-hidden divide-y divide-border/60">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-surface-hover/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-[#EA580C]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-body text-primary truncate">
                      {habit.name}
                    </div>
                    <div className="text-badge text-secondary font-mono flex items-center gap-2 mt-0.5">
                      <span>{habit.category || "General"}</span>
                      <span>•</span>
                      <span>
                        {habit.category || "daily"} (
                        {habit.expectedDurationMinutes || 15}m)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-caption font-mono font-medium text-secondary bg-surface-hover px-2 py-1 rounded border border-border">
                    {habit.streak}d streak
                  </span>
                  <button
                    onClick={() => handleEditHabit(habit)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface border border-border hover:border-primary text-secondary hover:text-primary transition-colors"
                    title="Edit Habit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <ConfirmDeleteButton
                    onConfirm={() => deleteMutation.mutate(habit.id)}
                    className="bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5] hover:border-[#F87171] text-[#DC2626]"
                    iconClassName="w-3.5 h-3.5"
                  />
                </div>
              </div>
            ))}
            {habits.length === 0 && (
              <div className="p-6 text-center text-caption text-muted font-mono">
                No routines configured to delete.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Daily Checklist Widget (30% on desktop, 100% on mobile) */}
      <div className="w-full lg:w-[30%] bg-surface-hover lg:h-full lg:overflow-y-auto p-4 sm:p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-border">
        <div className="v4-card p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#EA580C]" />

          <div className="flex items-center justify-between mt-1 mb-1">
            <span className="text-badge font-medium text-[#EA580C] uppercase tracking-[0.02em] flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 fill-[#EA580C]" /> Today's Tracker
            </span>
            <span className="text-caption font-mono font-bold text-primary bg-surface-hover px-2 py-0.5 rounded border border-border">
              {completedCount}/{totalHabits} Done
            </span>
          </div>
          <h2 className="text-section text-primary mb-3 ">{today}</h2>

          <div className="space-y-3">
            {todaysHabits.map((habit, index) => (
              <HabitTrackerRow key={habit.id} habit={habit} index={index} />
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between items-center text-caption">
              <span className="text-secondary font-medium">
                Daily Completion Rate
              </span>
              <span className="text-body font-medium text-primary font-mono">
                {progressPct}%
              </span>
            </div>
            <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden border border-border/40">
              <div
                className="h-full bg-[#EA580C] transition-all duration-400 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <HabitCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
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
