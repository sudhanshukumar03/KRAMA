# Remaining connected-flow issues — 2026-10-15

Fix status: all five findings below have now been addressed. See [implementation and verification](2026-10-15-remaining-flow-fixes.md). The findings and reproduction notes below describe the pre-fix behavior.

Scope: remaining Dashboard → daily planning/review → Tasks/Planner → Focus connections and goal check-in day boundaries. This is a targeted audit, not a claim that every Krama flow is free of other defects. Application code was not changed in this pass.

Five findings were reproduced across seven PostgreSQL scenarios and two browser probes. Prior fixed issues are excluded.

## 1. Goal reflections can overwrite the previous local day's entry

Priority: P1 when the server and user have different day boundaries, because reflection text can be replaced.

Example: on a UTC server, an India-based user checks in at 23:30 October 15 and again at 00:30 October 16. Both writes are treated as the same server day. The second reflection replaces the first, and the snapshot retains its October 15 timestamp.

Cause: `writeProgressSnapshot` calculates boundaries with server-local `Date.setHours`, without the user's reporting timezone. The creation and parent rollup paths use the same pattern.

Evidence: [goal.service.ts](../../../apps/server/src/services/goal.service.ts#L273), also lines 153 and 381. The actual snapshot writer was executed twice against PostgreSQL with a UTC server clock and Asia/Kolkata reporting days; there was one remaining snapshot containing the second day's note, dated to the first local day.

Needed: use the user's reporting-day boundaries consistently in every snapshot writer. Consecutive local days must retain separate entries; repeated check-ins on one local day can retain the existing update policy.

## 2. Choosing today's priorities does not carry them into generic Focus

Priority: P2.

Example: capture an unscheduled task, choose it in “Your top three today,” then open Focus using the sidebar. The task can be absent and Focus's automatic plan can be empty. The explicit Start Focus button on the priority does work, so entry routes disagree. An overdue unscheduled task visible on Dashboard is also excluded by generic Focus.

Cause: selecting a priority stores its ID in DailyLog and promotes a backlog task to TODO, but does not assign a date. Focus reads today's task dates/blocks and never reads the daily priority IDs. Its due-date query only includes today's date, while Dashboard includes overdue work.

Evidence: [personalDay.service.ts](../../../apps/server/src/services/personalDay.service.ts#L29), [focusTimer.service.ts](../../../apps/server/src/services/focusTimer.service.ts#L94), [dashboard.controller.ts](../../../apps/server/src/controllers/dashboard.controller.ts#L49). Both scenarios were reproduced with actual database queries.

Needed: share the eligibility rules for today's work and include selected priority IDs. Respect explicitly scheduled blocks while making unscheduled priorities and ready overdue work available in Focus.

## 3. Daily review decisions are ignored by generic Focus

Priority: P2.

Examples:

- Choose “Do tomorrow” for a task with a work block today. Dashboard removes it, but generic Focus still offers today's retained block.
- Choose “Return to backlog” for a task due today. Dashboard removes it, but generic Focus still offers it through its unchanged deadline.

Cause: review writes the task state and a DailyLog decision atomically, but Focus only reads task dates and blocks. It does not read that decision or exclude BACKLOG tasks.

Evidence: [personalDay.service.ts](../../../apps/server/src/services/personalDay.service.ts#L41), [focusTimer.service.ts](../../../apps/server/src/services/focusTimer.service.ts#L94). Both scenarios were reproduced against PostgreSQL.

Needed: generic Focus must respect current review decisions. Preserving calendar blocks and deadlines is already explained by the review UI; those records should not silently override the user's decision about what to work on next.

## 4. Rescheduling a reviewed task does not restore it on Dashboard

Priority: P2.

Example: return a task to backlog during daily review. Later, change your mind in Tasks/Planner and schedule it for today as TODO. It remains hidden from Dashboard's work list and unfinished review.

Cause: Dashboard and DailyPlanning exclude every task with a decision keyed by task ID. Ordinary task updates do not clear that decision, and the decision has no task version against which to detect subsequent replanning. Adding it to top three clears the decision, but normal rescheduling does not.

Evidence: [Dashboard.tsx](../../../apps/web/src/components/Dashboard.tsx#L140), [DailyPlanning.tsx](../../../apps/web/src/components/dashboard/DailyPlanning.tsx#L19), [task.service.ts](../../../apps/server/src/services/task.service.ts#L122). Reproduced using the actual review service followed by the actual task update service, then confirmed the hidden state in the built browser UI with mocked API responses.

Needed: clear or supersede the review decision when the user explicitly replans the task. Tie decision applicability to relevant task state/version so unrelated edits do not unexpectedly undo a review.

## 5. Focus bypasses task prerequisite rules

Priority: P2.

Example: task B depends on unfinished task A. Dashboard disables B's priority Start Focus button, but generic Focus automatically schedules B. Opening B's standalone Focus route also allows its session setup without a dependency warning.

Cause: generic Focus filters DONE/CANCELED tasks but does not resolve blockers. Explicit task Focus guards DONE/CANCELED status but not dependencies.

Evidence: [focusTimer.service.ts](../../../apps/server/src/services/focusTimer.service.ts#L94), [FocusPage.tsx](../../../apps/web/src/components/FocusPage.tsx#L334), [DailyPlanning.tsx](../../../apps/web/src/components/dashboard/DailyPlanning.tsx#L38). PostgreSQL confirmed B in the generated plan while A remained TODO. Chromium confirmed the Dashboard button was disabled and the `/focus?task=…&date=…` setup action was enabled.

Needed: apply consistent dependency eligibility to automatic scheduling and explicit Focus entry. If deliberate override is supported, make it an explicit user choice with the prerequisite visible.

## Verification and limits

- `powershell .audit/run-personal-postgres-check.ps1 -CheckScript '../../.audit/remaining-flow-postgres-check.ts'`: seven observed scenarios reproduced, successful exit. A temporary local cluster was created and removed; no application records were touched.
- `corepack pnpm exec playwright test --config .audit/remaining-flow.config.ts`: two observed-behavior probes passed against the existing production bundle, using mocked APIs. Initial browser fixture setup used a completed prerequisite and then an incorrect `/app/focus` URL; these probe mistakes were corrected to an active prerequisite and the actual `/focus` route before the successful run.
- PostgreSQL uses production migrations except the unavailable, unrelated pgvector column is represented as text. No vector features were tested.
- The goal reproduction invokes the shipped snapshot writer directly, with real persistence and controlled timestamps; it does not simulate UI check-in submissions.
- These audit probes assert current faulty outcomes. Their passing status means the issues were reproduced, not fixed. No full regression suite was rerun for this read-only application review.

Reproduction artifacts: [.audit/remaining-flow-postgres-check.ts](../../../.audit/remaining-flow-postgres-check.ts), [.audit/remaining-flow.spec.ts](../../../.audit/remaining-flow.spec.ts), [.audit/remaining-flow.config.ts](../../../.audit/remaining-flow.config.ts).

Suggested implementation order: protect daily goal history first, make review decisions react to explicit replanning, then use shared work eligibility rules across Dashboard and Focus.
