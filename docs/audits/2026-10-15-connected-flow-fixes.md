# Krama connected-flow fixes — October 15, 2026

**All six issues from the connected-flow review are fixed and regression-verified.** The full browser/module suite passed all 130 tests in one run. Product ideas listed separately in the review remain recommendations, rather than additional implemented features.

## Changes

| Finding | Corrected behavior | Regression coverage |
| --- | --- | --- |
| RC-01 — Goal partial-save draft loss | Settings and check-in have independent dirty flags and edit revisions. A partial save clears only its own section, preserves the other draft, and advances the retained draft's version. Newer edits made during a slow save remain recoverable. | Both save directions, next-save versions, recovery record cleanup, edits during slow settings/check-in saves. |
| RC-02 — Focus late acknowledgement | Completion retires its matching active snapshot synchronously before awaiting the save. Acknowledgement also retires the original selection independently of mounted effects. Completion IDs prevent older responses from erasing newer timers. | Return after a late save offers the completion decision; ordinary/selected snapshot cleanup; newer timer and pending-save preservation; damaged-cache tolerance. |
| CF-01 — Hidden Planner deadlines | Day, week, and month consider schedule and deadline independently. Week totals and completion percentages count each task once. Multiple calendar placements use distinct drag IDs. Focus uses the day the user selected; Dashboard uses its current reporting date. | Real Planner service output, both dates inside/outside a range, coincident dates, unique completion totals, day-to-week visibility, month-boundary visibility, three Focus entry paths. |
| CF-02 — Hidden open subtasks | Search/project/priority filters retain matching children. A hidden archived parent cannot hide open children. Unfiltered hierarchy still exposes children through their visible parent. Drag ordering uses the visible cards. | Child-only search, hidden canceled parent, project and priority filters. |
| CF-03 — Pinned habit rest days | Planner carries schedule eligibility and extra-log information. Pinning preserves daily rest days; empty daily schedules retain the all-days policy. Weekly habits remain eligible any day and display their weekly target. Existing extra logs remain visible and undoable. | Habit/Planner rest-day consistency, old extra-log Undo, weekly targets/eligibility, real service contract tests. |
| CF-04 — Deleted Brain descendant selection | Choosing the next document excludes the complete deleted subtree. If no document survives, the URL clears its selected document. Undo restores and opens the deleted root. | Parent/child/grandchild trees, surviving-document selection, empty state, Undo. |

## Verification

- Production workspace build: passed.
- Workspace lint: passed.
- Test/configuration TypeScript: passed.
- Backend unit/service suites: 22 passed, including eight new Planner workflow tests.
- Shared validation: 25 passed.
- All original reproductions pass after correcting the Focus assertion to accept the automatically opened completion decision and its working Review control.
- Expanded targeted tests pass. One retry-flow test dismisses its success toast before clicking a footer control the toast can overlap.
- Full browser/module suite: all 130 tests passed in one run; Playwright recorded no failed tests and the command exited successfully.

Full-run evidence: [.audit/connected-fixes-browser.log](../../.audit/connected-fixes-browser.log), [.audit/connected-fixes-server.log](../../.audit/connected-fixes-server.log), [.audit/connected-fixes-build.log](../../.audit/connected-fixes-build.log), and [.audit/connected-fixes-validation.log](../../.audit/connected-fixes-validation.log).

Permanent tests:

- [Connected-flow browser regressions](../../e2e/mocked/connected-flow-regressions.spec.ts)
- [Partial-save and late-response browser regressions](../../e2e/mocked/partial-save-recovery.spec.ts)
- [Focus recovery module tests](../../e2e/unit/focus-recovery.spec.ts)
- [Planner service regressions](../../apps/server/src/__tests__/planner_workflow.test.ts)
- [Planner service response fixture](../../e2e/fixtures/connected-flow.json)

The `.audit` reproduction entry points now import permanent tests asserting corrected behavior. The service probe checks the corrected Planner contract and retains the explicit off-schedule-log observation to verify that old extra logs can still be recognized and undone.

## Limits

Browser API responses and service database/cache IO are mocked. No live workspace records were modified. Isolated database/Redis integration and deployed provider behavior remain unverified. These changes require no database schema migration.
