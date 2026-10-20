# Faster, clean inline intro - 18 October 2026

Request: the intro is too slow; remove the bottom pause circle and use a quiet inline presentation inspired by the supplied Notion references.

## Changes

- The existing silent 34-second source plays at **1.7x**, giving an uninterrupted **20-second** presentation. Both default and current playback rate are set when loading a source, covering theme swaps, retry and format fallback. Encoded assets are unchanged.
- No visible playback icon is rendered while playing, including hover and keyboard focus. The bottom-corner circle is removed. Paused/ended states show only a centered Play/Replay affordance.
- Click/tap anywhere on the film or Enter/Space on its semantic button toggles playback. An inset focus ring stays visible inside the clipped frame, without adding a playing-state icon.
- Near-viewport preparation starts within 480px with automatic preloading, giving playback more headroom to start smoothly. Actual autoplay still waits for visibility, remains muted and inline, stops offscreen/in background, respects manual Pause and reduced motion, and does not loop.
- Updated the visible duration to 20 seconds. Removed outdated source-timeline timestamps from the screen-reader description; all scene explanations remain.

Files: `apps/web/src/components/landing/IntroVideo.tsx`, `apps/web/src/styles/landing-film.css`, `e2e/mocked/landing-film.spec.ts`, and current design/media documentation.

## Verification

Production frontend build, targeted IntroVideo lint, and browser/config TypeScript checks pass.

The first full landing run passed 42 cases and skipped seven media cases; two new timing checks had a test-code scope error because a Node-side sample was referenced inside browser evaluation. The sample comparison was moved outside browser evaluation. The player also received an inset keyboard focus ring and a matching assertion. After rebuilding, the complete intro spec passed **20 cases with zero failures or flaky results**, seven explicit Windows WebKit media skips, approximately 1.1 minutes. The 24 landing-page cases passed in the preceding full run; the final change only affects the player's focus ring.

Measured video-clock advancement against the browser's monotonic clock:

| Browser | Source duration | Configured rate | Measured rate | Presentation duration |
| --- | --- | --- | --- | --- |
| Chromium | 34 seconds | 1.7x | 1.700x | 20 seconds |
| Firefox | 34 seconds | 1.7x | 1.708x | 20 seconds |

The intro checks also pass scroll autoplay, offscreen/manual/background pause, keyboard pause/replay and focus, absence of icons on hover, source failure/retry, WebM fallback, blocked autoplay, light/dark switching with preserved time/pause and speed, reduced motion, responsive geometry and route cleanup. All six film sizes/orientations fit both themes with no undersized interactive targets.

Commands:

```powershell
corepack pnpm test:landing
corepack pnpm --filter client exec oxlint src/components/landing/IntroVideo.tsx
corepack pnpm exec tsc --noEmit -p tsconfig.json
corepack pnpm --filter client run build
corepack pnpm exec playwright test --config playwright.landing.config.ts landing-film.spec.ts
```

Evidence: `.audit/faster-intro/pace-{chromium,firefox}.json`, `.audit/faster-intro/full-suite-before-timing-fix.json`, `test-results/landing-results.json` (final intro spec), `.audit/landing-film/screenshots/playing-without-controls.png`, and `.audit/landing-film/measurements/inline-*.json`. The actual playing frame was visually reviewed and shows no bottom button or hover controls.

Windows WebKit does not decode these movies, so seven actual-media checks are skipped; interface checks run. Actual Safari playback on macOS/iOS remains unverified.
