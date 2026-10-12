# Planner dates, routines and holidays

Planner repairs connected date handling, workspace scope and shared habit behavior. Later holiday work replaced incomplete regional data with a sourced annual snapshot. These notes describe the repair history rather than instructions to replay against a current database.

## PLAN-01 and PLAN-02: daily logs

Daily-log creation did not consistently supply the required workspace scope. It also looked only for active rows before creating a new log. A soft-deleted log still occupied the unique `(userId, workspaceId, date)` key, so creating another row for that date failed.

The repair resolved validated scope and looked up the existing date regardless of deletion state. An active log produced a conflict; a deleted one could be restored; only an absent log required insertion. The unique constraint remained intact.

The original repair used UTC noon as a canonical storage representation for a calendar date. That representation is not a general timezone conversion. Current date helpers must keep calendar-date keys separate from real instants and apply the same convention across readers and writers.

## PLAN-03: milestone ownership

Milestone mutations gained an ownership lookup before updating or deleting the identified record. An unrelated identifier was treated as not found. The original explanation also attributed the failure to Prisma's unique-query rules too broadly: the important contract is the actual generated query type and the ownership boundary, not a blanket prohibition on additional filters alongside an identifier.

## PLAN-04: shared routine checkoffs

Planner checkoffs wrote habit completions directly, bypassing streak calculation and domain events. They were redirected through the habit service, including the corresponding uncheck path. This avoided maintaining a second, inconsistent implementation of habit behavior in planner routes.

## PLAN-05: requested ranges and backlog

A fixed seven-day loop generated excess data even for a single-day request. The repair calculated the requested range with a bounded maximum. Unscheduled active tasks were also returned explicitly as backlog instead of being queried and then discarded by date filtering.

## PLAN-06: regional holiday coverage

The location picker contained all 28 Indian states and eight union territories, but the initial provider check supplied no usable regional calendar for them. The 7 October 2026 repair added published 2026 calendars for all 36 locations: 32 from Office Holidays subscription feeds and four from government tables.

Regional calendars take precedence over conflicting central dates. Only qualifying public holidays reduce statewide working capacity; optional, bank-only, district-only and observance dates are not interchangeable with those holidays.

This is an annual published-calendar snapshot. It does not establish that every later amendment has been incorporated, and future years need their own sources. The [dataset guide](../../../../apps/server/src/services/holidays/data/README.md) explains maintenance and incomplete coverage.

## Recorded verification

The initial pass checked log creation and restoration, milestone ownership, routine checkoffs and requested date ranges. The holiday pass recorded sixteen focused checks, nine browser regressions, live API and browser verification across all locations, and build and lint checks. Unsupported-year notices remained part of the interface.

For current setup and checks, use the [development guide](../../../development/README.md). The [security record](02-security.md) explains personal time-block isolation.
