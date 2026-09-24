# 07 — Habits, Routines & Strategic Goals (OKR) Architecture

**Priority:** P2 (all three issues are correctness bugs, not outages — but each silently corrupts user-facing state over time)  
**Cross-reference:** `06-PLANNER-AND-CALENDAR.md` PLAN-04 (planner routine checkoffs route through `habitService`)  
**Touches:** `apps/server/src/services/habit.service.ts`, `apps/web/src/components/Goals.tsx`, `apps/server/src/services/goal.service.ts`

---

## 1. Scope

Stop off-schedule habit completions from crashing, stop goal creation from silently discarding a chosen `PAUSED`/`CANCELED` status, restore optimistic-locking on goal edits, and make Key Result deletion and restoration correctly recompute the parent Objective's progress instead of leaving it frozen at a stale value.

---

## 2. Hard Rules for This Section

- `HabitCompletion.offSchedule` is a real, intentional schema field — the fix is to *use* it, not to remove the concept of off-schedule completions.
- Goal `version` is an optimistic-concurrency field. Any goal update mutation must pass it through; do not "fix" a concurrency conflict by dropping the version check — that reintroduces silent overwrites, which is the exact bug being fixed.

---

## 3. Implemented Fixes

### HAB-01: Off-Schedule Habit Completion Crash
- **Root Cause:**
  - `apps/server/src/services/habit.service.ts` previously threw `throw new Error('Habit not scheduled for today')` if `offSchedule` was true. This crashed the request on the exact condition that the schema field `HabitCompletion.offSchedule Boolean @default(false)` was created to represent.
- **Implementation:**
  - Removed the exception in `habit.service.ts`.
  - Maintained calculation of `const offSchedule = !scheduled.includes(targetDate.getUTCDay())`.
  - Persisted `{ offSchedule }` directly on `habitRepository.addCompletion(...)`. Off-schedule completions now succeed (HTTP 200) and preserve telemetry in the database.

### GOAL-01: Silent Status Drop on Goal Creation
- **Root Cause:**
  - `GoalFormModal` allowed users to select `ACTIVE`, `PAUSED`, or `CANCELED`.
  - However, `createGoalMutation.mutationFn` in `apps/web/src/components/Goals.tsx` omitted `status` from the payload sent to `api.goals.create(...)`. Because the property was missing, backend creation defaulted to `ACTIVE`, dropping user intent.
- **Implementation:**
  - Updated `createGoalMutation` in `Goals.tsx` to include `status: data.status || 'ACTIVE'`.
  - Goal creation with `PAUSED` or `CANCELED` now correctly saves the chosen status into goal metadata and displays the appropriate status badge in the UI.

### GOAL-02: Optimistic Lock Bypass on Goal Edit
- **Root Cause:**
  - `GoalCard` and `handleModalSubmit` in `Goals.tsx` mutated goals without passing `version`.
  - The backend `goalService.updateGoal` enforces optimistic concurrency (`if (data.version !== undefined && existing.version !== data.version) throw new Error('Conflict: version mismatch')`), but because the frontend never supplied `version`, the check was bypassed, allowing concurrent overwrites.
- **Implementation:**
  - In `GoalCard` inline progress slider mutation, passed `version: goal.version`.
  - In `handleModalSubmit`, passed `version: editingGoal.version` inside `updateGoalDetailsMutation`.
  - Both frontend and backend now actively enforce optimistic concurrency control on goal updates.

### GOAL-03: Goal Progress Rollup on Key Result Deletion and Restoration
- **Root Cause:**
  - When a Key Result was soft-deleted via `deleteGoal` in `apps/server/src/services/goal.service.ts`, the parent Objective's progress remained frozen at its stale pre-deletion average.
  - Similarly, restoring a soft-deleted Key Result did not recompute the parent Objective's progress.
- **Implementation:**
  - Extracted the auto-rollup logic in `goal.service.ts` into a reusable private helper `recalculateParentRollup(parentGoalId: string, userId: string, tx: Prisma.TransactionClient)`:
    - Queries all active sibling Key Results (`where: { parentGoalId, deletedAt: null }`).
    - Calculates the average progress across active siblings (or 0 if all are deleted).
    - Updates parent Objective's `progress`, increments `version`, and upserts today's progress snapshot in `GoalProgressSnapshot`.
  - Invoked `recalculateParentRollup(existing.parentGoalId, userId, tx)`:
    - In `updateGoal` when a Key Result's progress changes.
    - In `deleteGoal` after marking the child goal soft-deleted.
    - In `restoreGoal` after restoring the child goal (`deletedAt: null`).

---

## 4. Section Completion Checklist

- [x] Off-schedule habit completions succeed and persist `offSchedule: true` (HAB-01).
- [x] Goal creation preserves a chosen `PAUSED`/`CANCELED` status instead of forcing `ACTIVE` (GOAL-01).
- [x] Goal edits enforce `version`-based optimistic locking on both frontend and backend (GOAL-02).
- [x] Deleting or restoring a Key Result recomputes its parent Objective's progress immediately (GOAL-03).
