# Personal workspace fix recheck — 15 October 2026

Rechecked capture → Inbox → priorities → separate-tab Focus → daily review, plus backup restoration. Two additional cross-tab defects were reproduced and corrected.

## Corrected findings

### A completed capture could erase another tab's newer draft

Previously, every tab wrote the same per-mode draft. A delayed successful save cleared that mode unconditionally. A second tab's newer, unrelated draft disappeared after reload. A failed first-tab capture could also be replaced by a second tab's typing.

Each tab now keeps its own working copy in session storage. A shared local-storage checkpoint remains available to a fresh tab. Saving/discarding clears the shared checkpoint only if its content still matches the draft being retired. Empty tab copies prevent unrelated shared drafts from being resurrected after a successful save.

Verified both a delayed successful save and independent failed drafts, with reloads in each tab. Existing account/workspace/date isolation and per-mode drafts are retained.

Files: `apps/web/src/lib/captureDraft.ts`, `apps/web/src/components/ui/QuickCaptureModal.tsx`.

### An older Dashboard tab could overwrite newer priorities

The database lock serialized requests but did not detect stale lists submitted by another tab. The last request could silently replace newer choices.

Daily-plan responses now carry the existing DailyLog version as a revision. Priority writes must send the revision they saw. The service checks it under the workspace lock and returns 409 before writing if it changed. The client refreshes the plan and allows the person to add their choice again while retaining the other tab's selection. Review actions retain their existing task-version protection.

Verified rejection without writes, browser recovery after conflict, and the revision increment/rejection using real PostgreSQL transactions. No schema migration is required.

Files: `apps/server/src/services/personalDay.service.ts`, `apps/server/src/controllers/personalDay.controller.ts`, the shared API contract, and `apps/web/src/components/dashboard/DailyPlanning.tsx`.

## Verification

| Check | Result |
| --- | --- |
| Personal flows against the production bundle | **14 passed**, including the cross-tab cases, all capture types, Focus launch, daily review, restore preview, mobile light/dark layouts and reduced motion. |
| Personal service checks | **17 passed**. |
| Entire backend unit/service run | **23 test files passed**. |
| Production build | **Passed**, with packages built sequentially to avoid the machine's memory limit. |
| Lint and browser/config TypeScript | **Passed**. |
| Development-server focused rerun | **2 passed** after the test setup changes described below. |
| PostgreSQL restore and daily-plan check | **Passed** in a new isolated temporary cluster, including stale priority revision rejection, task version rejection, restore rollback and original workspace preservation. Cluster stopped and removed afterward. |

The broad development-server Playwright run completed with **142 passed / 2 failed**. The failures were in a second-tab startup and a post-reload priority assertion; a development module fetch failure was logged. An isolated attempt also observed the development server becoming unreachable. Both scenarios passed against the built application.

The two development cases then passed after preparing both app shells before holding the capture request, and waiting for the priority mutation's saving state to finish before reloading. These changes retain the concurrent edit/save scenario and reload assertions while separating initial development-module loading from the race being tested. No further application code change was made for these two runtime failures. The full 144-test development run was not repeated after this test setup adjustment, so it is not recorded as a single clean 144-test run.

An earlier attempt to run the compiler and browser checks concurrently hit a native memory allocation failure and a test-worker exit. The sequential build and built-app browser run completed successfully.

The focused PostgreSQL schema used the production migrations with pgvector omitted and its unrelated, unused embedding column represented as text. Semantic/vector search, external AI providers, live Redis and deployed behavior were not exercised.

## Retained behavior and limits

- Restore creates a new personal workspace from a version 2, single-member backup, limited to 25 MB / 50,000 exported records. Linked attachments keep their original URLs.
- Review preserves existing deadlines and calendar blocks, as explained in the UI.
- Per-tab draft copies survive closing the dialog and reloading that tab. The shared checkpoint is the most recent draft for each mode; independent tab drafts are not automatically merged.
- Existing records were not changed; no deployment was performed. Pre-existing workspace edits were preserved.
