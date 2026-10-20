# Browser, accessibility and physical sleep verification

**Later status, checked 17 October:** The overnight run did not complete. `.audit/overnight/state.json` records `failed_or_interrupted` because its Focus tab was closed. The setup instructions and pending-state descriptions below are historical; physical sleep/wake remains unverified. See the [latest follow-up review](2026-10-17-followup-leftout-review.md).

The user confirmed that only this Windows laptop is available. Android/iPhone hardware and spoken output from a screen reader are not exposed to the automation tools. WebKit tests exercise its browser engine on Windows; they are not tests on an actual iPhone or the Safari application.

## Final completed verification

The final production-build run passed **264/264 live cases** in **20.0 minutes**, with **zero skipped, failed or flaky cases**, zero global Playwright errors and exit code 0. Retries were disabled. The same final app build was used throughout.

| Browser engine | Passed |
| --- | ---: |
| WebKit | 88/88 |
| Chromium | 88/88 |
| Firefox | 88/88 |

The completed disposable project was `krama-audit-9358e9674e86`, checked at **14:31 IST on October 16, 2026**. Production images built successfully; migrations, API, queue worker, pgvector PostgreSQL, Redis and Nginx were exercised, including real Groq/Gemini integrations with synthetic data. Its containers and owned volumes were removed afterward. Application data was not used.

Evidence: `.audit/production/full-suite-playwright-results.json`, `full-suite-summary.json`, `full-suite-result.json` and `final-build-images.json`. The complete unit/mocked-browser regression run also passed **150/150**. Physical sleep/wake and human screen-reader listening are separate pending checks below.

R2 is not configured here: the real production rejection path and unavailable-upload UI passed; successful external storage uploads remain unverified. A completed WebKit worker emitted a native Node/libuv shutdown assertion during the successful run; the final JSON recorded zero global errors and exit code 0, with every case passing. This was not counted as an extra test or a retry.

## Changes made during this pass

- Brain's editable document now exposes a named multiline textbox, **Document body**.
- Every Focus layout exposes **Start timer** / **Pause timer** actions. A separate timer exposes the remaining time with live announcements off; a polite status announces state changes rather than every second.
- Brain search permits its input to shrink on narrow Firefox screens, keeping the close button inside its dialog.
- Dashboard Quick Capture and shared page-header actions explicitly focus their clicked opener. WebKit otherwise left clicked buttons unfocused, so closing Quick Capture or a Goal form could not restore focus to its opener. The shared header also covers Habit and Project creation.
- The shared modal hook handles the complete Tab/Shift+Tab cycle, including visible fixed-position controls, and excludes disabled, inert and negative-tabindex controls. WebKit previously escaped the Focus setup and mobile navigation dialogs when its native traversal skipped candidates before the hook's boundary check.
- Keyboard helpers exercise both Tab and Shift+Tab rather than assuming that Firefox wraps focus within the webpage. Drag cancellation yields through the timer queue after the pickup announcement, because an event trace showed the announcement preceding the drag library's deferred keyboard listener. Cancellation, its announcement and subsequent task opening remain asserted.
- Pointer-drag checks wait for the destination column's visible hover ring before releasing the mouse. The reload-authentication check accepts Firefox's observed HTTP 304 profile revalidation and still requires the signed-in main content, exactly one refresh and the expected application route.

## Automated coverage

The production runner now supports the entire live suite, all opt-in workflow groups, real AI providers using synthetic content, and Chromium/Firefox/WebKit projects. It stores individual browser results and a JSON report under `.audit/production/`.

```powershell
.\.audit\run-production.ps1 -FullSuite -UseProviders -Browsers chromium,firefox,webkit
```

The final complete-suite result is recorded above. A targeted Firefox follow-up had also passed all **21 cases**, including the two new accessibility contracts, mobile dialogs and all board journeys, before the final full run.

After the shared modal and header fixes, the complete unit/mocked-browser regression suite passed **150/150** in one run (5.3 minutes), including the UTC+14 calendar case. Root E2E types, audit/overnight harness types, frontend types and workspace lint also passed. Regression JSON: `.audit/production/final-ui-results.json`.

The laptop rebooted at 13:12 on October 16. The earlier complete-suite attempt was interrupted and has no completed result, so it is not counted as a pass. Its disposable containers were removed before the new run. A subsequent Chromium pass exposed the drag-test synchronization race described above; a new complete run is required after that correction.

Three complete Chromium board repeats passed all 21 cases after the timer-queue correction. An intermediate wider run also revealed Firefox's cached profile responses and WebKit's Dashboard opener issue. That run was stopped after native browser/worker memory-allocation errors while a diagnostic browser was running beside it. It is not counted as a complete pass. The final run uses one worker, no parallel diagnostic browser and no video recording; explicit screenshots and accessibility snapshots remain enabled. Its container image IDs are recorded in `.audit/production/final-build-images.json`.

