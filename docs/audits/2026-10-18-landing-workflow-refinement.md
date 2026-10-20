# Landing workflow refinement — 18 October 2026

The demonstration now shows real actions rather than changing screenshots. One example task is captured, scheduled into a linked Planner block and started in its own Focus tab. The lower page follows the same portfolio project with substantive Brain notes and a goal/project/task illustration. Personal-workspace language, KRAMA tokens, the dominant hero and the single persistent Open KRAMA entry remain.

## Host inspection

| Concern | Observed host evidence |
| --- | --- |
| Framework | React 19.2.7, TypeScript, Vite 8.1.6 — `apps/web/package.json` |
| Route | `/`, existing `LandingPage` route — `apps/web/src/App.tsx` |
| Components | Existing `LandingPage`, `IntroVideo`, React Router and Lucide — `apps/web/src/components/LandingPage.tsx`, `apps/web/src/components/landing/IntroVideo.tsx` |
| Tokens/theme | Inter, Iris/Slate/Obsidian variables and theme hook — `apps/web/src/styles/theme.css`, `apps/web/src/lib/theme.ts`, `apps/web/src/styles/landing.css` |
| Tailwind | Tailwind 4.3.3 and Vite integration installed — `apps/web/package.json`, `apps/web/vite.config.ts` |
| Dependencies | Existing React, Router 7.18.1 and Lucide; no new frontend dependency — `apps/web/package.json` |

## Page plan

Job: make the capture-to-focused-work flow understandable through the actual product. Archetype: calm product page with alternating context/examples. Primary action: existing Open KRAMA app entry. Primary state: public page → app entry → login or authenticated workspace. Primary motion: deferred → visible muted playback → offscreen/manual pause → replay or failure/retry.

| Region | Product purpose | Published component | State or motion |
| --- | --- | --- | --- |
| Header/hero | Explain KRAMA and expose one app entry | none | Existing sticky navigation and mobile disclosure |
| Product preview | Inspect Today/Planner/Brain/Focus | none | Keyboard tab selection, image loading, error/retry |
| Workflow/film | Demonstrate one task reaching Focus | none | Real capture/plan/start recording, deferred native playback |
| Notes/project context | Explain the thinking and goal behind daily work | none | Static real Brain crop and labeled example relationship |
| Questions/footer | Answer existing product questions | none | Native keyboard disclosures and section navigation |

Registry: none. Native semantic UI and the existing player are appropriate; no registry code, dependency or new runtime engine is installed.

Responsive: 320/390 stack content and select portrait sources; 768 uses tablet/desktop media as its actual CSS viewport permits; 1440 uses alternating columns and 16:9 film. Light/dark select matching screenshots, posters and recordings. Reduced motion leaves a static poster with manual playback, while preview transitions are disabled. Keyboard order, focus visibility and pause/retry behavior are retained.

## Implementation

- `LandingPage.tsx` and `landing.css`: richer Brain editor crop; a clearly labeled static example of a goal, the Portfolio refresh project, two task states and its linked note. Remove the old generic feature list and abstract connection strip. Preserve complete horizontal image content; portrait figures reserve their full source ratio.
- `IntroVideo.tsx`: use an actual 20-second edit at 1x and a description of the recorded task. Keep the established autoplay, manual pause, offscreen/background pause, reduced-motion, retry, theme-state preservation and cleanup logic.
- `scripts/media/example-workspace.ts`, `capture.spec.ts`, `capture.config.ts`: reproducible synthetic workspace and browser recording. All application API traffic is intercepted. Assertions verify creation, Do today, time-block/task association, separate Focus tab and a ticking timer.
- `build-intro.py`: replace Pillow screenshot composition with FFmpeg edits of the actual browser recordings. Three chapters last 7/7/6 seconds. Both themes and two shapes have H.264 Baseline/YUV420P MP4, VP8 WebM, posters and text descriptions. Each MP4 is below 800 KB.
- Example notes include an opening paragraph, decisions to explain, a three-item outline and the next writing session. The short “Case study notes” title fits the phone input. The app controls and data model are unchanged.
- Landing tests include the lower responsive image, illustration content and contrast. The responsive asset check waits for the selected theme/device source to finish loading, accounting for WebKit picture-source switches.
- Root TypeScript includes the media tooling. No production server or application workflow logic changes.

