# Configuration and workflow closure recheck

Subsequent review found and repaired two additional uncovered boundary cases: [latest repairs and verification](2026-10-19-remaining-logic-repairs.md). The passing results below describe the tested cases and do not mean that the application has no remaining defects.

Follow-up plan: [configuration-recheck-plan](2026-10-19-configuration-recheck-plan.md). This review supplements the earlier [fix recheck](2026-10-19-fix-recheck.md). It uses disposable accounts and the isolated audit PostgreSQL/Redis services; personal workspace records and credentials are preserved.

## Confirmed and repaired

- **Planner project attribution:** moving a task from project A to B caused title-only and date-only edits to its existing block to return 400. Creating a block with only a task ID also saved no project. Linked reservations now derive the current task project during transactional validation. Task-only relinks derive their new project too. Explicit contradictory non-null project links still return 400. Project-free reservations remain supported.
- **Concurrent Brain recovery:** restoring eight sibling notes from a deleted space produced six separate active ?Recovered notes? spaces. Recovery now locks the workspace before reading current deletion state and selecting/creating its destination, using the same lock as Space deletion. All restored notes share one destination; repeated restoration is idempotent. Existing subtree and earlier-deletion rules are retained.
- **Restore scope errors:** restoring a task through another selected workspace returned 409 ?nothing to restore.? It now returns 404, consistently hiding out-of-scope records. Repeated restore in the original workspace still returns the appropriate 409.

A suspected cross-workspace Undo callback defect was not reproduced: switching workspace intentionally performs full navigation to protect draft/session scope, so its temporary toast does not survive the reload. No callback or session architecture was changed. A browser regression instead verifies the real switch, wrong-scope read/restore rejection, original-scope restore, and restored visibility after switching back. The test waits for navigation to finish before opening Planner.

Maintained coverage: [configuration-recheck-live.spec.ts](../../e2e/live/configuration-recheck-live.spec.ts). The original D04 regression now expects implicit task-only relinks to derive their project, while preserving explicit mismatch rejection and the legacy Focus attribution check.

## Verification

| Check | Result |
| --- | --- |
| Four focused live cases | 4 passed |
| Unit suites | 157 tests passed in 27 suites |
| Database integration suites | 57 tests passed in 8 suites |
| All-package build | Passed |
| Lint | Passed |
| Existing local database migration status (read-only) | Passed; no migration applied |
| Production Compose configuration (no containers started) | Passed configuration validation |
| Production-mode startup smoke | Passed: health, signup, refresh, authenticated reads, capability reporting, upload 503, timezone preflight, HTTP/polling/WebSocket origin isolation |
| Complete final live suite | 118 passed; 5 external checks skipped; 0 failures; 0 runner errors (6.8 minutes) |

The original reproduction and intermediate test-assumption failures are retained in local `.audit/full-2026-10-19/closure-before*.log` files. The first same-note concurrency attempt passed; expanding it to concurrent sibling restoration reproduced the duplicate-space bug. The final focused run covers both sibling concurrency and repeated same-note requests.

## Configuration boundary

Core database/Redis/authentication startup and worker workflows are verified locally. Secret values were never printed. Missing `FRONTEND_URL` and `COOKIE_SECURE` in the host development environment are optional defaults, not broken local setup; production origins/cookie behavior require explicit deployment values and HTTPS.

Object storage is not configured: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL` are absent. The application correctly reports uploads unavailable and returns 503. Successful uploads require real bucket details and credentials; placeholders are not a configuration fix.

GROQ/Gemini key presence was checked privately, but provider credentials and real generation/embedding success were not exercised in this isolated run. Production proxy/large-backup ingress is also unverified because no deployed target was supplied. These are remaining external verification requirements, not passing checks. No deployment, personal-data migration, or provider purchase was performed.

All executed checks passed on the final implementation. The five skipped cases comprise real AI/embedding operations and deployed production ingress; they are not counted as passes. Raw JSON is preserved in `.audit/full-2026-10-19/closure-full-live-results.json`; runner-reported errors are empty. PowerShell reported native stderr warnings as NativeCommandError in the wrapper log, while the Playwright report records zero failed tests and no runner errors.

Audit-owned API and worker process trees were verified by command line and stopped after the run. Existing user services and Docker containers were left running. No schema or personal workspace data changes were needed.
