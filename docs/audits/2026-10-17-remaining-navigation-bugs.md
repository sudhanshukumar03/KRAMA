# Additional search and navigation bugs — 17 October 2026

**Resolved:** All findings below were corrected on 17 October 2026. See [the fix and verification report](2026-10-17-remaining-fixes.md). The original diagnostic evidence is retained below as a historical record.

Four more issues were reproduced in Chromium with synthetic API data. These are additional to the seven findings originally tracked in [the preceding review](2026-10-17-leftover-bugs.md), bringing the original findings to eleven. This is a targeted review and does not establish that every possible remaining bug has been found.

No product code or personal workspace records were changed.

| Priority | Issue | Observed behavior | Source |
| --- | --- | --- | --- |
| Medium | Global search displays results for an older query | Type one query, then another while the first request is delayed. The newer results appear, but the delayed first response replaces them even though the input still contains the newer query. Selecting a result can therefore open an item unrelated to the current search. | `apps/web/src/components/CommandPalette.tsx:93`–`:125`: requests are not cancelled or checked against the latest query before updating state. |
| Medium | Global search disguises a service failure as no matches | Return HTTP 503 from the search endpoint. The palette displays “No matching results found…” rather than an error, with no retry control. Users cannot distinguish unavailable search from genuinely absent content. | `apps/web/src/components/CommandPalette.tsx:103`–`:106`, `:180`: the catch branch clears results and rendering uses the ordinary empty state. |
| Medium | Global search allows keyboard focus behind its overlay | Open the palette and press Shift+Tab from its input. Focus moves outside the search surface while its overlay remains visible. Keyboard users can interact with background controls without first closing search. | `apps/web/src/components/CommandPalette.tsx:148`: uses the plain Command root without a modal focus trap or equivalent keyboard containment. |
| Medium | Goal drawer ignores browser Back | Open a goal from the Goals list, then use browser Back. The URL returns to `/app/goals`, but the Goal details drawer stays open. URL history and the visible page disagree. | `apps/web/src/components/Goals.tsx:70` returns when the `goal` parameter disappears, leaving `detailGoal` populated; rendering at `:628` keeps the drawer mounted. |

## Reproduction evidence

- **4/4 diagnostic checks reproduced the behavior** in Chromium in 10.0 seconds.
- `.audit/remaining-navigation-review.spec.ts` contains the probes.
- `.audit/remaining-navigation-review.config.ts` contains the configuration.
- `.audit/remaining-navigation-review-results.json` contains the final results.
- Passing diagnostic probes mean the defects were reproduced, not that the behavior is correct.

The earlier review also tracked these seven issues: a save conflict after moving a Brain document; stale habit dates across midnight; imports going to the wrong space; lifecycle changes removing the Inbox marker; Projects/Habits hiding healthy data during related service failures; inaccessible small Today habit buttons; and notification overflow in very short windows.
