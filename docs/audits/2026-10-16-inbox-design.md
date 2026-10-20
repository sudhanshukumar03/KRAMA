# Inbox visual redesign — 16 October 2026

Scope: the personal Inbox. Keep its mixed task, idea, note and link capture workflow and all existing actions.

Changed `apps/web/src/components/Inbox.tsx` and added scoped `apps/web/src/styles/inbox.css`. The page now has a clear capture action, one continuous list, content-type icons, consistent action placement, and matching empty/loading/error states. Responsive container rules move actions under titles on narrow screens. Existing theme tokens, queries, sorting, mutation payloads and destinations are retained. No backend changes or extra features.

Design references: [Apple Reminders](https://support.apple.com/en-gb/119953) for personal-list hierarchy and [Linear Inbox](https://linear.app/docs/inbox) for row alignment. These informed visual composition; Krama's own content types, actions and theme remain.

Verification:

- Frontend TypeScript and lint passed.
- 14/14 existing personal-workspace regression checks passed in Chromium, including mixed capture content, draft recovery, Inbox filing, scheduling today, exact-task Focus tabs, day review and mobile layouts. Evidence: `.audit/inbox-personal-regression-results.json`.
- 27/27 targeted browser checks passed, zero retries/skips: Chromium, Firefox and WebKit; 320, 390, 768 and 1440px; light/dark themes; no horizontal overflow; minimum 44px controls; keyboard capture/Escape/focus return; long titles; empty/loading/error and retry.
- The sampled normal-state text contrast is at least 4.999:1. Initial light-mode Do today text measured 4.457:1; its theme-based ink was darkened before the final clean run.
- Browser tests use synthetic API fixtures, not a production deployment or physical phones. WebKit is an engine check, not a Safari device check.

Evidence: `.audit/inbox-results.json`, `.audit/inbox-visual.spec.ts`, `.audit/inbox-desktop.png` and `.audit/inbox-mobile.png`.

The production overnight Focus stack and its open tab were left running on the earlier build. Previous production-suite results are not evidence for this new visual revision.
