# Inline scroll-playing intro - 18 October 2026

Replaced the click-to-open introduction with a film embedded directly in the landing page after the product previews. Removed both Watch intro buttons, the dialog, its imperative open handle, body scroll lock and close controls. The single Open KRAMA entry remains in the header.

## Behavior

- Playback starts silently when the film enters view; no click is required. It uses muted, inline video and never moves keyboard focus or scrolls the page automatically.
- Media preparation is deferred until the film is within 240px of the viewport. Automatic playback requires 20% visibility, excluding the sticky header area.
- Scrolling away or hiding the tab pauses playback. Returning resumes an unfinished film unless the person explicitly paused it. Finished films offer Replay rather than restarting on every scroll.
- Reduced-motion preferences show a poster and manual Play. Changing the preference while playing stops automatic playback. An autoplay policy rejection offers manual Play without repeatedly retrying on scroll.
- Existing seek, captions, fullscreen, transcript, MP4/WebM fallback and retry controls remain available inline. Opening the transcript pauses the film. Route unmount releases its media source.
- Existing KRAMA light/dark tokens, encoded films and responsive portrait/landscape variants remain in use. No dependency or external video service was added.

The interaction uses the Motion Lexicon Implement workflow: one primary actor (video), with playback state and progress as supporting actors. The event is viewport entry, and the state sequence is deferred → prepared → playing ↔ paused → ended, with failure → retry. Registry components: none; native HTML media controls are adapted to the existing React page. The [current design plan](../design/landing-intro-film.md) records the complete behavior.

## Validation

| Check | Observed result |
| --- | --- |
| Production frontend build | Passed |
| Targeted lint and browser/config TypeScript | Passed, no lint warnings |
| Final production browser suite | **39 passed, six skipped, zero failures/flaky tests**, 45 cases, one worker, no retries, approximately 2.1 minutes |
| Actual media in Chromium and Firefox | Scroll entry without click, advancing time and decoded frames, muted/inline attributes, offscreen pause, resume, manual-pause persistence, end/replay, real caption cues and MIME, keyboard seeking, source failure/retry and WebM fallback |
| Motion preferences and browser policy | Reduced-motion poster/manual play, live preference change, hidden-tab pause/resume, rejected autoplay followed by keyboard Play |
| Responsive player | 320×900, 375×812, 390×900, 768×900, 1440×900 and 844×390; both themes, all three engines; **36 states**, no horizontal overflow and no targets under 44×44px |
| Existing landing | All 21 prior page journeys passed, including the single entry, login/signup, signed-in resume, preview recovery, contrast and keyboard navigation |
| Visual review | Light desktop, dark mobile and dark landscape captures inspected |
| Running localhost | Root and both updated modules return HTTP 200; Watch intro prompts are absent |

The first expanded run exposed a real short-landscape issue: focusing Play could scroll the control while leaving the cached observer visibility insufficient, so manual Play did nothing. Manual actions now check current geometry; short screens also constrain video height. The targeted Chromium/Firefox rerun and final full suite passed with the assertions retained. A Firefox test also used the Chromium-only JavaScript `playsInline` property; it now verifies the actual `playsinline` attribute.

Windows WebKit does not fetch/decode these movies. Its layout, reduced-motion interface, fullscreen outcome, cleanup and landing checks run; six actual-media tests are explicitly skipped. These results do not establish Safari video playback, which still needs macOS or iOS.

## Files and repeatability

- `apps/web/src/components/landing/IntroVideo.tsx`, `apps/web/src/styles/landing-film.css`: inline player and responsive presentation.
- `apps/web/src/components/LandingPage.tsx`: section placement and removal of dialog triggers.
- `e2e/mocked/landing-film.spec.ts`, `landing-page.spec.ts`: scroll playback and existing page regressions.
- Run `corepack pnpm test:landing` to rebuild and repeat the suite.
- Local evidence: `test-results/landing-results.json`, `.audit/landing-film/measurements/inline-*.json`, `.audit/landing-film/screenshots/inline-*.png`.

The [original film audit](2026-10-18-landing-intro-film.md) preserves encoding and historical dialog verification. The encoded media itself was not changed in this update.

## Compact player follow-up

The user found the player and its footer too large. Capped the film section at 960px, reduced section spacing, trimmed the playback bar, and shortened the transcript disclosure to a 44px row. Phones now use one playback-control row rather than two; the slider still announces the full duration even when the visual time display shows only elapsed time. Interactive targets remain at least 44px.

Production build and targeted lint passed. The affected cross-browser checks were rerun with `--grep 'inline player fits|scroll starts|keyboard seeking|fullscreen has'`: **10 passed, two known Windows WebKit media skips, zero failures**, approximately 1.3 minutes. Layout checks cover 36 theme/viewport states. Compact mobile dark and desktop light captures were visually inspected. The full 39-pass result above belongs to the preceding inline implementation; this size-only follow-up used the targeted suite.
