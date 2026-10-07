# 09 — Dashboard & Analytics Architecture

**Priority:** P2 (OOM risk + cross-user data leak are the serious parts; the rest is UX)  
**Touches:** `apps/server/src/controllers/dashboard.controller.ts`, `apps/server/src/services/analytics.service.ts`, `apps/web/src/components/Dashboard.tsx`, `apps/web/src/components/AppShell.tsx`, `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/AnalyticsPage.tsx`

---

## 1. Scope

Stop the dashboard endpoint from loading entire document bodies into memory just to count them, stop it from leaking other workspace members' focus sessions onto a user's own dashboard, fix the viewport clipping bug that hides bottom cards on laptop screens, and mount a real analytics page where the route currently dead-redirects.

---

## 2. Hard Rules for This Section

- Use `prisma.<model>.count(...)` for any query whose only purpose is a count — never `findMany` followed by `.length`. This is the exact defect being fixed; don't reintroduce it elsewhere in the same file while you're in there.
- Every dashboard query that returns per-user data (focus sessions, personal stats) must filter by `userId`, not just `workspaceId` — the leak in this file is a missing `userId` filter, not a missing `workspaceId` one (that part was already correct).

---

## 3. Implemented Fixes

### DASH-01: Dashboard OOM Hazard & Cross-User Focus Session Leak (Ref: Audit §7.1)
- **Root Cause:**
  1. `prisma.document.findMany({ where: { space: { workspaceId }, deletedAt: null } })` had no `select` clause, loading every document's complete TipTap JSON and markdown body into Node.js memory solely to compute `pages.length` for a dashboard stat card. On workspaces with large or numerous documents, this caused excessive memory consumption and OOM hazards.
  2. `prisma.focusSession.findMany({ where: { workspaceId } })` lacked a `userId` filter — returning all workspace members' focus sessions (duration, task, timing) to every other member viewing their dashboard.
- **Implementation (`apps/server/src/controllers/dashboard.controller.ts`):**
  - Replaced the full document fetch with an efficient SQL count:
    ```ts
    prisma.document.count({ where: { space: { workspaceId }, deletedAt: null } })
    ```
  - Scoped focus session queries to both `workspaceId` and the requesting user:
    ```ts
    prisma.focusSession.findMany({ where: { workspaceId, userId: req.user!.id }, orderBy: { createdAt: 'desc' } })
    ```
  - Updated downstream dashboard statistics:
    ```ts
    hasNote: noteCount > 0,
    totalNotes: noteCount,
    ```

### DASH-02: Dashboard Viewport Overflow Lock (Ref: Audit §7.1 pt. 3, §9.3)
- **Root Cause:**
  - `overflow-hidden` on the dashboard's root container clipped the lower half of the page ("Due Today", "Activity Feed", "Goal Progress") on 1080p and smaller laptop screens with no scrolling capability.
- **Implementation (`apps/web/src/components/Dashboard.tsx`):**
  - Replaced `overflow-hidden` with `overflow-y-auto min-h-0` on line 74:
    ```tsx
    <div className="h-full w-full max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 pt-6 pb-6 flex flex-col justify-between overflow-y-auto min-h-0 animate-in fade-in duration-200">
    ```
  - `min-h-0` allows the flex child to shrink properly within the flex container so `overflow-y-auto` provides fluid vertical scrolling on constrained viewports.

### DASH-03: Dead Analytics Route (Ref: Audit §9.2)
- **Root Cause:**
  - `/app/analytics` was a dead redirect (`<Route path="/analytics/*" element={<Navigate to="/app/" replace />} />`) in `AppShell.tsx`, despite the analytics backend worker and endpoints (`/api/v1/analytics/overview` and `/api/v1/analytics/focus-history`) already computing velocity, deep work, streaks, and OKR pace.
- **Implementation:**
  - **Component (`apps/web/src/components/AnalyticsPage.tsx`):**
    - Built a comprehensive analytics UI consuming `api.analytics.overview(range)` and `api.analytics.focusHistory(range)`.
    - Features:
      - Time range selector (`7d`, `30d`, `90d`).
      - KPI summary cards (Weekly Velocity, Deep Work Logged, Active Habit Streaks, OKR Target Pace).
      - Recharts Weekly Velocity area chart.
      - Recharts Deep Work Hours bar chart.
      - Strategic OKR pace progress indicators.
      - Historical Deep Work & Focus Sessions log list.
  - **Routing & Shell (`apps/web/src/components/AppShell.tsx`):**
    - Imported `AnalyticsPage` and mounted `<Route path="/analytics/*" element={<AnalyticsPage />} />`.
    - Added `/app/analytics` to `isFlushRoute` for proper container styling.
  - **Navigation (`apps/web/src/components/Sidebar.tsx`):**
    - Added an Analytics link with `TrendingUp` icon under `overviewItems` (`shortcut: 'G A'`).
  - **Service Layer (`apps/server/src/services/analytics.service.ts`):**
    - Enhanced `getOverview` with live real-time backfill of the current day's metrics if the nightly BullMQ worker has not run yet.

