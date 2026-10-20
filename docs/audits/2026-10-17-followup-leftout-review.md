# Follow-up review: remaining workflow gaps - 17 October 2026

**Resolved:** All five findings below were fixed and verified. See the [shared workflow fix report](2026-10-17-shared-workflow-fixes.md) for the final 296-check cross-browser/unit run and 91-case live production-container run. The original review evidence remains below as history.

Five additional issues were confirmed after the [eleven earlier fixes](2026-10-17-remaining-fixes.md). Seven Chromium diagnostic probes reproduce the cases below against the same production frontend bundle. This is a targeted review, not an exhaustive guarantee that all application bugs have been found.

No application source or personal workspace records were changed. The probes use synthetic API records. Passing these diagnostic assertions means the defect was reproduced; these are not regression assertions of correct behavior.

| Priority | Issue | Reproduction and observed impact | Source |
| --- | --- | --- | --- |
| Fix first | Cancelling a workspace switch leaves mismatched workspace state | Leave a Brain edit unsaved, choose another workspace, and cancel the browser's unsaved-work/reload warning. The original document remains open, but the workspace label, stored workspace selection and API header have already changed. Clicking Retry save sends the original document's content under the other workspace ID. The server can reject that request; the probe does not establish unauthorized access or data overwriting. | `apps/web/src/contexts/AuthContext.tsx:153`: state, API scope and localStorage change before `window.location.reload()` is allowed to finish. |
| Medium | Inbox can schedule yesterday through its Do today action | Open Inbox shortly before midnight, cross into the next day, and click Do today before the next dashboard poll. The PATCH still submits yesterday's date. The probe advances the synthetic server's day too, so a fresh dashboard request would return the correct day. A failed refresh can prolong the stale date. | `apps/web/src/components/Inbox.tsx:46` reads the cached dashboard date; `apps/web/src/hooks/useDashboard.ts:12` polls every 60 seconds without an exact day-boundary refresh. |
| Medium | Goals still depends on healthy related Projects/Habits requests | Return valid goals but fail either Projects or Habits. Goals shows a full-page failure and removes both existing goals and New Goal, even though the goals endpoint succeeded. Two separate probes cover the related feeds. The earlier partial-failure fix covered Projects and Habits themselves. | `apps/web/src/components/Goals.tsx:327` and `:337` block the entire page on either related request. |
| Medium | An individual project is hidden by failure of the project list | Return HTTP 200 for the selected project's detail request while the project-list endpoint returns 503. The usable project is replaced by Failed to Load Initiative Telemetry, and its editing controls disappear. The list is used for navigation/search and should not gate the authoritative detail request. | `apps/web/src/components/ProjectDetail.tsx:207` and `:211` gate the page on the project-list query. |
| Medium | Project shortcuts conflict with modal and app navigation | With Keyboard Shortcuts open and its ESC button focused, pressing C opens a second task dialog behind it. Separately, E then W opens Edit Initiative instead of the advertised Planner navigation chord. Two probes confirm the background action and the chord collision. | `apps/web/src/components/ProjectDetail.tsx:76`, `:93`, `:96`; `apps/web/src/components/AppShell.tsx:131`. The project listener does not account for global dialogs, prevented events or the app's chord prefix. |

## Verification

- Seven diagnostic probes reproduced all five findings in Chromium. There are two related-feed cases and two shortcut cases.
- The midnight case was also rechecked separately with a synthetic server day that advances at midnight; it reproduced the stale PATCH date.
- Configuration: `.audit/leftout-followup.config.ts`.
- Probes: `.audit/leftout-followup.spec.ts`.
- Combined evidence: `.audit/leftout-followup-results.json`.
- The preceding 251-check production regression run remains valid for the cases it covers. These are additional scenarios, rather than failed cases from that run.

## Verification still outside the completed checks

- Physical Android/iPhone use and the Safari application. WebKit engine automation on Windows is separate coverage.
- Human listening with Narrator or another screen reader.
- A successful real object-storage upload.
- An actual overnight Focus session with physical sleep/wake. `.audit/overnight/state.json` records `failed_or_interrupted`: the test Focus tab was closed before verification completed. The real one-minute smoke test passed earlier; it does not establish sleep/wake behavior.

Hosted verification is outside the current localhost-only scope requested by the user.
