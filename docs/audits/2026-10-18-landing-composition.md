# Notion / Linear inspired landing composition - 18 October 2026

The public landing page now uses a centered introduction, a framed actual-product preview, connected daily-flow columns, a compact inline intro, and a visual Brain story. KRAMA's personal-workspace language, Iris/Slate/Obsidian palette, single persistent app-entry action, and established authentication remain intact.

The complete host inspection, Page Plan, region/component table, Registry decision, research links, responsive rules, and theme decisions are recorded in the current [design specification](../design/landing-redesign.md). Registry components installed: none. Runtime dependencies added: none.

## Changes and critique

- Replaced the split hero with centered display typography and a concise product explanation. The Explore link transfers keyboard focus to the real product-preview region and updates the URL fragment.
- Kept actual theme-aware Today, Planner, Brain, and Focus screenshots, with reserved geometry, accessible tabs, image loading, error recovery, and interruptible selection.
- Used fine dividers to join Capture, Plan, and Focus instead of repeating detached feature cards.
- Placed the existing inline intro after that explanation. Its 960px maximum, single-row controls, scroll playback, reduced-motion behavior, light/dark media, and manual Pause are preserved.
- Added a real Brain screenshot beside its explanation. Mobile framing now shows the example document list rather than only the app header.
- Retained one sticky Open KRAMA link, native FAQ disclosures, and compact footer navigation. Added no app features or invented claims.

## Commands

All exit 0:

```powershell
corepack pnpm test:landing
corepack pnpm exec tsc --noEmit -p tsconfig.json
corepack pnpm --filter client exec oxlint src/components/LandingPage.tsx
```

The landing command builds the production frontend, then runs Chromium, Firefox, and WebKit with one worker and no retries. Final result: **44 passed, seven explicitly skipped, zero failed, zero flaky**, 51 cases, approximately 154 seconds. Each of Chromium and Firefox passed 17 cases; Windows WebKit passed ten interface cases and skipped seven actual-media cases because its backend does not fetch/decode these movies. Actual Safari playback on macOS/iOS remains unverified.

## Acceptance

Measurements below apply to all three engines and both themes. Controls include links, buttons, disclosures and custom interactive nodes. The film additionally passes 36 layout states across six sizes/orientations and both themes.

| Check | Observed evidence |
| --- | --- |
| Build | Production frontend build inside `corepack pnpm test:landing`: exit 0 |
| 320 | Viewport/document 320/320px; minimum target 44 by 44px; zero offenders |
| 390 | Viewport/document 390/390px; minimum target 44 by 44px; zero offenders |
| 768 | Viewport/document 768/768px; minimum target 44 by 44px; zero offenders |
| 1440 | Viewport/document 1440/1440px; minimum target 44 by 44px; zero offenders |
| Light / dark | Explicit toggle and emulated system dark -> light -> dark; logos, screenshot sources, page colors synchronized. Actual movie switching with preserved time/pause/captions passes Chromium and Firefox |
| Keyboard / focus | Tab -> Skip -> Enter focuses H1; Tab -> Explore -> Enter focuses preview; arrow/Home/End selects previews. Mobile menu Enter -> Tab -> Escape returns focus to trigger. Enter/Space controls native FAQ |
| Reduced motion | Emulated reduce removes preview animation and leaves intro paused with manual Play; live preference changes stop automatic playback |
| Targets | Minimum rendered width/height 44/44px, zero offenders across required page widths and film sizes |
| Primary state | Preview loading/decoded media, source failure -> retry, selection away from failed image; scroll playback, explicit pause/resume, seeking, captions, end/replay, transcript, movie source failure/retry and WebM fallback exercised where actual media works |
| Runtime | Zero unexpected console/page errors and zero unexpected HTTP failures in the responsive audits for all three engines. Expected public unauthenticated refresh 401 is excluded; failure journeys deliberately abort their test media/images |

Visual review covered final full-page desktop dark and phone light layouts, desktop/phone heroes, and the visible light intro. A full-page screenshot taken before scrolling to the lazy video shows its reserved surface; the separate inline screenshots show the prepared poster/movie. Live Brave inspection also confirmed the desktop composition and Explore focus destination.

## Files and evidence

- Composition: `apps/web/src/components/LandingPage.tsx`, `apps/web/src/styles/landing.css`.
- Regression navigation: `e2e/mocked/landing-page.spec.ts`.
- Current design specification: `docs/design/landing-redesign.md`.
- Intro placement documentation: `docs/design/landing-intro-film.md`, `scripts/media/README.md`.
- Local browser report: `test-results/landing-results.json`.
- Local geometry/contrast evidence: `.audit/landing/measurements/{chromium,firefox,webkit}*.json`.
- Local screenshots: `.audit/landing/screenshots/{hero,final}-*-{light,dark}.png`.
- Visible film evidence: `.audit/landing-film/screenshots/inline-*-{light,dark}.png`, `.audit/landing-film/measurements/inline-*.json`.

The app is available locally at http://127.0.0.1:5173/. This work does not publish or deploy it, change private workspace records, or claim physical-device/Safari playback verification.
