# Real-stack verification — 2026-10-15

## Latest recheck

Rechecked after the recovery fix with a fresh isolated stack, run `e3705ccdc0d24681bbccb8e0a8dbb4b1`. All **7 integration files / 55 cases**, **5 real browser journeys**, and **11 production-bundle recovery/eligibility checks** passed again. The full integration and live browser checks passed together in this run. Client build, workspace lint, root/server TypeScript and scoped diff checks passed. The temporary containers were confirmed removed. No additional application changes were needed, and no application workspace records were modified.

The critical recovery case again retained the original task and 60-second completion, survived three simulated failed saves and reload after Planner reassignment, and saved exactly one real session. Backup restoration and project/goal/worker updates also passed again. The verification boundaries at the end of this report still apply.

The primary personal-workspace journey now passes with the actual API, PostgreSQL/pgvector, Redis, Socket.IO and background workers. One additional Focus recovery bug was reproduced and fixed during this pass. Changes remain local, not deployed.

## Newly fixed issue

An active task Focus session correctly retained its original task when its Planner block was reassigned. However, if completion saving then failed and the page reloaded, the original task/block URL became invalid and disabled “Retry saving session.” Completed work remained in local recovery storage but could not be submitted from that page.

The retry action now submits the existing account/workspace-scoped completion independently of current Planner-link validity. It retains the original task, timestamps, duration and completion identifier. The server still authenticates the request, enforces workspace access, validates the interval, and handles duplicate completion IDs. An invalid selection still cannot configure or start new work.

Implementation: [FocusPage.tsx](../../../apps/web/src/components/FocusPage.tsx). Regression checks exist both in the normal mocked suite and the live API suite.

## Real services and isolation

- Fresh `pgvector/pgvector:pg15` and `redis:7-alpine` containers, using distinct loopback ports and no application volumes.
- Dedicated `krama_flow_test` database and Redis database 15.
- Both unmodified production migrations applied successfully; pgvector and its indexes were included, with no column substitution.
- The actual API and all worker processes were launched against those stores. Notification jobs were observed completing; their resulting notification and points were asserted through the API.
- The existing test-environment checks remained active. Test accounts and workspace records were created and cleaned up by the integration fixtures. The disposable containers and the API/worker processes were removed/stopped afterward.
- An empty dotenv file and cleared provider credentials kept external AI, embedding and storage-provider calls outside this pass.

Runner: [.audit/run-real-stack.ps1](../../../.audit/run-real-stack.ps1).

## Passing verification

### Backend integration: 7 files, 55 cases

| Suite | Cases |
| --- | ---: |
| Completion awards and retry atomicity | 3 |
| Goal, habit and task version conflicts | 3 |
| Brain document tree, CRUD, move, trash and restore | 8 |
| Document role enforcement | 4 |
| Post-commit event publishing and rollback | 6 |
| Connected repairs, authentication, sockets, indexing, preferences and Focus extensions | 28 |
| Live project/goal progress and deletion behavior | 3 |

Command: `corepack pnpm --filter server exec tsx src/scripts/run-all-tests.ts --integration`, with the dedicated services configured by the runner.

The first run exposed an outdated Goal Undo assertion expecting an automatic-mode parent to ignore its active child goal. It now asserts the established child-progress rule, then removes the final child and verifies that project-task progress resumes at 100%. It also checks that a previously deleted descendant stays deleted through a later root Undo. All seven files passed after that test correction; no production goal-progress behavior was changed in this pass.

### Real browser/API journeys: 5 passed

1. Capture a task through Inbox, schedule it, attach its project, view it in Planner, choose it as a priority, open a separate Focus tab, complete and save a minute of work, mark the task done, and verify project/goal progress, Dashboard updates, a single worker notification and ten points. Completion remains visible after reload.
2. Review work to backlog, verify its existing block is retained but Focus excludes it, then replan it in Tasks and verify Dashboard and Focus include it again.
3. Open a blocked Focus selection, complete its prerequisite through the real API, and verify the open page refreshes into usable session setup.
4. Reassign a Planner block during an active Focus session, fail all three save attempts, reload the now-invalid selection, then retry successfully. Verify exactly one real saved session with the original task, completion ID and 60-second duration. This case failed on the disabled retry button before the fix and passed afterward.
5. Export a real personal workspace, restore it through the Settings upload dialog, verify fresh task/project/goal IDs, preserved relations and goal snapshot counts, verify the original task remains unchanged, and open the restored workspace.

Cases: [personal-journey-live.spec.ts](../../../e2e/live/personal-journey-live.spec.ts). The final rerun used `-SkipIntegration` because the backend integration pass was already green and the production fix changed only the client. The recovery test waits for the actual 201 save response before inspecting the database-backed Dashboard.

### Production bundle and static checks

- **11 selected production-bundle browser checks passed**: goal settings/check-in draft recovery, late Focus acknowledgement, prerequisite rules, task replanning and the new invalid-link completion recovery case.
- Client production build, workspace lint, root TypeScript and server TypeScript checks passed.
- Scoped whitespace/diff checks passed.

Commands:

```powershell
.\.audit\run-real-stack.ps1
.\.audit\run-real-stack.ps1 -SkipIntegration
corepack pnpm --filter client run build
corepack pnpm exec playwright test --config .audit/fixed-flow.config.ts partial-save-recovery.spec.ts focus-eligibility.spec.ts
corepack pnpm -r run lint
corepack pnpm exec tsc --noEmit
corepack pnpm --filter server exec tsc --noEmit
```

## Still outside this verification

External AI/embedding/storage-provider calls, a full mobile and keyboard pass across every section, production container deployment and hosted-environment smoke tests. The live browser journeys are a targeted set, not the entire legacy live browser suite. The earlier standalone 13-case timezone/day-plan database checks remain separate coverage; they were not rerun here because those services were unchanged.
