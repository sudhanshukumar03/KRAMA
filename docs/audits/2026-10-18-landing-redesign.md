# Landing page design and verification

## Result

The public `/` route now presents KRAMA as a personal workspace. It replaces the engineering-specific mockup with the Sequence K identity, a substantial real-product preview, a Capture → Plan → Focus explanation, connected-workspace content, practical questions, and real account/workspace entry links.

The [design plan](../design/landing-redesign.md) records the host inspection, research sources, page regions, tokens, responsive decisions, and pre-implementation critique.

## Scope

- `apps/web/src/components/LandingPage.tsx`: complete landing composition and accessible interactions.
- `apps/web/src/styles/landing.css`: styles scoped to the public page, using existing theme roles.
- `apps/web/index.html`: accurate personal-workspace title and description.
- `apps/web/public/brand/`: light/dark Sequence K SVG wordmarks.
- `apps/web/public/landing/`: sixteen actual product screenshots, desktop/mobile and light/dark, with synthetic example records.
- `e2e/mocked/landing-page.spec.ts`: seven browser journeys, run in three engines.
- `.audit/landing/production.config.ts`: production-preview verification, independent of the development server.

No new runtime dependency. Existing authenticated workspace screens and their logic are outside this change.

## Product and interaction decisions

The primary action creates an account at `/signup` for a new visitor and resumes `/app` for a signed-in visitor. The header's Open app link always follows the normal guarded login journey. Feature links point to actual workspace modules.

The preview is labeled as an example workspace. Today, Planner, Brain, and Focus select real screenshots and explanatory captions. The media is an image, not an interactive imitation of application controls. Arrow keys, Home, and End work in the tab list. Selection has stable geometry; slow loading has an explicit status, image failure has a retry action, and retry transfers focus to the preview. Another selection can recover from a failed image.

Mobile navigation is an ordinary disclosure. Tab reaches its links; Escape closes it and returns focus to the trigger. Following a section link closes navigation and focuses the destination. The skip link focuses the main heading. Public links have explicit zero tab indices to preserve the normal document sequence in WebKit as well as Chromium and Firefox. No positive indices or focus trap.

Appearance follows the existing theme hook and persists through its normal storage mechanism. Reduced motion removes preview fades, disclosure-icon rotation transitions, and button movement. FAQ disclosures use native `details` and `summary`.

## Visual review

Reviewed desktop, tablet, and mobile screenshots in light and dark. Corrected the initial 320px header compression, reframed the mobile product preview to show the focus task, replaced captures containing transient toasts, used Brain's document library for its mobile preview, and stacked the tablet hero to keep its copy and actions balanced.

Research informed the presentation, not additional product features. Removed unsupported local-first, SQLite, offline, and engineering-only claims. No invented customer logos, testimonials, usage counts, or pricing.

## Verification

Commands:

```powershell
corepack pnpm --filter client run build
corepack pnpm --filter client exec oxlint src/components/LandingPage.tsx
corepack pnpm exec playwright test --config .audit/landing/production.config.ts
```

The build command includes TypeScript checking. The production suite covers:

1. Four viewport widths in both themes, all four media selections, target geometry, overflow, asset responses, and runtime errors.
2. Keyboard preview selection, native FAQ keyboard use, theme persistence, focus styling, and reduced motion.
3. Mobile navigation with keyboard, Escape return, destination focus, and skip link.
4. Simulated image failure, keyboard retry, focus handoff, and interruption by another selection.
5. Keyboard entry into signup and normal guarded login behavior for new visitors.
6. Keyboard entry into the workspace for a synthetic authenticated visitor.
7. Text/button contrast sampled against their composed backgrounds in both themes.

Contrast checks sample settled theme states with reduced motion. A normal theme switch also has brief color interpolation; it must not be confused with the final text color. Anonymous session refresh returning 401 is expected and is recorded separately from unexpected resource failures.

Final tablet-adjusted production build: **21 passed**, seven checks each in Chromium, Firefox, and WebKit, in 1.1 minutes. TypeScript/build, targeted Oxlint, and scoped whitespace checks also passed.

| Check | Observed result |
| --- | --- |
| 320px | Document 320px, minimum target 44×44px, zero offenders, both themes and all engines |
| 390px | Document 390px, minimum target 44×44px, zero offenders, both themes and all engines |
| 768px | Document 768px, minimum target 44×44px, zero offenders, both themes and all engines |
| 1440px | Document 1440px, minimum target 44×44px, zero offenders, both themes and all engines |
| Theme | Existing theme button and storage; all product previews load in light and dark |
| Keyboard | Tab → skip link → Enter → heading → Tab → create action → Enter → signup; mobile trigger → Enter → Tab → first navigation link → Escape → trigger |
| Selection | Arrow keys, Home/End, tab panel label and caption update; rapid selection remains usable after an image fails |
| Reduced motion | Explicit emulation; preview animation name `none`; static state and focus retained |
| Retry | Aborted image → visible recovery → keyboard retry → decoded image and focused panel |
| Text contrast | All sampled text and primary actions meet 4.5:1; sampled minimum 5.00:1 light and 6.09:1 dark |
| Runtime/assets | Zero page/runtime errors and zero unexpected failing HTTP responses across all layout/theme scenarios; anonymous refresh 401 is expected |
| Local services | Frontend `http://127.0.0.1:5173/` and backend readiness `http://127.0.0.1:3000/ready` both HTTP 200 |

The final screenshots were inspected after this run, including the adjusted 768px hero. Local development services remain running.

## Evidence and limits

- Production results: `.audit/landing/results.json`.
- Per-browser geometry/runtime and contrast: `.audit/landing/measurements/`.
- Final Chromium captures: `.audit/landing/screenshots/final-{320,390,768,1440}-{light,dark}.png`.
- First viewport captures: `.audit/landing/screenshots/hero-{390,1440}-{light,dark}.png`.
- Asset reproduction: `.audit/landing/capture-assets.spec.ts` and `capture.config.ts`, using the existing synthetic design fixture.

The page and signup/login entry routes are tested. Tests do not create real accounts or write to a personal workspace. WebKit on Windows is an engine check, not a claim of physical iPhone or macOS Safari testing. No Lighthouse score, live screen-reader run, hosted deployment, or whole-application regression certification is implied.
