# Quality baseline and ownership

Captured 2026-10-19 before production source changes for this pass. Plan: [quality improvement plan](quality-improvement-plan.md). Findings: [work register](quality-work-register.md).

## Reproducible source inventory

`node scripts/quality/source-inventory.cjs --output .audit/quality-2026-10-19/source-before.json`

The read-only TypeScript AST inventory records source hashes, line counts, explicit `any` syntax, type assertions, hooks, import specifiers, route literals, browser confirmations and named tests. CSS files are included in source hashing. Generated holiday data and tests are separated from production summaries. Counts are review signals, not security findings or quality scores.

| Source | Production files | Lines | Explicit `any` syntax |
| --- | ---: | ---: | ---: |
| Web | 160 | 32,724 | 92 |
| Server, excluding generated holiday data | 112 | 12,203 | 209 |
| Shared types | 7 | 844 | 0 |
| Shared validation | 6 | 453 | 2 |

384 source/test/style files were copied to the ignored baseline directory with a hash inventory. Existing worktree status was recorded separately. This pass will not reset, bulk-stage or commit the pre-existing edits.

Both applications already enable strict TypeScript. The server also enables unchecked-index access checking. Additional safety work must improve boundary types and behavior rather than merely enabling an already-enabled flag.

## Product rules and current owners

| Rule | Authoritative implementation | Existing evidence to retain |
| --- | --- | --- |
| Workspace membership and scoped access | Server auth middleware, domain services and repositories | `task_workspace_scope`, `document_roles`, live `goals-habits` and workspace journeys |
| Capture/review and today's priorities | `personalDay.service`, `task.service`, browser `personalTasks` | `personal_workspace`, `persistent_workflow`, live `personal-journey`, `capture-dashboard` |
| Deadline versus explicit scheduling and dependencies | `focusTimer.service`, `planner.service` | `focus_planner_algo`, live `remaining-logic-regressions` and `focus-eligibility` |
| Reservations, overlap and linked task consistency | `planner.service`, validated planner routes | `planner_atomicity.integration`, `planner_workflow`, live `planner` and `repair-edge-cases` |
| Habit day eligibility and streaks | `habitCompletionDate`, `habit.service`, `habitStreak.service` | `habit_completion_date`, live `habit-creation-date`, `goals-habits`, `streak-sync` |
| Goal hierarchy, progress and linked entities | `goal.service`, `goal.repository`, `goalTree` | `workflow_progress`, live `goals-habits`, `cross-section-flow` |
| Project/task deletion and restore histories | `task.service`, project repository/service | `task_recovery.integration`, live `remaining-logic-regressions` |
| Brain content revisions, hierarchy and trash | Document services, `documentSaveQueue` | `document_move_revision`, `document` integration, live `brain`, `shared-workflow`, workspace journeys |
| Grounded search and AI insertion | RAG retriever, document AI service, GroundedAIPanel | Live `real-ai-workflows`, `ai-assist`, provider failure coverage |
| Focus elapsed time and completion recovery | Server Focus service, browser `focusRecovery` and FocusPage | `focus-recovery` unit, live `focus-lifecycle`, persistent recovery UI |
| Session refresh and multi-tab coordination | Browser authenticated transport and AuthContext, auth server | Live configuration, persistent workflow and production HTTPS cases |
| Goal unsaved settings/check-in independence | GoalDetailDrawer, `goalDraftStorage` | Mocked `partial-save-recovery`, live persistent recovery and shared workflow cases |
| Backup compatibility and restart | `workspaceRestore.service`, production stack | `personal_workspace` unit, production ingress/HTTPS restart checks |

These entries identify owners to inspect, not permission to merge different rules. Calendar day keys, UTC timestamps and user timezone boundaries remain distinct concepts. The explicit habit rule currently allows backfill for a habit that existed on that day, rejects pre-creation dates and rejects future days.

## Design and route ownership

`App` owns public/auth/Focus routing; `AppShell` owns protected module navigation. Feature routes cover Dashboard, Inbox, Tasks, Planner, Goals, Habits, Projects and Brain. The plan's final supporting-screen slice includes account/settings, workspace/import/export, notifications and errors.

Current color authority: `apps/web/src/styles/theme.css`. Feature styling exists in workspace, sidebar, planner, inbox, command-palette, landing and landing-film stylesheets. Existing primitives include BaseButton, PageHeader, search fields, empty/error/loading states, deletion confirmation and modal focus management. Extend them after reviewing gaps rather than introducing a competing component library.

