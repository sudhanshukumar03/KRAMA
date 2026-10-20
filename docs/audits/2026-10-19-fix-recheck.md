# Independent repair recheck

Later complete rerun: [configuration and workflow closure recheck](2026-10-19-configuration-recheck.md) records 118 passing live cases and additional alternate-path repairs.

Follow-up review of the previously repaired personal-workspace flows. The original regression cases were supplemented with alternate entry points before changing production code.

## Reproduced before the follow-up changes

Five new live checks: four failed and one passed.

- Creating a linked time block does not activate BACKLOG work or clear Inbox classification.
- Relinking/moving a block does not update its task plan in the same operation; the UI currently relies on a second task request.
- Remembering a timezone appends to malformed legacy array metadata rather than producing an object, so background jobs still lack the saved timezone.
- Changing a search after collapsing a prior result does not reveal the matching goal path.
- A conflicting reservation already leaves the task unchanged; preserve that behavior.

## Repair and verification plan

1. Share the task update transaction with Planner block creation/relink/date movement. Publish task events only after commit, retain serializable overlap protection, preserve completed/canceled tasks and deliberate deferral on ordinary edits.
2. Remove the redundant client task write and invalidate the task/day data affected by block changes.
3. Normalize legacy metadata before atomically merging the timezone.
4. Expand goal matches for each changed query while retaining manual collapse controls.
5. Verify the new failures become passes, test rollback and terminal-state boundaries, run unit/integration/build/lint checks, and rerun the complete live suite against the final implementation.

## Implemented

- Planner and task writes now share a serializable transaction with events published only after commit. Block creation plans linked backlog work; actual task relinks and date moves update the linked task. Notes/time edits preserve deliberate deferral. Completed/canceled work is not reopened. Already-planned work retains its version when a new reservation causes no task change.
- Planner's drag/link handler makes one mutation. Block mutation completion refreshes task, Dashboard and daily-plan queries as well as Planner/Focus.
- Timezone persistence turns non-object legacy metadata into an object before merging, while retaining existing object properties.
- Goal expansion follows changes to the actual query, rather than only an empty/nonempty flag. Manual collapse remains available between searches.

Implementation: [planner.service.ts](../../apps/server/src/services/planner.service.ts), [task.service.ts](../../apps/server/src/services/task.service.ts), [prisma.ts](../../apps/server/src/prisma.ts), [userTimeZone.service.ts](../../apps/server/src/services/userTimeZone.service.ts), [PlannerPage.tsx](../../apps/web/src/components/planner/PlannerPage.tsx), [usePlannerWeek.ts](../../apps/web/src/hooks/usePlannerWeek.ts), and [GoalCard.tsx](../../apps/web/src/components/goals/GoalCard.tsx).

Maintained tests: [repair-edge-cases-live.spec.ts](../../e2e/live/repair-edge-cases-live.spec.ts) and [planner_atomicity.integration.test.ts](../../apps/server/src/__tests__/planner_atomicity.integration.test.ts). The latter forces failure after both database writes, verifies rollback of the block/task/activity, checks that no event escapes, and races four overlapping reservations to verify a single accepted plan/event.

## Verification

| Check | Result |
| --- | --- |
| Initial new edge cases before changes | 4 failures reproduced; 1 existing guard passed |
| First focused rerun after changes | 7 passed, including rollback-conflict and terminal-state boundaries |
| Unit tests | 157 tests; 27 suites passed |
| Integration tests | 57 tests; 8 suites passed, including the new rollback/concurrency tests |
| Focused mocked Planner/shared-flow checks | 39 passed |
| Build | Passed |
| Lint | Passed without warnings |
| Broad complete live suite on final implementation | 111 passed; one stale navigation assertion failed; five external checks skipped and two later serial cases did not run |
| Connected cross-section recheck | 3 passed after updating the task/date navigation assertion described below |

The broad run passed all eight new edge cases, all thirteen original repair cases, the legacy-note recovery case, both restored-note theme cases, and the remaining task/project/goal/habit/Focus/navigation checks. Together with the corrected three-case serial-group rerun, **114 distinct live scenarios passed**. No executed case remains unresolved after that recheck. The five external AI/embedding/production-ingress checks were not verified and are not counted as passing.

The updated planning contract also exposed a stale cross-section test assumption: Dashboard correctly opens a reserved task at `/focus?task=…&date=…`, while the test required a query-free URL. The test now asserts the exact planned task and date. It then opens general Focus separately for its one-minute preference/pause check, so the reservation's thirty-minute duration is not mistaken for a timer-preference failure. All three cases in that serial group passed on rerun. The broad run's original failure and two dependent skips will remain visible in its raw report; they are not silently counted as passes.

This review uses isolated PostgreSQL/Redis services and disposable accounts. Personal data and unrelated working-tree changes are preserved. No commit, deployment or schema migration is required. External AI/embedding success and production-ingress checks remain outside the isolated run.

Review complete. The follow-up fixes are implemented and covered by maintained regressions. Audit-owned API/worker services were stopped after verification; existing app services and Docker containers were left alone. Raw before/after reports are preserved under `.audit/full-2026-10-19/` as local development artifacts.
