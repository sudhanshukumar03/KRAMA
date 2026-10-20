# KRAMA fix recheck

Requested 2026-10-20. Status: fresh automated recheck completed. Seventeen stages passed; required Gemini text and Gemini-only Ask qualification failed. This checks the implemented repairs against current source and repeatable regressions; it does not close the unfinished quality-improvement plan.

## Scope and method

Preserve the existing working tree, private settings, ordinary services and personal records. Run the heavy suites sequentially. Database/Redis-backed checks use validated test storage and owned synthetic accounts; production staging uses its own generated Compose project, credentials, local certificate and disposable volumes. Real provider checks send only synthetic fixture text.

Read the affected implementations as well as their regression cases. Record fresh run exit codes, timestamps and JSON reports in ignored `.audit/fix-recheck-2026-10-20-1703/`. Compare source hashes at the beginning and end so a result cannot silently qualify changed application source. Do not replace failed real-provider checks with an earlier pass or a fallback-provider success.

## Repair-to-evidence map

| Implemented repair | Current review and regression evidence |
| --- | --- |
| Habit creation/start and future-day restrictions | `habitCompletionDate.ts`, authoritative Habit service and Planner eligibility; daily/weekly real creation-to-Planner journeys exercise rejected yesterday, disabled earlier controls, completion today and undo |
| Habit history visibility, timezone and undo | Both-theme habit/browser coverage, midnight/date-policy and streak suites; tracker/read contract checks log/undo, schedule edits, backfill ordering and user scope |
| Connected personal-workspace rules | Full integration/live suites cover Planner reservations, dependencies, daily decisions, Goal progress, linked Projects/Habits, Inbox classification, Focus completion and restore |
| Goal detail extraction and recovery | Reviewed draft revision ownership, entity/user/workspace recovery keys and safe discard flow; existing keyboard, conflict, failed save, independent section and long-title cases retained |
| Search field and navigation | Reviewed field-level focus styling, bounded on-open recents, aborted stale searches, result grouping and selected workspace lifecycle; shell/search response, keyboard and matrix cases retained |
| Shell AI entry and Escape order | Navigation placement avoids paging overlap; nested modal/assistant/shell ordering is covered by browser regressions |
| Tasks and Brain bounded rendering | Shared pager and typed complete task-page assembly inspected; paging/focus, complete search and document deep-link cases plus mature-workspace profile retained |
| Habit/summary read projections | Fingerprint includes habit versions/history; cache scope includes user, workspace, zone and local day; scoped summary and search projection contracts retained |
| Planner typography, controls and historical labels | Seven focused cases included in full frontend suite: both themes at phone/desktop, real target geometry, historical date wording and 450-task paging/full backlog search |
| Safe failure boundaries | Reviewed unknown thrown values, finite HTTP statuses, recognized metadata projection and production diagnostics; malformed/circular error, auth and upload regressions retained |
| AI source grounding and retrieval scope | Canonical retrieved source IDs/titles, saved Goal status and active ownership joins inspected; mocked grounding and live stale/orphan/mismatched-chunk contracts retained |
| AI input validation and recovery | Malformed/blank/oversized requests and retrieval flags tested before provider work; real Ask/Compose and stream cancellation/fallback/retry checks retained |
| Transactional large backup restore | Reviewed bounded 500-row inserts inside one transaction; mature restore checks counts/relationships and a later-batch duplicate verifies rollback |
| Landing typography, themes and inline intro | Fresh production build tested in Chromium, Firefox and WebKit; earlier user-requested removals remain intentional, including the large player toolbar/transcript |
| HTTPS sessions, WebSockets and restart | Complete production-image suite verifies secure refresh, confirmed upgrade before frame assertions, worker delivery, reconnect and persisted records |
| Dependencies and regression enforcement | Fresh package audit, fixed source/asset gates, build/types/lint and workflow syntax; remote enforcement remains a separate environment condition |

## Fresh results

