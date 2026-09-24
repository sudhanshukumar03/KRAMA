# 04 — Execution Board (Kanban) & Sprint Lifecycle Architecture

**Priority:** P1 (cache split breaks the core capture→board flow) · P2 (status corruption, sprint math)  
**Depends on:** `02-SECURITY-AND-IDOR.md` (SEC-02, sprint report IDOR — same subsystem, already closed)  
**Touches:** `apps/web/src/components/KanbanBoard.tsx`, `apps/web/src/components/SprintView.tsx`, `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/ui/QuickCaptureModal.tsx`, `apps/web/src/components/editor/SelectionToTaskModal.tsx`, `apps/server/src/controllers/sprint.controller.ts`, `apps/server/src/routes/sprint.routes.ts`, `apps/web/src/components/planner/TodayView.tsx`, `apps/web/src/components/planner/PlannerMatrix.tsx`, `apps/web/src/api/client.ts`

---

## 1. Scope

Fix the React Query cache-key mismatch that made new tasks invisible until manual reload, restore the two missing Kanban statuses (`TODO`, `CANCELED`), correct the `CANCELED`/`CANCELLED` spelling defect across the codebase, ensure sprint deletion does not orphan attached tasks in the database, and resolve three compounding sprint board defects (vanishing canceled tasks, progress percentage capped below 100%, and canceled tasks resurrecting into the backlog upon sprint completion).

---

## 2. Hard Rules for This Section

- **Enum Invariance:** The `TaskStatus` enum (`BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, CANCELED`) is the schema's source of truth — the frontend was aligned to match it without modifying database enum definitions.
- **Drag-and-Drop Integrity:** Drag mechanics, position recalculation, and subtask hierarchy behavior were strictly preserved while fixing the status mapping and cache invalidation.
- **Spelling Invariance:** `CANCELED` is single-L. Zero instances of `CANCELLED` remain in `apps/web/src`.

---

## 3. KAN-01 — React Query Cache Key Split (Ref: Audit §4.4)

**Symptom:** Tasks captured via Quick Capture, the selection-to-task editor modal, or AI suggestion acceptance did not appear on the Kanban board or increment sidebar badges until a manual page reload.

**Root cause:** Readers queried under key `['issues']` (`KanbanBoard.tsx`, `SprintView.tsx`, `Sidebar.tsx`), while writers invalidated key `['tasks']` (`QuickCaptureModal.tsx`, `SelectionToTaskModal.tsx`, `DailyLogSection.tsx`).

**Remediation:**
Standardized on dual-invalidation across all task mutation call sites:
```ts
queryClient.invalidateQueries({ queryKey: ['issues'] });
queryClient.invalidateQueries({ queryKey: ['tasks'] });
```
Applied in:
- `apps/web/src/components/ui/QuickCaptureModal.tsx`
- `apps/web/src/components/editor/SelectionToTaskModal.tsx`
- `apps/web/src/components/planner/DailyLogSection.tsx`
- `apps/web/src/components/KanbanBoard.tsx` (create and update mutations)
- `apps/web/src/components/SprintView.tsx`

**Verification:** Quick-capturing a task or creating one via the selection modal immediately updates both `['tasks']` and `['issues']` subscribers without page reloads.

---

## 4. KAN-02 — Kanban Status Corruption & Dropped Columns (Ref: Audit §6.1)

**Symptom:**
1. `STATUS_COLUMNS` rendered only 4 columns (`BACKLOG, IN_PROGRESS, REVIEW, DONE`); `TODO` and `CANCELED` had no representation.
2. `TODO` tasks were silently grouped into `BACKLOG`.
3. Dropping any task on a `TODO` card executed `newStatus = (overIssueData.status === "TODO" ? "BACKLOG" : overIssueData.status)`, permanently rewriting `TODO` tasks to `BACKLOG`.
4. `CANCELED` tasks were permanently hidden from the Kanban board.

**File:** `apps/web/src/components/KanbanBoard.tsx`

**Remediation:**
1. Added `TODO` as a first-class column in `STATUS_COLUMNS`:
```tsx
{
  id: "TODO" as TaskStatus,
  title: "To Do",
  subtitle: "Ready for execution",
  icon: ListChecks,
  iconColor: "text-info-fg",
  bgLight: "bg-surface border-border/80",
  topBorder: "border-t-[3px] border-t-info-border",
  badgeBg: "bg-info-bg text-info-fg border border-info-border",
  addText: "text-info-fg hover:bg-info-bg hover:border-info-border",
}
```
2. Defined `CANCELED_COLUMN` and added a reachable **Archive** toggle button in the filter toolbar:
```tsx
const [showCanceledArchive, setShowCanceledArchive] = useState(false);
const visibleColumns = useMemo(
  () => showCanceledArchive ? [...STATUS_COLUMNS, CANCELED_COLUMN] : STATUS_COLUMNS,
  [showCanceledArchive]
);
```
3. Removed the corrupting drop rewrite entirely:
```ts
// Before:
newStatus = (overIssueData.status === "TODO" ? "BACKLOG" : overIssueData.status) as TaskStatus;
// After:
newStatus = overIssueData.status as TaskStatus;
```
4. Scoped `getColumnIssues` directly to each column ID (`filteredIssues.filter(i => i.status === colId)`).

**Verification:** Newly captured tasks in `TODO` state appear in the To Do column. Dragging onto a `TODO` card keeps the task in `TODO`. Clicking "Archive" reveals the Canceled column with live counter.

