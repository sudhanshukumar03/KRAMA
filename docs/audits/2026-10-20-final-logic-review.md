# Final logic review

Later follow-up: the [22:05 fix validation](2026-10-20-fix-validation.md) confirmed these six repairs and fixed one additional late-answer keyboard-focus defect. It records fresh post-repair results separately from the full qualification below.

Requested 2026-10-20. Status: six additional defect groups repaired and fresh core qualification passed. Seventeen verification stages passed; direct Gemini text and Gemini-only application qualification failed with 503. This extends the earlier [all-fixes recheck](2026-10-20-all-fixes-recheck.md), which did not exercise these particular concurrency and recovery paths. The release is not declared fully qualified while required provider checks fail.

## Confirmed defects and repairs

| Finding | Reproduction | Implemented behavior |
| --- | --- | --- |
| Repeated AI task proposals created duplicate tasks | Rapid double activation sent two create requests for one proposal | A synchronous per-proposal guard owns pending and completed state in the conversation component. Closing/reopening the panel preserves it; other proposals remain independent. Failed writes unlock for retry |
| AI question failure and conversation reset lost recovery state | A failed question left an empty input without an inline alert; reset stayed available while an answer was pending | Restore the question for retry, expose the error through an alert, and prevent reset while an answer or task write is pending |
| Removed Goal connection selections remained actionable | After a real query reconnect/refetch removed the selected project or habit, Connect remained enabled | Clear unavailable selections; refuse missing entities instead of reporting a successful no-op or sending an absent version |
| Failed Goal connections hid the selected item | A 503 response closed the project/habit picker immediately | Close on success only; preserve the selection and version for a visible retry after failure |
| Concurrent dashboard insight requests exceeded the daily quota | Six simultaneous requests performed six generations despite the three-generation limit | Reserve allowance atomically in Redis before context/provider work; reject unavailable shared quota with 503 and exhausted quota with 429. Refund failed generation without creating negative counters |
| Malformed telemetry caused an internal error and accepted unsuitable values | A null body returned 500; strings, objects, negative counts and oversized reflection lacked a complete boundary | Validate bounded strings and finite nonnegative numeric input before context/provider work; require integral task counts and preserve valid zero values |

AI usage, insights and telemetry now consistently take the middleware-validated workspace scope. This is boundary consistency; no cross-workspace exploit was reproduced in this review. No schema migration or new runtime dependency was needed.

The action guard prevents repeat activation of a proposal during its conversation lifetime. It does not provide server-side idempotency for an ambiguously completed network request or preserve conversations across page reloads. Successful task completion retains its existing authoritative server rules.

## Verification method

Preserve the existing dirty tree, ordinary services, private configuration and personal data. Run heavy checks sequentially with validated disposable test storage. HTTPS staging owns its generated Compose project and volumes; external AI probes send synthetic fixture text only. Compare application/shared/test source hashes before and after the complete run.

New maintained regressions:

- `e2e/mocked/ai-action-recovery.spec.ts`: duplicate activation; close/reopen while pending and after success; independent proposals; failure/retry; question restoration; pending reset.
- `e2e/mocked/goal-connection-recovery.spec.ts`: stale selections and failed-write retry for both projects and habits, preserving version checks.
- `apps/server/src/__tests__/ai_request_guards.test.ts`: concurrent controller quota, failed-generation refund, unavailable shared state, cached insight, malformed telemetry and valid zero values.
- `apps/server/src/__tests__/followup_repairs.integration.test.ts`: real Redis reservation/release scripts under concurrent requests, expiry and missing-key handling.

The first stale-selection test attempted a window-focus refetch, which the application intentionally disables. That harness failure is separate from the product defect. The corrected test uses reconnect and confirms an actual list response before asserting the stale-selection bug. Its failure before the repair and pass afterward are retained.

Interaction acceptance uses native buttons, pending/completed disabling, stable action labels, an inline error alert and retryable failure state. No registry component or motion runtime was added. Closing the panel still removes its interactive children; state ownership preserves the conversation's mutation lifecycle without leaving hidden controls mounted. This is automated interaction evidence, not a spoken screen-reader or physical-device qualification.

