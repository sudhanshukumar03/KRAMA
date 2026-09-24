# 11 — Focus Mode: Full-Screen Timer Feature Architecture

**Priority:** New feature (additive) — built and verified.  
**Depends on:** `08-REALTIME-EVENTS.md` (`socketService.emitToUser` verified and active), `01-AUTH-AND-WORKSPACE.md` (in-memory token bootstrap via `AuthContext`).  
**Status of underlying data:** No DB migrations required — all referenced data fields exist in the schema (`FocusSession`, `Task.estimateMinutes`, `TimeBlock`, `User.weeklyCapacityMinutes`, `User.metadata.timerPreferences`).  
**Touches:**
- `apps/server/src/services/focusTimer.service.ts`
- `apps/server/src/controllers/focusSession.controller.ts`
- `apps/server/src/routes/focusSession.routes.ts`
- `apps/web/src/api/client.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/components/AppShell.tsx`
- `apps/web/src/providers/SocketProvider.tsx`
- `apps/web/src/components/FocusPage.tsx`
- `apps/web/src/components/focus/*` (`TimerMoreMenu.tsx`, `TimerLayoutCentered.tsx`, `TimerLayoutZen.tsx`, `TimerLayoutCard.tsx`, `TimerLayoutOverlay.tsx`, `TimerLayoutSidebar.tsx`, `TimerLayoutStandby.tsx`, `WallpaperPicker.tsx`, `TimerLayoutPicker.tsx`, `SettingsPanel.tsx`, `constants.ts`, `types.ts`)

---

## 1. Scope & Architectural Overview

Focus Mode provides an immersive, full-screen `/focus` tab launched with `Ctrl+Shift+Q` (or `Cmd+Shift+Q`) from anywhere in the application. It supports two operating modes:
- **Manual Mode:** Standard Pomodoro, Short Break, Long Break, Custom Duration countdown, and Desk Clock mode.
- **Planner Mode:** The backend computes an optimized pomodoro sequence derived from today's `TimeBlock`s and `Task.estimateMinutes`, net of meetings and capped by `User.weeklyCapacityMinutes / 5`.

The feature was implemented across two phases:
- **Phase A (Core Feature & Plumbing):** Endpoints, schedule calculation algorithm with capacity deductions, Redis caching, socket notifications, cross-tab synchronization, and complete session persistence.
- **Phase B (Borderless / Native-Feeling Refactor):** Pure viewport immersion (`fixed inset-0 overflow-hidden bg-black text-white`), zero browser notification prompts (Sonner toasts + Web Audio API synthesizer chimes), layered `Esc` key control, `Enter` key timer toggle, 5 swappable timer layouts with high-legibility drop-shadow digits over customizable wallpapers (curated, gradients, and proxied Unsplash), and graceful navigation back to `/app/`.

---

## 2. Adherence to Hard Rules

1. **Token Hygiene:** Never reads `localStorage.getItem('krama_token')` in new code. `FocusPage.tsx` connects to Socket.IO using the in-memory `accessToken` from `useAuth()`.
2. **Reuse Existing Infrastructure:** Reused existing services (`calculateCapacity()`, `analyticsService`, `socketService.emitToUser()`, `redisService.get/set/del()`, and `api.auth.updatePreferences()`).
3. **API Client Extension:** Extended `api.focusSessions` in `apps/web/src/api/client.ts` in-place (`complete`, `getSchedule`, and `getWallpaper`).
4. **Preference Schema Compatibility:** Preserved `User.metadata.timerPreferences` (`focusDuration`, `shortBreak`, `longBreak`, `longBreakAfter`).
5. **Auth & Tenant Isolation:** User ID is resolved from `req.user!.id` via `requireAuth`. All `TimeBlock` queries in `focusTimer.service.ts` filter on `{ userId, workspaceId, date: ... }` conforming to `02-SECURITY-AND-IDOR.md` (SEC-04).
6. **Zero Migrations:** No schema modifications or database migrations were performed.

---

## 3. Implemented Components

### 3.1 Backend: Schedule Computation (`apps/server/src/services/focusTimer.service.ts`)
- **Algorithm Implementation:**
  - Loads today's `user.weeklyCapacityMinutes`, `timeBlocks` (scoped by `userId` and `workspaceId`), active non-DONE `tasks`, and today's `completedSessions`.
  - Determines daily cap: `Math.round(weeklyCapacityMinutes / 5)`.
  - Uses `calculateCapacity()` to compute meeting minutes and deducts them from the daily cap to find `effectiveDailyCapMinutes`.
  - Subtracts already logged focus session duration to establish `remainingMinutes`.
  - Gathers work blocks (`STUDY`, `WORK`, `HEALTH`, `ADMIN`, `OTHER`).
  - **Synthetic Fallback:** If no `TimeBlock`s exist for today, synthesizes slots from the top 5 high-priority tasks by `estimateMinutes`.
  - Expands work slots into Pomodoro + break cycles, inserting a long break every `longBreakAfter` cycles.
  - Applies daily cap cutoff, trims trailing breaks, and normalizes slot indexing.
- **Cache Strategy:** Wrapped with 5-minute Redis TTL (`focus:schedule:${userId}:${workspaceId}`).

