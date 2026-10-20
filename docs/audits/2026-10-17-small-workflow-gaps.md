# Small cross-screen workflow gaps — 17 October 2026

Seven additional inconsistencies were reproduced in isolated Chromium sessions against the current production frontend. API responses used synthetic records and stateful mutation mocks. Application source and personal records were unchanged. These are diagnostic reproductions of existing behavior, not passing acceptance checks for fixes.

These findings supplement the [Planner–Habit investigation](2026-10-17-planner-habit-flow-gaps.md). Its pre-creation/future completion restriction was subsequently fixed in the [18 October habit repairs](2026-10-18-habit-repairs.md); the other findings retain their audit status.

## 1. A goal-to-habit link loses its intended scope

**Priority: medium.** Both the goal card and its detail drawer navigate to `/app/habits?goalId=...`. HabitTracker does not read the parameter and filters only by time of day. The destination shows unrelated habits without explaining that the requested scope was discarded.

Reproduction: select a linked Monday-only habit in Goal details; the destination URL contains the goal ID, yet an unrelated habit is visible.

Evidence: [navigation](../../apps/web/src/components/goals/GoalConnections.tsx:577), [destination filtering](../../apps/web/src/components/HabitTracker.tsx:236).

Correction: apply the requested goal filter to the habit list, counts and relevant empty state, and show a clear way to remove it.

## 2. Goal details permits habit completion on a rest day

**Priority: medium.** Habits uses shared schedule eligibility and disables completion on a daily habit's rest day. Goal details always offers Log Today and sends the completion request. The server accepts such records as off-schedule and excludes them from streak calculations, so the two entry points have different rules and feedback.

Reproduction: on Saturday, a Monday-only habit is disabled in Habits. Opening the same habit's goal and clicking Log Today submits a dated completion request.

Evidence: [Goal action](../../apps/web/src/components/goals/GoalConnections.tsx:589), [Goal mutation](../../apps/web/src/components/goals/GoalDetailDrawer.tsx:395), [shared Habits guard](../../apps/web/src/hooks/useHabitCompletion.ts:78), [server off-schedule rule](../../apps/server/src/services/habit.service.ts:195).

Correction: use the same schedule/completion policy at every entry point. An off-schedule log should not be presented as an ordinary successful streak completion.

## 3. Goal details offers Log Today after the habit is already done

**Priority: medium.** The Goal action ignores the habit's existing completion record and is disabled only during its own request. It offers no Undo state. The authoritative backend rejects a duplicate same-day log rather than creating a second completion.

Reproduction: Habits displays Completed today with an Undo action; the same habit in Goal details still has an enabled Log Today button.

Evidence: [Goal action state](../../apps/web/src/components/goals/GoalConnections.tsx:590), [duplicate guard](../../apps/server/src/services/habit.service.ts:199), [working shared completion state](../../apps/web/src/hooks/useHabitCompletion.ts:8).

Correction: render the current habit/date state and share completion/undo behavior. Do not rely on the server's duplicate error as normal interaction feedback.

## 4. Active goal status conflicts with the Done filter after reopening

**Priority: medium.** Switching a completed manual goal to Active sends its unchanged 100% progress. The status button then says Active, but the Active filter excludes every 100% goal and the Done filter includes it. The same progress-first classification also conflicts with Paused/Canceled statuses at 100%.

Reproduction: start with a completed 100% manual goal, choose Active, confirm the outgoing `{status:'ACTIVE', progress:100}` request and updated status label, close the drawer, and observe that the goal is absent from Active and still present in Done.

The stateful mock applies the same manual status/progress fields that the service accepts. This was not a live database write.

Evidence: [status update](../../apps/web/src/components/goals/GoalDetailDrawer.tsx:289), [classification](../../apps/web/src/components/Goals.tsx:268), [detail classification](../../apps/web/src/components/goals/GoalDetailDrawer.tsx:443), [server metadata/progress update](../../apps/server/src/services/goal.service.ts:205).

Correction: define consistent precedence between explicit status and achievement percentage, including a clear reopening policy. Do not silently discard recorded progress just to make a filter work.

## 5. Move to backlog can leave the task in the same day

**Priority: medium.** The Planner action clears only `scheduledDate`. Backlog classification requires no scheduled date and no due date. A task due on the selected day remains in that day's list, is absent from Backlog, and keeps its prior status despite the success message saying it moved to backlog.

Reproduction: choose Move to backlog on a task both scheduled and due on 17 October. The request clears its schedule, its due date and TODO status remain, it stays visible on the same day, and the Backlog tab does not contain it.

Evidence: [action](../../apps/web/src/hooks/useTodayPlanner.ts:284), [classification](../../apps/web/src/hooks/useTodayPlanner.ts:150), [date placements](../../apps/web/src/lib/utils.ts).

Correction: align the action, success message and actual destination. Preserve the user's deadline; do not fix this by silently clearing it. Removing a scheduled date can be presented as unscheduling, with an explanation that the deadline still places the task on that day.

## 6. Inbox Do today moves an in-progress task backwards

**Priority: medium.** Inbox's scheduling action unconditionally sends `status:'TODO'`, even when the captured task is already IN_PROGRESS. An Inbox task can reach that state through ordinary task editing, which does not automatically clear its Inbox metadata.

Reproduction: load an IN_PROGRESS task with Inbox metadata and choose Do today. The outgoing request changes it to TODO.

Evidence: [Inbox write](../../apps/web/src/components/Inbox.tsx:50), [task update preserves metadata](../../apps/server/src/services/task.service.ts:139).

Correction: preserve an already active task's execution status when changing its date. Promote BACKLOG to TODO only when that transition is required.

## 7. Goal deadline date and due-today message disagree in western timezones

**Priority: medium for affected timezones.** Goal creation stores a date-only target at UTC midnight. Goal pace calculations correctly preserve its calendar-day key, but the card renders it with the browser's local timezone. West of UTC, the visible date can become the preceding day.

Reproduction: with America/Los_Angeles and local 17 October, a target stored as `2026-10-17T00:00:00Z` renders `Oct 16` next to `(due today)`.

Evidence: [card rendering](../../apps/web/src/components/goals/GoalCard.tsx:349), [calendar-aware pace calculation](../../apps/web/src/lib/goalUtils.ts:21). The Goal drawer and compact project-goal card also use local timestamp formatting for the same calendar date.

Correction: render calendar deadlines through the shared calendar-date parser/formatter everywhere, keeping timestamps for actual instants such as activity updates.

## Verification and ruled-out candidates

```powershell
corepack pnpm exec playwright test --config .audit/small-flow-gaps.config.ts
```

Final run: **7/7 diagnostic reproductions**, 12.7 seconds. [Results](../../.audit/small-flow-gaps-results.json), [test source](../../.audit/small-flow-gaps.spec.ts), [configuration](../../.audit/small-flow-gaps.config.ts).

An initial run used a clock instant that crossed midnight in Asia/Kolkata and an outdated Completed-tab selector; the harness was corrected to the intended local day and actual Done label before the final run. Neither is counted as a product issue.

Two initial code-only suspicions were ruled out: canceled tasks appearing in normal Planner data, and canceled tasks depressing normal Project progress. The default task API excludes CANCELED, and the project task count applies the same exclusion. They are not confirmed bugs and were excluded from the findings.

The audit does not claim an exhaustive review of Brain, notifications, all Focus recovery paths or every backend workflow. No application fixes have been applied. Suggested repair sequence: unify habit actions across screens; reconcile goal status and filters; correct misleading scheduling actions; preserve navigation scope and calendar dates.
