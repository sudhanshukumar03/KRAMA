# Minimal inline intro - 18 October 2026

User request: remove the visible playback strip and Transcript row shown below the landing intro.

## Result

- Removed the progress slider, elapsed/duration text, captions/fullscreen buttons, and visible Transcript disclosure.
- The video frame now ends at the footage, without a bottom control panel.
- Click/tap anywhere on the video, or focus it and press Enter/Space, to pause or resume. A 44px icon is visible only on hover, keyboard focus, or while paused/ended. Playing footage has no persistent controls.
- Kept the silent movie's on-screen explanations and a screen-reader-only text equivalent.
- Preserved muted scroll autoplay, offscreen/background pause, reduced-motion poster/manual Play, explicit Replay, theme-aware media with preserved time/pause, source fallback, retry, and route cleanup.
- Removed progress-driven React rerenders and obsolete fullscreen/caption control state.

## Verification

Production frontend build, targeted IntroVideo lint, and browser/config TypeScript checks passed. The browser suite verifies removal of native/custom toolbars and visible disclosures, hidden overlay during playback, keyboard pause/replay, screen-reader description, both themes, responsive geometry, autoplay restrictions, error recovery, and media cleanup.

The first visual assertion sampled the overlay during its 150ms fade. Replaced that immediate read with an auto-retrying CSS assertion that waits for the actual final opacity; the implementation did not need an animation change.

Clean final rerun: **44 passed, seven explicit Windows WebKit media skips, zero failures or flaky cases**, 51 cases, one worker, no retries, approximately 2.5 minutes. All four required page widths fit both themes in all three engines; all six film sizes/orientations fit both themes with zero undersized interactive targets. Responsive audits recorded zero unexpected console/page errors and HTTP failures.

Commands:

```powershell
corepack pnpm test:landing
corepack pnpm --filter client exec oxlint src/components/landing/IntroVideo.tsx
corepack pnpm exec tsc --noEmit -p tsconfig.json
corepack pnpm exec playwright test --config playwright.landing.config.ts
```

Actual video playback is verified in Chromium and Firefox. Seven media checks are explicitly skipped in Windows WebKit, whose media backend does not decode these movies; its interface checks run. Actual macOS/iOS Safari remains unverified.

Evidence: `test-results/landing-results.json`, `.audit/landing-film/screenshots/inline-*.png`, `.audit/landing-film/measurements/inline-*.json`, `.audit/landing/measurements/*.json`. Live Brave inspection confirmed the lower video edge has no toolbar or Transcript row.

Changed files: `apps/web/src/components/landing/IntroVideo.tsx`, `apps/web/src/styles/landing-film.css`, `e2e/mocked/landing-film.spec.ts`, `e2e/mocked/landing-page.spec.ts`; current design/media documentation updated to match. Encoded video assets are unchanged.
