# Persistent personal-workspace repairs

Follow-up verification found additional failures outside this first test set. See [the independent recheck](2026-10-19-fix-recheck.md) for those reproductions, further repairs, and the latest verification results. Counts below describe the initial repair pass.

The [repair plan](2026-10-19-repair-plan.md) was written before production edits. Changes implement the thirteen findings from the [original audit](2026-10-19-personal-workspace-audit.md). That audit remains historical evidence of the before state.

## Changes

| Finding | Implemented behavior | Maintained regression |
| --- | --- | --- |
| D01 | Historical inline mentions no longer block unrelated note saves after their destination is deleted. New inactive references remain forbidden. | Save and reload writing around a deleted task; reject the same inactive reference in a newly created note. |
| D02 | Restored notes leave deleted spaces for an active destination. If no active space exists, a Recovered notes space is created. Descendants move with the restored subtree; unrelated earlier deletions remain in Trash. The UI refreshes spaces and selects the destination. Notes already stranded by the old restore also appear in Trash and can be recovered without a migration. | Check parent/child visibility and destination; restore through Trash, reload and save further writing in both themes; simulate the legacy stranded state and recover its subtree. |
| D03 | Note-to-task conversion inherits a project only when it remains active in the same workspace. A surviving note can otherwise create an unassigned task. | Delete the project, then create a task from its retained note. |
| D04 | Planner rejects contradictory task/project pairs on create and update, including unchanged associations during partial updates. The form derives the project from its selected task. Focus follows the task's current project, protecting older inconsistent blocks. | Reject mismatched creation, project-only changes and task-only changes; verify the legacy-block Focus fallback. |
| D05 | Return to backlog writes BACKLOG state and clears the scheduled day while preserving the deadline. Day view places deferred tasks in Backlog rather than the active dated list. | Check state, retained deadline and both Planner tabs. |
| D06 | Brain graph queries exclude deleted task/project destinations and omit edges to missing nodes. | Delete a referenced task and verify that neither its node nor destination edge remains. |
| D07 | Shared Planner scheduling patches activate BACKLOG tasks and clear Inbox classification while retaining other metadata. The task service also normalizes date-only requests from older clients. | Schedule through Planner and through a date-only API request; verify Focus eligibility and metadata. |
| D08 | Browser-driven Habit and Planner eligibility/statistics honor a validated IANA timezone. Session bootstrap and successful completion changes remember that timezone for background streak processing, merging metadata atomically. Calendar location shows the detected zone and device-following policy. | Complete a newly created habit across a UTC date boundary; verify saved timezone and day key; reject invalid timezone input. |
| D09 | Space deletion shares transactional goal deletion and automatic-progress logic. Surviving links, versions, rollups, events, and cached goal lists are updated. | Imported space/goal association, linked habit edit after deletion, and a previously cached goals list. |
| D10 | Both Planner task-deletion paths share an eight-second Undo action. Restoration refreshes task, Planner, Focus, project, goal, Dashboard and daily-plan queries. | Delete through day view, await Undo's restore response, verify persisted task and visible row. |
| D11 | Goal lists assemble complete subtrees from flat records rather than truncating descendants at three levels. Add-child controls support the displayed hierarchy. Indentation stops accumulating after the early levels to retain usable width. The full-tree cache has a new version. | Persist and display a fourth level; unit check a fifth level and defensive serialization of legacy cycles. |
| D12 | Habit date, duplicate and missing-checkoff errors carry validation statuses through the Planner endpoint. Invalid completion requests do not become generic server failures. | Pre-creation routine checkoff returns 400 and writes no completion. |
| D13 | Goals search recursively checks descendants and expands the matching hierarchy when search begins. | Find a third-level title through the main Goals search. |

Key implementation files: [documentContent.service.ts](../../apps/server/src/services/documentContent.service.ts), [document.service.ts](../../apps/server/src/services/document.service.ts), [planner.service.ts](../../apps/server/src/services/planner.service.ts), [task.service.ts](../../apps/server/src/services/task.service.ts), [habit.service.ts](../../apps/server/src/services/habit.service.ts), [userTimeZone.service.ts](../../apps/server/src/services/userTimeZone.service.ts), [goal.service.ts](../../apps/server/src/services/goal.service.ts), [goalTree.ts](../../apps/server/src/lib/goalTree.ts), [space.controller.ts](../../apps/server/src/controllers/space.controller.ts), [plannerTaskActions.ts](../../apps/web/src/lib/plannerTaskActions.ts), and [useTaskDeletion.ts](../../apps/web/src/hooks/useTaskDeletion.ts).

## Verification

Maintained tests assert correct behavior, unlike the audit-local diagnostic probes that intentionally asserted the defects. See [persistent-workflow-regressions.spec.ts](../../e2e/live/persistent-workflow-regressions.spec.ts), [persistent-recovery-ui-live.spec.ts](../../e2e/live/persistent-recovery-ui-live.spec.ts), and [persistent_workflow.test.ts](../../apps/server/src/__tests__/persistent_workflow.test.ts).

| Check | Result |
| --- | --- |
| Server unit tests | 157 tests; 27 suites passed, including the new contract tests |
| Server integration tests | 55 tests; 7 suites passed against isolated PostgreSQL/Redis |
| Targeted live repairs and connected flows | 27 passed |
| Restored-note browser editing, light/dark | 2 passed |
| Full build | Passed |
| Web/server lint | Passed without warnings |
| Broad full live suite | 102 passed; 5 skipped; one outdated project-dialog locator failed and was corrected/rechecked below |
| Final checks on restarted services and latest source | 19 passed: all 13 fixes, three boundary/legacy cases, two restore/edit theme cases, and the corrected project-dialog case |
| Focused mocked regressions | 56 passed |
| Firefox/WebKit responsive matrix | 20 passed across nine workspace routes, both themes and four viewport widths |

There are no unresolved failures among the executed checks after the targeted recheck. The broad run and final recheck together cover 106 distinct passing live scenarios. The five skipped checks require actual AI/embedding providers or production ingress; they were not silently counted as passes. The full live suite was not repeated after the final legacy-recovery refinement: that change was covered by the restarted-service checks and fresh server unit/integration/build/lint runs.

Existing tests were updated to use current accessible controls rather than removed UI. The duplicate-habit test uses today's day and a deliberately different scheduled weekday, preserving its off-schedule assertion. The historical Planner fixture is explicitly created as an older habit so its backfill remains valid; separate tests still forbid pre-creation dates. Error assertions allow the application's configured query retries to finish, and still exercise actual recovery controls.

No schema migration is required. Timezone persistence uses existing user metadata. Verification uses disposable accounts in the isolated audit database and Redis database; it does not modify personal workspace records. Existing stranded notes can be recovered through Brain → Trash. Source changes are uncommitted and undeployed.

External provider success, production ingress and physical-device sleep/keyboard behavior remain outside these checks. Automated browser tests establish the tested scenarios, not a guarantee that no other bugs exist.
