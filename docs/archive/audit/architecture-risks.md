# Architecture risk register

This register was revised on 7 September 2026 after a code review. It records the reasoning behind the repair plan, including findings that were later corrected. Read it alongside the [reality audit](reality-audit.md) and the [repair records](README.md); the conditions below are historical observations.

## Findings that were corrected

R5 described the chunker's default of 3,000 characters with 400 characters of overlap as a retrieval defect. The embedding worker actually called it with 800 characters and 100 characters of overlap. The running pipeline already used the proposed size; the documentation had confused a helper default with its caller's settings.

R7 alleged a capacity cache invalidation problem. Capacity was calculated per request and did not use the Redis service, so there was no such cache to invalidate.

R3 originally claimed that habit streaks never broke. A nightly worker already reset streaks after missed days. The narrower problem was an immediate display based on an optimistic increment and a day boundary that did not consistently match the user's timezone.

## Confirmed findings at the time

| Identifier | Observation | Why it mattered |
| --- | --- | --- |
| R13 | Goal progress requests omitted the version required by validation. | Saves failed with HTTP 400 before reaching the update service. |
| R2 | Workspace isolation depended on manually scoped queries. | A missing workspace or personal-user filter could expose unrelated records. |
| R15 | Role checks covered only part of the route surface, and refresh-token reuse did not revoke the session family. | Read-only roles could mutate data, and detected token reuse lacked the intended response. |
| R1 | Domain events were emitted inside transactions. | Subscribers could observe changes that were later rolled back. |
| R16 | Holidays were represented as one-hour blocks, with a small mock fallback calendar. | Weekly capacity allowed roughly seven extra working hours per full-day holiday in the standard eight-hour schedule. |
| R11 | Automation rules were saved, but their evaluator had no caller. | A saved rule appeared usable even though it could never execute. |
| R14 | Some AI calls bypassed the shared gateway and request telemetry. | Provider settings and measurements differed across execution paths. |
| R17 | Several tables had writers without application readers, or no application path at all. | The schema overstated the features available to a user. |
| R3 | Immediate streak updates and timezone boundaries disagreed with later reconciliation. | The displayed streak could remain misleading until the worker ran. |
| R18 | Retrieval lacked a vector index, a historical-document backfill and embedding provenance. | Older documents could be missed, searches could scan the corpus, and model changes could invalidate stored vectors. |
| R9 | Goal pace was calculated in the frontend from raw snapshots. | The calculation was harder to reuse and test independently of the view. |
| R8 | Versioned models used inconsistent update policies. | Some writes rejected stale changes while others silently skipped protection. |
| R10 | Intent classification and answer generation used separate AI calls. | Each interaction incurred an extra round trip without clear measurement of its benefit. |
| R6 | Calendar documentation promised bidirectional synchronization. | The implementation was a read-only import, without write-back or webhooks. |

The initial order addressed the goal-save outage first, then transaction events, tenant isolation and authorization. It next removed the unusable automation surface, corrected holiday capacity, hardened retrieval and streak calculations, and reviewed write-only data, pace calculations and concurrency policy. Provider performance work depended on usable telemetry. This was the priority order for that review, not a current backlog.

## R12: the cost of maintaining a personal workspace

The broader product risk was administrative effort. One person was being asked to maintain tasks, sprints, goals, habits, capacity, routines and daily reviews. When that effort exceeds the value of the app, records become stale and the resulting analytics can confuse missing input with poor performance.

The design response was to keep the daily loop small and make deeper planning optional. Focus time and task completion should supply derived measures wherever possible. Reporting should distinguish an unlogged day from a measured zero.

AI assistance can reduce this effort by proposing structured updates from a short review. The person still needs to inspect and accept those proposals. A half-built feature that requests input without using it should be finished deliberately or removed from the interface.

## How to use this history

The review established a useful rule: verify a feature's producer, consumer and execution path before describing it as available. Schema definitions, unused services and intended diagrams cannot establish runtime behavior. For current behavior, follow the source and the verification instructions in the [development guide](../../development/README.md).
