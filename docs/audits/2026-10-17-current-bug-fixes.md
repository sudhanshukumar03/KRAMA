# Seven confirmed bug fixes — 17 October 2026

The seven findings in `2026-10-17-current-bugs.md` have been addressed. The existing Krama palette and page layouts are retained. No database migration or new dependency is required.

| Finding | Corrected behavior |
| --- | --- |
| Brain task mentions lost their target | Task mentions use the existing `/app/board?task=<id>` deep link and load the selected task. |
| Stale Brain space preference hid documents | The preference is scoped to account and workspace. Missing spaces fall back to All Spaces after validation; foreign space IDs are not sent to the documents endpoint. Valid workspace preferences survive reloads. |
| Added/removed tags were stale in the editor | Tag mutations refresh the individual document query as well as the document list. The document body and save queue remain intact. |
| Inbox hid valid items after a partial failure | Available and cached items remain visible and actionable. The failed source has an error message and retry. An unavailable feed does not produce a false clear-Inbox state. |
| Trash showed empty after a request failure | Loading, error/retry, and confirmed-empty states are separate. Retry can recover the deleted-document list. Cached deleted items remain available during a refresh failure. |
| Older unread notifications were hidden and undercounted | A cursor-based API returns an independent full unread count. The popup can load older items, retry a failed page, and mark older items or all items read. Keyboard focus follows newly loaded rows and survives read actions. |
| Profile claimed PRO/Focused without real state | Both hardcoded labels were removed. Existing account identity and settings remain available. |

## Implementation

- `apps/web/src/components/brain/Editor.tsx`: task deep links and tag cache refreshes.
- `apps/web/src/components/BrainWorkspace.tsx`: scoped preferences, space validation, and Trash states.
- `apps/web/src/components/Inbox.tsx`: partial availability and source-specific retry.
- `apps/web/src/components/Sidebar.tsx`: removal of unsupported status labels.
- `apps/server/src/controllers/notification.controller.ts`: validated pagination, stable creation-time/ID ordering, user/workspace scoping, and total unread count. The original array response remains available to existing clients.
- `apps/web/src/components/NotificationCenter.tsx`, `apps/web/src/api/client.ts`, `packages/types/src/api.ts`: typed paginated retrieval and keyboard handling. The client also accepts the older array response during a rolling deployment.

The broader browser run also found a WebKit keyboard issue in the existing Brain AI Assist dialog: pointer activation did not focus the opener, so Escape could not restore focus to that button. Its click handler now explicitly focuses the opener before opening the dialog. This additional correction passed in all three engines on the rebuilt production bundle.

## Verification

- Server notification tests: **6 passed**, including older unread items, tied timestamps, insertion/deletion between pages, workspace/user isolation, invalid query parameters, and compatibility with the original response.
- Client and server TypeScript checks: passed. Shared types rebuilt successfully.
- Lint for changed product files and the server regression test: passed without warnings.
- Final frontend production compilation: passed.
- Original seven-fix browser regressions: **39/39 passed** against the production bundle, comprising 13 checks in each of Chromium, Firefox, and WebKit.
- Inbox reference layout and Inbox-to-Planner navigation: **27/27 passed**, covering both themes and widths from 320 to 1586 pixels. Desktop and mobile screenshots were visually inspected.
- Existing Brain editing/browser regressions: **26/27 passed** in the initial production run. The remaining WebKit AI Assist focus failure was corrected, the production bundle rebuilt, and that affected scenario passed **3/3** on recheck in Chromium, Firefox, and WebKit. No failed scenario remains unresolved.
- The full initial production run therefore recorded 92 passes and one failure; the targeted recheck after correcting that failure recorded three passes. A fresh single 93-test run was not repeated after the final AI button-only correction.
- Existing local frontend `/app/inbox` and API `/ready`: HTTP 200 after the fixes.

The browser tests use synthetic API fixtures; the server tests use a mocked database. Personal workspace records were not changed.

Regression sources: `e2e/mocked/current-bug-fixes.spec.ts`, `e2e/mocked/brain-workspace.spec.ts`, `apps/server/src/__tests__/notification_pagination.test.ts`.

Production verification configuration: `.audit/current-bug-fixes-production.config.ts`.

Results: `.audit/current-bug-fixes-production-results.json` and `.audit/current-bug-fixes-focus-recheck-results.json`. The original defect assertions in `.audit/current-bug-review.spec.ts` are historical diagnostic probes; use the regression suite to verify the corrected behavior.
