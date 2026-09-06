# KRAMA OS — Architecture Risk Register

**Revised 2026-09-07 after the full code audit.** Every item is now code-confirmed. Detail on module state lives in `reality-audit.md`; implementation steps live in `KRAMA-OS-Polish-Prompts.md`. This document holds severity, reasoning, and priority.

---

## Retractions

Three risks in the previous revision were wrong. Stating them plainly so nobody works from them.

**R5 (chunk size) — retracted.** I flagged 3000-character chunks with 400 overlap as destroying retrieval precision. That figure is a dead default at `chunker.ts:52`; the only caller, `embedding.worker.ts:28`, passes `(content, 800, 100)` — which is the size I was going to recommend. The chunker is already correct. All that remains is changing the misleading default, since it is a trap for the next caller and it is what misled the repo's own documentation.

**R7 (capacity cache invalidation) — retracted.** No capacity cache exists. Neither `capacity.service.ts` nor `planner.routes.ts` imports `redisService`; capacity is computed per request. The risk came from a documentation claim that was simply false. Redis also degrades gracefully to an in-memory `Map`, which is better than assumed.

**R3 (streaks never break) — substantially wrong.** A nightly BullMQ worker (`habitStreak.worker.ts`) audits completions and resets streaks on missed days. Streaks do break. The real defect is narrower and still worth fixing: the optimistic `increment: 1` at `habit.service.ts:131` displays a wrong streak for up to 24 hours, and "today" comes from server local time (`:115`) rather than the user's timezone — so the worker's 00:00 UTC boundary doesn't match the user's day.

The lesson generalizes: I was reasoning from the repo's architecture documents, and those documents describe intent rather than behavior. Several risks I raised existed only in prose.

---

## Confirmed risks

### R13 — Goal progress updates are broken ✅ live outage

`UpdateGoalSchema` (`packages/validation/src/execution.ts:53`) requires `version: z.number().int().min(1)`. `Goals.tsx:26` submits `{ progress: newProgress }` with no version. Every goal progress save fails Zod validation with a 400 before reaching the service; `goal.service.ts:51` would throw 409 if it got through. `task.service.ts` has the correct lenient guard.

This is a class of bug rather than an instance — six models carry `version`, and the same schema-requires-what-the-client-omits mismatch may exist elsewhere. **P0** fixes it and checks the other five.

### R2 — No structural tenancy enforcement ✅ critical

`apps/server/src/prisma.ts:1` is an unextended `new PrismaClient()`. No `$extends`, no middleware, no RLS. Isolation depends on every `where: { workspaceId }` being hand-written correctly at every query site, including every one added from here on. One omission in one list endpoint exposes another workspace's data.

Cost of delay is strictly increasing. **P2.**

### R15 — Role checks guard only DELETE ✅ NEW, high

`requireWorkspaceRole` (`auth.middleware.ts:52`) is applied to DELETE routes only. GET, POST, and PATCH perform no role check, so VIEWER and GUEST can read and mutate anything in a workspace they belong to. Five roles are modeled and effectively two are enforced, on one verb.

Related: refresh-token rotation works (`auth.service.ts:185`), but a reused token throws without revoking the session family — detection without response. **P3.**

### R1 — Events emit inside the transaction ✅ high, but cheap now

`habit.service.ts` calls `domainEventBus.emitEvent` inside `runInTransaction`, and `EventEmitter.emit` is synchronous, so handlers run inside the open transaction and fire on rollback.

**Correction to severity reasoning:** with one subscriber registered (`TASK_COMPLETED`), today's damage is bounded to a notification occasionally queued for a rolled-back task. The argument for doing it now is that the fix is nearly free while the bus is empty, and it is a hard prerequisite for attaching anything to the bus later. Also fix the hardcoded fallback `userId` in that one subscriber, which in a multi-tenant schema either misroutes notifications or never matches anyone. **P1.**

### R16 — Holiday capacity under-deducts by ~7 hours ✅ NEW, medium-high

