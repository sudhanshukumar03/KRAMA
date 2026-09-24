# 10 — Dead Code & Architecture Bloat Removal

**Priority:** Housekeeping (Executed after functional stability across files 01–09)  
**Touches:** `apps/server/src/index.ts`, `apps/server/prisma/schema.prisma`, `packages/validation/src/execution.ts`, `packages/types/src/execution.ts`, `apps/web/src/api/client.ts`, `apps/web/src/types/schema.ts`, `apps/server/src/services/holidays/`, `apps/server/src/services/redis.service.ts`, `apps/server/src/middlewares/rateLimit.middleware.ts`, `apps/server/package.json`

---

## 1. Scope

Safely removed confirmed dead code, unused models, obsolete validation rules, and heavy redundant dependencies across the monorepo while verifying zero remaining references. Preserved deferred items explicitly scheduled for subsequent feature cuts (e.g. Focus Mode).

---

## 2. Hard Rules for This Section

- Grepped before deleting every item (`grep -rn "<symbol or import path>" apps/ packages/`), confirming zero remaining references outside deleted modules.
- Confirmed transitive dependency trees (`pnpm why <package>`) prior to pruning `package.json`.
- Preserved `FocusTimerWidget.tsx` and working AI endpoints as required by §9.

---

## 3. Implemented Removals & Consolidations

### DEAD-01: Obsolete `model Page` Subsystem (Ref: Audit §8.1)
- **Status:** The entire web app operates on `model Document`. `model Page` was dead legacy code.
- **Pre-removal Check:** Confirmed zero live client or service references to `api.pages`, `page.routes`, or `page.controller`.
- **Actions Completed:**
  - Deleted [`apps/server/src/routes/page.routes.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/routes/page.routes.ts) and [`apps/server/src/controllers/page.controller.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/controllers/page.controller.ts).
  - Unmounted `/api/v1/pages` and removed `pageRoutes` import from [`apps/server/src/index.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/index.ts).
  - Removed `CreatePageSchema` and `UpdatePageSchema` from [`packages/validation/src/execution.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/packages/validation/src/execution.ts) and its test suite.
  - Removed `CreatePageDto` and `UpdatePageDto` from [`packages/types/src/execution.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/packages/types/src/execution.ts).
  - Removed `api.pages` from [`apps/web/src/api/client.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/web/src/api/client.ts).
  - Removed `Page`, `PageWithRelations`, and `pages` relations from [`apps/web/src/types/schema.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/web/src/types/schema.ts).
  - Removed `Page Model Concurrency` test block from [`apps/server/src/__tests__/concurrency.test.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/__tests__/concurrency.test.ts).
  - Removed page references from [`apps/server/src/workers/embedding.worker.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/workers/embedding.worker.ts), unifying embedding processing purely around `documentId`.
  - Deleted legacy audit script `scripts/verify-queue.ts`.
  - Removed `model Page` and relations (`Workspace.pages`, `Space.pages`, `Project.pages`, `KnowledgeChunk.pageId`, `KnowledgeChunk.page`) from [`apps/server/prisma/schema.prisma`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/prisma/schema.prisma).

### DEAD-02: Competing Dual Holiday Sync Services (Ref: Audit §8.2)
- **Status:** Consolidated competing holiday services (`holidays.service.ts` requiring paid Calendarific key vs. free public holiday provider).
- **Actions Completed:**
  - Implemented [`NagerDateHolidayProvider`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/services/holidays/NagerDateHolidayProvider.ts) using the free, public, keyless Nager.Date v3 API (`https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}`).
  - Wired [`HolidaySyncService`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/services/holidays/HolidaySyncService.ts) to default to `NagerDateHolidayProvider`.
  - Cleaned region mapping in [`HolidayNormalizer.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/services/holidays/HolidayNormalizer.ts).
  - Updated [`apps/server/src/routes/planner.routes.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/routes/planner.routes.ts) to use `holidaySync.ensureHolidays(...)`.
  - Deleted `apps/server/src/services/holidays.service.ts` and `apps/server/src/services/holidays/CalendarificHolidayProvider.ts`.
  - Verified `grep -rn "holidays.service\|Calendarific" apps/server/src` returned 0 results.

### DEAD-03: Dual Redis Client Dependencies (Ref: Audit §8.3)
- **Status:** Server previously imported both `redis` (node-redis v6) and `ioredis` (v5).
- **Actions Completed:**
  - Refactored [`apps/server/src/services/redis.service.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/services/redis.service.ts) to utilize `ioredis` with existing in-memory fallback support.
  - Updated [`apps/server/src/middlewares/rateLimit.middleware.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/middlewares/rateLimit.middleware.ts) `RedisStore` to call `(redisService.client as any).call(...args)`.
  - Updated [`apps/server/src/services/auth.service.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/src/services/auth.service.ts) session revocation and grace checks to use `redisService.isConnected`.
  - Removed `redis` from `apps/server/package.json`.
  - Verified `ioredis` remains the single direct Redis client on the server.

### DEAD-04: Heavy Unused AI Dependency: `@xenova/transformers` (Ref: Audit §8.4)
- **Status:** Installed dependency (>200MB uncompressed) never imported anywhere in application source.
- **Actions Completed:**
  - Removed `@xenova/transformers` from `apps/server/package.json`.
  - Confirmed lockfile updated and zero imports existed across the workspace.

### DEAD-05: `Decision` Model and Unused DB Table (Ref: Audit health matrix)
- **Status:** Verified zero controllers, routes, API client methods, or active components used `Decision`.
- **Actions Completed:**
  - Removed `decisions Decision[]` from `Workspace` and deleted `model Decision` in [`apps/server/prisma/schema.prisma`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/server/prisma/schema.prisma).
  - Removed `DecisionWithRelations` and `Decision` from [`apps/web/src/types/schema.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/apps/web/src/types/schema.ts).

### DEAD-06: Redundant Validation Rules for Deleted Skills
- **Status:** Redundant `skillIds` validation rule on `CreateHabitSchema` for deleted Skill functionality.
- **Actions Completed:**
  - Removed `skillIds: z.array(z.string()).optional()` from [`packages/validation/src/execution.ts`](file:///C:/Users/sksin/OneDrive/Desktop/Krama/packages/validation/src/execution.ts).

---

## 4. Deferred / Explicitly Preserved

- **`POST /api/v1/ai/analyze-telemetry` & `GET /api/v1/ai/dashboard-insight`**: Preserved in `ai.controller.ts` and `ai.routes.ts` for AI telemetry insight calls.
- **`FocusTimerWidget.tsx`**: Untouched in this pass — handled in `11-FOCUS-MODE-FEATURE.md` during full-screen Focus Mode cutover.

---

## 5. Section Completion Checklist

- [x] `model Page` and all associated controller/route/validation/DTO code removed, with zero remaining references (DEAD-01).
- [x] Holiday sync consolidated onto `HolidaySyncService`; `holidays.service.ts` and its API key requirement removed (DEAD-02).
- [x] Server uses only `ioredis`; the `redis` package is removed from `package.json` (DEAD-03).
- [x] `@xenova/transformers` removed (DEAD-04).
- [x] `Decision` model removed after confirming zero active references (DEAD-05).
- [x] "Deleted skills" validation rule removed from `CreateHabitSchema` (DEAD-06).
- [x] `FocusTimerWidget.tsx` was **not** touched by this file — confirmed handled by file 11 instead.
