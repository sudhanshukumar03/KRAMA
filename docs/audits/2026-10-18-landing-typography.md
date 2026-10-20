# Landing typography and theme legibility - 18 October 2026

User clarification: refine the text itself; light mode feels plain and dark-mode fonts are difficult to read.

## Changes

- Kept Inter and the existing KRAMA Iris/Slate/Obsidian palette. Added landing-scoped text profiles: deeper slate supporting text in light mode; brighter platinum/slate supporting text in dark mode. Global application tokens are unaffected.
- Display heading uses weight 700 with less compressed tracking; section and feature headings use 600. The introductory label uses an existing Iris accent and weight 600.
- Main reading descriptions are at least 16px in both desktop and phone layouts; hero supporting text is 18px desktop and 16px mobile with weight 500.
- Restored normal body tracking rather than inheriting the application's negative letter spacing. Raised small captions from 11px to at least 12px and flow metadata to 13px.
- Intro heading/description follows the same text hierarchy; loading/recovery text inherits the brighter theme profile. Simplified playback and encoded films are unchanged.

The previous color checks met their minimum thresholds, but small text and lighter weights still weakened perceived legibility. This pass addresses size, weight, tracking and contrast together.

## Verification

The responsive regression now checks a 16px minimum for reading descriptions at 320, 390, 768 and 1440px in both themes. The contrast audit covers 31 representative text contexts, including navigation, hero, preview labels, section descriptions, Brain, metadata, FAQ and footer. Non-accent text must reach 7:1; existing colored accents and primary actions retain their 4.5:1 requirement.

Production frontend build and browser/config TypeScript checks pass. Final production browser suite: **44 passed, seven explicit Windows WebKit media skips, zero failures and zero flaky cases**, 51 cases, one worker, no retries, approximately 2.2 minutes.

Commands:

```powershell
corepack pnpm test:landing
corepack pnpm exec tsc --noEmit -p tsconfig.json
```

Visual review: updated production desktop dark hero, mobile light hero and complete dark layout. Evidence: `test-results/landing-results.json`, `.audit/landing/measurements/*-contrast.json`, `.audit/landing/measurements/{chromium,firefox,webkit}.json`, `.audit/landing/screenshots/{hero,final}-*.png`.

Seven actual-media cases are skipped on Windows WebKit, whose backend does not decode these films. Its layout/theme/interface tests run. Actual Safari video playback on macOS/iOS remains unverified.

Changed files: `apps/web/src/styles/landing.css`, `apps/web/src/styles/landing-film.css`, `e2e/mocked/landing-page.spec.ts`, and current design documentation. No application logic, app-wide typography, or page features changed.

## Measured acceptance

| Engine / theme | Hero body contrast | Lowest non-accent text contrast | Minimum reading size | Overflow / small-target / unexpected runtime failures |
| --- | --- | --- | --- | --- |
| chromium / light | 9.83:1 | 7.30:1 | 16px | 0 |
| chromium / dark | 12.12:1 | 8.75:1 | 16px | 0 |
| firefox / light | 9.83:1 | 7.30:1 | 16px | 0 |
| firefox / dark | 12.12:1 | 8.75:1 | 16px | 0 |
| webkit / light | 9.83:1 | 7.30:1 | 16px | 0 |
| webkit / dark | 12.12:1 | 8.75:1 | 16px | 0 |

All required 320/390/768/1440px layouts pass both themes. Colored accents and actions pass 4.5:1; all 27 non-accent representative contexts pass 7:1. Existing keyboard navigation, focus return, image retry, theme synchronization, account entry and minimal intro tests pass.
