# Connected-flow fixes — 2026-10-15

Follow-up: [real-stack verification](2026-10-15-real-stack-verification.md) now covers unmodified pgvector migrations, all seven backend integration suites, real browser/API journeys, live Redis/workers, and an additional Focus recovery fix.

Addresses all five findings in [the remaining-flow review](2026-10-15-remaining-flow-review.md). Changes remain local; nothing was deployed. No database migration is required.

## Resulting behavior

1. **Goal check-ins use the user's local day.** Creation baselines, manual/automatic snapshots and parent rollups all resolve the user's saved timezone (with the existing country/UTC fallback). Boundaries are half-open and account for daylight saving. A second local day's reflection cannot replace the previous day's reflection because both happened on one server date. Multiple check-ins during one local day retain the existing daily-update behavior. Previously overwritten notes cannot be reconstructed by this change.

2. **Generic Focus includes chosen priorities and overdue ready work.** Today's priority IDs participate in the task query even without dates, and chosen order is preserved in the task-estimate fallback. Timed work blocks retain precedence; selected priorities without a block are appended once. Without eligible blocks, the fallback includes up to five ready tasks, with chosen priorities first. Existing work-cap and schedule-size limits remain in force.

3. **Daily review decisions are respected by generic Focus.** “Do tomorrow,” “Return to backlog” and cancellation stop those tasks from returning through old blocks or deadlines. Deadlines and calendar reservations remain stored. BACKLOG tasks are excluded from automatic Focus; choosing one as a priority promotes it to TODO through the existing daily-plan service.

4. **Explicit task replanning clears today's earlier review decision.** A changed scheduled date or transition back into a ready status clears the current user's current-day decision in the same transaction as the task update. Workspace locking serializes it against daily review and priority writes. The daily-log revision increments, preserving conflict detection for stale tabs. Historical reviews, other metadata, title-only edits and unchanged form values remain intact. Dashboard's day-plan queries are invalidated on task events and task-detail saves.

5. **Prerequisites apply to Focus entry.** Automatic Focus excludes tasks with active unfinished prerequisites. Direct task/block Focus resolves the task's live dependency, shows its title, and prevents setup/start until resolved. Completed, canceled or deleted prerequisites release the task. Focus task queries refresh on task/socket events and every 30 seconds. Dependency restrictions are separate from structural link validity, so an already-recorded pending completion can still be saved.

## Implementation

- [goal.service.ts](../../../apps/server/src/services/goal.service.ts): one timezone-aware day resolver used by every goal snapshot writer.
- [focusTimer.service.ts](../../../apps/server/src/services/focusTimer.service.ts): daily priorities, overdue task selection, review exclusions, prerequisite eligibility and priority append/fallback handling.
- [personalDay.service.ts](../../../apps/server/src/services/personalDay.service.ts) and [task.service.ts](../../../apps/server/src/services/task.service.ts): atomic current-day review clearing on explicit replanning.
- [usePlannerFocus.ts](../../../apps/web/src/hooks/usePlannerFocus.ts) and [FocusPage.tsx](../../../apps/web/src/components/FocusPage.tsx): prerequisite explanation and start/setup guards, plus live selection refresh.
- [SocketProvider.tsx](../../../apps/web/src/providers/SocketProvider.tsx) and [KanbanBoard.tsx](../../../apps/web/src/components/KanbanBoard.tsx): affected query invalidation.

## Verification

All of the following passed:

- `corepack pnpm --filter server test`: **23 backend test suites**. Existing mocked database fixtures were updated for the added user-timezone and DailyLog reads.
- `powershell .audit/run-personal-postgres-check.ps1 -CheckScript '../../.audit/fixed-flow-postgres-check.ts'`: **13 connected-flow checks** using real services and PostgreSQL persistence.
- `corepack pnpm exec playwright test --config .audit/fixed-flow.config.ts`: **48 selected browser regressions** against the production build, covering connected Planner flows, personal-workspace features, goal draft recovery, Brain save barriers, Focus reload/offline completion recovery, and the five new eligibility/replanning browser cases.
- After a final copy-only adjustment to the blocked-task message, a fresh client build and rerun of `focus-eligibility.spec.ts`: **all five affected browser checks passed again**.
- `corepack pnpm -r --workspace-concurrency=1 run build`.
- `corepack pnpm -r run lint`.
- `corepack pnpm exec tsc --noEmit`.

The PostgreSQL checks cover unscheduled priorities, mixed blocks/priorities, priority order, overdue dates, retained reservations/deadlines after review, unrelated-edit preservation, atomic replanning and revision protection, historical review preservation, dependency release states, public goal creation/check-ins/parent rollups across IST midnight, same-local-day updates across UTC midnight, and a 25-hour New York daylight-saving day.

The temporary database used production migrations except for an unrelated pgvector embedding column represented as text because the extension is unavailable locally. No application database records were changed. Browser checks use mocked APIs; PostgreSQL checks separately exercise the actual services. One pre-existing browser test that dynamically imports a development source URL is deliberately excluded from the production-preview configuration. This was a focused regression pass, not a complete live deployment test.

Regression artifacts: [browser cases](../../../e2e/mocked/focus-eligibility.spec.ts), [PostgreSQL checks](../../../.audit/fixed-flow-postgres-check.ts), [production-preview configuration](../../../.audit/fixed-flow.config.ts).
