# Planner layout repair — 16 October 2026

The reported layout problem was reproduced with a separate local browser and synthetic API data. At 320 × 568, the fixed-height page and stacked capacity cards left no usable height for the weekly matrix. The monthly calendar similarly collapsed while its summary cards occupied the remaining area. Independently wrapping header groups also produced crowded rows.

The repair preserves the existing desktop composition, actions and scheduling handlers:

- A scoped Planner stylesheet adapts to the width available inside the app shell.
- The header uses deliberate rows on narrow containers and retains its wide desktop arrangement. Active view buttons expose their selected state.
- Narrow and short layouts scroll vertically instead of clipping the planning area. Weekly and monthly grids retain a usable minimum height.
- Existing capacity cards scroll in one horizontal row on phones; their values and Edit action are retained.
- The weekly matrix has one scrolling region, keeping its sticky day headers and category labels aligned.
- Weekly task titles have their own column width; the existing edit/delete controls sit below them rather than squeezing text into a few characters.
- Month summaries follow the calendar on narrow containers. The desktop calendar keeps its summary column; its main column can shrink without overflowing in a short window.

No backend, scheduling, task mutation, date navigation or Focus launch behavior was changed.

Verification evidence is recorded in `.audit/planner-layout-results.json` and `.audit/planner-regression-results.json`. Layout cases assert non-collapsed grids, viewport bounds, last-day reachability, summary reachability and absence of browser runtime errors. Preview images are `.audit/planner-desktop.png`, `.audit/planner-mobile.png` and `.audit/planner-month-mobile.png`.

The full layout matrix passed 72/72 cases: all three views in light/dark themes, Chromium at 320/390/768/1024/1440px and a short 1440 × 568 window; Firefox and WebKit at 390/1440px including the short window. After the final task-row adjustment, 24/24 targeted production-bundle week checks passed across the same engines and also enforce at least 80px of usable task-title width; their report is `.audit/planner-final-layout-results.json`.

All 24 existing Planner/Focus workflow checks passed against the final rebuilt frontend, including date navigation/history, time-block validation, capacity settings, keyboard milestone/task actions, task details, separate Focus tabs, failed task loading and timer recovery. The verification runs had zero skips, retries or flaky results. These workflow checks use synthetic API responses.

Frontend TypeScript, lint and Vite production compilation passed. The running overnight Focus production stack was left untouched. Browser fixtures do not represent physical-device testing or a new deployment of that stack.
