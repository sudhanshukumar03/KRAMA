# Landing refinement - 18 October 2026

Request: refine the current KRAMA landing page while retaining its identity and recently simplified intro.

## Design decisions

The earlier hero delayed the product preview and used stronger display sizing than the rest of the page. Repeated descriptions and the Brain checklist extended the reading journey, while nested screenshot borders made the product frame heavier than necessary.

- Reduced desktop display sizing from 100px to 84px, relaxed its tracking, and tightened hero spacing. The product is visible earlier in the first screen.
- Replaced abstract hero copy with a direct explanation of tasks, notes, plans and focus.
- Preserved complete 8:5 desktop screenshots instead of cropping their lower edge. Kept mobile crops centered on useful product content.
- Softened product-frame borders and shortened caption padding.
- Shortened Capture/Plan/Focus descriptions and strengthened icon hierarchy with the existing Iris token.
- Removed the repeated Brain checklist, widened its screenshot, and tightened feature/FAQ copy and mobile section spacing.
- Kept the existing light/dark tokens, Inter family, single Open KRAMA link, example-workspace labels, reduced-motion behavior, and minimal inline intro. No application features or dependencies added.

## Implementation

`apps/web/src/components/LandingPage.tsx`, `apps/web/src/styles/landing.css`, and `e2e/mocked/landing-page.spec.ts`. The existing responsive test now records product placement and screenshot aspect ratio, and checks that the desktop preview starts within the first 550px while preserving the full product image.

## Verification

Production frontend build, targeted lint, and browser/config TypeScript checks pass. Final production browser run: **44 passed, seven explicit Windows WebKit media skips, zero failures and zero flaky cases**, 51 cases, one worker, no retries, approximately 2.5 minutes.

Commands:

```powershell
corepack pnpm test:landing
corepack pnpm --filter client exec oxlint src/components/LandingPage.tsx
corepack pnpm exec tsc --noEmit -p tsconfig.json
```

Visual review: live Brave desktop dark hero, production phone light hero, and complete production desktop light layout. The preview remains a labeled example rather than a live app imitation. The inline video prepares when near the viewport; a full-page screenshot taken before scrolling can show its reserved surface, while the separate inline screenshots show the prepared media.

Evidence: `test-results/landing-results.json`, `.audit/landing/screenshots/hero-*.png`, `.audit/landing/screenshots/final-*.png`, `.audit/landing/measurements/*.json`, `.audit/landing-film/screenshots/inline-*.png`.

Actual movie playback is verified in Chromium and Firefox. Windows WebKit skips seven media checks because its backend does not decode the movies. Actual macOS/iOS Safari remains unverified.

## Measured acceptance

| Engine | Desktop preview top | Page widths | Minimum targets | Offenders | Unexpected runtime / HTTP errors |
| --- | --- | --- | --- | --- | --- |
| chromium | 519.9px | 320/390/768/1440 fit both themes: True | 44 by 44px | 0 | 0 / 0 |
| firefox | 519.9px | 320/390/768/1440 fit both themes: True | 44 by 44px | 0 | 0 / 0 |
| webkit | 519.9px | 320/390/768/1440 fit both themes: False | 44 by 44px | 0 | 0 / 0 |

Keyboard preview selection, mobile menu/Escape focus return, FAQ, source retry, public/signed-in app entry, system theme synchronization, contrast, reduced motion, and the minimal intro behavior pass.
