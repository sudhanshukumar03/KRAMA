# Obsolete code and dependency cleanup

Cleanup followed functional repairs and reference checks. The review treated an unused symbol as a lead to investigate, not sufficient evidence to delete an entire feature. Routes, workers, scripts, generated contracts and database relations all needed consideration.

## DEAD-01: the legacy Page subsystem

The knowledge interface had moved to `Document`, while a separate `Page` subsystem remained. The recorded cleanup removed its routes, controller, API methods, validation, DTOs, frontend types and concurrency tests. Embedding processing was aligned with document identifiers, and obsolete schema relations were removed with the model.

The replacement document path needed to be available before these removals. Historical references to Page in earlier audit records describe the reviewed revision rather than a model that should be recreated.

## DEAD-02: holiday service consolidation

Competing holiday paths were consolidated through `HolidaySyncService`. The initial cleanup selected Nager.Date as the free provider. Later Indian regional coverage introduced the bundled annual dataset and `DefaultHolidayProvider`.

The early cleanup record said that Calendarific had been removed entirely. That statement no longer describes the repository: an optional Calendarific provider exists alongside the default path. The current behavior and annual coverage are explained in the [planner record](06-planner-calendar.md) and [dataset guide](../../../../apps/server/src/services/holidays/data/README.md).

## DEAD-03 and DEAD-04: dependencies

The server's direct Redis clients were consolidated on `ioredis`, removing the extra direct `redis` dependency. Development fallback behavior did not eliminate the need for working Redis in production, where queues and shared session and rate-limit behavior depend on it.

The unused `@xenova/transformers` dependency was removed after import and dependency-tree checks. A package's size alone was not the reason for deletion; it had no application consumer.

## DEAD-05 and DEAD-06: unused contracts

The unused `Decision` model and frontend types were removed after checking their consumers. Habit validation also dropped a redundant `skillIds` field left over from removed skill functionality.

## Replacement dependencies and verification

Working AI telemetry and dashboard-insight endpoints were retained for planned consumers. The old focus widget was retained during this pass and removed only when the [Focus feature](11-focus.md) replaced it.

The cleanup record relied on reference searches, dependency inspection and builds. Future cleanup needs the same care around dynamic imports, registered routes, worker entry points, command-line scripts and migration history. An old migration may intentionally mention a removed model and should not be deleted merely to obtain an empty search result.

See the [audit overview](../README.md) for the broader history and the [development guide](../../../development/README.md) for current verification.
