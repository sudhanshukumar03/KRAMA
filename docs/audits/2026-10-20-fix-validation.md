# Fix validation follow-up

Completed 2026-10-20 at 22:05 Asia/Kolkata. The six repairs from the [final logic review](2026-10-20-final-logic-review.md) passed again. One additional asynchronous focus bug was reproduced, repaired and verified.

## Additional defect

After sending an AI question, close the assistant, open workspace search and type a query. When the pending answer arrived, the assistant's message-change effect restored focus to its opener behind the search dialog. The focused reproduction failed because the search input became inactive.

`AIAssistant.tsx` now separates message scrolling from opener focus restoration. Only a panel-close transition restores focus; a background message cannot move focus from the next field or dialog. The new permanent regression in `ai-action-recovery.spec.ts` checks that search retains its focus and query, then reopens the assistant to confirm the answer was retained. Existing normal close/Escape focus return remains covered. No motion runtime, dependencies, API or schema changed.

## Fresh verification

Before the additional repair, all 424 inventoried source/test files matched the 21:36 full qualification. An initial rerun passed build/lint/types, backend suites and 33 affected browser cases. The separate focus reproduction then failed; it was not counted as passing.

After the focus repair, all eight verification stages passed:

| Check | Result |
| --- | --- |
| Production build / lint / root test/config types | Passed |
| Backend unit | 177 passed across 30 suites |
| Database/Redis integration | 60 passed across nine suites |
| Shared validation | 25 passed |
| Source boundaries, type-debt and production asset budgets | Passed without relaxing allowances |
| Expanded browser regressions | 60 passed in 2.0 minutes; zero retries, skips, failures or report errors |

The browser selection covers AI action deduplication and retry, pending reset, panel close/reopen, late-answer focus, Goal connection selection/retry/version behavior, responsive Goal controls, independent draft recovery, connected Planner/Brain flows, navigation reads, nested modal Escape, sidebar and account dialogs. The backend checks include the quota concurrency/refund/outage/cache cases, telemetry validation and real Redis reservation/release scripts.

The post-repair run started at 22:02 and finished at 22:05. All 424 source/test files remained unchanged during it. Compared with the earlier full qualification, only `AIAssistant.tsx` and its existing regression file changed. No other application source changed. Verification ports 3021/4187/4188/4189 were free afterward; personal records and ordinary services were preserved.

Private evidence: `.audit/fixes-validation-2026-10-20-2200/` contains the initial green rerun and failing focus reproduction. `.audit/fixes-validation-2026-10-20-2200-after/` contains fresh stage logs, browser JSON, timestamps, source inventories and `verification-summary.json` for the repaired state. The maintained regression is discovered by the existing frontend CI suite.

## Qualification scope

This was a repair-focused recheck with expanded navigation coverage. The complete 270-case frontend, 135-pass live, 26-case HTTPS, performance and real-provider qualification belong to the earlier 21:36 snapshot; they were not all repeated after this small focus change. Current post-repair checks are listed above.

The last real-provider check at 21:36 passed configured-provider AI, Gemini embeddings and Groq text, but direct Gemini text and Gemini-only Ask returned 503. Providers were not called again in this follow-up, so that qualification remains open. Public hosting, remote CI enforcement, physical-device and independent human/accessibility qualification remain outside this local result. R2 uploads remain **Coming soon**, as requested. No commit, push or deployment was performed.