`planner.routes.ts:114-115` models each holiday as a 1-hour dummy time block at 8–9 AM, deducting 60 minutes from weekly capacity. A national holiday costs one hour instead of a full working day. Without `CALENDARIFIC_API_KEY`, `CalendarificHolidayProvider.ts:17` silently returns 7 hardcoded mock holidays.

This is the sharpest failure in the system relative to its purpose: the subsystem exists specifically to stop you over-scheduling a week with public holidays, and as built it produces a confident number that permits exactly that. A wrong capacity figure is worse than no capacity figure, because you plan against it. **P5.**

### R11 — Automations are dead code ✅ resolved, prune

`evaluateEvent` (`automation.service.ts:4`) has no caller. `AutomationRules.tsx:105` persists rules to a table nothing reads. One condition operator, two actions, no execution logging.

A user creates a rule, sees it saved, trusts it, and it never fires — a missing feature converted into a broken promise, which also erodes confidence in adjacent modules. For a single user, an if/then engine's value comes from a volume of routine events a solo tool does not generate. **Decision made: delete. P4.**

### R14 — AI observability is bypassed ✅ medium

`ai.service.ts` is a multi-provider gateway logging `AiRequest` rows with tokens, latency, and cost. `krama-ai.service.ts:59` bypasses it and calls Gemini directly. `AiRequest` has no reader except a 30-day retention cleaner (`analytics.worker.ts:22`). Two provider-configuration paths is also why the architecture docs contradicted each other on provider.

Compounding: `krama-ai.service.ts:79` classifies intent in one LLM call before generating in a second (`:161`), so every interaction is two round trips — unmeasured. **P8.**

### R17 — Five write-only tables ✅ NEW, medium

`SprintReport`, `ActivityLog`, `AiRequest` have writers and no readers; `Certification` and `CareerMilestone` have neither. `ActivityLog` is the notable one — there is no read endpoint anywhere, so the "Activity Feed" described in the docs does not exist as a feature.

The `SprintReport` gap has a useful shape: `SprintView.tsx:69-74` computes burndown from current-state points only, so no historical trend exists in the UI — and the unread weekly reports are exactly the missing time series. **P8.**

### R3 — Habit streak display and timezone ✅ medium, narrowed

See retractions. Optimistic increment shows a wrong value for up to 24 hours; server-local "today" misaligns with both the user's day and the worker's UTC boundary. **P7.**

### R18 — RAG works but is unindexed and unbackfilled ✅ NEW, medium

The pipeline is genuinely end-to-end. Three gaps: no HNSW or IVFFlat index, so every similarity search is a sequential scan; no backfill script, so pages predating the embedding worker are invisible to RAG; and `KnowledgeChunk` stores `vector(768)` with no model or version column, so a same-dimension model swap would silently invalidate the corpus with no way to identify affected rows.

Also `AIAssistant.tsx:38-43` wires only `open_page` and `open_project` — `create_task` and `complete_task` are parsed and discarded, so the assistant renders buttons that do nothing. Same species of trust bug as the automations UI. **P6.**

### R9 — Pace engine client-side ✅ medium

Confirmed at `apps/web/src/lib/goalUtils.ts:38-46`, consuming raw snapshots from `goal.repository.ts:9`. A core domain calculation in the view layer cannot be tested in isolation, cannot be reused by AI context hydration, and forces the client to fetch full snapshot history per goal. Moving it server-side also makes "behind required pace" available as a trigger — the one automated behavior a solo user would plausibly want, and more valuable than the rule engine being deleted. **P9.**

### R8 — Concurrency policy inconsistent ✅ medium

Six models carry `version` with at least three behaviors: hard-throw (Goal), silent skip when omitted (Task), and unverified on the other four. Silent skip is the worst — it presents as protected while protecting nothing whenever a client forgets. **P10, decision first.**

### R10 — Intent router doubles latency and cost ✅ low-medium

Confirmed two LLM calls per interaction (`krama-ai.service.ts:79` then `:161`). Users experience this as slowness unrelated to answer quality, and none of it is currently measured. Fix R14 first so any improvement is visible. Where classification is genuinely needed, have the answering model return intent as a field of its structured response instead of asking twice.

