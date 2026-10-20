# Remaining logic repairs and verification

Plan: [remaining-logic-repair-plan](2026-10-19-remaining-logic-repair-plan.md). Original reproductions: [remaining-logic-findings](2026-10-19-remaining-logic-findings.md).

## Behavior after repair

**Focus:** an overdue deadline can offer unscheduled work, but it no longer overrides an explicit future work date in the automatic plan. A current-day priority or time block still opts that task into today's plan. Open dependencies and daily review decisions continue to control eligibility. Deadline visibility in Dashboard/Planner is retained.

**Individual task recovery:** a task keeps an active project in the same workspace. If its project is deleted or unavailable, recovery clears the project link so the task is usable independently, including Planner reservation. It does not revive the deleted project. Restoration locks the project row before deciding, following the project's own deletion/restoration order; it re-reads after waiting and performs cleanup in the same guarded task transaction. Project-level Undo continues restoring only the tasks deleted with that project, preserving earlier task deletions and independent recoveries.

Implementation: [focusTimer.service.ts](../../apps/server/src/services/focusTimer.service.ts) and [task.service.ts](../../apps/server/src/services/task.service.ts).

## Added regression coverage

Nine maintained live cases in [remaining-logic-regressions.spec.ts](../../e2e/live/remaining-logic-regressions.spec.ts): future-date precedence, today's/overdue unscheduled deadlines, explicit priority plus dependency, reservation override, inactive/active project recovery, mixed project Undo history, and four simultaneous project-delete/task-restore races.

Two database cases in [task_recovery.integration.test.ts](../../apps/server/src/__tests__/task_recovery.integration.test.ts): recovery during an intentionally uncommitted project deletion, and injected failure after the recovery write verifying rollback of link/version/activity/events. The new suite is registered in the integration runner.

The new live cases first produced 4 failures and 5 passing guards on the old implementation. All 9 passed after repair. These tests extend coverage; previous passing tests did not cover the two reported failures.

## Verification

| Check | Result |
| --- | --- |
| New focused live regressions | 9 passed |
| Unit suites | 157 tests passed; 27 suites |
| Database integration suites | 59 tests passed; 9 suites |
| All-package build | Passed |
| Lint | Passed |
| Production-mode startup smoke | Passed: health, signup, refresh, authenticated read, capability reporting, unconfigured-upload 503, timezone preflight and HTTP/polling/WebSocket origin isolation |
| Existing local database migration status | Passed read-only check; no migration applied |
| Production Compose configuration | Passed validation; no containers replaced or started |
| Complete final live suite | 127 passed; 5 external checks skipped; 0 failures; 0 flaky cases; 0 runner errors (7.0 minutes) |

Raw before/after evidence is retained under `.audit/full-2026-10-19/remaining-repair-*` as ignored local development artifacts. All tests use dedicated PostgreSQL/Redis audit targets and disposable users; personal workspace records are preserved.

## Configuration limits

JWT values in the local host and Docker environments meet the startup length requirement and have no checked placeholder markers; values were not printed. Docker frontend/CORS origins are explicitly set. Host development uses the supported local-origin defaults. Production-mode behavior was exercised with temporary isolated startup settings, not deployed public ingress.

R2 is still unconfigured in both environment files: real account, access-key, secret, bucket and public URL values are absent. Upload capability reporting and its unavailable state are verified, but successful uploads require the owner's real bucket details/credentials. No placeholder secrets were added. Actual external AI/embedding success and deployed proxy/large-backup ingress remain unverified; skipped checks are not passing results.

No commit, deployment, database reset or schema migration is required for these two logic changes.

All executed checks passed on the final implementation. No reproduced issue from this repair remains unresolved. Five external AI/embedding/deployed-ingress checks remain unverified and are not counted as passes. This result describes the tested coverage and does not prove that all possible defects are absent. Final JSON: `.audit/full-2026-10-19/remaining-repair-full-live-results.json`.

After verification, audit-owned API/worker process trees were checked by command line and stopped. Existing user services and Docker containers were preserved.
