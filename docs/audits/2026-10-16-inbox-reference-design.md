# Inbox reference design — 16 October 2026

Implemented the user-supplied dark Inbox composition using the existing Krama palette. The theme tokens remain unchanged: obsidian surfaces, slate/silver text and iris accents. Light mode uses the existing light tokens.

The page has a larger heading and capture action, a spacious empty-state panel, a token-coloured SVG paper tray, and four chips opening the existing Task, Idea, Link and Note capture modes. The populated Inbox retains its mixed list, filing, scheduling and detail actions. No new capture type, backend/API or billing feature was introduced.

The shared sidebar keeps its 260/280px width, navigation groups and routes. It has more deliberate spacing, an iris selected state, and the existing settings/profile controls in a footer showing the current person's name and workspace. Notifications, search, workspace switching and collapse remain available. The existing AI launcher has a matching iris outline. Styles are scoped to their components.

Keyboard checks exposed an existing nested Escape issue on phones. Closing Settings now retains the navigation dialog and restores focus to the Settings button; the next Escape can close navigation.

Verification:

- Frontend TypeScript, lint and Vite production compilation passed.
- 51/51 targeted checks passed across Chromium, Firefox and WebKit, including empty/populated states, 320–1586px screens, both themes, capture-mode selection, dialog focus return, settings/collapse, 44px Inbox targets, sampled text contrast, long content and recoverable errors.
- 8/8 empty-state and sidebar checks passed against the final production bundle in Chromium.
- 36/36 production-bundle Planner layout checks passed after the shared sidebar changes: week/month/day, light/dark, 320/390/768/1024/1440px and short laptop windows. Grids retained their height, title width and scrolling; the last day and month summaries remained reachable.
- 127/127 production-compatible mocked workflow cases passed across capture, drafts, Brain, goals, projects, Planner, settings and Focus. The first run also attempted one development-only source-module probe, which failed because a production build does not serve `/src/lib/habitFilters.ts`. That probe then passed with Vite (1/1); the production regression configuration now excludes it and the separate development-helper report records its result. No habit application code was changed.

Reports: `.audit/inbox-reference-results.json`, `.audit/inbox-reference-production-results.json`, `.audit/inbox-reference-regression-results.json` and `.audit/inbox-reference-planner-results.json`.

The regression JSON preserves the initial 127 passes plus that source-import harness failure. The separate passing helper evidence is `.audit/inbox-reference-dev-helper-results.json`.

Production-bundle preview screenshots: `.audit/inbox-reference-dark.png`, `.audit/inbox-reference-light.png` and `.audit/inbox-reference-mobile.png`.

These browser runs use synthetic API fixtures. The active overnight Focus stack remains on its earlier production build and was not restarted or updated by this task. The source/build changes are not yet deployed to that container.
