# Krama workspace redesign — 17 October 2026

The workspace now uses a coherent design system across Dashboard, Inbox, Tasks, Planner, Goals, Projects and project details, Habits, Brain, and Focus. The implementation preserves Krama's Iris palette, existing Inbox illustration, routes, records, and separate-tab Focus flow.

## Review

- [Design direction and existing product flow](../design/workspace-redesign.md)
- [Screenshot gallery: ten screens, light/dark desktop and mobile](../../.audit/redesign/review.html)
- [Verification summary with per-case provenance](../../.audit/redesign/verification-summary.json)
- [Frontend files changed against the task-start snapshot](../../.audit/redesign/changed-files.json)
- [Final source hashes](../../.audit/redesign/final-hashes.json)

The task-start snapshot includes the user's earlier fixes. It is the comparison baseline for this redesign, rather than the repository's older Git HEAD. Existing unrelated working changes were preserved.

## Resulting design and flow

| Area | Implemented result |
| --- | --- |
| Shared workspace | Plain headings, consistent page gutters, readable supporting text, 248px navigation rail, quieter panels, shared search field and control geometry |
| Themes | Existing blue identity retained; dark surfaces differentiated; muted and semantic foregrounds adjusted for readable text |
| Dashboard | Today's next Focus task precedes the longer planning list; Start Focus is the primary action and completion remains available |
| Inbox | Reference-led illustration and capture/triage purpose preserved, with aligned heading and actions |
| Tasks | Shared header and search, clear existing view/filter actions, consistent create controls |
| Planner | Compact capacity summary, clearer date/view controls, contained calendar working surface |
| Goals | Quiet four-part summary, accurate labels, accessible focus-goal control and selected pillar states |
| Projects | Consistent Project terminology, scannable progress and status, quieter card interactions |
| Habits | Full routine names, clear completion and saving feedback, supporting tracker placement, no missed-day marking before creation |
| Brain | Library/editor switches based on available workspace width, wrapping actions, readable document column, usable narrow-screen creation dialog |
| Focus | Existing dedicated-tab timer, layouts, saved settings and recovery preserved; controls align with the shared interaction sizes |
| Overlays | Theme-aware toasts, contained close controls, scrolling form bodies with visible footers, modal focus entry/trapping/return, unobstructed forms |

## Verification

The final source passed TypeScript, Oxlint, Vite production build, and whitespace checks:

```powershell
corepack pnpm --filter client exec tsc --noEmit -p tsconfig.app.json
corepack pnpm --filter client exec oxlint src
corepack pnpm --filter client exec vite build
git -c core.safecrlf=false diff --check -- apps/web/src docs/design/workspace-redesign.md
```

Browser verification used isolated synthetic records, so user records were not changed. The UI suite ran against the built production assets through Vite preview on port 4188. Chromium, Firefox and WebKit were checked on Windows; WebKit is engine coverage, not a claim of physical Safari/iPhone testing.

| Coverage | Verified result |
| --- | --- |
| Existing unit and mocked Chromium regression cases | 198 unique cases verified: 194 passed in the broad run and four passed in targeted rechecks |
| Production UI cases | 90 unique cases verified across Chromium, Firefox and WebKit, combining the broad run and explicit correction runs |
| Ten screen layouts | 240 samples: 10 screens × 3 engines × 4 widths × 2 themes |
| Widths/themes | 320, 390, 768, 1440px; light and dark |
| Layout measurements | Zero page overflow, title/icon overlap, or visible control targets below the 44px threshold in the sampled screens |
| Sampled runtime/network | Zero page/React errors and unexpected request failures in the 30 layout reports; intentionally blocked Socket.IO traffic recorded separately |
| Dialogs | Nine dialog types in each engine; four widths each, viewport bounds, internal overflow, Tab containment, Escape and opener focus return |
| Empty states | Eight workspace screens checked at 390px in all three engines |
| Text palette | 26 foreground/background token comparisons; minimum 5.00:1 in light mode and 5.54:1 in dark mode |
| Local availability | Frontend `http://127.0.0.1:5173` and API `/ready` on port 3000 returned HTTP 200 |

These totals describe unique verified cases across runs, **not a single uninterrupted all-green run on the final source**. The reports retain the original failures and identify the later passing rechecks. No full live backend or external-provider suite is included in these totals.

### Findings corrected during verification

- WebKit did not consistently focus clicked dialog openers. The affected actions now establish opener focus before opening their dialogs, allowing reliable return on dismissal.
- Habit form contents overflowed narrow WebKit layouts. The flexible name field can now shrink, and the form owns its scrolling body while the footer stays visible.
- The workspace menu extended outside narrow viewports. Its placement is now bounded and its options support arrow, Home and End keys.
- Escape from the workspace menu reached the app shortcut and toggled Focus mode. Menu dismissal now consumes Escape and restores its trigger.
- A collapsed sidebar was visually hidden but retained interactive descendants. Its collapsed container is now inert and hidden from the accessibility tree. The final checks verify these attributes and the accessible notification control.
- Brain's Firefox audit waited indefinitely for a paused animation. The screenshot harness now disables animations instead of waiting for every animation's completion promise.
- Older regression selectors used superseded visible labels and search input roles. They were updated to the implemented labels and semantic roles while retaining behavioral assertions. Wallpaper screenshot capture disables animations and has a bounded capture timeout.

### Reproduction and evidence

```powershell
corepack pnpm exec playwright test --config .audit/redesign/regression.config.ts
corepack pnpm exec playwright test --config .audit/redesign/recheck.config.ts
corepack pnpm exec playwright test --config .audit/redesign/production-ui.config.ts
corepack pnpm exec playwright test --config .audit/redesign/acceptance.config.ts
corepack pnpm exec playwright test --config .audit/redesign/acceptance-final.config.ts
python .audit/redesign/summarize.py
```

The production assets must be rebuilt before running the production configurations. Browser tests used one worker and bounded Node memory. The final targeted run passed **6/6**: Habit dialog and workspace/notification popovers in each engine, after the last source correction. Its checks include workspace-menu arrow navigation, dismissal without app Focus-mode activation, collapsed navigation semantics, viewport bounds and focus return.

Source reports: [regression](../../.audit/redesign/regression-results.json), [regression rechecks](../../.audit/redesign/recheck-results.json), [production UI](../../.audit/redesign/production-ui-results.json), [first correction run](../../.audit/redesign/acceptance-results.json), [final six checks](../../.audit/redesign/acceptance-final-results.json), [palette measurements](../../.audit/redesign/palette-results.json).

Physical devices, assistive-technology usability, real overnight sleep/wake, live provider credentials, production containers and hosted deployment were not revalidated as part of this redesign. A subjective 9.5/10 aesthetic score is not an objective acceptance result; the implementation and review evidence above are the deliverables.
