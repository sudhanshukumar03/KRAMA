# Mature workspace qualification

Work started on 2026-10-19 and continued on 2026-10-20. Status: mature-workspace qualification passed after repairs; the complete release regression pass is still in progress. The small-workspace baseline is not substituted for this workload.

## Workload and failed baseline

The opt-in `pnpm quality:scale` builds the production client and starts an owned local API/worker against separately validated test storage. Its disposable account owns 5,000 tasks, 2,000 documents, 200 projects, 100 goals, 50 habits, 36,500 habit completions and 730 daily logs. Direct bulk setup creates no embedding/provider jobs. The longest document has 120 substantial paragraphs. Cleanup uses the fixture owner's identity and separate test database.

Profile: local production Vite preview, retained browser cache, no network or CPU throttle, reduced motion; Windows, Node 24.14, Intel i5-12500H, approximately 16GB memory. These are controlled lab observations, not field Web Vitals or verified product limits.

| Measurement | Before repairs |
| --- | ---: |
| Tasks, light / dark route-to-ready | 4,390 / 3,251ms |
| Tasks DOM elements | Approximately 115,650 |
| First desktop long-document load, light | 9,232ms |
| Long-document DOM elements | Approximately 76,820 |
| Planner, light / dark | 2,100 / 1,595ms |
| Task full-list read p95, ten clients | 2,259ms |
| Habit list read p95, ten clients | 5,209ms |
| Document page read p95, ten clients | 69ms |
| Lite goal read p95, ten clients | 38ms |

All measurements were retained before the first budget assertion failed. No browser `pageerror` was recorded in this run. That does not prove every interaction or console warning is error-free.

## Implemented repairs

- Board columns, alternate task views and the Brain hierarchy mount bounded pages with visible counts and native Previous/Next buttons. Search still covers the complete loaded dataset. Document deep links reveal the relevant root/child page. Explicit page changes move focus to the new content and reset its scrolling container.
- The task API adds validated cursor/limit reads capped at 500 records, preserving the existing unbounded array contract for older callers. The browser's typed task adapter assembles the complete collection through bounded requests. The mature ordinary-read budget now exercises a 200-record task page, matching the existing bounded document read. The old full-list timing remains recorded as a bulk result; it must not be described as a like-for-like improvement to that unbounded endpoint.
- The Brain's All Spaces query shares the existing whole-workspace document cache instead of independently downloading the same pages twice. Command palette suggestions show six entries per domain; typed search remains server-backed.
- Habit summaries cache derived statistics and canonical completion day keys, without notes, metadata or full completion records. Each read checks a database fingerprint scoped to workspace, user, zone, local day, habit versions and completion counts/latest completion timestamps. Logging, undo, schedule edits and midnight retire old statistics without relying solely on a timer or a delayed socket event. The cache is bounded and expires entries; failed computations are removed. The browser requests the tracker projection, while the legacy API preserves recent full completion details. Streaks use full history.
- A paging interaction reproduced the floating AI launcher's overlap with the Next button. The desktop entry now lives in the sidebar, or in the utility header when the sidebar is collapsed; mobile retains its header entry. The conversation remains available by shortcut, with focus returned on close.
- Sidebar badges use one authorized count projection. The closed command palette performs no collection reads; opening it requests bounded recent suggestions, and typing uses the existing server search. Successful relevant writes and socket updates invalidate counts/recent suggestions. Search preserves navigation, result grouping, cancellation, retry and keyboard selection.
- The backup restore inserts at most 500 records per database batch inside the existing all-or-nothing transaction. The mature backup initially exceeded the generic 15-second fixture request deadline. Its explicit bulk deadline now accommodates the existing 60-second server transaction budget; ordinary read deadlines and performance budgets are unchanged. This is a separate bulk operation, not a relaxed ordinary-read budget.

## Passing mature run

The first passing run completed in 50.3 seconds, including setup, browser measurements, export, restore, relationship checks and cleanup. Source: private `scale-navigation-batched.log` and `scale-measurements-navigation.json`. The final post-Planner acceptance run below supersedes these timings.

