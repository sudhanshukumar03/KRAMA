import type { HabitCreateInput, HabitUpdateInput, Habit } from '../types/schema';
import { HabitGridCard, PlantIllustration } from './habits/HabitCards';
import { HabitFormModal } from './habits/HabitFormModal';
// UI-only refactor — no data/logic changes
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Clock,
    Flame,
    Moon,
    Plus,
    Sun, Sunset,
} from 'lucide-react';
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import { cn } from "../lib/utils";
import { EmptyStateInline } from "./ui/EmptyStateInline";
import { ErrorState } from "./ui/ErrorState";
import { LoadingState } from "./ui/LoadingState";
import { PageHeader } from "./ui/PageHeader";
import { useLocalDay } from '../hooks/useLocalDay';

export function HabitTracker() {
 useLocalDay();
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

 if (isLoading)
 return (
 <LoadingState
 variant="habit-tracker"
 title="Loading Habits..."
 description="Loading your habits and recent completions..."
 />
 );
 if (isError) {
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

  const handleOpenCreateWithTime = (time: string) => {
    setDefaultTimeOfDay((['morning', 'afternoon', 'evening', 'anytime'] as const).find(value => value === time) ?? 'morning');
    setCreateModalOpen(true);
  };

  return (
    <div className="workspace-habits flex flex-col lg:flex-row h-full w-full bg-canvas animate-in fade-in duration-150 overflow-y-auto lg:overflow-hidden relative">
      {/* LEFT COLUMN: Main Content */}
      <div className="workspace-habit-main flex-1 lg:h-full lg:overflow-y-auto px-6 py-6 space-y-6 relative min-w-0">
        <PageHeader
          icon={Flame}
          title="Habits"
          description="Choose routines you want to keep up with and check them off as you go."
          primaryAction={{
            label: 'Create Habit',
            icon: Plus,
            onClick: () => handleOpenCreateWithTime(activeTimeOfDay || 'morning'),
          }}
          className="shrink-0"
        />

        {goalsError && <ErrorState title="Goal links are unavailable" message="Your habits are available. Retry to load linked goals." onRetry={() => { void retryGoals(); }} />}
        {/* Time of Day Filter Pills row */}
        {habits.length > 0 && <div role="tablist" aria-label="Habit time of day filter" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTimeOfDay === null}
            onClick={() => setActiveTimeOfDay(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
              activeTimeOfDay === null
                ? "bg-card text-primary font-bold border border-border shadow-2xs ring-1 ring-border"
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
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTimeOfDay(isSelected ? null : tf.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
                  isSelected
                    ? "bg-card text-primary font-bold border-accent/40 shadow-2xs ring-1 ring-accent/20"
                    : "bg-surface/70 text-secondary border-border/80 hover:border-primary/40 hover:text-primary backdrop-blur-sm"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-accent-fg" : tf.iconColor)} />
                <span>{tf.label}</span>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                  isSelected
                    ? "bg-accent-subtle text-accent-fg font-bold"
                    : "bg-surface-hover text-muted"
                )}>
                  {tf.count}
                </span>
              </button>
            );
          })}
        </div>}

        {/* Main Empty State Card (when habits.length === 0) */}
        {habits.length === 0 ? (
          <div className="workspace-habit-empty relative krama-card p-8 sm:p-12 flex flex-col items-center text-center max-w-3xl mx-auto my-2 backdrop-blur-sm overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            <PlantIllustration />
            <h2 className="text-base sm:text-lg font-bold text-primary tracking-tight">No habits created yet</h2>
            <p className="text-xs text-secondary mt-1 max-w-sm">
              Start with something you want to do regularly. Choose the days that suit you, then record each time you do it.
            </p>

            <button
              type="button"
              onClick={() => handleOpenCreateWithTime("morning")}
              className="mt-5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create First Habit</span>
            </button>

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

      {createModalOpen && (
        <HabitFormModal
          mode="create"
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          defaultTimeOfDay={defaultTimeOfDay}
          onSubmit={(data) => createHabitMutation.mutate(data)}
          isSubmitting={createHabitMutation.isPending}
          goals={goals}
          goalsUnavailable={goalsError || goalsLoading}
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
          goalsUnavailable={goalsError || goalsLoading}
          initialData={editingHabit}
        />
      )}
    </div>
  );
}
