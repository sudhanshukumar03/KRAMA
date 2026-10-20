# Krama localhost verification — 16 October 2026

Scope: the existing personal workspace, using disposable accounts, PostgreSQL with pgvector, Redis, actual workers, Chromium, and the production Dockerfiles/Compose configuration. The user requested localhost rather than a hosted deployment.

## Fixes

| Finding | Result |
| --- | --- |
| Planner controls and the workspace header clipped at 320px | Controls wrap; the compact workspace selector leaves room for notifications and theme controls. |
| Dialog focus could disappear when a loading panel was replaced, or fail to return to its opener | The shared accessibility hook follows the actual dialog node and retains the original opener. |
| Holiday-location control required a pointer | It is a labelled native button. |
| Shortcut help, Focus layout gallery and wallpaper picker lacked complete modal keyboard handling | Added dialog semantics, focus containment, Escape handling and focus restoration. |
| Alternate Focus layouts placed options or countdown digits outside narrow screens | Header controls wrap and timer typography adapts to the viewport. All six layouts were checked at 320px. |
| Selected-task Focus could clip custom-duration controls or let its task banner cover them | Duration controls wrap within the available width. All six layouts reserve the measured notice height; task/save notices stack and remain below modal dialogs. |
| Uploaded/remote wallpapers and the file picker had keyboard gaps | Wallpaper selection uses buttons; the file input remains keyboard reachable. |
| Focus letter shortcuts stopped working after a dialog returned focus to a button | W/S/N remain available from buttons and links. Text fields keep typing behavior, and native controls retain Enter/Space handling. |
| AI provider failures could be interpreted as expired Krama authentication, and a stalled stream could remain pending | Provider failures become a recoverable 503. Each provider attempt has a 30-second deadline covering connection and streaming; cancellation is propagated. Fallback happens only before any answer text is emitted. |
| Suggested goal deadlines could be one calendar day early shortly after local midnight | New goal defaults and horizon changes now format the local calendar date. Stored calendar-date values retain their existing interpretation. |
| Completion notifications lacked task destinations and their rows required a pointer | New completion notifications include their task URL. Existing notifications resolve their task from metadata. Entries and read actions use keyboard controls, with focus restored after updates. |
| Escape from notifications also activated the workspace's distraction-free mode | The open notification panel handles Escape before global workspace shortcuts. |
| Brain Undo/reopening could initialize the editor from an old detail cache | Acknowledged title/body writes update the detail cache. Subtree restore is followed by a fresh document read before reopening; inactive child detail caches are removed so subsequent child edits use the current revision. Snapshot restore and explicit reload update that cache too. |
| Nginx rejected valid backups above 11 MB although the restore API accepts 25 MB | The restore endpoint has a dedicated 26 MB ingress allowance; the smaller global upload limit remains. A real 12 MB backup restored successfully. |
| Production readiness requests could return the SPA | `/ready` now proxies to the API readiness endpoint. |

## Follow-up fix recheck

The follow-up review found an additional mobile Focus issue. The earlier layout case checked ordinary Focus; a selected task also displays custom-duration presets and a fixed task notice. In Corner Overlay, that combination pushed the timer beyond 320px. The task notice could also intercept duration-button clicks in other layouts.

The regression now exercises all six layouts both with and without a selected task. It checks the timer, options trigger, first/last duration buttons and layout choices using actual browser hit-testing, in addition to viewport geometry. The corrected layout clears the measured notice height and wraps its presets.

The final rebuilt production stack passed **41 browser cases in one uninterrupted run**, including the new regression, all mobile/keyboard cases, Brain subtree editing after restore, notification navigation/read state, four Focus lifecycle cases, backup restore and AI outage draft retention. Production run: `krama-audit-305fa0b7646f`. Its disposable containers were removed afterward. The outage response in this rerun is controlled; the earlier real-provider checks below were not repeated.

After the last source change, fresh verification also passed:

- **149 unit/mocked cases in one uninterrupted run** against the final Docker-built frontend.
- **1 additional UTC+14 calendar browser case** against the normal development server, which serves its source-module import. Together these cover all **150 unit/mocked cases** on the corrected source.
- **23 backend test suites**, including provider cancellation, timeout, retry and fallback behavior.
- Workspace lint and root/server TypeScript checks. The production frontend build also completed its own type check.

No further regression was found in these checks. Real R2 uploads, physical-device behavior and a hosted deployment retain the boundaries below.

## Earlier verification evidence

