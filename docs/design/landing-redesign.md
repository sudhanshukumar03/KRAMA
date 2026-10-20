# KRAMA landing page

The public route `/` explains KRAMA as a personal workspace and provides one persistent Open KRAMA link. This composition supersedes the earlier split hero. The authenticated application and account flow retain their existing behavior.

## Research and direction

Reviewed the live official [Notion home page](https://www.notion.com/) and [Linear home page](https://linear.app/) on 18 October 2026, including browser screenshots. Notion informed the centered introduction, generous reading space, and prominent product preview. Linear informed restrained navigation, fine dividers, accurate product imagery, and sectional product stories. These are design interpretations; KRAMA uses its own copy, identity, screenshots, and product capabilities.

The page keeps KRAMA's Iris, Slate, light neutral, and Obsidian tokens. It uses the installed Inter family. No competitor artwork, fabricated customers, adoption figures, testimonials, pricing, or capabilities are introduced.

## Host inspection

| Concern | Observed host evidence |
| --- | --- |
| Framework | React 19.2.7, Vite 8.1.6, TypeScript 6 - `apps/web/package.json` |
| Route | `/` lazily renders LandingPage - `apps/web/src/App.tsx` |
| Component system | React Router links, Lucide icons, native disclosures, existing IntroVideo - `apps/web/src/components/LandingPage.tsx`, `apps/web/src/components/landing/IntroVideo.tsx` |
| Tokens / theme | Iris/Slate/Obsidian, root `.dark`, persisted/system preference - `apps/web/src/styles/theme.css`, `apps/web/src/lib/theme.ts` |
| Tailwind | Tailwind 4 compiled by Vite; scoped landing CSS - `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/src/styles/landing.css` |
| Dependencies | React Router 7.18.1, Lucide 1.26.0; no added runtime packages - `apps/web/package.json` |

## Page Plan

Job: understand the personal workspace, see how its parts connect, and enter the application.

Archetype: product-led editorial landing page with one dominant preview surface.

Primary action: one sticky-header Open KRAMA link to `/app`. Visitors reach login, with account creation available there; signed-in visitors resume the workspace. Explore the workspace is an in-page link to the preview, not another app-entry action.

Primary state: selected preview -> loading -> decoded screenshot or recoverable image failure. Selection can interrupt a failed preview. The inline film has its existing visible/playing/paused/ended/error/retry states.

| Region | Product purpose | Published component | State or motion |
| --- | --- | --- | --- |
| Header | Navigate sections, switch appearance, enter KRAMA | none | Mobile disclosure; Escape returns focus |
| Centered hero | Explain the personal workspace | none | Static copy; Explore link transfers focus to preview |
| Framed product preview | Inspect Today, Planner, Brain, Focus | none | Explicit tab selection, arrow keys, reserved image geometry, loading and retry |
| Daily flow | Explain Capture -> Plan -> Focus | none | Three connected static columns; stacked rows on mobile |
| Compact intro | Show the existing daily-workflow tour inline | none | Scroll playback, offscreen pause, explicit controls, reduced-motion poster |
| Wider workspace | Show Brain and connections to Projects, Goals, Habits | none | Theme-aware real screenshot and static feature narrative |
| Questions / footer | Resolve practical questions and navigate | none | Native disclosures; no repeated app-entry CTA |

Registry: none. Existing semantic components and native controls meet the product job; no registry source or animation dependency was installed.

Responsive: 320/390px use a compact mobile header, stacked stories, and actual mobile screenshots; 768px retains full navigation with stacked content; 1440px uses an 1184px content column, centered display heading up to 112px, and a 1120px product frame. The intro remains at most 960px wide. All interactive targets measure at least 44 by 44 CSS px. The document must not scroll horizontally.

Theme: light and dark use existing semantic tokens and matching screenshots, logos, posters, and film sources. Reduced motion removes preview fades and disables scroll autoplay. Manual pause remains authoritative. Motion is limited to the film and brief explicit-selection feedback.

## Final composition

1. Quiet 72px header with a single app-entry action.
2. Centered ?Make room for? introduction with focus/planning/habits topic capsule and an in-page exploration link.
3. Real product screenshots with keyboard-selectable tabs and descriptive captions.
4. Capture, Plan, Focus explanation joined by dividers.
5. Existing compact, silent intro film embedded directly in the page.
6. Brain story with a real screenshot, then Projects and Goals/Habits descriptions and a goal-to-next-step connection.
7. Native FAQ and compact footer.

Mobile Brain imagery is framed around the document list rather than cropping away the example notes. Product images are explicitly labeled as an example workspace; screenshot controls are not presented as a working application demo.

## Implementation and acceptance

Composition changes: `apps/web/src/components/LandingPage.tsx`, `apps/web/src/styles/landing.css`. Navigation coverage: `e2e/mocked/landing-page.spec.ts`. Existing intro playback, theme synchronization, media generation, app authentication, and application geometry remain in their established components.

The current [composition audit](../audits/2026-10-18-landing-composition.md) records commands, viewport measurements, browser results, screenshots, and limitations. Earlier landing audits are historical and describe their respective builds.

Player follow-up: the user requested removing the bottom controls and Transcript row. The current player has no toolbar; only a play/pause overlay appears on hover, focus, or while paused. See the [minimal player audit](../audits/2026-10-18-minimal-intro.md).

Earlier refinement (superseded by the reference balance below): reduced the hero to 84px desktop with tighter vertical spacing so the product starts within the first 550px at 1440px width. Desktop product frames preserve the full 8:5 screenshot rather than trimming the bottom. Softer borders, a shorter caption area, concise flow descriptions, fewer repeated Brain benefits, and tighter mobile section spacing improve reading rhythm. The simplified intro and single app-entry action are retained. See the [refinement audit](../audits/2026-10-18-landing-refinement.md).

Typography follow-up: landing-only text tokens now deepen secondary and metadata text in light mode and brighten them in dark mode. Display text uses weight 700; section headings use 600; body descriptions use 16px minimum (hero 18px desktop/16px mobile). Normal body tracking replaces the inherited compressed app tracking. Small captions stay at least 12px, and Iris accents retain their existing colors. This does not change global application text tokens or encoded media. See the [typography audit](../audits/2026-10-18-landing-typography.md).

## User-reference balance

The five supplied Notion screenshots establish the intended relationship between dominant hero type, smaller regular-weight supporting text, large left-aligned section headings, product media, and a spacious footer. This supersedes the earlier compact type scale while retaining the stronger contrast profiles.

Current wide-screen scale: hero up to 112px/700; section headings up to 56px/700; primary feature heading up to 36px/600; other feature headings 24px/600; supporting body 17-20px/400. Mobile retains 16px reading text with appropriately smaller headings. The introductory label is removed and hero supporting copy is one concise sentence. Section headings and descriptions share a two-column grid, stacked on mobile. Footer branding has more presence and links remain limited to existing sections.

No competitor artwork, company marks, capabilities, pricing, testimonials, or repeated app-entry CTAs are added. The compact inline intro and dark-mode text profiles remain. Responsive optional line breaks include actual word spacing, preserving readable mobile headings. Verification includes 320/390/768/1440/1920px widths in both themes. See the [reference-balance audit](../audits/2026-10-18-landing-reference-balance.md).

Earlier intro playback (superseded by the recorded workflow below): the 34-second composed tour played at 1.7x. The current film is a 20-second edit of real browser actions at 1x. It prepares within 480px of the viewport and has no icon while playing, including hover and keyboard focus. Click/tap and keyboard pause/resume remain; only paused/ended states show centered Play/Replay.

Redundant UI cleanup: removed the intro's duplicated visible heading and duration/sound caption, along with the decorative product-preview tagline. Functional preview tabs, example-workspace labels, accessible film heading/text equivalent and recovery controls remain. Removed their unused CSS and stale ARIA description references.


## Recorded workflow and connected examples

The current landing replaces the screenshot slideshow with an actual browser recording: one task moves through Inbox, a linked Planner block and a running Focus timer. Four theme/device variants are edited to 20 seconds at 1x, each MP4 below 800 KB. Screen-reader descriptions follow these actual actions. The player keeps its clean surface, reduced-motion poster, keyboard controls, theme continuity and failure recovery.

The Brain examples now contain a case-study outline, design decisions and a next writing session. The lower section shows a focused editor crop and a clearly labeled, static illustration of the same Portfolio refresh project linked to its goal and two task states. It replaces the generic feature list and abstract connection strip. These are example records, not personal data or new app functionality. Desktop and portrait editor frames preserve all horizontal content. The existing single Open KRAMA entry and hero remain.

See the [workflow refinement audit](../audits/2026-10-18-landing-workflow-refinement.md) and [reproducible media instructions](../../scripts/media/README.md). This supersedes the earlier 34-second source / 1.7x player approach.


## Changing headline topics

The headline now reads ?Make room for? with a single Iris-tinted capsule cycling through **focus ? planning ? habits**. Timer, calendar and repeat icons identify the existing product areas. The typography and capsule take inspiration from the user's Notion reference while preserving KRAMA's colors and existing page structure. The sentence remains grammatical for all three topics.

`landing/HeroTopic.tsx` owns this small interaction independently of the rest of the page. Topics hold for 3.2 seconds, with a 260ms incoming and 150ms outgoing opacity/vertical transition. A hidden size reference reserves the longest word's space, so the headline and product preview do not shift. The capsule is itself a keyboard-accessible pause/resume control, with no separate toolbar. Offscreen or hidden-page rotation stops and timers/observers are cleaned up on unmount.

The heading keeps a stable accessible name, ?Make room for focus, planning and habits.? Changing visual words are hidden from repeated screen-reader announcements. Reduced motion disables automatic cycling and animation; the capsule then lets the user step through topics manually. Light and dark themes use the existing accent-subtle, accent-fg and text-primary tokens. No new dependency or product feature is introduced.

Verification and screenshots: `.audit/hero-topics/`; production acceptance includes two additional headline journeys per browser engine, alongside the existing landing suite.


Topic capsule color follow-up: following the user's correction, **only the capsule background changes** between Iris blue, violet and jade pastels. All topic words remain pure black (`#000`) in both light and dark mode; icons retain the original Iris blue. Opaque pastel backgrounds are mixed from KRAMA's existing feature colors and white, keeping black text readable in dark mode as well. The existing timing, pause control, layout and reduced-motion behavior remain.
