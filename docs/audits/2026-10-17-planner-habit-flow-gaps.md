# Planner and Habit flow gaps

Scope: read-only investigation of application code, plus three isolated Chromium reproductions against the production frontend using synthetic data. No application source or personal records were changed. The three reproductions document existing defects; their passing results do not indicate repairs.

Update, 18 October: item 3's pre-creation/future completion restriction is now implemented and verified. See [habit repairs](2026-10-18-habit-repairs.md). Other findings below retain their original audit status.

## 1. Pinned habits disappear from the daily execution view — high priority

The weekly matrix renders `data.routines`, but `TodayView` has no routine input/actions or rendering. The parent provides routine actions only to the matrix. Opening a day loses the habits the user just planned for it.

Reproduced: the same pinned reading habit appears in Habits and Planner Week, then has no matching content in Planner Day.

Evidence: [weekly rendering](../../apps/web/src/components/planner/PlannerMatrix.tsx:261), [daily view wiring](../../apps/web/src/components/planner/PlannerPage.tsx:521), [daily view](../../apps/web/src/components/planner/TodayView.tsx:30).

Correction: a day should expose the pinned habits eligible for that selected date, including their completion status and undo action. It should use the existing habit/date completion record. Off-days should remain clear and non-actionable except for undoing existing extra logs.

## 2. The two screens disagree about which week a completion belongs to — high priority

Planner uses Monday–Sunday and ISO week numbering. Habit weekly counts and server streaks use Sunday–Saturday. This makes a weekly habit's displayed target progress disagree with the visible Planner week on Sunday.

Reproduced on Sunday 18 October 2026 with completions on 15, 16 and 17 October: Habits shows `0/3 this week`, while Planner's current week still contains the three completed entries and the same `3 per week` target.

Evidence: [Planner week boundary](../../apps/web/src/hooks/usePlannerWeek.ts:16), [Habit count boundary](../../apps/web/src/lib/habitFilters.ts:29), [server streak boundary](../../apps/server/src/services/habitStreak.service.ts:54).

Correction: choose one week boundary for Planner, Habit target counts, streaks and heatmaps. Changing a calendar convention requires an explicit compatibility decision for existing weekly streak history; it should not silently recalculate old achievements.

## 3. Planned future occurrences can be treated as completed work — high priority

Routine buttons are disabled for unscheduled days, but not future dates. The mutation checks schedule eligibility only. The log schema validates date syntax, and the service validates the canonical date, but neither limits completion dates to today/past or checks the habit's creation date. Occurrence generation also ignores creation date.

Reproduced: with the clock fixed to Saturday 17 October, Sunday's completion control is enabled. Future persistence and pre-creation behavior were traced in source, not exercised against the live database.

Evidence: [routine control](../../apps/web/src/components/planner/PlannerMatrix.tsx:291), [mutation guard](../../apps/web/src/hooks/usePlannerWeek.ts:80), [date validation and write](../../apps/server/src/services/habit.service.ts:182), [occurrence generation](../../apps/server/src/services/planner.service.ts:270), [request validation](../../packages/validation/src/execution.ts:97).

Correction: distinguish planning an occurrence from completing it. Reject future and pre-creation completion dates on the server, using the application's agreed user-local date policy, and disable the corresponding UI action. Valid historical backfilling should remain possible.

## 4. Habit time preferences and effort stop at the Habits screen — integration gap

Habits capture morning/afternoon/evening and expected duration, but Planner's routine response keeps only ID, name, cadence, weekdays and weekly target. The time-block contract links tasks/projects, with no habit link. Planner capacity uses time blocks and qualifying holidays, not habit effort.

Consequences: a 30-minute morning habit has no corresponding placement or duration in Planner. Creating a similarly named personal time block does not establish a relationship to that habit or its completion record. The Free Time number describes block availability and does not account for unallocated habit effort.

Evidence: [form fields](../../apps/web/src/components/habits/HabitFormModal.tsx:321), [routine response](../../apps/server/src/services/planner.service.ts:246), [shared routine/block contract](../../packages/types/src/planner.ts:6), [capacity inputs](../../apps/server/src/services/planner.service.ts:236).

Correction: retain habit duration and time-of-day context in daily planning. Keep pinning as a visibility choice; make timed allocation explicit. Any future allocation must reference the habit and date and avoid counting the same effort twice. Until then, label block-based availability clearly rather than implying habits have been allocated.

## 5. Creating a habit does not clearly explain how to include it in Planner — discoverability gap

The create form declares an optional `pinnedToPlanner` value but does not render or submit a choice for it. New habits default to unpinned on the server. Planner filters its visible routine rows to pinned habits. Inclusion is available later in the habit card's menu or Planner's Pin Routine dialog.

This is an intentional opt-in mechanism with an incomplete explanation: a user can configure a habit's weekdays and time-of-day and reasonably expect it in their plan, yet never see it there.

Evidence: [create form submission](../../apps/web/src/components/habits/HabitFormModal.tsx:102), [default pin state](../../apps/server/src/services/habit.service.ts:37), [Planner filtering](../../apps/server/src/services/planner.service.ts:246), [existing card action](../../apps/web/src/components/habits/HabitCards.tsx:228).

Correction: expose the existing “Show in Planner” choice during creation/editing, explain what it means, and provide a direct route to the selected day's plan after pinning. No duplicate habit or separate routine entity is needed.

## Verification and repair order

Three reproduction checks completed in Chromium. [Results](../../.audit/planner-habit-gap-results.json), [test source](../../.audit/planner-habit-gap.spec.ts), [week screenshot](../../.audit/planner-habit-gap-week.png), [day screenshot](../../.audit/planner-habit-gap-day.png).

```powershell
corepack pnpm exec playwright test --config .audit/planner-habit-gap.config.ts
```

An initial synthetic fixture used an unpadded day in its creation timestamp and caused an invalid-date failure; correcting the fixture produced the final three successful reproductions. That fixture mistake is not counted as a product defect.

Repair order: restore the week-to-day habit flow, enforce completion-date eligibility, decide and unify week boundaries, then clarify pinning and time allocation. Verify daily and weekly habits, rest days, weekly targets, midnight, selected historical dates, future dates, creation boundaries, completion/undo sync and deletion/restore.

The current implementation already shares canonical habit/date completion endpoints and invalidates the Habit and Planner queries after completion. The principal missing bridge is daily planning/execution and consistent recurrence policy, rather than separate copies of completion data.