- Backend unit runner: **23 suites passed**, including seven provider-stream recovery cases.
- Real database/Redis integration runner: **7 files / 55 cases passed**, with unmodified migrations and actual pgvector.
- Wider live run: **76 passed**, three stale test assumptions failed, two later serial cases did not run, and the production-only backup case was skipped. The affected files were updated for the current labels, Inbox scheduling, advanced goal options, explicit draft-discard confirmation, separate Focus tabs and per-completion recovery keys.
- Follow-up run of Dashboard, Tasks and Goals/Habits: **23 passed**; the remaining Dashboard assertion still assumed a particular theme token. It was replaced by an actual 4.5:1 text contrast check. All seven Dashboard cases subsequently passed against the production containers.
- Production container pass after the goal-date correction: **33 passed**, including all critical journeys, Dashboard cases, mobile/keyboard cases, six Focus layouts, midnight goal defaults, capture-to-Focus, worker notifications, backup export/restore and the 12 MB ingress regression. The final rebuilt images then passed **2 additional targeted journeys** for notification keyboard/read/navigation and Brain edit → subtree trash → Undo → child edit → reload. These are **35 distinct production cases across the runs**, not a claim of one uninterrupted final 35-case run.
- Focus lifecycle: four real-API browser cases passed: two-hour suspended/background timing, a long pause without extra work, local-midnight completion, and expired-login recovery of the original completion exactly once.
- Real providers: Groq document answers and writing streams passed; Gemini document/query embeddings and pgvector retrieval passed. Gemini briefly returned 503, then its streaming endpoint recovered. A deliberately invalid Groq primary subsequently fell back to real Gemini and returned the expected synthetic answer.
- Provider outage browser check passed: recoverable 503, retained instruction/document, retry enabled, zero authentication-refresh requests, and the user remained signed in.
- Final lint and root/server TypeScript checks passed after the last source changes. The production builds also type-checked the frontend and backend.

The broad unit/mocked regression run passed **147 cases**. It exposed the Focus shortcut issue above, leaving its next serial case unrun; one source-module import also required the development server rather than static assets. After the shortcut correction, **35 targeted regressions passed** against the latest production frontend, including both Focus cases, Brain save/conflict/snapshot recovery, connected task/habit flows and subtree Undo. The separate UTC+14 habit calendar test then passed using the normal development-server configuration. Thus **all 150 distinct unit/mocked cases passed across the broad run and follow-up runs**, without claiming a single uninterrupted final 150-case run.

## Boundaries

- R2 account, access key, secret, bucket and public URL are not configured. The upload-unavailable API/UI behavior and image validation were verified. A real object-storage upload remains unverified until R2 is configured.
- Small-screen testing uses Chromium at 320px and 390px, both themes, reduced motion, and actual Tab/Shift+Tab/Enter/Escape input. This is not a physical-phone, Safari/WebKit or screen-reader certification.
- Sleep/background gaps, long sessions and midnight crossings use controlled browser clocks with real API persistence. The laptop was not physically suspended for hours.
- Production images, migrations, API, worker, database, Redis and Nginx were run on localhost. No hosted site was tested or deployed. Production container browser checks keep external-provider credentials disabled; real provider checks ran separately using synthetic content.
- A source-based test API and two attempts at the separate development-server calendar test hit the laptop's memory limit. Those attempts were discarded. Compiled production containers completed the final live journeys; the calendar browser test passed after removing verified leftover audit processes and memory recovered. TypeScript checks used a larger compiler heap than browser-test processes.
- Disposable test containers are removed after each run; existing application volumes and workspace data are not used.

## Reproduction

```powershell
# Full real stack, with configured AI providers and synthetic data
.\.audit\run-real-stack.ps1 -UseProviders -FullSuite

# A deliberately invalid provider, without real provider credentials
.\.audit\run-real-stack.ps1 -SkipIntegration -FailProvider -Specs e2e/live/provider-failure-live.spec.ts

# Isolated production build, startup and browser/ingress checks
.\.audit\run-production.ps1

# Use the pinned package manager directly; this machine also has a different global pnpm.
corepack pnpm -r run lint
corepack pnpm exec tsc --noEmit
corepack pnpm --filter server exec tsc --noEmit
corepack pnpm --filter server test
corepack pnpm exec playwright test

# Targeted checks against the extracted production frontend
corepack pnpm exec playwright test --config .audit/final-regression.config.ts e2e/mocked/focus-mode.spec.ts e2e/mocked/brain-workspace.spec.ts e2e/mocked/connected-flow-regressions.spec.ts e2e/mocked/workflow-regressions.spec.ts

# This case imports a source module and requires the normal Vite server
corepack pnpm exec playwright test e2e/mocked/workflow-regressions.spec.ts --grep 'weekly habit counts'
```

For the final regression pass on this memory-constrained laptop, the frontend was extracted from `krama-audit-web:prod` into `.audit/final-web` and tested using `.audit/final-regression.config.ts`. This serves the compiled bundle rather than starting another development compiler. The existing suite still controls its own mocked APIs.

## Subsequent complete browser verification

The later [browser and overnight verification report](2026-10-16-browser-and-overnight-verification.md) records the final complete production run: **264/264 live cases**, 88 each in WebKit, Chromium and Firefox, plus a fresh **150/150** unit/mocked regression pass after the shared keyboard fixes. The real one-minute Focus harness passed; the separate 24-hour physical sleep/wake run started at 14:33 IST on October 16 and remains pending. These later results supersede this report's narrower browser counts; the earlier checks above remain historical evidence.
