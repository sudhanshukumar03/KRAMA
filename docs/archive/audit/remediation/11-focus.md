# Focus sessions and timer layouts

Focus introduced a dedicated `/focus` page with manual timers and planner-derived sessions. It reused the existing authentication, session models, preferences and socket infrastructure. The initial feature and the connected-flow review are recorded here.

## Modes and scheduling

Manual mode supported focus, short break, long break, custom duration and a desk clock. Planner mode used current tasks and personal workspace time blocks to produce a sequence of work and breaks.

The initial algorithm used weekly capacity divided across five working days, deducted meetings and completed work, then expanded eligible work into timer cycles. It inserted longer breaks according to the user's preferences, trimmed trailing breaks and stopped at the daily cap. When no time blocks were available, it could derive work from up to five high-priority tasks. That was a fallback limit, not a requirement to manufacture five sessions.

Later repairs checked current task identity and exclusions and distinguished refreshed schedules from an already started session. A running session needed stable linked identity even when the surrounding records changed.

## Scope, units and persistence

Focus requests resolved the user through authentication and checked workspace access. Personal blocks were queried by both user and workspace. The Focus socket used the in-memory authentication token, rather than introducing a separate token in local storage.

Session duration is stored in seconds while planner and capacity calculations use minutes. Calendar-date keys and real start and end instants also have different meanings. Conversions had to remain explicit for schedule limits, daily logs and analytics to agree.

Completion invalidated schedule and reporting readers and emitted a socket event for connected tabs. Wallpaper requests were user-level actions, while schedule and session operations required workspace scope. Optional Unsplash lookup fell back to bundled choices when no key was configured.

## Interface and controls

The page was available through the app and the `Ctrl+Shift+Q` or `Cmd+Shift+Q` shortcut. Enter or Space controlled the countdown; Escape handled an open dialog before broader fullscreen or control behavior.

The implementation contained six layouts: centered, zen, card, overlay, sidebar and standby. The early description incorrectly called that set five layouts while listing standby as well. Wallpaper, layout and settings controls shared the same timer behavior.

Completion feedback used in-app toasts and a Web Audio chime. It did not require browser notification permission. The older shell widget was removed after the dedicated page became available.

## The 7 October 2026 connected-flow review

The follow-up aligned local-day accounting with Analytics, excluded paused time from work totals and retained failed completion saves after reload. Retrying a completion reused the same identifier and captured payload so an outage could not create duplicate sessions or silently change what was being saved.

Current tasks and blocks were checked in generated schedules, including linked identity and exclusions. The record reports twenty-four connected-flow checks, including an injected outage followed by an explicit successful retry. Initial and follow-up build and lint checks were also recorded.

No new migration was needed for the feature because the existing models supplied the required fields. The [database record](12-database.md) distinguishes those existing fields from earlier schema repairs. Use the [development guide](../../../development/README.md) to repeat current checks.
