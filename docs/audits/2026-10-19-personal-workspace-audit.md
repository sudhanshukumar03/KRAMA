# KRAMA personal workspace audit — 19 October 2026

## Result and scope

**13 confirmed defects: 2 high priority (P1), 10 medium priority (P2), and 1 low priority (P3).** This is an audit of the current working tree, including existing uncommitted changes. It does not claim that every possible defect has been found. Application code was not changed during this audit.

Reviewed Dashboard, Inbox, Tasks, Planner, Focus, Habits, Goals, Projects, Brain, and their shared lifecycle: capture → organize → schedule → focus → complete → delete/restore. Checks covered persistence, relationships, history/date eligibility, hierarchy, error recovery, workspace boundaries, keyboard access, and responsive layout in both themes.

Reproductions used disposable accounts in an isolated PostgreSQL database and Redis database, with an isolated API and worker. Personal workspace records were not used as test fixtures. External provider keys were disabled for these services.

## Confirmed defects

### D01 · P1 · A deleted task reference blocks Brain note saves

**Trigger:** Mention a task in a note, delete that task, then add a paragraph to the note.

**Observed:** Saving the body returns HTTP 400, “Referenced entity must be active in this workspace.” The new paragraph is not persisted. The existing, unchanged mention prevents unrelated writing from saving.

**Cause:** Every inline entity reference is revalidated as an active entity on every body save, including references that were already present.

**Required fix:** Validate newly introduced references without blocking edits containing historical references. Render deleted references as unavailable or convert them to plain text while preserving the note. Keep authorization checks for new links.

