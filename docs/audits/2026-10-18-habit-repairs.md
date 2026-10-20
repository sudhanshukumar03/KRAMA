# Habit date and visibility repairs — 18 October 2026

Completed the three requested changes: remove Today's Tracker, prevent invalid historical checkmarks on new habits, and make the completion history visible in light mode.

## Behavior

- Habits no longer renders Today's Tracker, its completion gauge, secondary habit list, toggle, or saved-open-state logic. The main cards retain completion, undo, edit, delete, Planner pinning and time-of-day filters. Unused tracker components and rail styles were removed.
- A completion day must fall between the habit's creation day and today, inclusive. Both dates use the user's configured timezone, with the existing country/default resolution used by habit streaks. Valid backfill remains available for older habits.
- Planner receives an unavailable reason for pre-creation and future occurrences, disables their unchecked controls and explains why. The mutation also checks that reason.
- The authoritative habit service rejects those dates before inserting a completion. Its existing controller maps the Invalid completion date error to HTTP 400, so other entry points and direct requests cannot bypass the Planner restriction.
- Previously recorded invalid completions remain removable. Undo is intentionally allowed without applying the new log restriction; this repair does not silently rewrite historical records.
- The 13-week history has visible inactive-cell borders, separate no-log fills, green completed cells, an accessible summary and a compact legend. Earlier days before creation remain inactive, rather than becoming missed days. Today is not marked missed while the day is still in progress.

Source: [date policy](../../apps/server/src/services/habitCompletionDate.ts), [authoritative completion guard](../../apps/server/src/services/habit.service.ts), [Planner eligibility](../../apps/server/src/services/planner.service.ts), [Planner controls](../../apps/web/src/components/planner/PlannerMatrix.tsx), [Habits page](../../apps/web/src/components/HabitTracker.tsx), [history rendering](../../apps/web/src/components/habits/HabitCards.tsx).

## Verification

| Check | Result |
| --- | --- |
| Shared type package build | Passed |
| Frontend and backend TypeScript | Passed |
| Frontend and backend Oxlint | Passed |
| Production frontend build | Passed |
| Focused backend tests | 26 passed: service write guard, timezone boundaries, valid historical backfill, today, future dates, invalid legacy undo, Planner availability, and existing streak/schedule behavior |
| Production browser checks | 12 passed across Chromium, Firefox and WebKit |
| Responsive theme samples | 24: four widths (320/390/768/1440) × two themes × three engines |
| Cell boundary contrast | At least 3.35:1 in light mode and 3.45:1 in dark mode across the sampled states |
| Browser date interactions | Disabled pre-creation/future controls, enabled creation-day completion, successful dated write, invalid legacy undo and subsequent disabled state |
| Existing habit browser regressions | 8 passed, including rest days, legacy extra-log undo, goals outage/retry, midnight writes, automatic midnight history refresh, keyboard target size and UTC+14 weekly counts |

Browser records and API writes were synthetic. Backend tests executed the shipped services with mocked database IO. No personal records were changed, and no physical-device or live-database lifecycle suite is claimed.

One initial regression assertion referenced the removed Tracker's date label. It was replaced with stronger assertions on the retained history grid: today's cell changes to yesterday/missed and a new not-logged day appears after midnight. The completion-control accessibility test now checks the retained card action. The final eight-case rerun is the result reported above.

```powershell
corepack pnpm --filter @krama/types build
corepack pnpm --filter client exec tsc --noEmit -p tsconfig.app.json
corepack pnpm --filter server exec tsc --noEmit
corepack pnpm --filter client exec oxlint src
corepack pnpm --filter server exec oxlint src
corepack pnpm --filter client exec vite build
corepack pnpm --filter server exec tsx --test --test-concurrency=1 src/__tests__/habit_completion_date.test.ts src/__tests__/planner_workflow.test.ts src/__tests__/habit_streak_timezone.test.ts
corepack pnpm exec playwright test --config .audit/habit-repairs.config.ts
corepack pnpm exec playwright test --config .audit/habit-regressions.config.ts
```

[Production browser results](../../.audit/habit-repairs-results.json), [existing regression results](../../.audit/habit-regressions-results.json), [light desktop screenshot](../../.audit/habit-repair-light-1440.png), [dark mobile screenshot](../../.audit/habit-repair-dark-390.png).

Ports 5173, 3000 and 4800 were not serving the user's app during this session. Browser checks started their own temporary production preview and frontend test servers; deployment was not performed.

## Follow-up: real creation-to-Planner verification

The repeated report was checked again against the source, then against a running API. The date guard was already present. Docker and the local app were stopped; they were started, and the current frontend and backend now serve ports 5173 and 3000.

Two additional Chromium journeys passed using the real backend and database, without intercepting Planner or Habit responses: create a daily habit today and create a weekly habit today. Each journey verifies that the server marks earlier days unavailable, a direct attempt to log yesterday returns HTTP 400 without adding a completion, earlier Planner controls are disabled, and today's completion and undo persist correctly.

These checks use the separate `krama_habit_date_test` database, Redis database 14 and a temporary API on port 3019. The existing integration fixture removes its own synthetic users, workspaces and jobs. The temporary API was stopped afterward; the user's ordinary app remains running. No user habit records were modified.

[Live regression source](../../e2e/live/habit-creation-date-live.spec.ts), [live results — 2 passed](../../.audit/habit-creation-live-results.json).

```powershell
node .audit/habit-creation-live.cjs Prepare
# In a separate terminal, while the test runs:
node .audit/habit-creation-live.cjs Server
node .audit/habit-creation-live.cjs Test
```

The earlier mocked browser checks remain useful for cross-browser rendering, but these additional journeys specifically verify eligibility flags generated by the actual Planner service rather than supplying them in a browser fixture.
