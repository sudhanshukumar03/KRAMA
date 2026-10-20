# Remaining logic findings

**Resolved:** both findings are now repaired and covered by the [remaining logic repairs and verification](2026-10-19-remaining-logic-repairs.md) report. The original reproduction details below are preserved as history.

Review requested after the closure verification. This is an additional read-only application review with synthetic records in the isolated audit database. No production source changes were made.

## 1. Focus includes future-scheduled tasks because their deadlines are overdue

Reproduced: create an open TODO task with scheduledDate three days ahead, dueDate yesterday, and a 25-minute estimate. With no priority selection or reservation for today, GET focus-sessions/schedule still includes it in today's plan.

Cause: the eligibility query in `apps/server/src/services/focusTimer.service.ts:106` independently accepts any dueDate up to today, even when a later scheduledDate exists. A deliberate work date therefore does not exclude the task from today's automatic Focus queue. Calendar/deadline visibility can remain useful, but automatic work selection should have an explicit precedence rule.

Suggested rule: an explicit future work date excludes automatic selection today, unless the user deliberately adds a current-day priority or time block. Keep overdue deadlines visible separately. This is a scheduling policy gap; changing it should include tests for all overrides.

## 2. Individual task recovery retains a deleted project link and breaks Planner reservation

Reproduced: create a project task, delete the task, delete its project, restore only the task. The restored task is active; its API project relation is null, while projectId still references the deleted project. Creating a Planner block with just this taskId then returns 404 instead of creating a reservation.

Cause: `apps/server/src/services/task.service.ts:245` restores the task without reconciling inactive project links. Planner derives its project from the task and correctly rejects the deleted project in `apps/server/src/services/planner.service.ts:97`. The restored task is therefore visible but cannot use the normal scheduling flow until its project association is removed or the project is restored.

Suggested repair: reconcile the project association during individual restoration, allowing the recovered task to work independently; retain current explicit-invalid-link validation in Planner. Test both individual recovery and project-level Undo, including earlier independently deleted tasks.

## Evidence and limits

Two isolated API probes were rerun after server readiness. Both failed their intended-behavior assertions: unexpected inclusion in the Focus plan, and HTTP 404 on Planner creation after task restore. Evidence is retained locally in `.audit/full-2026-10-19/remaining-logic-confirmed.log`, `remaining-logic-results.json`, and `remaining-logic-probes.spec.ts`. The first attempt also had a startup connection race; it is not counted as an application defect.

The previous 118 passing live cases remain valid for their covered paths. These additional boundary cases were not covered by that suite. This review does not establish that these are the only remaining defects. The previously documented missing object-storage credentials and unverified external provider/production operations remain separate configuration limits.
