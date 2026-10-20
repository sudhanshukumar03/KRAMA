# Additional remaining bugs — 17 October 2026

**Resolved:** All findings below were corrected on 17 October 2026. See [the fix and verification report](2026-10-17-remaining-fixes.md). The original diagnostic evidence is retained below as a historical record.

Further review confirmed [four additional search/navigation issues](2026-10-17-remaining-navigation-bugs.md). Together with the seven below, eleven findings were tracked at the time of review.

Seven additional issues were confirmed with eight synthetic Chromium diagnostic probes. Projects and Habits share the same failure-handling issue and are grouped below. The previous seven fixes and the additional AI Assist focus correction are not repeated here. No product code or personal workspace records were changed during this review.

These probes intentionally assert observed defects: passing means successful reproduction. This is a targeted review, not an exhaustive list of every possible application defect.

| Priority | Issue | Trigger and impact | Evidence |
| --- | --- | --- | --- |
| Fix first | Moving the open Brain document makes subsequent edits conflict | Move the open document under another parent, then edit its body. The move changes the server revision, while the editor save queue retains the previous revision. The next save returns a conflict despite there being no other writer. The unsaved draft is retained, but normal autosave is blocked. | Browser reproduction; `apps/web/src/components/BrainWorkspace.tsx:655` refreshes only document lists, while `apps/server/src/services/document.service.ts:107` updates the document. |
| Fix first | Habit completion can target yesterday after midnight | Keep Habits open across midnight without another render, then mark a habit complete. The hook submits the date captured during the previous render. A simulated midnight in Asia/Kolkata reproduced a request for October 17 while the browser date was October 18. | Browser reproduction; `apps/web/src/hooks/useHabitCompletion.ts:63`, `:69`. |
| Medium | Brain imports ignore a selected empty space | Select an empty space, then import a file. With no selected document, the import request uses `spaces[0]` instead of the selected space, so the note lands in a different space. | Browser reproduction; `apps/web/src/components/BrainWorkspace.tsx:156`. |
| Medium | Changing a note's lifecycle silently removes its Inbox marker | Change a captured note to DRAFT, IN_REVIEW, ACCEPTED, or DEPRECATED. The lifecycle mutation replaces the entire badges array, removing Inbox even though the user did not choose to file the item. The note then disappears from Inbox. | Browser reproduction; `apps/web/src/components/brain/Editor.tsx:250`. |
| Medium | Related service failures hide usable Projects and Habits | A failed documents request hides otherwise healthy Projects. A failed goals request hides otherwise healthy Habits. Both screens replace all content with an error, preventing independent work until the secondary request recovers. | Two browser reproductions; `apps/web/src/components/Projects.tsx:148`, `apps/web/src/components/HabitTracker.tsx:203`. |
| Medium | Today's habit completion controls are inaccessible and undersized | The completion buttons in Today's Habits have no accessible name, so assistive technology cannot identify their purpose or associated habit. Their hit areas are smaller than 44px. The larger main habit-card controls have separate labels and are not the controls implicated here. | Accessible-name and geometry assertions; `apps/web/src/components/habits/HabitCards.tsx:110`. |
| Low | Notifications extend below very short windows | At a 390×240 viewport, the notification popup extends beyond the bottom edge. Its minimum 200px height exceeds the available space below the trigger, and it does not reposition above the trigger. | Browser geometry reproduction; `apps/web/src/components/NotificationCenter.tsx:91`. |

## Verification

- Diagnostic probes: **8/8 reproduced** the behavior in Chromium in 34.8 seconds.
- Configuration: `.audit/leftover-review.config.ts`.
- Probes: `.audit/leftover-review.spec.ts`.
- Results: `.audit/leftover-review-results.json`.
- API requests and responses were synthetic. The document move probe models the existing server revision update and rejects a subsequent stale content revision with HTTP 409.

Separate verification gaps remain: physical phone/Safari application checks, and an actual laptop sleep/wake session. These gaps do not by themselves establish further bugs.