## Fresh results

| Check | Fresh result |
| --- | --- |
| Build, lint, root test/config types | Passed |
| Backend unit | 177 passed across 30 suites |
| Database/Redis integration | 60 passed across nine suites |
| Shared validation | 25 passed |
| Source/asset gates | Passed with existing budgets and type-debt allowances |
| Dependency audit | No known vulnerabilities reported |
| Workflow syntax / isolated startup | Passed |
| Focused new browser regressions | Eight passed, including final close/reopen lifecycle; zero retries/skips |
| Complete frontend | 270 passed in 12.2 minutes; zero retries/skips |
| Complete live workspace | 135 passed in 7.0 minutes; eight mode-selected skips, zero retries |
| Production landing in three engines | 50 passed; seven existing Windows WebKit media skips, zero retries |
| Small and mature production-client profiles | Both passed with fixed budgets |
| Mature backup | 14,801,650 bytes; restored in 10,784ms, with counts and relationship checks passing |
| Isolated production HTTPS | 26 passed in 1.8 minutes; zero retries/skips |
| Direct Gemini embeddings / Groq text | Passed: 768 finite embedding dimensions and a nonempty completion |
| Direct Gemini text | Failed HTTP 503; provider reported temporary high demand |
| Configured-provider application AI | Both real workflows passed: worker embeddings, keyword/semantic retrieval, grounded Ask and Compose insertion/save/reload |
| Gemini-only application AI | Retrieval passed; Ask returned HTTP 503, so Compose was not reached. Required-provider qualification remains failed |

The mature fixture includes 5,000 tasks, 2,000 documents, 100 goals, 200 projects, 50 habits, 36,500 completions and 730 daily logs. Maximum measured route readiness was 1,471ms; maximum bounded-read p95 was 435ms. These are local unthrottled lab observations, not field Web Vitals. The Habit tracker and paged task reads remain bounded projections, rather than comparisons with unbounded full-list reads.

The broad live run retains the original personal-workspace rules: forbidden Habit dates and duplicate checkoffs; signed-in member history; Goal progress, links and undo; Planner reservation/conflict behavior; Focus sessions; Inbox classification; Brain moves, autosave and subtree recovery; worker notifications and scoped workspace switching. The eight live skips select dedicated AI, ingress and performance modes. Skips are not counted as passing; the dedicated results are recorded separately.

Production HTTPS checks passed secure login/refresh, confirmed WebSocket delivery, worker events, large backup ingress, restart persistence/reconnect, emulated phone/Focus behavior and both-theme contrast. Staging uses its own local certificate, not a public deployment. The seven production-landing skips are the existing Windows WebKit media-decoding limitations.

The full run started at 21:05 and finished at 21:36 Asia/Kolkata. All 424 inventoried application/shared/test source files have identical before/after hashes. Browser runs used zero retries. Neither assertions nor performance budgets were relaxed to obtain these results. The provider failures remain failed rather than being replaced with earlier passes or fallback-provider success. The misleading trailing pnpm `tsx` message follows a nonzero child exit; the actual direct-provider and HTTP assertions above identify the failures.

Private evidence is under ignored `.audit/final-logic-2026-10-20/`: failing-before logs, focused browser JSON, per-stage logs/reports, `results.json`, `verification-summary.json`, validated CI snapshot, timestamps, measurements and source inventories. Ordinary services and personal records were preserved. No commit, push, public deployment or remote settings change was performed.

The final cleanup check found no listeners on verification ports 3021/4187/4188/4189 and no staging containers running. Existing KRAMA and LedgerMind PostgreSQL/Redis containers remained healthy.

## Limits and deferred work

R2 uploads remain **Coming soon**, as requested, and successful storage integration is excluded from this release's acceptance. Disabled-upload handling remains required. No physical device is connected; local HTTPS and browser emulation cannot establish physical keyboard/sleep behavior or public hosting behavior. Remote CI protection and independent human/accessibility qualification remain open.

The broader quality plan still includes Focus/Editor/Project decomposition, remaining typed adapters, rich-content and raw-log review, and observed usability. A passing regression set does not establish the absence of every possible defect.