### 3.2 Backend: Route Ordering & Controller (`apps/server/src/routes/focusSession.routes.ts` & `focusSession.controller.ts`)
- **Route Order:**
  ```ts
  router.use(requireAuth);
  router.get('/wallpaper', getWallpaper); // User-level only (no workspace membership required)

  router.use(ensureFocusWorkspace);
  router.use(requireWorkspaceRole('MEMBER'));
  router.get('/schedule', getSchedule);
  router.post('/', completeFocusSession);
  ```
- **Cache Invalidation & Real-Time Sync:**
  In `completeFocusSession`:
  ```ts
  await redisService.del(`focus:schedule:${userId}:${workspaceId}`);
  await redisService.del(`focus:schedule:${userId}`);

  socketService.emitToUser(userId, 'focus:session:completed', {
    sessionId: session.id,
    duration: session.duration,
    type: session.type,
    taskId: session.taskId,
    dailyDeepWorkMinutes: dailyLog.deepWorkMinutes
  });
  ```
- **Unsplash Proxy (`getWallpaper`):** Proxies Unsplash API server-side using `UNSPLASH_ACCESS_KEY`. Returns `{ error: 'UNSPLASH_NOT_CONFIGURED', wallpapers: [] }` when unconfigured so the client safely falls back to curated/bundled gradients.

### 3.3 Frontend: Shell & Cross-Tab Synchronization
- **Routing (`apps/web/src/App.tsx`):**
  Mounted `/focus` within the `<Route element={<AuthGuard />}>` wrapper. Auth bootstrapping occurs naturally via `AuthProvider`.
- **Keyboard Shortcut (`apps/web/src/components/AppShell.tsx`):**
  Added `Ctrl+Shift+Q` / `Cmd+Shift+Q` handler immediately before the input/textarea focus guard in the global keydown listener so it triggers globally. Added "Focus Timer" entry to the cheatsheet modal.
- **Cross-Tab Invalidation (`apps/web/src/providers/SocketProvider.tsx`):**
  The main app tab listens for `focus:session:completed` and invalidates React Query caches for `['dashboard']`, `['daily-logs']`, and `['analytics']`.
- **Widget Deprecation:** Removed legacy `FocusTimerWidget.tsx` and all references from `AppShell`.

### 3.4 Phase B: Borderless Immersive Experience
- **Distraction-Free Viewport:**
  The container uses `fixed inset-0 w-screen h-screen overflow-hidden select-none bg-black text-white`.
- **Keyboard Controls & Esc Layering:**
  - `Enter` / `Space`: Starts or pauses the countdown timer in all modes except Desk Clock.
  - `Esc`: Closes open modals (Wallpaper, Layout, Settings) first; if no modal is open, toggles fullscreen / controls HUD.
- **Audio Synthesizer (Zero Native Notification Prompts):**
  Zero `Notification.requestPermission()` prompts. Completion alerts use Sonner `toast.success()` and an in-memory Web Audio oscillator chime (`playAudioChime()`).
- **5 Swappable Layouts:**
  - `centered`: Minimalist large typography in the center.
  - `zen`: Ultra-clean, distraction-free typographic layout.
  - `card`: Translucent glassmorphism HUD with session statistics.
  - `overlay`: Floating HUD over cinematic wallpapers.
  - `sidebar`: Split view showing the full day's agenda alongside the timer.
  - `standby`: Pure OLED dark mode desk clock.
- **Unified Controls Menu (`TimerMoreMenu.tsx`):**
  Provides mode switching, wallpaper picker, layout picker, audio toggles, and safe in-app exit (`navigate('/app/')`).

---

## 4. Verification Results

- **Server Typecheck:** `pnpm --filter server exec tsc --noEmit` — 0 errors.
- **Client Typecheck:** `pnpm --filter client exec tsc -b` — 0 errors.
- **Full Workspace Build:** `pnpm run build` — successfully built `@krama/server`, `@krama/client`, `@krama/common`, and root.
- **ESLint:** `pnpm run lint` — passed.

---

## 5. Section Completion Checklist

- [x] `focusTimer.service.ts` built and matches capacity algorithm, meeting deduction, and synthetic-slot fallback.
- [x] `GET /focus-sessions/schedule` and `GET /focus-sessions/wallpaper` properly registered and ordered in routes.
- [x] `TimeBlock` queries in `focusTimer.service.ts` filter by both `userId` and `workspaceId`.
- [x] `/focus` route is mounted inside `<AuthGuard>` in `App.tsx`.
- [x] `FocusPage`'s socket connection uses `useAuth().accessToken`, never `localStorage.getItem('krama_token')`.
- [x] `Ctrl+Shift+Q` opens `/focus` and is placed before the input-guard early-return in `AppShell.tsx`.
- [x] `api.focusSessions` extended in-place in `apps/web/src/api/client.ts`.
- [x] `focus:session:completed` emitted by backend and consumed by `SocketProvider.tsx` for cross-tab sync.
- [x] All 5 timer layouts + Standby layout render cleanly with drop-shadow digits over backgrounds.
- [x] Legacy `FocusTimerWidget.tsx` is completely deleted.
- [x] Phase B borderless refactor applied and verified end-to-end.
