# Task boards and sprint lifecycle

The board and sprint repairs addressed inconsistent task readers, missing status handling and lifecycle operations that left misleading associations. The later board review also covered concurrency, recovery and connected views.

## KAN-01: task readers and cache invalidation

Some interfaces read tasks under the `issues` query family while capture and AI actions invalidated only `tasks`. A task could therefore be saved successfully and remain absent from the board until reload. Mutations were updated to invalidate the affected readers in both families.

## KAN-02 and KAN-03: task status

The board omitted a distinct `TODO` column and a reachable canceled-task view. A drop handler also rewrote `TODO` into `BACKLOG`, changing stored status when a task was dragged onto a card. The repair preserved the target status, represented To Do directly and exposed canceled tasks through an archive control.

The frontend was aligned with the schema spelling `CANCELED`, with one L. Comparisons against `CANCELLED` had failed to recognize completed or canceled work in planner views.

## KAN-04: deleting a sprint

Soft-deleting a sprint left its tasks pointing to a deleted parent. The repair combined sprint deletion and task dissociation in one transaction so backlog queries could see the released tasks consistently.

## KAN-05: completing a sprint

Canceled tasks were hidden, counted against active progress and released into the backlog when a sprint completed. The repair made them visible while excluding them from the active progress target. Done and canceled tasks retained their sprint association; only unfinished tasks were released.

Completion moved from sequential client requests to one server operation that updated the sprint and released unfinished work atomically.

## KAN-06–20: the 7 October 2026 board review

Fifteen further findings covered Review status, General Operations creation, version-aware edits and ordering, drag cancellation and menu actions. Forms retained drafts and accepted a zero estimate. Scheduling, due dates, discussion recovery, archive feedback and query feedback received explicit handling.

Task links were checked for valid scope and cycles. Mobile and keyboard controls, subtask navigation, blocked indicators, connected-view refresh and deletion with Undo were also reviewed. Historical invalid relations were sanitized when read rather than rewritten through a migration.

The Board Calendar remained a chronological timeline. Manual ordering belonged to Manual sort mode rather than changing that timeline's date order.

## Recorded verification

The original pass checked capture-to-board visibility, status changes, sprint deletion and batch completion. The 7 October board follow-up recorded seven live board checks, thirteen unit checks and six connected live regressions, alongside builds and lint checks. It did not constitute a fresh audit of every earlier sprint finding.

Use the [development guide](../../../development/README.md) to run the current checks. The [audit overview](../README.md) describes how this record fits into the broader repair history.
