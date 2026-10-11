# Habit checkoffs and goal progress

The first repairs addressed off-schedule checkoffs, lost goal status and inconsistent progress updates. The 7 October 2026 follow-up extended that work to hierarchy, concurrency and recoverable forms.

## HAB-01: off-schedule completions

The habit service rejected a completion when the habit was not scheduled for that day, although the schema already supported an `offSchedule` flag. The repair stored the completion and its flag instead of treating the condition as an exception.

## GOAL-01 and GOAL-02: preserving intent and versions

Goal creation omitted the status selected in the form, causing paused or canceled goals to become active. The selected status was included in the request.

Goal edits also needed the version of the record the person had actually edited. Sending that version enabled stale-write detection instead of silently overwriting another change. Removing a version check would have hidden the conflict rather than repaired it.

## GOAL-03: parent progress

Deleting or restoring a key result left its parent's progress at an old value. Shared recalculation was invoked for progress changes, deletion and restoration, with an updated version and progress snapshot. Later work extended recalculation to weighted children, moves and removal of the last child.

## GH-01–06: hierarchy and automatic progress

The follow-up checked that parent goals and linked habit goals belonged to the workspace and were active. It rejected cycles and conflicting request scope, enforced atomic Goal and Habit version checks, and recalculated weighted progress after child moves or weight changes.

Deletion covered descendants at any depth. Restoration was limited to descendants removed by that deletion, so an older independently deleted child stayed deleted. Task moves and restoration updated automatic progress for both affected goals; manual overrides of automatic progress were rejected.

## GH-07–10: recoverable editing

Goal forms and drawers retained their drafts and starting versions through background refreshes. A partially failed link operation could be retried without creating another goal. Dialog behavior, labels, keyboard access, mobile scrolling and error feedback were reviewed alongside the mutation itself.

## GH-11–15: personal habit history

The habit work preserved metadata, validated calendar-date keys and separated members' completion histories and streaks. Duplicate checkoffs were serialized. Failed drafts stayed available, and successful changes refreshed the planner and any open goal detail.

## Recorded verification and limits

The follow-up recorded ten live Goals/Habits regressions and sixteen progress and streak calculation tests. Nine live Projects regressions and the live Planner suite also passed after the shared changes. Builds and lint were recorded, and no migration was required for this pass.

Goal deletion intentionally disconnects project and habit associations. Undo restores the relevant goal hierarchy, but those associations may need to be relinked. It does not restore descendants deleted independently before that operation.

See the [audit overview](../README.md) for the broader verification history and the [development guide](../../../development/README.md) for current commands.
