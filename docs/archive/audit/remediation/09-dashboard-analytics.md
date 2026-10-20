# Dashboard and analytics

This record covers the initial dashboard repairs and the reporting and interface reviews completed on 7 October 2026. Later reporting decisions superseded some descriptions in the first implementation.

## DASH-01: counting and personal scope

The dashboard fetched entire document bodies only to count them. It was changed to use a database count. Focus-session queries also gained the requesting user's scope in addition to the workspace scope, so one member's personal sessions were not returned on another member's dashboard.

## DASH-02 and DASH-03: reachable content

The dashboard's overflow rules clipped lower cards on smaller screens. Its flex and scrolling behavior was corrected so the content could be reached. The analytics route, previously a redirect, was mounted as an actual page with navigation and real backend data.

## DASH-04–21: reporting behavior

Eighteen follow-up findings moved reporting to live source records for exact 7-, 30- and 90-day ranges. Personal focus, planner logs, streaks and activity were user-scoped. Focus work totals and planner logs were reported separately, with explicit duration units and date boundaries.

Task completion dates and version handling were stabilized. History gained pagination and independent retry controls. Goal aggregation, previews, direct habit checkoffs, draft-preserving Quick Capture and connected refresh were reviewed. Charts had accessible table and CSV alternatives.

The earlier description of nightly snapshot backfill no longer described the reporting path. Current top-level goal values were labeled as progress, rather than presenting them as a historical OKR pace series.

## DASH-22–29: controls and recovery

Eight further findings covered task filters, counts and checked states; detail destinations; overdue ordering; current snapshots versus range totals; and Daily or seven-day rolling chart controls. Guided empty states, failed history-page recovery, break labels, refresh feedback and mobile loading behavior were also addressed.

A connected-flow pass corrected Start Focus links to the mounted `/focus` route and verified the Dashboard and Analytics destinations in the browser.

## ANUI-01–06 and KUI-01–05: presentation

The analytics follow-up improved reporting controls, compact mobile metrics, empty chart sizing and recovery when a cached report could not refresh. Daily-data expansion survived return navigation, and dates and durations had explicit units.

The subsequent visual pass grouped related controls and metrics, clarified typography, reduced the prominence of supporting surfaces and strengthened the daily focus hierarchy. It retained the shared palette and shell rather than introducing a separate style for reporting.

## Recorded verification and reporting limits

The functional follow-up recorded nine live checks and eighteen reporting-time, habit-timezone and planner-capacity unit checks. The interface suite expanded to eleven live checks and later twelve after visual work. Those are successive revisions of the suite, not independent totals to add together. Builds and lint were repeated as those changes were made.

Legacy task dates, current-goal reporting, cross-midnight focus allocation and bounded dashboard previews limit how historical reports should be interpreted. A current goal snapshot is not a complete history, and a dashboard preview is not an exhaustive result set.

The [development guide](../../../development/README.md) explains current verification commands. The [audit overview](../README.md) records the later consolidated checks.
