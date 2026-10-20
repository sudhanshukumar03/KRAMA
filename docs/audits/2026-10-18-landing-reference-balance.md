# Landing reference balance - 18 October 2026

User supplied five Notion screenshots to clarify the desired balance of font styles and layout. The reference is used for hierarchy, alignment, white space and the relationship between text and product media; no artwork, customer marks, competitor copy or capabilities are reused.

## Decisions and implementation

- Hero type is now fluid from 64px to 112px on wider layouts, with weight 700. The unnecessary introductory label is removed; a single concise supporting sentence uses regular-weight 20px text.
- Section headings reach 56px/700, primary feature type reaches 36px/600, and other feature titles use 24px/600. Descriptions use 17-18px regular text on wider screens, with at least 16px reading text on mobile.
- Section headings and descriptions share a two-column grid, which stacks on phones. This keeps larger headings from crowding the copy.
- The footer has a larger wordmark, readable text, more vertical space, and links only to existing sections. One persistent Open KRAMA action remains.
- Stronger light/dark text profiles are retained. The simplified inline video and existing application logic are unchanged.
- Fixed optional mobile line breaks that could join adjacent words; headings now retain actual word spaces when the break is hidden. An existing mobile regression checks the complete accessible heading name.

Files: `apps/web/src/components/LandingPage.tsx`, `apps/web/src/styles/landing.css`, `apps/web/src/styles/landing-film.css`, `e2e/mocked/landing-page.spec.ts`, and the current design specification.

## Verification

Production frontend build, targeted LandingPage lint, and browser/config TypeScript checks pass.

The production suite exercised 51 cases: 43 passed, seven Windows WebKit media cases were explicitly skipped, and one WebKit responsive assertion initially failed. At an outer width of 768px, WebKit's scrollbar leaves its layout on the mobile breakpoint, where the intentionally smaller hero has a different ratio to section headings. The test incorrectly classified it by outer width. The assertion now uses the actual CSS media query, and the affected responsive audit is rerun across all three engines against the same unchanged production build. Targeted rerun: **three passed, zero failed**, with no application changes between runs. Together these runs cover all 44 applicable production cases successfully; seven media cases remain explicitly skipped.

The responsive audit covers 320, 390, 768, 1440 and 1920px in both themes, records heading proportions and reading sizes, and checks overflow and every interactive target. The existing contrast audit retains its 7:1 non-accent text and 4.5:1 action/accent requirements. Video behavior, keyboard navigation, preview recovery, authentication entry and system-theme tests remain covered by the production run.

Commands:

```powershell
corepack pnpm test:landing
corepack pnpm --filter client exec oxlint src/components/LandingPage.tsx
corepack pnpm exec tsc --noEmit -p tsconfig.json
corepack pnpm exec playwright test --config playwright.landing.config.ts --grep 'public page fits phone'
```

Visual review: 1920px light hero, complete 1440px light composition, and 390px dark hero. The lazy video can show its reserved frame in an unscrolled full-page screenshot; the separate inline screenshots show prepared media.

Evidence: `.audit/landing-reference-balance/full-suite-before-breakpoint-assertion.json`, `test-results/landing-results.json` (targeted rerun), `.audit/landing/measurements/*.json`, `.audit/landing/screenshots/{hero,final}-*.png`, and `.audit/landing-film/screenshots/inline-*.png`.

Windows WebKit does not decode these films, so seven actual-media checks are skipped. Actual macOS/iOS Safari video playback remains unverified. The local app remains available at http://127.0.0.1:5173/.

## Final responsive measurements

| Engine | Audited theme/width states | Minimum reading size | Minimum targets | Overflow / target / unexpected runtime failures |
| --- | --- | --- | --- | --- |
| chromium | 10 | 16px | 44 by 44px | 0 |
| firefox | 10 | 16px | 44 by 44px | 0 |
| webkit | 10 | 16px | 44 by 44px | 0 |
