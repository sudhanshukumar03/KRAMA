# 06 — Planner & Calendar Architecture

**Priority:** P0 (daily log creation crash blocks a core daily workflow) · P2 (milestone crash, routine/streak disconnect, wasteful queries)  
**Depends on:** `12-DATABASE-SCHEMA-MIGRATIONS.md` §12.1 (`TimeBlock.workspaceId`), `02-SECURITY-AND-IDOR.md` §SEC-04  
**Touches:** `apps/server/src/controllers/dailyLog.controller.ts`, `apps/web/src/components/planner/DailyLogSection.tsx`, `apps/server/src/routes/planner.routes.ts`, `apps/server/src/services/habit.service.ts`, `apps/web/src/components/planner/TodayView.tsx`, `apps/web/src/components/planner/PlannerMatrix.tsx`

---

## 1. Scope

Fix the two crashes that block daily log creation entirely (missing `workspaceId` and a P2002 unique-constraint violation on soft-deleted logs), fix the Prisma runtime validation error on milestone update/delete, reconnect planner routine checkoffs to the real habit-streak service, and stop the week view from always computing 7 days of data regardless of the requested range.

---

## 2. Hard Rules for This Section

- `DailyLog` has `@@unique([userId, workspaceId, date])` — any fix here must respect that constraint, not work around it by weakening the schema. The correct pattern is always "check for a soft-deleted row first, resurrect it if found," never "delete the unique constraint."
- Routine checkoffs in the Planner must delegate to `habitService`, not duplicate its streak logic locally. If you find yourself writing streak-increment math inside `planner.routes.ts`, stop — call the service instead.

---

## 3. Implemented Fixes

### PLAN-01 & PLAN-02: Daily Log Creation & Soft-Delete Resurrection (P2002 Fix)
- **Root Cause:**
  - `CreateDailyLogSchema` requires `workspaceId`. The controller directly parsed `req.body` without injecting `x-workspace-id` header or query fallback.
  - The lookup query previously filtered `deletedAt: null`. When attempting to re-create a daily log for a previously soft-deleted date, the lookup found nothing and attempted `prisma.dailyLog.create(...)`, triggering a fatal `P2002` compound unique constraint violation on `[userId, workspaceId, date]`.
- **Implementation:**
  - In `apps/server/src/controllers/dailyLog.controller.ts` (`createDailyLog`):
    - Extracted `workspaceId` from `(req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || req.body.workspaceId`.
    - Used canonical UTC noon (`logDate.setUTCHours(12, 0, 0, 0)`) to eliminate local timezone drift across server environments.
    - Queried `prisma.dailyLog.findFirst({ where: { workspaceId, userId: req.user!.id, date: logDate } })` without filtering `deletedAt`.
    - If found and `!existing.deletedAt`, returned `409` (`Log already exists for this date. Use PATCH to update.`).
    - If found and `existing.deletedAt`, resurrected the row via `prisma.dailyLog.update({ where: { id: existing.id }, data: { ...data, deletedAt: null, updatedBy: req.user!.id } })`, returning `200`.
    - If not found, created via `prisma.dailyLog.create({ data: { ...data, date: logDate, userId: req.user!.id, createdBy: req.user!.id } })`, returning `201`.
  - In `apps/web/src/components/planner/DailyLogSection.tsx`:
    - Connected `useAuth()` to provide `workspaceId` in the payload for defense in depth.

### PLAN-03: Milestone Update/Delete Prisma Validation Error
- **Root Cause:**
  - `prisma.milestone.update` and `delete` passed `{ where: { id: req.params.id, userId } }`. In Prisma, `where` clauses on `update`/`delete` must target unique fields (`@id` or `@@unique`). `Milestone` only defines `@id` on `id`, causing Prisma Client runtime validation exceptions.
- **Implementation:**
  - In `apps/server/src/routes/planner.routes.ts`:
    - Updated `PATCH /milestones/:id` to verify ownership via `prisma.milestone.findFirst({ where: { id: req.params.id as string, userId } })`. Returned `404` if not found or unauthorized.
    - Updated by bare unique ID: `prisma.milestone.update({ where: { id: existing.id }, data: dataToUpdate })`.
    - Updated `DELETE /milestones/:id` using the same pattern with `prisma.milestone.delete({ where: { id: existing.id } })`.

### PLAN-04: Planner Routine Checkoffs Delegate to Habit Streak Service
- **Root Cause:**
  - Checking off a routine occurrence in `/app/planner` previously performed a direct `prisma.habitCompletion.upsert`, bypassing `habitService.ts` entirely. Consequently, habit streaks were never incremented, and `HABIT_LOGGED` domain events were never emitted.
- **Implementation:**
  - In `apps/server/src/services/habit.service.ts`:
    - Enhanced `logHabitCompletion` and `unlogHabitCompletion` to accept either an options object `{ id, workspaceId, userId, dateIso, dateStr, allowOffSchedule }` or positional parameters.
    - Handled habits pinned to planner (`pinnedToPlanner`) and off-schedule execution without throwing errors.
  - In `apps/server/src/routes/planner.routes.ts` (`PATCH /routine-occurrences`):
    - Removed manual `prisma.habitCompletion.upsert` and `deleteMany`.
    - Delegated checkoff directly to `habitService.logHabitCompletion({ id: body.habitId, userId, workspaceId, dateIso: targetDate.toISOString() })`.
    - Delegated uncheck to `habitService.unlogHabitCompletion({ id: body.habitId, userId, workspaceId, dateIso: targetDate.toISOString() })`.

### PLAN-05: Dynamic Range Loop & Unscheduled Tasks Backlog
- **Root Cause:**
  - `GET /week` hardcoded an iteration of 7 days (`for (let i = 0; i < 7; i++)`) regardless of the date range requested. Single-day calls (e.g. from `TodayView.tsx`) wasted bandwidth and computation generating empty future day objects.
  - Unscheduled tasks were queried (`scheduledDate: null, status: { not: 'DONE' }`), but then discarded inside the loop via `if (!d) return false`.
- **Implementation:**
  - In `apps/server/src/routes/planner.routes.ts`:
    - Calculated `dayCount = Math.max(1, Math.round((endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24)) + 1)`.
    - Looped for `Math.min(dayCount, 31)` days, preventing memory/CPU exhaustion while matching exact single-day or multi-day requests.
    - Filtered and mapped unscheduled tasks explicitly:
      ```ts
      const unscheduledTasks = tasks.filter((t: any) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELED').map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        completed: t.status === 'DONE',
        scheduledDate: null,
        dueDate: null,
        estimateMinutes: t.estimateMinutes,
      }));
      ```
    - Returned `backlog: unscheduledTasks`, `workDayMinutes`, and merged `tasks: [...allMappedTasks, ...unscheduledTasks]` so `PlannerMatrix.tsx` backlog drawer renders pending tasks without extra queries.

---

## 4. Section Completion Checklist

- [x] Daily log creation no longer 400s on missing `workspaceId` (PLAN-01).
- [x] Creating a daily log for a date with a soft-deleted prior log resurrects it instead of crashing with P2002 (PLAN-02).
- [x] Milestone update/delete no longer throw Prisma validation errors, and enforce per-user ownership via `findFirst` (PLAN-03).
- [x] Routine checkoffs from the Planner increment real habit streaks via `habitService`, not a local upsert (PLAN-04).
- [x] Week view returns exactly the requested day range, not always 7; unscheduled tasks are genuinely surfaced as backlog (PLAN-05).
