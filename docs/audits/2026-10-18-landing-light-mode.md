# Landing and intro light-mode repair - 18 October 2026

Scope confirmed by the user: the public landing page and intro video.

## Confirmed problems

- The film, poster, loading surface and source-failure panel used dark-only assets/colors in light mode. The rest of the page changed theme, creating a visibly mismatched player.
- System appearance changes updated the root CSS class without notifying React theme consumers. A browser regression reproduced the page becoming light while the header logo remained the dark asset. Product previews could remain on the previous appearance too.

## Changes

- Added actual light-mode landscape/portrait films and posters using KRAMA's off-white, slate and Iris palette, light wordmark and corresponding real product screenshots. Added synthetic light Inbox source captures. The existing dark movies are unchanged; all four SHA-256 checks match the earlier values.
- Made player backgrounds, loading and recovery surfaces follow the active theme. Compact dimensions, scroll autoplay, offscreen pause, keyboard controls and reduced-motion behavior remain in place.
- Swapping the film's appearance preserves playback position, pause and captions. A pending restore snapshot avoids replacing the intended position during successive theme changes.
- Theme subscribers now receive system appearance changes, so logos, previews and the intro use the same resolved appearance as the page.
- The reproducible media script defaults to both themes and accepts `--theme light` or `--theme dark`. Only light assets were generated during this repair.

## Verification

| Check | Observed result |
| --- | --- |
| Reproduction | System-theme regression failed before the fix: expected light logo, received dark logo after the background changed |
| Production frontend build | Passed |
| Targeted lint and browser/config TypeScript | Passed |
| Media script syntax | Passed |
| New media integrity | All four light MP4/WebM files decoded completely with FFmpeg without errors |
| Dark media preservation | All four original movie SHA-256 values match |
| Final production browser suite | **44 passed, seven Windows WebKit media skips, zero failures or flaky tests**, 51 cases, one worker, no retries, approximately 2.4 minutes |
| Theme synchronization | System dark → light → dark updates root, logo and preview assets in Chromium, Firefox and WebKit |
| Real film appearance switching | Chromium and Firefox verify light/dark sources, decoded frames, preserved time/pause/captions and resumed playback |
| Responsive appearance | 36 film states across six viewport sizes/orientations and both themes; no horizontal overflow, all measured controls at least 44×44px |
| Existing journeys | Scroll autoplay, manual pause, keyboard seek, captions, transcript, source recovery, WebM fallback, reduced motion, fullscreen/cleanup, single app entry, auth navigation and landing contrast pass |
| Visual review | Light desktop/mobile player and light storyboard scenes inspected; original dark design retained |
| Running local app | Root returns HTTP 200; new light media returns 206 with correct MP4/WebM types |

Windows WebKit does not actually fetch/decode these movies, so seven media-specific checks are skipped explicitly. Its interface and system-theme checks run. Actual Safari video playback remains a separate macOS/iOS check.

## Files and evidence

- `apps/web/src/lib/theme.ts`: synchronized theme state.
- `apps/web/src/components/LandingPage.tsx`, `components/landing/IntroVideo.tsx`, `styles/landing-film.css`: theme-aware player integration and surfaces.
- `apps/web/public/landing/film/*-light.*`, `*-light-poster.jpg`: new films/posters.
- `scripts/media/build-intro.py`, `README.md`, `sources/inbox-*-light.png`: reproducible light/dark media sources.
- `e2e/mocked/landing-page.spec.ts`, `landing-film.spec.ts`: theme regressions.
- Local evidence: `test-results/landing-results.json`, `.audit/landing-film/measurements/inline-*.json`, `.audit/landing-film/screenshots/inline-*.png`, `.audit/light-theme/dark-media-preservation.json`, `.audit/landing-film/media-manifest.json`.

Repeat the build and browser checks with `corepack pnpm test:landing`. No private credentials or personal workspace records were changed.
