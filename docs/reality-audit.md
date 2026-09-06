# KRAMA OS — Reality Audit (complete)

**Audit completed 2026-09-07** against the repository, with `path:line` evidence for every verdict. All sixteen probe areas resolved.

**This document replaces `Complete Project Analysis`, the deep-dive architecture doc, and the module breakdown.** Those three are confirmed inaccurate on eight specific claims (listed at the end) because they inferred completeness from Prisma models plus `AppShell.tsx` routes. Delete them and keep this in `docs/`.

Repo layout: `apps/server`, `apps/web`, `packages/validation`.

---

## Completeness ladder

| Level | Means |
|---|---|
| **L0** | Prisma model exists. No application code reads or writes it. |
| **L1** | Route renders, but with mock data, empty state, or placeholder. |
| **L2** | Backend logic is real but unreachable, uncalled, or its result discarded. |
| **L3** | A user completes the full loop through the UI and it persists correctly. |
| **L4** | L3 plus error/empty/loading states, validation, and a test that fails if it breaks. |

---

## Truth table

| # | Module | Level | Evidence | Notes |
|---|---|---|---|---|
| 1 | **Automations** | **L2** | `automation.service.ts:4`, `task.controller.ts:1`, `subscribers.ts:4`, `AutomationRules.tsx:105` | `evaluateEvent` never invoked — imported, uncalled. Rules persist via UI and never execute. 1 condition operator (`===`), 2 actions (`CREATE_NOTIFICATION`, `ADD_COMMENT`). No execution logging. **Decision: prune (P4).** |
| 2 | **Domain event bus** | **L2** | `subscribers.ts:4-15` | Exactly one listener: `TASK_COMPLETED`, with a hardcoded fallback `userId`. `HABIT_LOGGED` and every other event have zero subscribers. Events emit *inside* `runInTransaction`. |
| 3 | **RAG / AI** | **L3** | `page.controller.ts:84`, `embedding.worker.ts:28`, `retriever.ts:16`, `krama-ai.service.ts:181`, `AIAssistant.tsx:133` | Full loop works: page edit → BullMQ → embed → pgvector cosine → Gemini → rendered. Gaps: no HNSW/IVFFlat index (sequential scan), no backfill script, `create_task`/`complete_task` actions parsed then dropped (`AIAssistant.tsx:38-43`). |
| 4 | **Knowledge Graph** | **L3** | `apps/web/package.json:34`, `KnowledgeGraph.tsx:23`, `knowledgeGraph.controller.ts:16` | Works — `react-force-graph-2d`, interactive 2D force graph. Edges derive from foreign keys only (`projectId`, `goalId`, `linkedProjectId`, `parentPageId`). No Tiptap body link extraction, no `Backlink` table. Shallower than documented but real. |
| 5 | **Career & Skills** | **L3** skills / **L0** cert+milestone | `skill.service.ts:8`, `SkillsModule.tsx:14`, `schema.prisma:768`, `:781` | Skills CRUD and entity linking work. **Auto-leveling is false:** `validateSkillLinking` (`skill.service.ts:120`) only validates IDs; `currentLevel` changes only via manual form. `Certification` and `CareerMilestone` have zero application code. |
| 6 | **Analytics** | **L3** | `worker.ts:20`, `analytics.worker.ts:7`, `analytics.service.ts:4`, `Analytics.tsx:17` | Nightly BullMQ repeatable job (`0 1 * * *`) aggregates velocity, deep work, streaks, pace into `workspaceAnalytics`. UI charts velocity and deep work but **omits `activeStreaks` and `okrPace`** — computed and not displayed. |
| 7 | **Calendar sync** | **L2** | `google-calendar.service.ts:14`, `:39`, `planner.routes.ts:122` | Read-only one-way poll, `calendar.readonly` scope, `events.list` for a date range. No push path, sync tokens, webhooks, renewal, tombstones, or conflict resolution. "Bidirectional" was false. |
| 8 | **Habits & streaks** | **L3** | `habit.service.ts:103`, `:131`, `habitStreak.worker.ts:7`, `HabitTracker.tsx:138` | Works. Streak is a bare increment/decrement (`:131`, `:169`); a nightly worker audits and resets on missed days — so streaks **do** break, with up to 24h latency. Heatmap reads real completions. "Today" uses **server local time** (`:115`). |
| 9 | **Planner & capacity** | **L3** | `planner.routes.ts:105`, `capacity.service.ts:33`, `CalendarificHolidayProvider.ts:15`, `PlannerPage.tsx:30` | Works, but holiday math is wrong: holidays become **1-hour dummy blocks at 8–9 AM deducting 60 min** (`planner.routes.ts:114-115`) instead of a full workday. Without `CALENDARIFIC_API_KEY`, provider returns **7 hardcoded mock holidays** (`:17`). `RoutineOccurrence` generated in memory, not persisted. |
| 10 | **Goals & pace** | **L2** | `packages/validation/src/execution.ts:53`, `goal.service.ts:51`, `Goals.tsx:26`, `goalUtils.ts:38` | **Live outage:** `UpdateGoalSchema` requires `version`; `Goals.tsx:26` submits `{ progress }` only → Zod 400 on every save. Pace computed client-side (`goalUtils.ts:38-46`) from snapshots supplied by `goal.repository.ts:9`. |
| 11 | **Sprints** | **L3** sprints / **L0** reports | `SprintView.tsx:15`, `:62`, `sprintReport.worker.ts:7` | Creation, status, issue linking work. Burndown computed from **current-state points only** (`SprintView.tsx:69-74`) — no historical series. `SprintReport` generated weekly (`0 2 * * 0`), write-only, no read endpoint or UI. |
| 12 | **Tenancy** | **L2** | `prisma.ts:1` | **Zero structural isolation.** No `$extends`, no middleware, no RLS. Isolation depends on manual discipline in every query. |
| 13 | **Auth & roles** | **L3** auth / **L2** roles | `auth.middleware.ts:52`, `auth.service.ts:185` | `requireWorkspaceRole` guards **only DELETE routes** — GET/POST/PATCH check no role, so VIEWER and GUEST can mutate. Refresh rotation implemented, but token reuse throws **without revoking the session family.** |
| 14 | **Real-time & caching** | **L3** | `socket.service.ts:11`, `SocketProvider.tsx:29`, `redis.service.ts:14`, `auth.service.ts:109`, `ai.controller.ts:388` | Sockets bidirectional and connected. Redis falls back gracefully to an in-memory `Map` (`:14-21`). Caches only session tokens, AI rate limits, AI prompt hashes. **Capacity is not cached** — so no invalidation bug exists. |