Phase 2 will establish `docs/design/system.md` as the canonical consolidated specification, linking existing design documents as historical/contextual references. Preserve current Inter/Iris identity and user-approved icon, hero pill and landing content choices.

## Runtime baseline profile and budgets

The unchanged client was rebuilt before measurement. A new explicit baseline mode uses the production Vite preview, a separately owned test API/worker and disposable fixtures. It captures 390/1440px light/dark empty Goals, populated Dashboard, long-title Goal detail, Planner and a long Brain document. It records route-to-ready durations, requested asset sizes, supported browser performance entries, heap samples, edit-and-save time and fifty task reads at ten concurrent clients.

This is an unthrottled local Windows measurement with retained browser cache, not public field performance or a mature-workspace benchmark. Editor edit-and-save time includes automation and the autosave delay; it must not be presented as keystroke latency. The qualified pre-change capture passed in 30.1 seconds. Fifty reads at ten concurrent clients measured p50 48.5ms / p95 113.3ms; fifty creates measured p50 92.7ms / p95 121.3ms. Four editor input-to-two-animation-frame samples were 4.6-16.2ms, and edit-through-save samples were 992-1,050ms. These are local observations, not field INP or a statistical interaction-latency guarantee. Heap samples include unreclaimed allocations across navigation and do not establish retained-memory growth. Mature-workload and field qualification remain open.

Initial proposed qualification goals remain LCP <=2.5s, INP <=200ms and CLS <=0.1 for real users; controlled ordinary reads p95 <=500ms and mutations <=750ms on the specified workload/profile. Baseline measurements determine appropriate per-route bundle and interaction budgets before optimization; no budget is silently relaxed after changes.

## Current verification limits

The previous release report records the passing core/unit/integration/staging baseline. Actual phones, screen-reader spoken output, observed user testing, remote CI enforcement, public trusted HTTPS and real storage success remain unverified. Gemini text's last availability probe failed with provider HTTP 503. These conditions are kept separate from code/UI implementation findings.

### Fixed budgets for this pass

For the controlled small-workspace profile above: task read p95 <=500ms; task create p95 <=750ms; route-to-ready <=2,000ms; editor input-to-two-frames <=50ms per sample; edit-through-save <=2,000ms. Investigate regressions before changing a threshold. Repeat measurements only when a change/failure or noise concern warrants it.

Preserve route loading boundaries and cap compressed asset groups at the following pre-optimization budgets: React vendor 85 KiB, editor vendor 140 KiB, Brain feature 36 KiB, Planner feature 30 KiB, Focus feature 30 KiB, global CSS 28 KiB and entry JS 28 KiB. These are gzip ceilings for corresponding generated chunks, not sums of all chunks or cold-route transfer claims. The fresh baseline measured approximately 78.2, 127.7, 31.4, 26.3, 25.5, 24.6 and 24.1 KiB respectively. If chunking changes, compare equivalent route asset groups and document the mapping instead of bypassing the budget by renaming a file.

Evidence: `.audit/quality-2026-10-19/source-before.json`, `source-measured.json`, `measurements-qualified-before.json`, `baseline-qualified-before.log`, and `test-results/live-baseline.json`. No application production code changed before these measurements.

### Follow-up measurement, 2026-10-20

The asserted small-workspace qualification passed in 30.2 seconds after the Goal, list/read and navigation repairs. All measured routes were below 926ms; editor input-to-two-frame samples were 5.3–22ms and edit-through-save 919–1,099ms. Fifty task reads at ten clients measured p95 56.2ms; fifty creates measured p95 155.4ms. These remain controlled observations under the profile above, with the original fixed budgets unchanged. Evidence: `baseline-navigation-final.log` and `baseline-measurements-navigation.json` in the ignored audit directory.

The separate [mature workload](../audits/2026-10-20-quality-scale.md) also passed, including the bulk backup round-trip. Its ordinary task/habit measurements exercise bounded response projections, so they are not presented as like-for-like improvements to the original full-list endpoints. Field Web Vitals and retained-memory/sustained-device measurements remain open.

The final post-Planner acceptance also passed: worst measured route 915ms, input-to-two-frame samples 13–22.2ms, edit-through-save 957–1,070ms, fifty task reads p95 85.7ms and fifty task creates p95 109.2ms at ten clients. Source: private `baseline-acceptance.log` and `baseline-measurements-acceptance.json`. The fixed budgets and lab limitations above are unchanged.