Source: [documentContent.service.ts:21](../../apps/server/src/services/documentContent.service.ts#L21). Diagnostic: D01.

### D02 · P1 · Restoring a note from a deleted space makes it disappear

**Trigger:** Delete a Brain space containing a note, find the note in Trash, and restore it.

**Observed:** Restore returns success, but the note appears in neither the normal document list nor Trash. The database record remains; this is an inaccessible restore, not a demonstrated permanent deletion.

**Cause:** Restore clears the document's deletion marker while leaving its parent space deleted. Normal lists require an active space; Trash requires the document itself to remain deleted.

**Required fix:** Restore into an active destination or explicitly restore the parent space. Return success only when the note is reachable from the UI.

Sources: [document.service.ts:241](../../apps/server/src/services/document.service.ts#L241), [document.controller.ts:84](../../apps/server/src/controllers/document.controller.ts#L84). Diagnostic: D02.

### D03 · P2 · Deleting a project breaks task creation from its surviving notes

**Trigger:** Link a Brain note to a project, delete the project, then create a task from the retained note.

**Observed:** The note remains readable, but task creation returns HTTP 400 because it inherits the deleted project ID.

**Required fix:** Resolve the project's active state before inheritance. Offer an active project or create an unassigned task with clear feedback. Define whether deleting a project should detach surviving notes.

Sources: [document.service.ts:402](../../apps/server/src/services/document.service.ts#L402), [project.controller.ts:187](../../apps/server/src/controllers/project.controller.ts#L187). Diagnostic: D03.

### D04 · P2 · Planner accepts contradictory task and project links

**Trigger:** Create a time block for a task belonging to project A while selecting project B on the block.

**Observed:** The block is accepted. Focus schedule generation assigns the task's slot to project B because the block's project takes precedence.

**Required fix:** Derive a linked block's project from its task, or reject inconsistent pairs on both create and update. Revalidate when either association changes.

Sources: [planner.service.ts:71](../../apps/server/src/services/planner.service.ts#L71), [focusTimer.service.ts:172](../../apps/server/src/services/focusTimer.service.ts#L172). Diagnostic: D04 confirms the incorrect project in the generated Focus plan; downstream analytics were not separately asserted.

### D05 · P2 · “Move to backlog” does not move a deadline task to backlog

**Trigger:** Give a TODO task a scheduled day and deadline, then choose “Move to backlog” in Planner.

**Observed:** The success toast appears, but only `scheduledDate` is cleared. The task stays TODO and remains in the dated Planner list through its deadline.

**Required fix:** Establish one explicit defer/backlog transition and make the action label, persisted state, and resulting lists agree. Preserve deadlines deliberately rather than silently discarding them.

Source: [useTodayPlanner.ts:284](../../apps/web/src/hooks/useTodayPlanner.ts#L284). Diagnostic: D05.

### D06 · P2 · Brain graph presents deleted task references as active nodes

**Trigger:** Link a note to a task, delete the task, then load the workspace graph.

**Observed:** The graph still returns a node for the deleted task. Its active task destination no longer exists.

**Cause:** External task/project queries omit the active-record filter. The task case was reproduced; the project query has the same omission.

**Required fix:** Exclude deleted destinations or render explicitly unavailable references without normal navigation.

Source: [documentGraph.service.ts:103](../../apps/server/src/services/documentGraph.service.ts#L103). Diagnostic: D06.

### D07 · P2 · Choosing a backlog task for today leaves it deferred and absent from Focus

**Trigger:** Create a BACKLOG task with Inbox metadata, open Planner's Backlog, and choose “+ Today.”

**Observed:** A scheduled date is saved, but status remains BACKLOG and `metadata.inbox` remains true. Focus excludes BACKLOG tasks, so the task selected for today's work is absent from the generated plan.

**Required fix:** Make scheduling an intentional activation transition: resolve BACKLOG status and Inbox classification consistently. Apply the same contract to day scheduling, drag/drop scheduling, and linking tasks to blocks.

Sources: [useTodayPlanner.ts:275](../../apps/web/src/hooks/useTodayPlanner.ts#L275), [PlannerPage.tsx:184](../../apps/web/src/components/planner/PlannerPage.tsx#L184), [focusTimer.service.ts:102](../../apps/server/src/services/focusTimer.service.ts#L102). Diagnostic: D07.

### D08 · P2 · Habit completion uses a different day from the browser

**Trigger:** Use a profile without an explicit IANA timezone and a browser whose local date differs from the profile fallback date. Create a habit and click “Complete for today.”

**Observed:** A legitimate completion for the browser's current day is rejected as a future date or as preceding habit creation. The diagnostic used a US location preference and a browser timezone across the UTC date boundary.

**Cause:** Habit eligibility uses profile metadata, then an India-specific fallback or UTC; other daily flows honor browser timezone headers. Location preferences do not provide a complete timezone selection flow.

**Required fix:** Persist and expose an explicit IANA timezone and apply one day-boundary policy across Habits, Planner, Dashboard, Focus, and nightly streak processing. Retain the prohibition on checking dates before creation.

Sources: [habit.service.ts:186](../../apps/server/src/services/habit.service.ts#L186), [habitStreak.service.ts:19](../../apps/server/src/services/habitStreak.service.ts#L19). Diagnostic: D08.

### D09 · P2 · Space deletion bypasses goal relationship cleanup

**Trigger:** Delete a space containing a goal associated through imported/legacy data, with a habit linked to that goal and the goals list cached.

**Observed:** The goal is soft-deleted, but the linked habit cannot subsequently be renamed: HTTP 400 “Invalid linked goal.” The cached goals list can still contain that deleted goal.

**Cause:** Space deletion directly updates goal/project rows instead of using the lifecycle cleanup and cache invalidation used by normal entity deletion.

**Required fix:** Share transactional deletion logic, detach or otherwise resolve surviving links, recompute affected progress, invalidate caches, and publish events after commit.

**Scope qualification:** Normal goal creation does not expose `spaceId`; workspace restore supports this association. The reproduction assigned that relationship through Prisma to model imported data, then exercised the normal APIs for deletion and editing. This is an imported-data path, not a claim about the normal goal form.

Source: [space.controller.ts:85](../../apps/server/src/controllers/space.controller.ts#L85). Diagnostic: D09.

### D10 · P2 · Planner deletes tasks without confirmation or Undo

**Trigger:** Click a task's delete control in Planner day view.

**Observed:** The task is immediately deleted. The success toast has no Undo action and there is no confirmation. The Tasks board provides Undo, making recovery inconsistent across entry points.

**Required fix:** Provide a working Undo action using the existing restoration capability, or confirmation where appropriate. Keep the task recoverable without relying on a different screen's transient toast.

Source: [useTodayPlanner.ts:94](../../apps/web/src/hooks/useTodayPlanner.ts#L94). Diagnostic: D10.

### D11 · P2 · Goals can create a fourth level that the main tree omits

**Trigger:** Open a third-level goal's detail drawer and add another child/key result.

**Observed:** The drawer offers the action and the service accepts the fourth level. The flat goals response contains it, but the root's nested tree payload stops at three levels; the main tree renders roots and their supplied descendants.

**Required fix:** Either enforce and explain a three-level maximum everywhere, including the server, or build the full supported tree from the flat records. Do not accept children the primary tree cannot display.

Sources: [goal.repository.ts:12](../../apps/server/src/repositories/goal.repository.ts#L12), [goal.service.ts:73](../../apps/server/src/services/goal.service.ts#L73), [GoalDetailDrawer.tsx:864](../../apps/web/src/components/goals/GoalDetailDrawer.tsx#L864). Diagnostic: D11.

### D12 · P3 · Planner reports an invalid habit-history request as a server failure

**Trigger:** Send a structurally valid routine-occurrence completion request for a date before a new habit was created.

**Observed:** Planner responds HTTP 500 instead of a validation response explaining why that date is unavailable. No completion is written: the eligibility guard itself works.

**Required fix:** Translate domain validation failures into consistent 4xx responses across the Habit and Planner endpoints. Avoid presenting a user's invalid date as a server outage.

Source: [planner.service.ts:614](../../apps/server/src/services/planner.service.ts#L614). Diagnostic: D12.

### D13 · P2 · Goals search misses supported grandchildren

**Trigger:** Create root → child → grandchild, then search the exact title of the grandchild.

**Observed:** The relevant root card disappears from the results, so the supported third-level goal cannot be found through the main Goals search.

**Cause:** Search checks root text and immediate child titles only.

**Required fix:** Search the supported descendant tree recursively and expand or expose the matching path. Retain the ancestor context needed to navigate to a match.

Source: [Goals.tsx:282](../../apps/web/src/components/Goals.tsx#L282). Diagnostic: D13.

## Repair order and missing contracts

1. Fix Brain save and restore first (D01–D02), with regression tests proving the new paragraph persists and restored notes are reachable.
2. Define shared task actions for capture, activation, scheduling, deferral, and completion (D04–D05, D07). Verify one captured task through Inbox → Planner → Focus → completion and back to backlog.
3. Define deletion/reference/recovery behavior across all entities (D03, D06, D09–D10). A personal workspace also needs a discoverable recovery path after transient Undo expires; the existing Brain Trash does not provide a unified recovery surface for every entity type.
4. Unify timezone and habit error contracts (D08, D12), including midnight and timezone changes.
5. Make goal depth and search use the same hierarchy model (D11, D13).

The recovery surface and shared contracts are design gaps/recommendations; they are not additional confirmed defect counts.

## Validation evidence

Audit-local reproduction source and raw reports are under `.audit/full-2026-10-19/` (ignored development artifacts). D01–D12 reproduced in the full diagnostic run; D13 reproduced in a targeted rerun after correcting an ambiguous test locator. **These diagnostic tests assert that the defects exist. Their passing status does not mean the defects are fixed.**

| Check | Result |
| --- | --- |
| Server unit tests | 152 tests; 26 suites passed |
| Server integration tests, isolated PostgreSQL/Redis | 55 tests; 7 suites passed |
| Lint | Passed for web and server |
| Full workspace build | Passed |
| Main live-browser suite against isolated API/worker | 68 passed; 10 failed; 15 skipped |
| Additional opt-in Dashboard and cross-section checks | 10 passed; covered ten skips from the main run |
| Default Playwright suite | 221 passed; 6 failed |
| Error recovery recheck with realistic retry wait | 4 passed |
| Live goal/project partial-outage recheck with realistic retry wait | 1 passed |
| Additional Firefox/WebKit workspace layout matrix | 20 passed |
| Diagnostic reproductions | 13 confirmed across the full run and targeted rerun |

The layout matrix exercised nine workspace routes in both themes at 320, 390, 768, and 1440 pixels, with additional dialog and empty-state checks. This establishes tested reachability and overflow behavior, not perfect visual polish or full accessibility certification.

### Test maintenance and recovery latency

Of the six default-suite failures, two expect UI removed or collapsed by the recent redesign: a visible Brain tag before opening document properties, and a removed Dashboard count tile. Four recovery assertions timed out at five seconds while React Query was still performing its default retries. All four passed when allowed to reach the actual error state. Retry/error presentation remains slow enough to deserve refinement; it is not evidence that the retry controls are absent.

Keep failure tests aligned with the intended retry timing and current accessible UI. Replace fixed historical habit dates with dates derived from creation time; correctly rejecting a pre-creation completion must not make a test expect success.

The ten main live-suite failures break down as follows:

- One exposes the real Planner HTTP 500 in D12; the same test also incorrectly expects a newly created habit to accept a historical date.
- Eight stop at outdated or ambiguous UI/date expectations: pre-creation habit checkoff, a removed duplicate Dashboard Focus action, an ambiguous New Project text locator, the old document-title placeholder, the old project task-button name, the old project error heading, and two old Brain action-menu names.
- One stops while waiting only five seconds for a related-project outage alert. A focused rerun with a 15-second assertion timeout passed the whole case, including opening goal settings and project settings during the related-list outage.

A test that stops at an outdated selector does not verify its remaining steps. These failures need test maintenance; they must not be silently reported as passing flows.

The additional ten opt-in checks verified Dashboard reporting and date validation, mobile controls, capture draft recovery, task/project/goal connections, Planner/Habits checkoff synchronization, mounted Focus refresh, exact-once completion retries, and retaining failed Focus saves through reload. They passed without modifying the production tests.

### Limits

External AI providers, configured object-storage uploads, production ingress, real mobile keyboards, physical-device sleep/resume, and extended multi-day operation were not fully verified by this isolated run. Storage-unconfigured and provider failure behavior can be tested without proving successful third-party operations. Simulated browser layout and accessibility checks do not replace assistive-technology testing.

UI interaction review used the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), alongside repository flow analysis and real-service reproductions.
