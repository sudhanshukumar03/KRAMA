# KRAMA changing hero headline — 18 October 2026

The requested Notion-inspired headline treatment is implemented in the existing landing page. It reads **Make room for** with an Iris capsule cycling **focus → planning → habits**, accompanied by Timer, Calendar and Repeat icons. KRAMA's existing Inter typography, colors, app-entry action and page sections remain.

Implementation: `apps/web/src/components/landing/HeroTopic.tsx`, imported by `LandingPage.tsx`; styles in `apps/web/src/styles/landing.css`. Registry component: none. Existing React, Lucide and `useReducedMotion` are reused; no package was added.

| Event/state | Observed behavior |
| --- | --- |
| Initial render | Focus is visible immediately, with no entrance animation |
| Automatic change | 3.2-second hold; incoming opacity/vertical transition 260ms, outgoing 150ms |
| Geometry | The longest topic reserves one shared grid area; changing words do not shift the capsule or product preview |
| Pause/resume | Click or Enter/Space on the capsule toggles automatic changes; no separate control strip |
| Offscreen/background | Viewport observer and document visibility stop the timer |
| Reduced motion | No automatic changes or animations; the capsule becomes an explicit next-topic button |
| Assistive technology | Stable H1 accessible name “Make room for focus, planning and habits.”; visual changes do not repeatedly announce |
| Unmount | Interval, observer and visibility listener clean up |

Keyboard focus uses the existing visible Iris outline. Both light and dark appearances use `accent-subtle`, `accent-fg` and `text-primary`. The introductory sentence is grammatical for all three topics. The change is limited to the landing headline; no workspace behavior was redesigned.

Two new production-browser journeys verify the sequence, fixed geometry, keyboard pause/resume, offscreen suspension, live reduced-motion changes, static manual topic selection and responsive fit at 320/390/768/1440 in both themes. The existing whole-page checks also include 1920px. Screenshot evidence lives under `.audit/hero-topics/`, with each topic captured at 390 and 1440 in light/dark.

Initial local Chromium verification: both new journeys passed. Frontend lint and root TypeScript validation exit 0. Final production suite results are recorded below after completion.


Final acceptance: fresh production build succeeded. The completed production browser run reports **50 passed, 7 skipped, 0 failed, 0 flaky** across Chromium, Firefox and WebKit. All six new headline checks pass, including WebKit. The seven skips are existing Windows WebKit video-backend limitations; they do not concern the headline. The keyboard navigation check now includes the capsule's pause/resume control before Explore the workspace.

At 1440px the product preview starts at y=543.39px in both themes, retaining the existing under-550px requirement. Page measurements show no horizontal overflow or targets below 44px at the tested widths. Visual proof includes `1440-light-planning.png`, `1440-dark-focus.png` and `390-dark-habits.png` under `.audit/hero-topics/`. Frontend lint and root TypeScript validation passed.


Background-only color revision: the user asked to retain black text. Current words are `#000` across all topics and both themes; the capsule alone changes between pastel Iris, violet and jade, with the original blue icons. The topic contrast/responsive journey now verifies black text, three distinct backgrounds, matching geometry and contrast in all 24 topic/theme/width combinations per engine. Pastel surfaces use the existing KRAMA hue tokens mixed with white, so the dark-mode words remain black and readable. Production build and TypeScript validation pass.

Background-only verification: **18 relevant production browser checks passed**, with no failures or skips. All 72 topic/theme/width samples across Chromium, Firefox and WebKit retain black text and readable contrast (minimum 16.94:1). Keyboard pause/resume, reduced motion, responsive geometry, page contrast and the app-entry path pass.