| Measurement | After repairs |
| --- | ---: |
| Tasks, light / dark route-to-ready | 1,477 / 1,413ms |
| Tasks DOM elements, light | 2,963 |
| Desktop long-document load, light / dark | 1,000 / 934ms |
| Phone long-document load, light / dark | 906 / 910ms |
| Long-document DOM elements, desktop light | 2,726 |
| Planner, light / dark | 1,299 / 1,222ms |
| Task 200-record page p95, ten clients | 300ms |
| Document 200-record page p95, ten clients | 82ms |
| Lite goal p95, ten clients | 42ms |
| Habit tracker projection p95, ten clients | 355ms |
| Backup JSON | 14,801,650 bytes |
| Export / restore | 822 / 10,675ms |

All measured routes met the fixed 2,000ms budget and ordinary read projections met 500ms p95. Task page and Habit tracker results use different response contracts from the original full-list measurements. Export/restore preserved all 5,000 tasks, 2,000 documents, 36,500 completions, 100 goals, 200 projects, 50 habits and 730 daily logs, with restored project-goal, task-project and habit-goal ownership links checked. No embedding chunks were generated. No browser `pageerror` was recorded in this run.

Five focused live contract cases passed for task pagination and workspace isolation; habit projection invalidation, backfill ordering and timezone behavior; and navigation count/recent-search scoping. Two mocked navigation cases passed, including badge refresh after capture. These do not replace the full regression suites.

### Final post-Planner acceptance

The unchanged fixed budgets passed again in 52.1 seconds, including fixture setup and backup restoration. Source: private `scale-measurements-acceptance.json` and `scale-acceptance.log`.

| Measurement | Final acceptance |
| --- | ---: |
| Tasks, light / dark route-to-ready | 1,560 / 1,432ms |
| Tasks DOM elements, light / dark | 2,963 / 2,971 |
| Desktop long-document load, light / dark | 975 / 962ms |
| Phone long-document load, light / dark | 896 / 902ms |
| Planner, light / dark | 1,347 / 1,203ms |
| Task 200-record page p95, ten clients | 285ms |
| Document 200-record page p95, ten clients | 99ms |
| Lite goal p95, ten clients | 58ms |
| Habit tracker projection p95, ten clients | 358ms |
| Backup JSON | 14,801,650 bytes |
| Export / restore | 944 / 10,946ms |

Counts and linked ownership checks passed, with no browser `pageerror` recorded. The separate Planner interaction fixture verifies paging and complete backlog search across 450 tasks; route timings do not stand in for every Planner interaction.

## Related error-boundary repairs

Focused cases reproduced four failures: Habit creation exposed adapter details in the HTTP body; malformed rejections caused controllers to reject again; an internal missing-file message was misclassified as a public 404; and a non-operational AppError bypassed production error hiding.

Goal/Habit controllers now use the shared unknown-input error boundary. Their known domain input/not-found/conflict failures use typed AppError instances, and optimistic Prisma missing-record conflicts retain 409 behavior. The legacy compatibility adapter matches exact public messages instead of arbitrary “not found” substrings. Production diagnostics retain request IDs and bounded classifications rather than raw adapter messages or stacks. Other existing controllers/logging paths remain under the broader security review.

## Verification and limits

The original full live run passed 127 with seven optional skips before these performance repairs. It verifies the Goal pilot/dependency update, not this later slice. Initial list checks passed 22 existing Brain/UI cases and exposed the AI overlap; two new document assertions needed disambiguation between the current breadcrumb and tree row. The focused error repairs passed their first ten cases, and another production-log privacy case was added subsequently.

The affected browser checks passed (22), as did the mature qualification above. Final qualification passed the ordinary baseline, 171 backend unit tests, 59 integrations, 25 validation tests, 262 mocked/frontend checks, 135 live checks (eight mode-selected skips) and all 26 isolated HTTPS cases. Configured-provider AI workflows passed; required Gemini text/Ask checks failed HTTP 503. Physical devices, spoken screen-reader testing, independent usability observations, public hosting/storage and remote CI activation remain separate open evidence. See the [complete verification ledger](2026-10-20-quality-verification.md).

Private evidence: `.audit/quality-2026-10-19/scale-before.log`, `scale-measurements-before.json`, `domain-errors-before.log`, and subsequent named verification logs. Raw source/account details and private service configuration are not published.
