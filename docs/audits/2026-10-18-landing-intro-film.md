# KRAMA landing introduction film

**Interaction updated later on 18 October:** The click-to-open dialog described below has been replaced by an inline film that plays on scroll. See the [current inline intro audit](2026-10-18-inline-intro.md). The original media encoding and earlier test results remain historical evidence.

## Delivered

An original 34-second silent introduction composed from actual KRAMA example screens and the Sequence K identity. It covers Inbox, Planner, Brain, and Focus with readable title cards, gentle framing, and crossfades. It uses no external footage, soundtrack, or invented product behavior.

Watch intro is available beside the main hero action and in the desktop product-preview header. It opens a native dialog with custom accessible media controls. The existing preview tabs and landing flow remain available.

The player loads no film media before a person requests it. It chooses landscape or portrait based on the viewport, uses MP4 with WebM fallback, exposes captions and a transcript, pauses when hidden/offscreen, and releases playback on close or unmount. Closing returns focus to the actual opener, including pointer activation in WebKit. Failed sources offer keyboard retry and an available transcript.

## Files

- `apps/web/src/components/LandingPage.tsx`: the two watch actions and player integration.
- `apps/web/src/components/landing/IntroVideo.tsx`: native dialog, playback, seeking, captions, fullscreen, visibility behavior, recovery, transcript, and focus ownership.
- `apps/web/src/styles/landing-film.css`: player geometry and responsive controls using the existing light/dark theme.
- `apps/web/public/landing/film/`: MP4/WebM landscape and portrait films, posters, and English WebVTT descriptions.
- `scripts/media/build-intro.py`, `README.md`, `sources/`: reproducible native media composition and actual synthetic Inbox captures.
- `e2e/mocked/landing-film.spec.ts`: seven film journeys; combined production configuration now maintained at `playwright.landing.config.ts` (the original local run used `.audit/landing-film/production.config.ts`).

No new frontend dependency or third-party video service. The encoder is a build-time tool installed only under `.audit/landing-film/tools`.

## Validation

```powershell
corepack pnpm --filter client run build
corepack pnpm --filter client exec oxlint src/components/LandingPage.tsx src/components/landing/IntroVideo.tsx
corepack pnpm test:landing
```

Final production result: **38 passed, four skipped, zero unexpected failures, zero flaky tests**, in 119 seconds. TypeScript/build, targeted lint, and scoped whitespace checks passed. All four encoded movies decoded completely with FFmpeg without errors.

| Check | Observed evidence |
| --- | --- |
| Media | 34 seconds, 24fps, no audio; landscape 1280×720 and portrait 720×960 |
| Formats | H.264 Baseline/YUV420P MP4 with fast-start metadata; VP8 WebM fallback |
| Transfer | MP4 about 2.95MB desktop and 2.36MB mobile; no movie, poster or caption request before activation in the real media tests |
| Playback | Actual advancing time and decoded frames verified in Chromium and Firefox |
| Captions | All six real VTT cues loaded; keyboard show/hide verified |
| Transport | Pause, keyboard seek, ending, replay and reopen verified |
| Recovery | Aborted sources → visible failure/transcript → keyboard retry → decoded playback; MP4 outage → actual WebM playback |
| Visibility | Hidden page and offscreen player pause; returning does not resume automatically |
| Keyboard | Dialog focus entry, controls, transcript, Escape close and focus return; explicit pointer opener fixes WebKit return behavior |
| Layout | 320/390/768/1440px, both themes, all three engines; document remains within viewport, dialog stays inside viewport, all measured controls at least 44×44px, zero offenders |
| Reduced motion | Existing landing checks pass; no page-load autoplay or film loop, static UI with a transcript alternative |
| Existing landing | All 21 prior production landing checks still pass |
| Services | Local frontend and backend readiness both returned HTTP 200 and remain running |

Final movie scenes and Chromium player screenshots were visually inspected, including mobile and dark mode. Corrected the mobile preview-header overflow, removed clipped Inbox framing, kept the entire Focus clock visible, and made closed captions optional to avoid repeating on-screen titles by default.

## WebKit test limitation

This Windows WebKit runner reported media readiness/time and loaded the poster and VTT, but did not request the MP4/WebM file. It reported rendered dimensions (818×460 in the diagnostic) rather than the encoded 1280×720 and did not supply decoded-frame metrics. These observations cannot establish actual video decoding. Accordingly, four media-specific checks are explicitly skipped on Windows WebKit: actual decoding, seek/end/replay, failed-source network recovery, and WebM fallback decoding.

Its layout, keyboard, visibility-state and fullscreen/reopen interface checks still run. Actual Safari playback remains to be checked on macOS or an iPhone. [Playwright's browser documentation](https://playwright.dev/docs/browsers) explains that codecs vary across operating systems and recommends WebKit on a Mac for video playback closest to Safari. We do not count the Windows media simulation as Safari playback evidence.

## Evidence

- `.audit/landing-film/results.json`: final combined production results.
- `.audit/landing-film/measurements/`: per-engine player geometry, eight states per engine.
- `.audit/landing-film/screenshots/`: final player captures across four widths and two themes.
- `.audit/landing-film/media-manifest.json`: output bytes and SHA-256 checksums.
- `.audit/landing-film/{landscape,portrait}-{01,06,12,18,24,31}.png`: representative rendered scenes.
- `.audit/landing-film/encode-*.log`: encoder logs.
- `.audit/landing-film/inspect.cjs`, `webkit-player.png`: Windows WebKit diagnostic.

The [design plan](../design/landing-intro-film.md) records the storyboard, constraints, interaction states, and official-product inspiration sources.
