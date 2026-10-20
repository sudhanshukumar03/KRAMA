# Current Krama bug review — 17 October 2026

Follow-up: these findings have been addressed; see [the fix and verification report](2026-10-17-current-bug-fixes.md) for current status. The findings below preserve the original reproduction evidence.

Read-only product review of the current working tree. Product code was not changed. Seven diagnostic browser probes reproduced six issues using synthetic API responses in Chromium; one further issue was confirmed by tracing the server and client code. These probes intentionally assert the defects, so their passing results mean successful reproduction, not correct application behavior. This is a targeted review, not a new complete audit of every feature.

## Findings

### 1. Brain task mentions lose the linked task selection — Medium

Click a task mention in a document. The URL becomes `/app/board`, without the linked task ID, so the user lands on the general Board instead of the task they selected. The click handler has the correct `entityId` but does not pass it to navigation. Other entry points already support `/app/board?task=<id>`.

- Source: `apps/web/src/components/brain/Editor.tsx:359`.
- Browser reproduction: `Brain task mention opens Board without the linked task selection`.
- Required correction: include the task ID in the existing Board deep link.

### 2. A saved Brain space can hide another workspace's documents — Medium

The selected space is persisted in one global `krama_brain_selected_space` key. After switching workspaces, changing accounts, or removing that space, Brain can request documents for an ID that is absent from the current workspace. The server correctly returns no matches; Brain displays no selected specification even though the workspace contains documents. Selecting All Spaces restores access. The current reset effect only helps when a `doc` URL parameter exists.

- Source: `apps/web/src/components/BrainWorkspace.tsx:30`, `:60`, `:132`; document filtering in `apps/server/src/controllers/document.controller.ts:85`.
- Browser reproduction: `Brain retains an invalid space from another workspace and hides available documents`.
- Required correction: scope the preference to account/workspace and validate it against loaded spaces.

### 3. Brain tag changes leave the open editor stale — Medium

Adding a tag succeeds and shows a success message, but the tag does not appear in the open editor. Removing a tag succeeds, but the removed chip remains visible. Both actions invalidate `['documents']`; the editor renders from the separate `['document', id]` query, which stays unchanged. This can encourage repeated actions and makes saved state look unreliable.

- Source: `apps/web/src/components/brain/Editor.tsx:52`, `:260`, `:274`, `:715`.
- Browser reproductions: adding and removing a tag, including verification that the synthetic server state changed and the editor detail query did not refetch.
- Required correction: update or invalidate the individual document cache after tag changes.

### 4. Inbox loses usable items when either source fails — Medium

When tasks load successfully but the documents request fails, Inbox displays only “Could not load Inbox.” Successfully loaded tasks are hidden and cannot be organized there. The same all-or-nothing rendering applies if task loading fails while documents succeed.

- Source: `apps/web/src/components/Inbox.tsx:59`, `:89`.
- Browser reproduction: successful tasks plus a synthetic HTTP 503 response for documents.
- Required correction: retain usable items, identify the failed source, and provide a retry for it.

### 5. Brain Trash reports an empty state after a request failure — Medium

Opening Trash while the deleted-documents endpoint fails displays “Trash is empty.” There is no error or retry control, even after all automatic retries fail. Loading is also initially represented as empty. Users cannot distinguish an empty Trash from an unavailable restore list.

- Source: `apps/web/src/components/BrainWorkspace.tsx:63`, `:520`.
- Browser reproduction: four HTTP 503 responses followed by the false empty state and no alert/retry control.
- Required correction: render loading, failure/retry, and confirmed-empty states separately.

### 6. Older unread notifications become inaccessible and uncounted — Medium

The API returns only the newest 50 notifications without pagination or an independent unread total. The bell count is calculated only from those returned records. If the latest 50 are read but an older notification is unread, the bell reports no unread items and that older notification cannot be reached through the current list. “Mark all read,” when visible, also operates on all unread database records, including records omitted from the list.

- Source: `apps/server/src/controllers/notification.controller.ts:16`, `:22`, `:68`; `apps/web/src/components/NotificationCenter.tsx:39`.
- Evidence: server/client code trace; not a live database reproduction.
- Required correction: expose the actual unread count and provide a way to retrieve older or unread notifications.

### 7. Profile displays invented subscription/activity status — Low

The Settings profile panel always displays `PRO` and `Focused`, regardless of account subscription or whether a Focus session is running. Both strings are hardcoded.

- Source: `apps/web/src/components/Sidebar.tsx:256`, `:273`.
- Browser reproduction: both labels appear with a synthetic ordinary account and no timer state.
- Required correction: remove unsupported labels or derive them from actual state.

## Verification records

- `.audit/current-bug-review.spec.ts`: seven diagnostic probes, all reproduced the observed behavior.
- First run: six probes passed in 18.2 seconds; JSON retained at `.audit/current-bug-review-results.json`.
- Additional Trash probe: one passed in 13.0 seconds, including exhaustion of four failed requests.
- Configuration: `.audit/current-bug-review.config.ts`.
- All browser requests were mocked; no personal workspace records were created, changed, or deleted.

Recommended order: fix navigation, stale space/tag state, and false failure states first; then notification retrieval/counting and the hardcoded profile labels.