## Verification

Final acceptance results are appended below after the final build. The first complete run passed 44 checks with 7 explicit Windows WebKit media skips. A subsequent check of lazy lower images exposed a decode/source-switch timing race in the added test; the source-completion assertion addresses that condition. The video itself played in Chromium/Firefox. A low 384 MB Node limit caused the standalone TypeScript command to run out of heap; rerunning with 768 MB passed.

Evidence: `.audit/workflow-film/` holds raw capture intervals, contact sheets and encoding hashes. `.audit/landing/screenshots/` holds theme/viewport and individual context sections. `test-results/landing-results.json` holds the production browser report. Earlier audits describe earlier builds, not this revision.


## Final acceptance

`corepack pnpm test:landing` exits 0: fresh production build, **44 passed, 7 explicitly skipped**, no failures. The seven skips are Windows WebKit movie-playback cases; real Safari and physical devices are not claimed. Chromium and Firefox exercise the actual media. `corepack pnpm --filter client run lint`, `corepack pnpm exec tsc --noEmit` and Python compile validation exit 0. Both capture tests pass, and the final clean screenshot refresh passes. All eight MP4/WebM files decode fully with FFmpeg `-xerror`, exit 0 with empty error output.

| Check | Observed evidence |
| --- | --- |
| Build | `corepack pnpm test:landing`, fresh Vite production build, exit 0 |
| 320 | Chromium/Firefox viewport/document 320/320; WebKit CSS viewport/document 314/314 due to scrollbar. Minimum target 44x44; 0 offenders in both themes |
| 390 | Chromium/Firefox 390/390; WebKit 384/384. Minimum target 44x44; 0 offenders |
| 768 | Chromium/Firefox 768/768; WebKit 762/762. Minimum target 44x44; 0 offenders |
| 1440 | Chromium/Firefox 1440/1440; WebKit 1434/1434. Minimum target 44x44; 0 offenders |
| Light/dark | Explicit theme switch, reload persistence and emulated system appearance tested; matching images, posters and movies inspected. Sampled non-accent text contrast at least 7.30:1 light / 8.75:1 dark; actions/accents at least 5.00:1 / 6.32:1 |
| Keyboard/focus | Tab to preview, arrows/Home/End; Enter/Space FAQ; mobile menu Enter then Escape returns trigger focus; skip link focuses main; film Space pauses, Enter resumes/replays; retry returns film-control focus |
| Reduced motion | Emulated reduce: poster/manual Play, no autoplay source fetch; preview animation disabled. Changing preference during playback pauses |
| Targets | 44x44 minimum at all five page widths and all film viewport/orientation checks; no offenders |
| Primary state | One public/authenticated app entry; preview loading/failure/retry/selection interruption; movie lazy load, autoplay denial/manual Play, explicit pause/replay, background/offscreen pause, source failure/WebM fallback, theme continuity and unmount cleanup |
| Runtime | Zero unexpected console/page or HTTP failures across the page geometry runs in all three engines. React SPA, no hydration phase |

Additional width 1920 and film sizes 375 and 844x390 are covered. Each of the three engines has ten page theme/viewport observations. Final measured playback is 20 seconds at 1x (Chromium about 1.000x, Firefox about 0.994x). The native lower project example is explicitly labeled and has no fake interactive controls.

Visual proof: `knowledge-1440-light.png`, `knowledge-390-dark.png`, `project-1440-dark.png`, `project-390-light.png` under `.audit/landing/screenshots/`; the full theme/width pages and playing-video screenshot are also retained. Reviewed the four movie contact sheets and clean editor screenshots; corrected the original desktop crop and shortened the example title to avoid phone truncation.