---

## 5. KAN-03 — `CANCELLED` vs `CANCELED` Spelling Bug (Ref: Audit §6.2)

**Symptom:** Canceled tasks lingered in active checklists forever because checks checked `t.status === 'CANCELLED'`, which never matched Prisma's `CANCELED`.

**Files:**
- `apps/web/src/components/planner/TodayView.tsx` (line 174)
- `apps/web/src/components/planner/PlannerMatrix.tsx` (line 428)

**Remediation:**
Replaced all occurrences of `'CANCELLED'` with `'CANCELED'`:
```tsx
const isCompleted = t.status === 'DONE' || t.status === 'CANCELED';
```
Verified across `apps/web/src` with `grep_search`: zero matches for `"CANCELLED"` remain.

---

## 6. KAN-04 — Orphaned Tasks on Sprint Deletion (Ref: Audit §7.2)

**Symptom:** Soft-deleting a sprint left `task.sprintId` pointing to the deleted sprint, corrupting backlog queries and burndown time series.

**File:** `apps/server/src/controllers/sprint.controller.ts`

**Remediation:**
Wrapped soft-deletion and task dissociation in a single atomic transaction:
```ts
await prisma.$transaction([
  prisma.sprint.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedBy: req.user!.id,
    },
  }),
  prisma.task.updateMany({
    where: { sprintId: id },
    data: { sprintId: null },
  }),
]);
```

**Verification:** Deleting a sprint atomically updates all child tasks to `sprintId: null`, safely releasing them back to the unassigned backlog.

---

## 7. KAN-05 — Sprint Board Fixes & Batch Sprint Completion (Ref: Audit §6.8)

**Symptom:**
1. Canceled tasks disappeared from the sprint board.
2. Progress math included canceled tasks in the denominator without including them in the numerator, capping progress below 100%.
3. Completing a sprint stripped `sprintId` from canceled tasks, resurrecting them into the backlog.
4. Sprint completion fired N sequential PATCH calls across the network.

**Files:**
- `apps/server/src/controllers/sprint.controller.ts` (`completeSprint`)
- `apps/server/src/routes/sprint.routes.ts` (`POST /:id/complete`)
- `apps/web/src/api/client.ts` (`api.sprints.complete`)
- `apps/web/src/components/SprintView.tsx`

**Remediation:**
1. **Accurate Directive Segregation & Progress Math:**
```tsx
const currentFocusDirectives = useMemo(
  () => sprintDirectives.filter(i => i.status === 'IN_PROGRESS' || i.status === 'REVIEW'),
  [sprintDirectives]
);
const upNextDirectives = useMemo(
  () => sprintDirectives.filter(i => i.status === 'BACKLOG' || i.status === 'TODO'),
  [sprintDirectives]
);
const completedDirectives = useMemo(
  () => sprintDirectives.filter(i => i.status === 'DONE'),
  [sprintDirectives]
);
const canceledDirectives = useMemo(
  () => sprintDirectives.filter(i => i.status === 'CANCELED'),
  [sprintDirectives]
);

const totalCount = sprintDirectives.length;
const doneCount = completedDirectives.length;
const canceledCount = canceledDirectives.length;
const activeSprintTarget = totalCount - canceledCount;
const progressPct = activeSprintTarget > 0 ? Math.round((doneCount / activeSprintTarget) * 100) : 0;
```
2. **Dedicated Canceled Section:** Rendered `canceledDirectives` in a dedicated section inside the Completed column.
3. **No Resurrection of Canceled Directives:** Incomplete tasks to release are filtered strictly as `status !== 'DONE' && status !== 'CANCELED'`.
4. **Atomic Batch Sprint Completion:** Implemented `POST /api/v1/sprints/:id/complete` on the server executing in a single transaction:
```ts
const [updatedSprint, releasedTasks] = await prisma.$transaction([
  prisma.sprint.update({
    where: { id },
    data: {
      status: 'completed',
      version: { increment: 1 },
      updatedBy: req.user!.id,
    },
  }),
  prisma.task.updateMany({
    where: {
      sprintId: id,
      status: { notIn: ['DONE', 'CANCELED'] },
    },
    data: { sprintId: null },
  }),
]);
```
Replaced sequential client loops with `await api.sprints.complete(activeSprint.id)`.

---

## 8. Verification Checklist

- [x] **KAN-01:** Quick Capture and selection-to-task invalidate both `['issues']` and `['tasks']`.
- [x] **KAN-02:** `TODO` has its own Kanban column; `CANCELED` has a toggleable Archive column; drop handler status rewrite bug is eliminated.
- [x] **KAN-03:** Zero occurrences of `'CANCELLED'` (two Ls) remain in `apps/web/src`.
- [x] **KAN-04:** Sprint deletion nulls `sprintId` on attached tasks via an atomic transaction.
- [x] **KAN-05:** Sprint board displays canceled tasks, progress math reaches 100% when active directives are completed, and canceled tasks retain their sprint association.
- [x] **Sprint Completion Batch Endpoint:** `POST /api/v1/sprints/:id/complete` performs completion and task release in a single server-side transaction.
- [x] **TypeScript & Linter:** `pnpm --filter server exec tsc --noEmit`, `pnpm --filter client exec tsc -b`, and `pnpm run lint` all pass with 0 errors.
