# Personal workspace changes — 15 October 2026

Latest recheck: [personal fix recheck](2026-10-15-personal-fix-recheck.md), including two corrected cross-tab conflicts and updated verification results.

Implemented the seven changes described in the personal-workspace explanation.

| Change | Result |
| --- | --- |
| Correct blocker warnings | Projects check unresolved task dependencies. High priority alone no longer produces a blocker warning. Dashboard avoids recommending blocked tasks and explains when all today's work is waiting. |
| Preserve capture drafts | Each account/workspace has browser-persisted drafts, with separate entries for task, note, idea and link. Planner capture drafts also retain their date context. Closing, switching mode and reloading preserve text; saving or explicitly discarding clears that mode's draft. |
| Unified Inbox | `/app/inbox` lists newly captured tasks, notes, ideas and links together. Tasks can be scheduled for today or filed in Tasks; documents can be filed in Brain. Filing removes the Inbox marker, without deleting the underlying item. Existing work is not retroactively marked as uncategorized. |
| Three daily priorities | Dashboard saves up to three chosen tasks per person, workspace and calendar day. Each open, unblocked priority opens its exact task/date in a separate Focus tab. Completed priorities remain visible for that day. Choosing captured/backlog work files it and makes it ready. |
| Close the day | Dashboard review offers tomorrow, backlog and cancel actions. Task updates and review decisions commit together, with version checks. Reviewed work stops appearing in today's recommendations; deliberately choosing it again clears that decision. |
| Simpler screens | Main task, project and goal entry points use plain names. New-goal advanced progress/connections are collapsed behind Advanced goal options. The sidebar hides workspace switching when there is only one workspace. Timer appearance remains in its existing More/settings dialogs. |
| Backup restore | Settings → Restore backup previews a file, validates the graph and restores a separate personal workspace. Fresh IDs are used throughout, including linked metadata and internal URLs. Authentication and imported membership privileges are never restored. |

The intended daily path is Capture → Inbox → choose priorities → optionally schedule → Focus → complete or review unfinished work.

## Data and restore boundaries

- Restore accepts Krama version 2 personal backups with one member, at most 25 MB and 50,000 exported records. Shared-workspace migration is explicitly rejected.
- Restore keeps the original workspace unchanged and makes the signed-in person the new workspace owner. Trash stays in trash; the restored root workspace is active.
- Restored entities include goals/snapshots, projects/milestones, tasks/comments/labels/dependencies, spaces/folders/documents/versions/tags, habits/completions, sprints/reports, focus history, calendar blocks, daily logs/priorities, activity, notifications and entity links.
- Cycles, missing references, duplicate IDs, foreign workspace data and incompatible personal histories fail validation. Database constraint failures roll back the whole restore.
- Regular document text-search vectors are rebuilt. Provider embeddings and other data excluded by the export are not imported. External images/attachments retain their original URLs; their binary files are not in the JSON backup.
- Review deliberately preserves deadlines and calendar blocks. The review explains this; those can be changed in Planner separately. Returning an overdue task to backlog does not erase its deadline.
- Draft recovery depends on browser storage. If writing it fails, Quick Capture tells the user to keep the dialog open.

## Verification

- Full Playwright regression run: **139 passed**. This included the original 130 checks plus the first 9 personal-workspace checks.
- Final targeted Playwright run after follow-up changes: **11 passed**, adding all document capture types and the all-blocked-task state.
- Final backend run: **23 test files passed**, including **16 new personal-workspace service checks**.
- Shared validation: **25 tests passed**. Whitespace checks passed for the touched files.
- Final production build, repository lint and root browser/config TypeScript check passed.
- Browser screenshots inspected at 375 px in both light and dark mode, with reduced motion. Existing goal dialog checks also passed down to 320 px.
- Focused PostgreSQL 18.4 verification passed using an isolated temporary cluster: repeat restoration to fresh IDs, original workspace preservation, dependency/tag/owner/history/trash restoration, text-search vector regeneration, persisted daily plans and reviews, stale-write rejection, and complete rollback after an intentionally duplicated tag violated a database constraint.
- The focused PostgreSQL schema used the production migrations with only the unavailable, unrelated pgvector extension omitted and its unused embedding column represented as text. **Semantic/vector search, live Redis, external providers and deployed behavior were not exercised.** The temporary cluster was stopped and removed.
- No existing application records were changed and no deployment was performed.

## Host and interaction decisions

| Host concern | Evidence / decision |
| --- | --- |
| Framework and utilities | React 19, TypeScript and compiled Tailwind 4 in `apps/web/package.json`; existing dependencies reused. |
| Routing | Existing React Router shell in `apps/web/src/components/AppShell.tsx`; added Inbox without changing existing routes. |
| Components and theme | Existing buttons, cards, error/loading states, modal focus helper and theme tokens reused. |
| Registry / motion | No Registry component or animation dependency added. Plain semantic controls fit these state changes; pending actions disable repeated writes and report failure or success. |
| Keyboard / accessibility | Native controls, labels, minimum 44 px action heights, modal focus trapping/return, and explicit status/error text. No added movement is required for the flow. |
| Responsive / themes | Wrapping action rows, scrollable dialogs and surfaces, existing light/dark tokens, reduced-motion checks. |

The workspace contained substantial pre-existing edits. Those changes were retained.