---

## 4. Verification

1. **Dashboard Memory & Scoping (DASH-01):**
   - Verified `dashboard.controller.ts` executes `prisma.document.count` instead of `findMany`, running a fast SQL `COUNT(*)` query with zero document body memory allocation.
   - Verified `focusSession` query filters by `userId: req.user!.id`, preventing cross-member session leakage.
2. **Dashboard Responsiveness (DASH-02):**
   - Confirmed root element contains `overflow-y-auto min-h-0`, allowing all dashboard sections (Due Today, Activity Feed, Goal Progress) to be scrolled and fully accessible on all viewports.
3. **Analytics Page & Navigation (DASH-03):**
   - Verified `/app/analytics` mounts `AnalyticsPage` rendering real metrics, charts, and focus logs.
   - Verified full client build (`vite build`) and server typecheck (`tsc --noEmit`) pass with 0 errors.

---

## 5. Section Completion Checklist

- [x] Dashboard document count uses `prisma.document.count`, not a full `findMany` (DASH-01).
- [x] Dashboard focus sessions are scoped to the requesting user, not the whole workspace (DASH-01).
- [x] Dashboard is scrollable on smaller viewports; no clipped cards (DASH-02).
- [x] `/app/analytics` renders a real page with real data, not a redirect (DASH-03).

## 6. Dashboard and Analytics follow-up — 2026-10-07

**Status: COMPLETE — 18 follow-up findings repaired.** The current implementation supersedes the earlier live-backfill and “OKR pace” descriptions in this document. Analytics reads live source records for exactly 7/30/90 days; personal focus, Planner logs and streaks are user-scoped. Current top-level goal progress is labelled as progress.

The repaired list is DASH-04–21: personal history scope, frozen snapshots, dense date ranges, work-only focus totals, separate Planner logs, stable task completion dates, history pagination, independent retry controls, accurate goal aggregation, calendar/instant boundaries, personal activity, responsive scrolling, task completion/version handling, direct habit checkoffs, progress previews, accessible Quick Capture with draft retention, connected refresh, and accessible charts/table/CSV export.

Verification: 9 Dashboard/Analytics live checks and 18 reporting-time/habit-timezone/Planner-capacity unit checks passed. Frontend/backend builds and lint passed. Temporary verification fixtures were removed. Legacy task dates, current-goal reporting, cross-midnight focus allocation and bounded Dashboard previews are documented in the review.

## 7. Dashboard and Analytics UI follow-up — 2026-10-07

**Complete: DASH-22–29, eight additional UI/usability findings repaired; 26 follow-up repairs in total.**

The follow-up improves focus hierarchy, task filters/counts and checked states, task/history detail destinations, overdue ranking, separation of current snapshots from range totals, Daily/7-day rolling chart controls, guided empty states, failed history-page recovery, break labels, refresh feedback, theme-aware accent text/progress, mobile loading containment and accessible retry controls.

The expanded live suite has eleven checks. The frontend production build/typecheck and lint were repeated. Reporting boundaries from the functional pass still apply; no deployment or real-user data was changed.

The subsequent connected-flow audit corrected Dashboard/Analytics Start Focus links to the mounted `/focus` destination and verified both in the browser. The Focus accounting/scheduling and Brain-to-goal integration findings are now repaired and verified. All 11 Dashboard/Analytics regression tests passed again after those repairs.

## 8. Analytics follow-up UI repairs — 2026-10-07

**ANUI-01–06 repaired.** Repairs cover reporting controls, compact mobile metrics, empty chart sizing, cached-report recovery after refresh failure, retained daily-data expansion, and explicit date/duration units. All 11 regression tests passed, including new recovery and return-navigation checks. The final responsive toolbar check, frontend build and lint also passed. This pass retains the restored global UI style.

## 9. Planned and judged visual polish — 2026-10-07

**KUI-01–05 addressed on Dashboard and Analytics.** Changes include grouped reporting controls/metrics, clearer typography, quieter supporting surfaces, compact empty charts and stronger daily focus hierarchy. Existing palette, shell and repaired workflows remain. All twelve live checks, frontend build/typecheck and lint passed.