| Check | Fresh result |
| --- | --- |
| Build / lint / root test-config types | Passed |
| Backend unit | 171 passed across 29 suites |
| Integration | 59 passed across nine suites |
| Shared validation | 25 passed |
| Source and compressed asset gates | Passed, with the existing fixed budgets |
| Package vulnerability audit | Passed; no known vulnerabilities reported |
| Workflow syntax / isolated startup | Passed; actionlint passed again after the additional CI repair |
| Small production-workspace performance | Passed |
| Mature production workspace | Passed; maximum measured route 1,397ms, maximum bounded-read p95 348ms |
| Mature backup | 14,801,650 bytes; restored in 6,787ms, with counts and relationship checks passing |
| Production landing, three engines | 50 passed; seven existing Windows WebKit media-decoding skips remain unverified |
| Full frontend | 262 passed in 11.3 minutes; zero retries and zero skips |
| Full live workspace | 135 passed in 6.4 minutes; eight mode-selected skips, zero retries |
| Full isolated HTTPS staging | 26 passed in 1.6 minutes; secure refresh, WSS task/worker events, large ingress backup, restart recovery, theme contrast and emulated mobile/Focus cases |
| Direct Gemini embedding / Groq text | Passed: 768 finite embedding dimensions and a nonempty text completion |
| Direct Gemini text | Failed HTTP 504: provider reported deadline exceeded |
| Configured-provider application AI | Both workflows passed: real worker embeddings, keyword/semantic retrieval, grounded Ask and Compose insertion/save/reload |
| Gemini-only application AI | Retrieval passed; Ask returned HTTP 503; Compose was not reached. Required Gemini qualification remains failed |

The performance results use the same local, unthrottled production-preview profile and fixed budgets as the previous qualification. Task pages and Habit tracker projections remain different contracts from unbounded full-list reads. These observations do not establish field Web Vitals or sustained device performance.

Actual fresh light desktop and dark phone landing captures were inspected; headline, black text on the colored topic background, entry action and preview remain legible. The light phone Habit history, light phone Planner and dark phone long-title Goal drawer were also inspected: history boundaries remain visible, task actions are visible with a clear focus ring, and the Goal title wraps. Automated contrast/layout checks and all seven focused Planner cases passed. Selected captures are preserved with the private run evidence. This is not a substitute for independent usability or spoken assistive-technology checks.

The eight full-live skips select separate AI, production ingress and performance modes; their applicable dedicated checks were run above. The seven landing skips are existing Windows WebKit media limitations. Neither category is counted as passing. All completed browser runs used zero retries.

The fresh run started at 17:04 and finished at 17:32 Asia/Kolkata. All 421 inventoried application/shared/test source files have identical before/after hashes. The only implementation/configuration repair made in this recheck was the CI addition below; its current hash matches the workflow validated after that repair. No application code change was needed to obtain the passing core regressions.

Private evidence includes `results.json`, `verification-summary.json`, per-stage logs, `mocked.json`, `live.json`, `staging.json`, `landing.json`, `ai.json`, `ai-gemini.json`, before/after source inventories, the validated CI snapshot and performance measurements in `.audit/fix-recheck-2026-10-20-1703/`. Staging cleanup removed only its generated project containers/volumes; owned test listener ports 3021/4187/4188/4189 were free after completion. Existing personal services and settings were preserved.

Both real creation-to-Planner cases passed for daily and weekly habits. They verify rejected yesterday writes, disabled earlier Planner controls, a successful completion today and persisted undo. All eight current live data contracts passed, including bounded/scoped reads, immediate habit cache invalidation, requested reporting zone, backfill ordering, navigation summaries, stale index exclusion, late-batch backup rollback and malformed AI input.

## Additional repair found during this recheck

The production landing suite had been verified in three engines locally but was absent from the release workflow. The core CI job now installs Chromium, Firefox and WebKit and executes `pnpm test:landing`; `release-ready` already requires that job to succeed. Local production tests passed 50 cases with seven Windows-only WebKit media skips; Linux CI is configured to run those media cases as well. The updated workflow passed actionlint 1.7.7. An actual remote run remains unverified; local source changes do not activate remote protection.

## Work that is still open

Focus/Editor/Project responsibility cleanup, remaining typed adapters, broader interface/control migration and the rest of the security review are planned work, not completed fixes. Physical-device keyboards/touch/sleep, spoken screen-reader output, observed usability, field measurements, public hosting and remote CI enforcement require their actual environments or participants. No physical device is connected; isolated local HTTPS is the selected staging environment.

Subsequent user decision, 2026-10-20: R2 uploads remain **Coming soon** and are excluded from current release acceptance. The existing wallpaper upload interface already displays that state, disables file selection and retains built-in wallpapers/gradients. Real R2 activation and its successful upload/recovery checks belong to that future feature release.
