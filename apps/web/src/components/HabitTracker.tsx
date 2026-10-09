import type { HabitCreateInput, HabitUpdateInput, Habit } from '../types/schema';
import { HabitGridCard, HabitTrackerRow, PlantIllustration, RadialProgress } from './habits/HabitCards';
import { HabitFormModal } from './habits/HabitFormModal';
// UI-only refactor — no data/logic changes
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowRight,
    Calendar,
    ChevronLeft, ChevronRight,
    ClipboardList,
    Clock,
    Flame,
    Heart,
    Moon,
    Plus,
    Sun, Sunset,
    Target,
    TrendingUp,
    Zap
} from 'lucide-react';
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import { isHabitCompletedToday } from "../hooks/useHabitCompletion";
import {
    isHabitLoggableToday
} from "../lib/habitFilters";
import { cn } from "../lib/utils";
import { EmptyStateInline } from "./ui/EmptyStateInline";
import { ErrorState } from "./ui/ErrorState";
import { LoadingState } from "./ui/LoadingState";
import { PageHeader } from "./ui/PageHeader";

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
 const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
 const [defaultTimeOfDay, setDefaultTimeOfDay] = useState<NonNullable<HabitCreateInput["timeOfDay"]>>("morning");

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
      cadence: NonNullable<HabitCreateInput["cadence"]>;
      category: NonNullable<HabitCreateInput["category"]>;
      difficulty: NonNullable<HabitCreateInput["difficulty"]>;
      expectedDurationMinutes: number;
      scheduledDays: number[];
      timeOfDay: NonNullable<HabitCreateInput["timeOfDay"]>;
      weeklyTarget?: number;
      pinnedToPlanner?: boolean;
    }) =>
      api.habits.create({
        name: data.name,
        icon: data.icon,
        linkedGoalId: data.linkedGoalId,
        cadence: data.cadence,
        category: data.category,
        difficulty: data.difficulty,
        expectedDurationMinutes: data.expectedDurationMinutes,
        scheduledDays: data.scheduledDays,
        timeOfDay: data.timeOfDay,
        ...(data.cadence === "weekly" && data.weeklyTarget ? { weeklyTarget: data.weeklyTarget } : {}),
        pinnedToPlanner: data.pinnedToPlanner,
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
      const previousHabits = queryClient.getQueryData<Habit[]>(["habits"]);
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
      payload: HabitUpdateInput;
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

 const handleEditHabit = (habit: Habit) => {
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

  const getHabitTime = (h: Habit) => {
    const metadata = h.metadata && typeof h.metadata === "object" && !Array.isArray(h.metadata) ? h.metadata : {};
    return typeof metadata.timeOfDay === "string" ? metadata.timeOfDay : h.timeOfDay || "anytime";
  };

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
    setDefaultTimeOfDay((['morning', 'afternoon', 'evening', 'anytime'] as const).find(value => value === time) ?? 'morning');
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