---

## Write-only paths

Written and never read. Each needs a decision — finish or delete. Drifting is the only wrong answer. Scoped as P8.

| Model | Written at | Consumer |
|---|---|---|
| `SprintReport` (`schema.prisma:290`) | `sprintReport.worker.ts:44` | None — no controller, service method, or UI |
| `ActivityLog` (`schema.prisma:170`) | `activity.service.ts:6` | **None — no read query or endpoint exists.** The documented "Activity Feed" does not exist |
| `AiRequest` (`schema.prisma:589`) | `ai.controller.ts:394` | Only a 30-day retention cleaner (`analytics.worker.ts:22`) |
| `Certification` (`schema.prisma:768`) | Nothing | Nothing — L0 |
| `CareerMilestone` (`schema.prisma:781`) | Nothing | Nothing — L0 |

Note the shape of the `SprintReport` gap: `SprintView.tsx` computes burndown from current state only, so there is no trend anywhere in the UI — and the unread reports are precisely the missing time series.

---

## Documentation corrections

Every claim below appears in the repo's three architecture documents and is contradicted by code.

| Claim | Correction |
|---|---|
| "A single action (checking off a Habit) fires a domain event, increments a Skill, updates the Activity Feed, triggers an Automation, and factors into weekly Analytics. **Nothing is isolated.**" | `subscribers.ts:4-15` registers one listener (`TASK_COMPLETED`). `HABIT_LOGGED` has zero subscribers. `skill.service.ts:120` does not increment levels. `activity.service.ts` is never called by habits. `automation.service.ts:4` is an uninvoked orphan. The cascade does not exist. |
| "If/Then automations leverage these events" | `evaluateEvent` has no caller. The engine does nothing. |
| "**Bidirectional** Google Calendar sync… KRAMA remains the single source of truth" | `google-calendar.service.ts:14` requests `calendar.readonly` and runs a one-way `events.list` poll (`:61`). Zero push, webhooks, or conflict handling. |
| "`AiRequest` tracks… models (defaults to `groq`)" + "intent router uses Gemini 3.6 Flash" | Both misleading together: `schema.prisma:598` defaults to `"groq"`, but `krama-ai.service.ts:59` instantiates Google GenAI (`gemini-3.6-flash`) directly, bypassing the gateway. Embeddings are hardcoded to Google `text-embedding-004` (`lib/embedding.ts:8`) — named in neither doc. |
| "`redis.service.ts` caches frequent queries (like **capacity calculations**)" | Neither `capacity.service.ts` nor `planner.routes.ts` imports `redisService`. Redis caches auth sessions (`auth.service.ts:109`), AI rate limits and prompt hashes (`ai.controller.ts:388-390`) only. |
| "The Planner is fully location-aware… to **accurately** calculate your working capacity" | `CalendarificHolidayProvider.ts:15-26` falls back to 7 hardcoded mock holidays without an API key. `planner.routes.ts:114-115` injects holidays as 1-hour dummy blocks deducting 60 minutes, not a full workday. It under-deducts by ~7 hours per holiday. |
| "The chunker splits text into ~3000 character segments with a 400 character overlap" | `chunker.ts:52` *defaults* to 3000/400, but the only caller — `embedding.worker.ts:28` — passes `(content, 800, 100)`. The documented figure is a dead default. |
| "Optimistic Concurrency Control: Goals use a `version` integer… preventing stale data overwrites" | `packages/validation/src/execution.ts:53` requires `version`, but `Goals.tsx:26` omits it — so goal progress updates fail with a 400 at runtime. The mechanism prevents nothing and breaks everything. |
| "Skills Module: **fully modeled** with `Skill`, `Certification`, `CareerMilestone`" | `Certification` (`:768`) and `CareerMilestone` (`:781`) are L0 — zero service methods, controllers, or UI. |
| "Meditating every day directly increments your Mindfulness skill level" | Requires an event subscriber that does not exist. |
| README described features as "deferred/not built"; the analysis doc promoted them to "present" on the strength of schema plus routes | The original README was closer to correct than the document that corrected it. |

---

## What the audit changed about the assessment

Three items in the earlier risk register were wrong and are now retracted: the chunker is already correctly sized at the call site, no capacity cache exists so there was no invalidation bug, and habit streaks do break via a nightly worker rather than never breaking. Analytics, Knowledge Graph, RAG end-to-end, sockets, and sprint management all turned out genuinely **L3** — the BullMQ scheduler the docs claimed does exist.

What got worse: the goal `version` problem is a confirmed live outage failing at validation rather than a latent 409; role enforcement covers only DELETE, so VIEWER and GUEST can mutate; refresh-token reuse doesn't revoke the session family; and holiday capacity math is confidently wrong in a way that produces exactly the over-scheduling the feature exists to prevent.

The pattern worth carrying forward: **the modules that work are the ones with a BullMQ worker or a real UI consumer, and the ones that don't are the ones whose only consumer was described in a document.** Five write-only tables and one uninvoked service all share that property.

Fixes are scoped in `KRAMA-OS-Polish-Prompts.md`, priorities in `KRAMA-OS-Architecture-Risks.md`.
