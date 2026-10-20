# Landing workflow film

## Current implementation

The introduction is a 20-second edit of a real KRAMA browser journey using synthetic records. It replaces the composed screenshot tour and plays at normal 1x speed. The browser capture creates a task through Quick Capture, saves it to Inbox, selects Do today, creates a linked time block in Planner, opens Focus in its separate tab, accepts the plan and starts the countdown. Assertions verify the mutations and running timer before the recording is accepted.

| Time | Actual action |
| --- | --- |
| 0-7 seconds | Capture “Write the case study opening”, save to Inbox, choose Do today |
| 7-14 seconds | Create a 16:00-16:25 time block linked to that task |
| 14-20 seconds | Open the task in Focus, accept the plan, start the countdown |

Desktop and phone layouts are recorded separately in light and dark themes. The app uses its existing fonts, colors and Focus wallpaper; no fictional UI or capability is introduced. The example is separate from personal data. Route-loading gaps are cut and the three clips are timed to 7/7/6 seconds. It shows starting a session, not completing 25 minutes of work.

## Player and accessibility

`apps/web/src/components/landing/IntroVideo.tsx` retains native MP4/WebM playback. Media is deferred until within 480px of the viewport. Visible playback is muted and inline; offscreen or hidden pages pause. Explicit pause persists, and completion waits for Replay. Theme changes preserve progress. Reduced motion shows a theme-matched poster until manual Play. Unmount releases the source. No new runtime dependency or third-party embed.

There is no visible heading/caption, toolbar, transcript row, sound/duration note, corner control or playing-state icon. A full-surface semantic button supports click/tap and Enter/Space. Keyboard focus remains visible. Paused/ended states show centered Play/Replay. The region has a screen-reader heading and the video has an equivalent description of the actual workflow. Failed sources expose keyboard-accessible retry; autoplay denial allows manual Play.

## Sources and build

See [media instructions](../../scripts/media/README.md). `capture.spec.ts` records real application controls with the stateful `example-workspace.ts` fixture intercepting all API traffic. It also generates the richer dashboard, Planner and Brain screenshots used by the landing page. `build-intro.py` edits and encodes the footage to 1280x720 desktop and 720x960 portrait, H.264 Baseline MP4 and VP8 WebM, 24fps, no audio. Raw footage, timings, contact sheets and hashes are under `.audit/workflow-film/`.

## Verification

The production suite covers source decode, dimensions, measured 1x playback and 20-second runtime, autoplay, viewport/background pause, manual pause, keyboard Replay, source fallback, error retry, reduced motion, unmount cleanup, theme continuity and responsive geometry. Windows WebKit media-backend limitations remain explicit skips; this does not verify physical Safari or phones. Current results and page-plan details are recorded in [the workflow refinement audit](../audits/2026-10-18-landing-workflow-refinement.md).