### R6 — Calendar documentation is wrong ✅ low

72 lines, `calendar.readonly`, one-way `events.list` poll. My original sync-integrity analysis does not apply — there is no sync to get wrong, and read-only import is a legitimate, much cheaper design. What remains is correcting the docs and deciding explicitly whether write-back is ever wanted. If it isn't, stop calling it sync.

---

## R12 — Administrative overhead is the real risk ✅ high, outranks the rest

The app asks one person, daily, to maintain sprints and backlog, kanban with blocking dependencies, goals and OKRs with target dates and snapshots, habit check-ins bound to scheduled days, the planner matrix with capacity and routines and time blocks, daily review with mood and energy and wins and blockers, the decision log, and career skills and milestones.

Personal productivity tools rarely die from missing features. They die when maintenance cost exceeds payoff for two weeks running and the data goes stale — after which every derived number becomes not merely absent but actively misleading, because velocity, pace, streaks, and analytics all report on an under-logged period as though it were an unproductive one.

The audit sharpens this considerably. The planner matrix's information density is where the input surface first exceeded what one person can hold — and it now turns out that several things competing for attention alongside it do nothing at all: automations never fire, skills never auto-level, the activity feed has no read path, sprint reports are never displayed, and analytics computes `activeStreaks` and `okrPace` that the UI omits. The system asks for more input than it can act on, and some of what it does compute it never shows.

**Directions.**

Make the daily loop small and fixed — one screen, under sixty seconds, habit ticks plus a two-field review. Everything else becomes opt-in depth rather than daily obligation.

Derive instead of asking. Deep-work time already comes from focus sessions; velocity from task completion. Any number the system can compute should never be a form field — and note the inverse problem too: `activeStreaks` and `okrPace` are computed nightly and not rendered, so some of the payoff for existing input is being thrown away for the price of a chart.

Treat gaps as first-class data. An un-logged day must be distinguishable from a zero day in every analytic, or the numbers lie during exactly the periods you most want to understand.

Let the AI absorb structure. "Shipped the auth refactor, blocked on the Stripe webhook, energy was low" should populate the daily log, resolve a task, and flag a blocker. One free-text field fanning out into structured records is the strongest case for having an LLM in this product — considerably stronger than the intent router — and it attacks the overhead problem rather than decorating it. The RAG pipeline and structured-output plumbing to do this already work.

Cut rather than finish. Automations are going. `Certification` and `CareerMilestone` are L0 and cited in the docs as built. A cut module costs nothing; a half-built one occupies nav space and erodes trust in its neighbours.

---

## Priority

| | Risk | Prompt | Why now |
|---|---|---|---|
| 0 | R13 Goal update outage | P0 | Confirmed broken in production; one line plus a sibling check |
| 1 | R1 Post-commit events | P1 | Nearly free while the bus is empty; prerequisite for P4 |
| 2 | R2 Tenancy | P2 | Only live data-leak class; cost rises per commit |
| 3 | R15 Authorization gaps | P3 | VIEWER and GUEST can currently mutate |
| 4 | R11 Prune automations | P4 | Decided; removes a broken promise from the UI |
| 5 | R16 Holiday capacity | P5 | Self-contained; the feature currently permits what it exists to prevent |
| 6 | R12 Overhead | — | Determines whether the app survives daily use; design session, not a prompt |
| 7 | R18 RAG hardening | P6 | Index and backfill; provenance before any model change |
| 8 | R3 Streak display | P7 | Visibly wrong number erodes trust in the data |
| 9 | R14 + R17 Observability and write-only paths | P8 | First real measurement of AI cost; decide finish-or-delete per table |
| 10 | R9 Pace server-side | P9 | Testability, plus unblocks the one trigger worth having |
| 11 | R8 Concurrency policy | P10 | Decision, then apply |
| 12 | R10 Intent router | — | After R14, so the improvement is measurable |
| 13 | R6 Doc correction | — | Delete the three inaccurate docs; keep the audit in `docs/` |
