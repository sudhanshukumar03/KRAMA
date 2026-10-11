# Reality audit

The September 2026 review compared the architecture documents with the code paths that actually ran. It looked for a producer, a consumer and a usable interface for each advertised capability. This document preserves that assessment; later changes are described in the [repair records](README.md).

## How the review classified features

| Level | Meaning in this review |
| --- | --- |
| L0 | No application implementation beyond a name or schema entry. |
| L1 | A partial implementation without a usable execution path. |
| L2 | Some working behavior, with a material missing connection or contract. |
| L3 | An end-to-end path with a real consumer. |
| L4 | A mature implementation supported by wider operational evidence. |

These levels were review shorthand, not product guarantees. File names and line numbers below identify evidence from the reviewed revision and may have changed since then.

## Module observations

| Module | Recorded level | Historical source evidence |
| --- | --- | --- |
| Automations | L2 | `automation.service.ts:4`, `task.controller.ts:1`, `subscribers.ts:4`, `AutomationRules.tsx:105` |
| Domain event bus | L2 | `subscribers.ts:4-15` |
| RAG / AI | L3 | `page.controller.ts:84`, `embedding.worker.ts:28`, `retriever.ts:16`, `krama-ai.service.ts:181`, `AIAssistant.tsx:133` |
| Knowledge Graph | L3 | `apps/web/package.json:34`, `KnowledgeGraph.tsx:23`, `knowledgeGraph.controller.ts:16` |
| Career & Skills | L3 skills / L0 cert+milestone | `skill.service.ts:8`, `SkillsModule.tsx:14`, `schema.prisma:768`, `:781` |
| Analytics | L3 | `worker.ts:20`, `analytics.worker.ts:7`, `analytics.service.ts:4`, `Analytics.tsx:17` |
| Calendar sync | L2 | `google-calendar.service.ts:14`, `:39`, `planner.routes.ts:122` |
| Habits & streaks | L3 | `habit.service.ts:103`, `:131`, `habitStreak.worker.ts:7`, `HabitTracker.tsx:138` |
| Planner & capacity | L3 | `planner.routes.ts:105`, `capacity.service.ts:33`, `CalendarificHolidayProvider.ts:15`, `PlannerPage.tsx:30` |
| Goals & pace | L2 | `packages/validation/src/execution.ts:53`, `goal.service.ts:51`, `Goals.tsx:26`, `goalUtils.ts:38` |
| Sprints | L3 sprints / L0 reports | `SprintView.tsx:15`, `:62`, `sprintReport.worker.ts:7` |
| Tenancy | L2 | `prisma.ts:1` |
| Auth & roles | L3 auth / L2 roles | `auth.middleware.ts:52`, `auth.service.ts:185` |
| Real-time & caching | L3 | `socket.service.ts:11`, `SocketProvider.tsx:29`, `redis.service.ts:14`, `auth.service.ts:109`, `ai.controller.ts:388` |

The review found working paths for retrieval, the knowledge graph, analytics, sockets and sprint management. Those paths did not establish every adjacent claim. For example, the automation evaluator had no caller, habit logging did not automatically level a skill, and several event-driven actions existed only in the architecture prose.

Goal progress writes failed validation because the client omitted a required version. Role enforcement did not cover all mutation verbs, refresh-token reuse lacked family revocation, and holiday capacity deducted one hour where a full working day was intended. Those were concrete behavior defects rather than documentation differences.

## Data without an application reader

`SprintReport` was written by its worker but had no report consumer. The sprint view's current-state burndown was not a substitute for a historical time series. `ActivityLog` had a writer without the advertised feed read path. `AiRequest` had request records and a retention cleaner, but no user-facing telemetry reader in that revision.

`Certification` and `CareerMilestone` had neither application writers nor readers. Their presence in the schema did not make the corresponding features available. Each of these paths needed a deliberate decision to expose a useful consumer or remove unused functionality.

## Claims the evidence did not support

The advertised cascade from a habit checkoff to skills, activity, automations and analytics did not exist as one connected workflow. The event registry and its actual callers had to be checked independently.

Google Calendar integration was a read-only import. It did not push changes, receive webhooks or resolve bidirectional conflicts. AI calls also did not all share one provider configuration and telemetry path. Documentation that inferred a provider from a schema default missed direct calls elsewhere in the application.

Capacity calculations did not use Redis caching. Without a configured holiday provider, the calendar fallback was a short mock list rather than comprehensive location coverage. Goal concurrency fields existed, but the client and validator did not agree on their write contract.

## Corrections to the earlier assessment

Three findings were revised after following the complete paths. The embedding worker already selected an 800-character chunk size with 100-character overlap, despite a larger unused helper default. There was no capacity cache invalidation bug because no capacity cache existed. Habit streaks did break through a nightly worker; the remaining defects concerned immediate display and timezone boundaries.

The [risk register](architecture-risks.md) records the corrected priorities. Current setup instructions and test commands are maintained in the [development guide](../../development/README.md).
