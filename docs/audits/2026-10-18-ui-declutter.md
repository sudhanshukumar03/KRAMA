# Workspace UI simplification

This pass removes repeated presentation and gives the working content more room. It follows the existing Inter typography, Iris accent and light/dark theme variables.

## Changes

| Area | Removed or consolidated | Where the useful action remains |
| --- | --- | --- |
| Dashboard | Four workspace-total tiles, empty-state “Daily Compass” badge, separate task-details button, repeated Start Focus button for the featured priority | Sidebar and contextual lists; click the featured task title for details; start its timer from Today's Focus |
| Planner | Live Horizon clock and pulse, duplicate full-date heading, repeated schedule explanation, doubled plus sign in the time-block action | Header date navigation; daily plan actions and chronological schedule |
| Projects | Duplicate description card, Quick Actions panel, second progress/velocity panel, repeated update/phase/placeholder-owner rows, duplicate Edit menu item, tab shortcut keycaps | Edit Project; task/note cards; Timeline; status and tags in Project Details; one task-progress panel |
| Goals | Seven category chips on their own scrolling row | One labelled life-pillar select alongside the existing filters |
| Habits | Four feature-promotion cards in the empty state, empty filter row, five-bar difficulty ornament on every habit | Habit creation and editing; streak, completion, weekly target, history and linked goal remain in context |
| Brain | Always-expanded project/type/status/tag controls, standalone task-conversion button, wrapping formatting ribbon on phones | Keyboard-operable Document properties disclosure; Create task from document in More document actions; horizontally scrollable formatting controls |
| Shared layout | Inbox-only 328px sidebar and enlarged shared controls; floating assistant over phone content | Consistent 248px desktop sidebar; mobile AI entry in the header |

Project open-task previews now filter completed and canceled tasks, so the “Open tasks” heading describes the displayed list.

## Keyboard repair found during verification

Escape in the global AI conversation previously also triggered the workspace's distraction-free mode. The AI panel now claims Escape while open and returns focus to its opener after closing. The desktop launcher remounts on close, so focus restoration waits until it is available again.

The landing recheck also exposed a timer-cleanup race: WebKit could process one more headline interval after its offscreen state committed. Interval setup and teardown now run in a layout effect, so a stopped state and cleared timer commit together. The visible rotation, black lettering and pastel topic backgrounds retain their existing design.

## Verification

The production matrix checks nine workspace routes in both themes at 320, 390, 768 and 1440px, in Chromium, Firefox and WebKit. It exercises the time-block dialog, life-pillar filter, Brain properties disclosure, document-to-task dialog, AI open/close and focus restoration, plus empty-habit creation and keyboard containment. API responses use isolated synthetic records.

Screenshots and measurements: `.audit/declutter/{chromium,firefox,webkit}/`.

At 390px in Chromium, Brain's editable body starts at 620px, compared with 913px in the preceding audit. Inbox and the other desktop routes use the same 248px sidebar. The matrix checks document overflow and page exceptions.

| Check | Result |
| --- | --- |
| Frontend production build | Passed |
| Frontend lint | Passed, no warnings |
| Root TypeScript check | Passed |
| Affected mocked workflow suite | 101 passed in one final run, no failed tests |
| Production layout and keyboard matrix | All 30 cases passed across the matrix and its targeted WebKit recheck |
| Media capture | Both recording and product-preview capture tests passed |
| Final production landing recheck | 14 passed; one Windows WebKit video-playback case retained its existing platform skip |

The first production matrix completed 29 cases successfully and reported one deliberately intercepted Socket.IO network abort as a WebKit page error. The fixture already aborts that transport. The test now excludes only that exact network-abort signature, retains all application page errors, and the affected 320px dark-mode case passed on recheck. Reports: `.audit/declutter/results.json` and `.audit/declutter/webkit-recheck.json`. Workflow output: `.audit/declutter/workflows-final.log`.

The landing product screenshots and 20-second silent introduction are re-recorded from the updated application in both themes and desktop/phone layouts, using the existing capture → plan → Focus journey.

The final landing checks cover media loading, autoplay/offscreen pause where the engine supports playback, responsive page geometry, text contrast, black headline text, stable topic backgrounds, keyboard pause/resume and reduced motion. The repaired offscreen timer case passed in all three engines. Report: `test-results/landing-results.json`. A skipped Windows WebKit media test does not establish real Safari playback.
