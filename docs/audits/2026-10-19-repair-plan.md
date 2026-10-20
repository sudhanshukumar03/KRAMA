# Personal workspace repair plan

Requested sequence: plan → implement/configure → verify. This plan is written before production edits. Preserve existing work and personal records; use the isolated audit database, Redis database, API and disposable accounts for live verification.

## 1. Brain and reference lifecycle — D01, D02, D03, D06

- Allow a note to retain an existing deleted reference without blocking unrelated body saves. Continue validating new references and workspace access.
- Recover notes from deleted spaces into an active destination, keeping restored descendants reachable and leaving unrelated deleted records alone.
- Create tasks from surviving project notes without inheriting an inactive project.
- Remove inactive graph destinations from active navigation.
- Verify body persistence after reload, visible restore, descendant behavior, new-link rejection, and conversion/graph behavior after deletion.

## 2. Planner task contract and recovery — D04, D05, D07, D10

- A linked block's project must agree with its task; enforce this in the service and make selection coherent in the form.
- Scheduling a deferred task activates it and clears Inbox classification. Returning to backlog changes its workflow state while retaining its deadline.
- Use shared transition helpers in day and calendar scheduling paths.
- Provide task deletion Undo in both Planner entry points and refresh all connected views after restoration.
- Verify Inbox → Planner → Focus eligibility, backlog with deadlines, block creation/update validation, and delete → Undo persistence.

## 3. Habit day and validation contract — D08, D12

- Use one validated IANA timezone policy for browser-driven habit operations and Planner eligibility, with a persisted user timezone for background streak processing.
- Preserve creation-date and future-date guards.
- Return validation errors as 4xx consistently through Habit and Planner APIs.
- Verify legitimate today checkoffs across UTC date boundaries, forbidden past/future days, check/uncheck sync, and streak consistency.

## 4. Goals and space deletion — D09, D11, D13

- Reuse transactional goal lifecycle cleanup when deleting a space, including surviving relationships, rollups, events, and cache invalidation.
- Make supported goal depth consistent between service, tree, and detail drawer; ensure existing deeper data remains reachable.
- Search descendants and expose the ancestor path for a match.
- Verify imported associations, cached lists, surviving habit edits, nested creation/display, search, and parent-cycle protection.

## 5. Verification and completion gates

- Promote the 13 audit reproductions into maintained tests asserting correct behavior. Preserve the original audit evidence.
- Add boundary cases where a narrow fix could regress authorization, history, Undo, or hierarchy behavior.
- Run server unit/integration tests, targeted browser regressions, lint and the full build. Run connected live flows and light/dark responsive checks appropriate to the changed screens.
- Update stale test selectors/dates only to match intended behavior; do not weaken assertions to hide failures.
- Record exact results and remaining limits. Do not mark a finding resolved merely because a build passes.
- Stop only audit-owned services after verification. Do not reset unrelated files, mutate personal data, commit, or deploy.

## Status

Complete: planned, implemented, and verified D01–D13. Existing stranded notes are also recoverable from Trash. The initial 27 targeted checks passed. After the final refinement and service restart, all 19 final repair/boundary/UI checks passed. The broader live run and corrected test recheck cover 106 distinct passing scenarios, with five external-provider/production checks skipped.

Also passed: 157 unit tests, 55 server integration tests, 56 focused mocked browser checks, 20 Firefox/WebKit layout checks, full build, and lint without warnings. The full live suite was not repeated after the last narrowly scoped legacy-recovery refinement; that refinement has restarted-service and fresh server checks.

See [the implementation and verification report](2026-10-19-persistent-workflow-repairs.md) for exact run results and remaining verification limits. Isolated audit services were stopped after testing. Existing work and personal records were preserved; no commit or deployment was made.
