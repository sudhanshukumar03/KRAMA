# Remaining workflow fixes - 17 October 2026

The eleven findings from the [workflow review](2026-10-17-leftover-bugs.md) and [search/navigation review](2026-10-17-remaining-navigation-bugs.md) have been corrected. The existing Krama palette and layout are retained.

| Area | Corrected behavior |
| --- | --- |
| Brain document moves | Pending edits save before a move. The editor adopts the returned revision before later saves. A move checks its expected revision atomically on the server, so a genuine concurrent change still produces a conflict and retains the draft. |
| Habits across midnight | Daily views refresh at local midnight and on window wake/focus. Completion computes today's date when clicked instead of submitting a date captured yesterday. |
| Brain imports | Importing into a selected empty space uses that space. |
| Brain lifecycle | Changing lifecycle retains Inbox and other unrelated badges. |
| Related service failures | Projects and Habits remain usable when secondary data fails. Retry controls recover the failed feeds; unavailable progress/counts are not displayed as zero. Goal link controls preserve their existing value while goals are unavailable. Project details also retain their usable sections. |
| Today's habit buttons | Completion controls have habit-specific accessible names, pressed state, visible keyboard focus, and a minimum 44px hit area. |
| Notifications | The popup fits the available viewport space and can open above its trigger in short windows. |
| Search response order | Changing, clearing, or closing search cancels its old request and prevents late results from replacing the current query's results. |
| Search failures | Service errors have a retry action that retains the query and are distinct from a successful empty result. |
| Search keyboard behavior | Focus stays inside the search dialog until it closes and then returns to its opener. |
| Goal browser history | The drawer is derived from the URL. Back closes it, Forward reopens it, and an unsaved goal draft survives the journey. |

## Verification

- Frontend production build and frontend/server TypeScript checks passed.
- Lint checks for changed code and whitespace checks passed.
- Server checks: **9/9 passed**, covering move revision validation and notification pagination.
- Targeted Chromium checks passed for all corrected flows. Additional cases cover typing during a pending move, retaining a draft on a genuine conflict, automatic midnight refresh, stale responses after clearing/closing search, and unsaved goal drafts across Back/Forward.
- Final production regression run: **251/251 passed** in 10.9 minutes, with zero skipped, failed, flaky, or retried checks. This includes all current mocked browser specs in Chromium, the affected workflows in Firefox/WebKit, Inbox reference layouts, and all current unit specs.
- The development-only date-helper check also passed: **1/1**, covering the weekly habit calendar boundary in UTC+14. It imports source helpers directly and was run separately from the production bundle.
- The local frontend returned HTTP 200 and the API readiness endpoint returned `ready`.

| Final production-run project | Passed |
| --- | ---: |
| Unit | 24 |
| Chromium | 163 |
| Firefox | 32 |
| WebKit | 32 |
| Total | 251 |

The browser tests use synthetic API records and do not alter personal workspace data. No new dependencies or database migration are required. Physical phones, the Safari application, real external provider credentials, and actual overnight laptop sleep/wake are outside this verification run.

## Evidence

- `.audit/remaining-fixes-production.config.ts` and `.audit/remaining-fixes-production-results.json`
- `.audit/inbox-reference-dev-helper-results.json`
- `e2e/mocked/remaining-workflow-fixes.spec.ts`
- `e2e/mocked/remaining-navigation-fixes.spec.ts`
- `e2e/unit/document-structure-save.spec.ts`
- `apps/server/src/__tests__/document_move_revision.test.ts`
- `apps/server/src/__tests__/notification_pagination.test.ts`

The older diagnostic probes deliberately assert the former defects. Their historical passing results mean reproduction, not successful regression verification. The regression tests above assert the corrected behavior.

A subsequent [follow-up review](2026-10-17-followup-leftout-review.md) confirmed five additional workflow gaps in scenarios outside this regression run. Those five gaps were subsequently [fixed and verified through shared workflow changes](2026-10-17-shared-workflow-fixes.md). The eleven fixes documented here remain resolved.