The subsequent complete attempt passed every Chromium and Firefox case, then found additional WebKit issues in Goal opener restoration and keyboard containment. Those led to the shared-header and modal changes above. One WebKit workspace-isolation UI check also asserted while the lazy board was still loading: the API isolation checks passed; the browser check now waits for the board heading. Production assertions allow 15 seconds, matching browser actions, rather than assuming all engines finish cold route compilation within 5 seconds. The final 264-case run above supersedes these earlier browser subsets.

That attempt finished with **252 passed / 12 failed**, all failures in WebKit. Additional failures included a renderer crash, cold route waits and a test pressing Escape before a rejected project save had finished releasing its pending guard. The project test now waits for the enabled save action before dismissal and requires the dialog to close. The final configuration runs each WebKit spec file in its own project/browser process to release native browser memory between files, preserving every workflow, assertion and the full 88 WebKit cases. Chromium and Firefox retain their 88-case projects; retries remain zero.

## Actual elapsed-time and sleep check

The headed one-minute smoke run passed on October 16 at **14:33 IST**. It used 60 real seconds, saved the original completion ID exactly once with duration 60 and correct start/end times, and required no retry. Its checkpoint is `.audit/overnight/smoke-state.json`. This result does **not** verify physical sleep/wake.

The actual 24-hour run started at **14:33:55 IST on October 16** and cannot finish before **14:33:55 IST on October 17**. Its initial checkpoint is **running**, with target duration **86,400 seconds**, project `krama-audit-68ebe156147d` and completion ID `17cc23c6-d284-4882-a885-c46867c4dae3`. The detached runner process identity, visible Chrome for Testing window and Nginx readiness were independently checked after launch. The running screenshot was inspected; the 24-hour timer fits the viewport. A separate Brain tab contains the Narrator verification note.

**The actual overnight/sleep result remains pending.** Keep the verification Focus tab open and do not pause it. A normal Windows Sleep of at least 30 minutes during the active timer, followed by wake, is required. The runner neither forces Sleep nor changes power settings. It records the eventual result in `.audit/overnight/state.json`; the browser and its owned stack close after successful verification. Runner identity/logs are in `.audit/overnight/runner.json`, `runner.log` and `runner-error.log`. A reboot or closing the test window interrupts this check and cannot be counted as a pass.

The overnight runner uses a visible Chromium window, a fresh disposable account and the actual production stack. It does not install a fake clock, fast-forward time, suspend Windows or change power settings. Browser flags that disable background throttling are removed for this check.

```powershell
# Validate the runner with one real minute; this does not verify sleep/wake.
.\.audit\run-production.ps1 -Overnight -OvernightSmoke

# 24 real hours, covering the next night; leaves the Focus window open.
.\.audit\run-production.ps1 -Overnight

# Keep the runner independent of the chat/tool session; browser stays visible.
.\.audit\start-overnight.ps1
```

A real run can pass only after all of these conditions hold:

1. 24 hours have actually elapsed. After the laptop rebooted and verification resumed in the afternoon, the test duration was extended to cover the following night.
2. Windows records a standby-entry/resume pair after the test started, with at least 30 minutes overlapping the active timer. Sleep occurring only after timer completion cannot produce a pass. This laptop reports Modern Standby support; observed local Kernel-Power events identify entry/exit as 506/507. The verifier also supports traditional sleep events 42/107.
3. The original completion ID appears exactly once in the real database with the original task, 24 hours of work and the correct timestamps. An explicit retry is allowed if the local services need time to recover after wake.

The checkpoint is `.audit/overnight/state.json`. A one-minute smoke run writes a separate `smoke-state.json` and cannot produce an overnight pass. Closing the Focus tab early records interruption. The owned test stack and records are removed when its run finishes; application volumes and real workspace data are not used.

For the physical part, leave the test window open, put Windows to Sleep using its normal power menu, and wake it after at least 30 minutes. The timer remains open until verification finishes. Do not pause the test timer. Microsoft's [Modern Standby documentation](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/modern-standby) describes sleep entry/resume; [SleepStudy](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/modern-standby-sleepstudy) provides more detailed hardware power-state diagnostics if needed.

## Spoken screen-reader check

The real overnight run also opens a separate **Narrator verification note** in Brain, in the same disposable browser account. Use that tab for this human listening check without changing or pausing the overnight timer.

1. Turn Narrator on with **Windows+Ctrl+Enter**. This is the [Microsoft-documented shortcut](https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-b-narrator-keyboard-commands-and-touch-gestures).
2. Navigate with Tab/Shift+Tab. Confirm that the document title, **Document body** multiline editing area and toolbar actions are understandable when announced.
3. Type a short synthetic sentence in the document body. Confirm that save feedback is announced and the text survives reload.
4. Open document search and AI Assist. Confirm their names are announced, focus remains within a mobile dialog, and Escape returns to the opener.
5. In the Focus tab, read the **Pause timer** action and **Time remaining** without activating or pausing the overnight timer. The countdown should not announce every second.

The automated accessibility-tree tests check the underlying roles, names, focus behavior and state changes. They cannot verify what Narrator actually speaks; that result needs a human observation. Physical Android/iPhone testing remains unavailable with the current hardware.
