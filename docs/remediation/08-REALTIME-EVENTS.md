# 08 — Real-Time Event Bus Architecture

**Priority:** P1 (the entire multi-tab/multi-user real-time layer is restored)  
**Depends on:** `socketService.emitToUser()`  
**Read before Focus Mode:** `11-FOCUS-MODE-FEATURE.md` §11 depends on this pattern being proven functional.  
**Touches:** `apps/server/src/events/subscribers.ts`, `apps/server/src/workers/notifications.worker.ts`, `apps/server/src/services/task.service.ts`, `apps/web/src/providers/SocketProvider.tsx`, `apps/web/src/components/NotificationCenter.tsx`

---

## 1. Scope

Wire the domain event bus to `socketService.emitToUser()` so that task creation, updates, and deletions, as well as notifications, reach connected clients in real time across browser tabs and sessions. Replaced high-frequency notification polling with real-time push and a lengthened fallback poll.

---

## 2. Hard Rules for This Section

- Do not build a second real-time mechanism (SSE, polling-with-shorter-interval, etc.) as a workaround. `socketService.emitToUser()` and the Redis pub/sub adapter behind it already work — this is purely a "call the function that already exists" fix.
- Every domain event subscriber added here must guard on `payload.userId` being present before emitting — do not emit to an undefined user ID.
- `NotificationCenter`'s 30-second poll should be removed or significantly lengthened as a fallback only once real-time delivery is confirmed working — do not leave both a tight poll and real-time delivery running simultaneously.

---

## 3. Implemented Fixes

### RT-01: Real-Time Socket.io Event Bus Wiring
- **Root Cause:**
  - `SocketProvider.tsx` on the client listened for `task:created`, `task:updated`, `task:deleted`, and `notification`.
  - On the backend, `apps/server/src/events/subscribers.ts` only subscribed to `TASK_COMPLETED`. `TASK_CREATED`, `TASK_UPDATED`, and `TASK_DELETED` were completely absent.
  - Furthermore, `apps/server/src/services/task.service.ts` published task events without including `userId` in several mutation paths, leaving subscribers unable to target the user's socket room.
  - In `apps/server/src/workers/notifications.worker.ts`, notifications were written to Postgres but never emitted via Socket.io.
- **Implementation:**
  - **Publisher Side (`apps/server/src/services/task.service.ts`):**
    - Updated `createTask`, `updateTask`, `deleteTask`, `reorderTask`, `completeTask`, and `restoreTask` to publish `TASK_CREATED`, `TASK_UPDATED`, and `TASK_DELETED` with `userId` and `task` payload in `publishAfterCommit`.
  - **Subscriber Side (`apps/server/src/events/subscribers.ts`):**
    - Imported `socketService` and wired domain event listeners:
      ```ts
      domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string }>('TASK_CREATED', (payload) => {
        if (payload.userId) socketService.emitToUser(payload.userId, 'task:created', payload);
      });

      domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string }>('TASK_UPDATED', (payload) => {
        if (payload.userId) socketService.emitToUser(payload.userId, 'task:updated', payload);
      });

      domainEventBus.onEvent<{ taskId: string; workspaceId: string; userId?: string }>('TASK_DELETED', (payload) => {
        if (payload.userId) socketService.emitToUser(payload.userId, 'task:deleted', payload);
      });
      ```
  - **Notification Worker (`apps/server/src/workers/notifications.worker.ts`):**
    - Immediately after creating a notification row in Postgres, dispatched real-time event:
      ```ts
      socketService.emitToUser(notification.userId, 'notification', notification);
      ```

### RT-02: Notification Polling Converted to Fallback
- **Root Cause:**
  - `NotificationCenter.tsx` polled `api.notifications.list` every 30 seconds (`refetchInterval: 30000`) because real-time push was inactive.
- **Implementation:**
  - In `apps/web/src/components/NotificationCenter.tsx`, lengthened `refetchInterval` to 3 minutes (`180000` ms) as a resilience fallback for disconnected states.
  - In `apps/web/src/providers/SocketProvider.tsx`, added query invalidations on `connect` so that upon reconnecting or re-authenticating, `notifications`, `issues`, and `tasks` caches are immediately refreshed.

---

## 4. Section Completion Checklist

- [x] `TASK_CREATED`/`TASK_UPDATED`/`TASK_DELETED` domain events reach connected clients via `socketService.emitToUser` (RT-01).
- [x] Confirmed the publisher side (domain event emission at the actual task mutation call sites) exists for all three event types — not just the subscriber wiring (RT-01).
- [x] Notification creation emits a real-time `notification` socket event (RT-01).
- [x] `NotificationCenter`'s poll interval is lengthened to a fallback cadence (3m), not left at 30s as the primary delivery mechanism (RT-02).
- [x] Sockets invalidate queries on connect/reconnect to prevent stale states during network interruptions.
