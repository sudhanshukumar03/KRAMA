# Landing entry simplification - 18 October 2026

The landing page repeated entry actions in the header, hero, module descriptions, mobile menu, closing panel and footer. These mixed Open app, Create your workspace and login prompts made entering the same personal workspace unnecessarily confusing.

The page now has one persistent **Open KRAMA** link in its sticky header. It points to `/app`: the existing authentication guard opens the workspace for signed-in users and routes visitors to login. The login page retains its Sign up link. Authentication behavior and account creation were not changed.

Removed repeated hero, feature, closing, footer and mobile-menu entry links. Feature descriptions remain informational. Removed the redundant closing sales panel and its unused styles. The original intro film, screenshot previews, section navigation, themes and FAQs remain available. Header spacing accommodates the longer label on small screens using existing KRAMA tokens.

## Validation

- Frontend production build, targeted lint, browser/config TypeScript and scoped whitespace checks passed.
- Final production landing/film suite: **38 passed, four Windows WebKit media tests skipped, zero failures or flaky tests**, one worker and no retries, approximately 1.9 minutes.
- A new visitor regression checks exactly one app-entry link at 320, 360, 390, 768 and 1440px; the header action remains visible after scrolling to Questions and stays inside the viewport. Keyboard activation reaches login and the Sign up link reaches account creation.
- Signed-in keyboard activation reaches the dashboard. This and the visitor journey pass in Chromium, Firefox and WebKit.
- Existing layout, contrast, 44px targets, theme persistence, reduced-motion, preview recovery and intro-film journeys still pass. Actual film decoding remains verified in Chromium/Firefox; the known Windows WebKit media limitation is unchanged.
- Light desktop and dark mobile screenshots were visually inspected. The development server at port 5173 serves the updated module and returns HTTP 200.

The first run caught a test sequencing mistake after a second page load: keyboard input was sent before the heading was ready. Added an explicit readiness and skip-link focus assertion; the targeted rerun and final complete suite then passed. No retry was used to hide that failure.

Files: `apps/web/src/components/LandingPage.tsx`, `apps/web/src/styles/landing.css`, `e2e/mocked/landing-page.spec.ts`. The [landing design plan](../design/landing-redesign.md) now describes the simplified entry flow. Local generated evidence is in `test-results/landing-results.json` and `.audit/landing/`.
