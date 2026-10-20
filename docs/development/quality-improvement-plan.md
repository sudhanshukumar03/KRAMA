# KRAMA code and UI quality improvement plan

Date: 2026-10-19. Status: execution authorized; Goal pilot, shared controls, typed adapters and dependency repairs implemented; full workspace rollout and mature qualification in progress (updated 2026-10-20).

## Outcome and definition of completion

Raise KRAMA's maintainability, correctness, usability and visual consistency to a standard that can be demonstrated through code review, repeatable checks and observed use. The current review estimates code quality at 7.5/10 and UI quality at 8/10. Those are judgments, not standardized measurements.

Treat 10/10 as the quality ambition. Completion requires every applicable acceptance gate below to pass, with evidence and disclosed limits. A numerical self-rating cannot establish perfection or the absence of undiscovered defects. External blockers remain pending until verified.

The user authorized execution with “go on” after reviewing this plan. Work proceeds in small, reviewable changes. Public deployment, remote repository changes and paid service setup remain separate environment actions. Progress and evidence are recorded in the [work register](quality-work-register.md) and [baseline](quality-baseline.md).

## Execution checkpoint, 2026-10-20

| Phase | Current status and remaining exit work |
| --- | --- |
| 0 — Baseline | Source inventory, before captures and fixed small/mature workload budgets recorded. Broader feature/state, sustained-memory and field evidence remain tracked separately |
| 1 — Contracts and policies | Task/Goal adapters, safe error boundaries, scoped read models and data-contract checks implemented; remaining domain adapters and policy mapping are in progress |
| 2 — Interface system | Canonical system specification, development-only showcase, shared controls and reference captures implemented; complete control/state migration remains open |
| 3 — Goal detail pilot | Composition/draft/recovery/connection extraction and targeted responsive, conflict and keyboard checks verified; independent human acceptance belongs to Phase 6 |
| 4 — Workspace rollout | Shell/search, list rendering and Planner refinements verified. Focus, Brain editor and Project responsibility cleanup and broader module/control review remain open |
| 5 — Reliability/security/performance | Fixed small/mature budgets, large transactional restore, typed failure privacy and grounding repairs verified; remaining logs, rich content and security controls still require review |
| 6 — Release acceptance | Final frontend/live, HTTPS, dependency and workflow checks passed. Configured Groq workflows passed; Gemini-only Ask and direct text failed HTTP 503. Physical devices, spoken screen reader, observed usability and actual remote/public environments remain pending |

The [current verification ledger](../audits/2026-10-20-quality-verification.md) distinguishes final runs, earlier evidence and outstanding work. This checkpoint does not close the complete plan or assign a perfect quality score.

Scope decision, 2026-10-20: the user deferred R2 image uploads as **Coming soon**. Successful R2 uploads are excluded from current release acceptance. Keep the existing Coming soon UI, disabled upload control when storage is unavailable, and clear rejection of direct upload requests. Built-in wallpapers and gradients remain usable. Verify real storage success/recovery before enabling this future capability.

## Starting evidence

- Live workspace checks: 127 passed, 6 optional cases skipped.
- Isolated HTTPS production staging: 26 passed, including sessions, WSS, worker delivery, backup import/export, restart recovery and theme-palette contrast.
- Backend: 157 unit tests and 59 integration tests passed. Shared validation: 25 passed. Lint, type checks and workflow syntax passed.
- Real Brain retrieval, worker embeddings, Ask and Compose passed with the usual text configuration and with Gemini-only text. Final standalone Gemini text probes subsequently failed with provider HTTP 503 in three attempts; embeddings and Groq passed.
- No physical phone/tablet was connected. Browser emulation does not verify actual keyboards, touch ergonomics or OS sleep.
- CI files exist locally; remote secrets and required-status settings have not been activated. Public HTTPS and successful R2 uploads have not been verified.

The [release verification report](../audits/2026-10-19-release-verification.md) is the current evidence source. Existing test counts are a baseline, not a quality quota.

## Observed gaps to address

| Gap | Current example | Required result |
| --- | --- | --- |
| Responsibilities combined in large components | GoalDetailDrawer 1,221 lines; FocusPage 1,068; Brain Editor 861; ProjectDetail 754 | Focused view components, feature hooks and policies with clear ownership |
| Incomplete type boundaries | `any` in task controller errors/input casts and loosely typed metadata | Validated unknown input, explicit contracts, typed errors and documented adapter exceptions |
| Rules can diverge between modules | Dates, eligibility, completion, recovery and linked entities span multiple features | Documented authoritative rules and shared tested policy functions where appropriate |
| Mixed interaction patterns | Browser confirms alongside application dialogs; module-specific controls | Consistent dialogs, forms, pending states, errors, save feedback and focus behavior |
| Uneven visual hierarchy | Repeated cards/actions, small secondary data, varying screen density | Clear page purpose, grouped information and restrained primary actions |
| Incomplete proof outside local automation | Physical devices, current Gemini availability, remote CI enforcement | Explicit evidence or a visible pending condition for each item |

File length is a review signal. Generated holiday data, schemas and cohesive declarative content are assessed differently from interactive stateful components.

## Product rules to preserve

Record these as decision tables before moving their implementations. Link each rule to existing coverage or a focused missing case.

| Area | Invariants |
| --- | --- |
| Personal workspace | Every read, mutation, queue job, search result and event respects the selected user's workspace and permissions |
| Inbox and Tasks | Capture remains quick; review moves or classifies an item without duplication or lost notes; task state has one authoritative meaning |
| Dashboard and daily plan | Today's priorities, explicit scheduling, deadlines and daily review decisions have documented precedence; completed priorities retain their intended day history |
| Planner | Task reservations, routine occurrences, availability and overlaps remain consistent; invalid changes roll back atomically |
| Habits | Completion cannot predate the habit's effective start; future-day behavior is explicitly defined; schedule, local dates, undo and streak calculations agree |
| Goals | Progress aggregation, child goals, manual progress, linked habits/projects and undo follow one documented model; cycles and cross-workspace links are rejected |
| Projects | Linked tasks/notes remain scoped; deletion and recovery preserve independent prior deletions and clear unavailable links correctly |
| Brain | Titles, content, hierarchy, revisions, search, trash and undo remain consistent; stale embedding jobs cannot expose outdated or deleted content |
| AI | Ask uses accessible sources and meaningful citations; Compose distinguishes proposed text from saved text; cancellation, unavailable providers and retry preserve user work |
| Focus | Explicit future scheduling retains precedence; dependencies and daily decisions govern eligibility; pause adds no work time; recovery saves a completion once |
| Session and synchronization | Refresh, logout/account change, multiple tabs, WSS reconnect and stale responses cannot restore old identities or overwrite another workspace's draft |
| Backup and persistence | Import validates format and links, handles failure safely, and preserves supported older versions; restarting or restoring does not silently lose records |

Any ambiguous product rule becomes an explicit decision with examples. A refactor preserves current verified behavior unless a separately identified defect requires a change.

## Architecture and code standards

Keep React/Vite, Express, Prisma, the existing shared packages and Playwright. Use existing feature subfolders and hooks before adding a new abstraction. Framework replacement, microservices and a universal state/store rewrite are outside this quality pass.

The dependency direction will be:

```text
UI views -> feature hooks/controllers -> API adapters -> shared HTTP contracts
Routes -> request validation and authorization -> domain services -> Prisma/queues
Pure policy functions -> explicit inputs and outputs; no React, requests or storage
```

- Domain services own authorization-sensitive decisions and transactions. Frontend checks improve feedback; the server remains authoritative.
- Share portable validation and deterministic policy definitions where useful. Keep database models, secrets and server-only code out of browser contracts.
- Keep server state in the existing query layer, transient UI state near its view, and drafts in the existing recovery mechanisms. Account/workspace/entity identity must scope caches and recovery records.
- Split the API module by domain behind its current facade. Preserve refresh coordination and authenticated JSON/stream/upload/download behavior while consumers migrate.
- Standardize typed error codes, validation details, conflicts and retryability without a flag-day API break. Validate external input, persisted legacy metadata and third-party responses at their boundaries.
- Existing strict TypeScript stays enabled. Introduce additional checks incrementally after measuring failures. No new unexplained `any`, double casts or suppression directives in changed production paths; isolate necessary third-party exceptions.
- Review stateful UI files above approximately 400 lines and hooks above 250. Aim for short route/view composition, but extract by responsibility rather than splitting solely to satisfy a line count.
- Centralize repeated domain rules only after checking their behavior is actually equivalent. Document deliberate differences between deadlines, planned work dates and routine occurrences.
- Publish events after commit; retain lock ordering, optimistic versions, retry safety and completion idempotency. Preserve queue payload compatibility during rolling version changes.
- Use consistent formatting and narrow lint rules. Establish a baseline and prevent new violations; avoid obscuring behavioral changes with repository-wide formatting churn.

## UI direction and shared standards

KRAMA should feel like a calm personal working environment. The distinguishing sequence is capture -> choose -> plan -> focus -> review. Inspiration from Notion and Linear informs hierarchy and restraint; KRAMA retains its own existing identity and product behavior.

Preserve Inter, the Iris accent, current light/dark palette, the supplied KRAMA logo and the actual habit icon. Preserve black text in the colored hero topic pill and the blue/white Explore action requested earlier. Consolidate existing design documents and tokens; resolve their conflicting typography values into one canonical specification.

| Area | Planned standard |
| --- | --- |
| Typography | Explicit roles for page titles, section headings, body, forms, metadata and document prose; 14-16px workspace body, 16px phone text inputs, secondary metadata generally at least 12px |
| Spacing | Shared 4/8px-based scale; consistent desktop/tablet/phone gutters; related content closer together than separate sections |
| Color | Semantic tokens for foreground, surfaces, status, borders and interactive states in both themes; normal text at least 4.5:1; large text and meaningful non-text UI at least 3:1 where applicable |
| Surfaces | Use rows, sections and dividers where they clarify work; reserve panels for meaningful groups and elevation for overlays |
| Actions | One visually dominant action per task context; quieter secondary actions; destructive actions separated and recoverable where supported |
| Components | Shared Button, IconButton, TextField, Select/Combobox, Dialog/Drawer, Menu, Tabs, Badge, Tooltip, EmptyState, ErrorState, SaveStatus and skeleton patterns |
| Interaction | Semantic controls, visible focus, pending/disabled/error states, focus return, consistent Escape behavior, and touch areas targeting 44x44 CSS px where practical |
| Copy | Plain, specific verbs; explain what happened and how to recover; remove repetitive marketing-style prose and redundant labels |
| Motion | Brief feedback for user actions, usually 100-220ms; honor reduced motion, preserve orientation and avoid layout shifts |
| Navigation | Stable module names, working deep links and browser back/forward; reflect shareable filters/views in URLs where useful |

44px is KRAMA's ergonomic target, not a claim that it is the WCAG AA minimum. Accessibility assessment uses the applicable [WCAG 2.2 criteria](https://www.w3.org/TR/WCAG22/), including [contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Design judgments about hierarchy must also be validated through actual screens and tasks.

## Execution sequence

Each phase has a concrete output and exit gate. Update this document's status table and link evidence as work proceeds. Execution is authorized; update the work register as phase gates are verified.

### Phase 0 - Establish an exact baseline

Inventory all routes, feature components, APIs, policy owners, design tokens, recovery records and tests. Record module-specific debt rather than relying on aggregate file counts. Preserve the user's existing work and distinguish this pass's edits from earlier changes.

Capture representative light/dark screens and behavior on empty, populated and long-content fixtures. Measure route payloads, editor input responsiveness, list performance, API latency and memory under a documented machine/network profile. Use isolated synthetic test storage.

Deliver: baseline inventory, findings with severity/evidence, a rule-to-test map, canonical design-spec location and initial performance budgets.

Exit: the current baseline is reproducible; existing failures/skips and environment limits are individually recorded; each planned work item has an owner in the architecture and a way to verify it. Performance budgets are fixed before optimization begins.

### Phase 1 - Consolidate contracts and product policies

Map current date/time, eligibility, completion, progress, linking, deletion/restore and error behavior to their authoritative implementations. Consolidate only proven duplication. Add missing boundary cases before changing high-risk behavior.

Refine shared schemas/types, parse legacy metadata explicitly, standardize error handling, and define domain API adapter boundaries. Add import-boundary checks incrementally. Maintain existing response compatibility through adapters until migration is complete.

Deliver: policy decision tables, typed contracts, the first domain adapter and a small dependency-boundary map.

Exit: changed workflows remain behaviorally equivalent except for documented bug fixes; malformed input, cross-workspace access, stale versions and transaction failures have meaningful checks.

### Phase 2 - Define and demonstrate the design system

Reconcile theme, typography, spacing, icon, radius and state tokens. Inventory existing primitives before extending them. Build a lightweight internal component showcase using the existing stack, with both themes, keyboard states, validation, busy states and long labels.

Prepare representative Dashboard, Goal detail and mobile Planner compositions using realistic content. Compare density, grouping and action hierarchy before applying patterns across every screen.

Deliver: one canonical specification, state-complete shared components and captured desktop/mobile reference compositions.

Exit: components have consistent semantics, focus behavior and theme contrast; the reference screens clearly express their primary job and support long content. No unfinished global style overrides leak into unrelated modules.

### Phase 3 - Prove the approach on Goal detail

Refactor GoalDetailDrawer into composition, settings, progress/check-in, connections and recovery responsibilities. Reuse the existing goal draft storage and modal accessibility behavior. Migrate its repeated controls to the shared design system in reviewable steps.

Deliver: a maintainable first feature with before/after source boundaries, UI captures and behavior evidence. Use the measured result to adjust the extraction pattern before wider rollout.

Exit: goal edits, progress, links, child goals, version conflicts, offline save failures, recovered drafts, workspace switches, keyboard navigation and focus return pass. A failed subordinate request must not disable unrelated editing.

### Phase 4 - Apply the pattern across the complete workspace

Work through these slices in order. Finish the slice's code and UI acceptance before starting another broad migration.

| Order | Slice | Concrete improvement and protected behavior |
| --- | --- | --- |
| 1 | Shell, search and navigation | Consistent headers/toolbars, command search and notification states; retain shortcuts, mobile drawer and workspace switching |
| 2 | Dashboard and Inbox | Make today's decision and quick capture clear; remove repeated summaries/actions; preserve daily review, capture classification and drafts |
| 3 | Tasks and Planner | Separate filters, editing, board/calendar views and scheduling policies; clarify deadlines versus planned time; retain dependency rules, capacity, overlaps and reservations |
| 4 | Habits and remaining Goals views | Unify date/status feedback and progress presentation; retain start-date bounds, local-day rules, schedules, streak undo and goal relationships |
| 5 | Projects | Clear task/note/goal context and editing; retain linked-item scoping and delete/restore histories |
| 6 | Brain and AI | Separate tree, editor persistence, search, links and AI panels; preserve content/revision ordering, conflict recovery, selection, undo and source-grounded AI |
| 7 | Focus | Extract lifecycle/persistence orchestration from layout rendering; keep all layouts, separate-tab flow, exact elapsed time, preferences and pending completion recovery |
| 8 | Landing and supporting screens | Apply final typography/component rules to landing, media, login/signup, settings, backup/import, notifications, errors and not-found states; preserve earlier requested content removals |

Backend refactoring follows the corresponding feature slice. Do not move every service and route simultaneously. Keep tested service facades during incremental extraction.

Exit per slice: targeted checks, relevant API/integration checks, both-theme visual review, keyboard paths and updated documentation pass. Record removed duplication and remaining justified exceptions.

### Phase 5 - Performance, security and reliability qualification

Profile before optimizing. Keep route-level loading boundaries, avoid unrelated feature downloads, prevent repeated network work, inspect query plans and eliminate measured N+1 behavior. Apply pagination or virtualization where actual datasets need it, while preserving keyboard and screen-reader navigation.

Use synthetic mature-workspace fixtures: approximately 5,000 tasks, 2,000 documents with a long-document case, 200 projects, 100 goals, 50 habits and two years of history. These are proposed qualification workloads, not declared product limits. Bulk fixtures must not trigger real paid AI jobs.

Target good Core Web Vitals: LCP <=2.5s, INP <=200ms and CLS <=0.1 at the 75th percentile, segmented by device. Controlled lab checks can validate budgets during development; actual field performance stays pending until enough real measurements exist. [Web Vitals guidance](https://web.dev/articles/vitals).

Proposed controlled API goals: p95 <=500ms for ordinary indexed reads and <=750ms for ordinary mutations at ten active synthetic clients on the recorded profile. AI generation, exports/imports and bulk indexing have separate latency/timeout/progress criteria. Review these proposed goals once in Phase 0 against hardware and workload, then fix the accepted budgets before implementation.

Review applicable [OWASP ASVS](https://owasp.org/projects/asvs) controls with a small threat model: authorization and workspace isolation, sessions/CSRF/origins, input validation, document rendering/XSS, upload/import handling, rate limits, secret/log hygiene and dependency/image risks. Record applicable controls and exclusions; this is not an unsupported security certification claim.

Inject offline, timeout, duplicate submission, version conflict, provider 429/503, expired login, worker retry and server restart failures. Verify safe cancellation, bounded retries, job idempotency, after-commit events and preservation of unsaved work. Add sanitized request/job identifiers and useful diagnostics without logging note bodies, tokens or keys.

Deliver: performance traces and budgets, security findings/disposition, dependency review, fault-injection results and restore/recovery evidence.

Exit: no unresolved critical/high security or data-loss defect; budgets met or a concrete scope decision remains visibly pending; all high-risk failure paths preserve user data.

### Phase 6 - Full product acceptance and release enforcement

Run the complete build, type, lint, validation, meaningful unit/integration, mocked/browser and live suites after the final changes. Run actual production-image HTTPS staging. Verify AI providers directly and through Brain workflows; fallback must not conceal a failing required provider. Preserve optional checks with clear names and reasons rather than counting skips as passes.

Review the state/device matrix below. Complete manual screen-reader and physical-device checks. Conduct a small usability round with 3-5 representative people using disposable workspaces: capture/review a thought, plan a task, complete a habit, edit/recover a note, connect a project/goal and start/resume Focus. Record task success, confusion and recovery. Set a usability target of at least 90% completion of the defined core tasks without guidance, with no data-loss outcome. This is a small formative sample, not population-level proof.

Wire the confirmed suites into the existing release-ready workflow, capture artifacts on failure, and verify required-status enforcement on the remote repository when authorized access is available. Every future publish/deploy job must depend on the applicable gate. Provider outages leave real-AI qualification failed; they do not become passes through retries or model substitution.

Deliver: final issue register, code/UI scorecards with linked evidence, acceptance captures, test/performance/accessibility reports, operational runbook and release/rollback checklist.

Exit: every required gate passes; open limitations remain explicit. Public HTTPS/certificate checks, remote CI enforcement and real-device evidence require their actual environments and cannot be substituted with local emulation. R2 success is deferred with its Coming soon capability; unavailable uploads must continue to be handled correctly.

## Required acceptance matrix

| Axis | Required cases |
| --- | --- |
| Appearance | Light/dark, normal/reduced motion, focus/hover/active/disabled, error and high-contrast usability review |
| Data/state | First use, loading, empty, normal, long content, large lists, partial failure, offline, saving, saved, conflict, recovered draft, trashed/restored |
| Viewports | 320, 390, 768, 1024 and 1440px; relevant portrait/landscape and browser text enlargement |
| Accessibility | Keyboard-only completion, screen-reader names/order/status, drag alternatives, visible/unobscured focus, zoom/reflow, form errors, readable contrast and motion/media control |
| Browser/device | Chromium, Firefox and WebKit automation for core journeys; actual Android Chrome and iOS Safari for keyboard, touch and sleep behavior |
| Time | Local midnight, DST transition zones, timezone changes, habit creation/start boundaries, overdue versus future scheduling, running/paused Focus across sleep |
| Synchronization | Two tabs, workspace/account switches, stale network replies, reconnect, simultaneous edits, duplicate/reordered events and retried jobs |
| Persistence | Reload, app restart, failed save, old supported backup import, large valid import, malformed import, interrupted operation and verified restore |

Select combinations by feature risk rather than mechanically running the full Cartesian product. Record applicability and coverage; every feature receives both-theme populated/empty/error review, and every high-risk invariant receives an executable check or a documented manual case.

Accessibility completion also requires 200% text enlargement and 400% zoom/reflow checks on applicable content, with intentional two-dimensional working surfaces reviewed under the relevant WCAG exceptions. Automated accessibility findings must be triaged; unresolved applicable failures remain open even if the automated summary score is high. Test at least one desktop screen reader and actual mobile assistive technology when the device is available.

Visual acceptance uses stable fonts, seeded content and controlled animation/time. Review screenshots at the required widths, inspect actual clipping/focus/scroll behavior, and record intentional differences individually. A snapshot baseline is updated only after that review; a bulk screenshot rebaseline cannot close visual findings by itself. Functional tests cannot establish visual polish.

## Work register and evidence requirements

Phase 0 creates a small work register with one row per finding. Keep it beside the audit documents and update it after each slice.

| Field | Required content |
| --- | --- |
| Identity | Stable ID, affected module/files and code/UI/both classification |
| Problem | Observed evidence, reproduction when applicable, severity and user/developer impact |
| Decision | Proposed change, preserved invariants, dependencies and justified exceptions |
| Completion | Specific acceptance criterion, automated/manual checks and expected result |
| Evidence | Before/after captures or code review, test/report links, fixture/environment/build identity |
| Status | Planned, in progress, verified, blocked by environment or explicitly deferred |

For a behavior defect, demonstrate that the focused case fails before the fix where practical, then passes afterwards. For structural work, record the changed responsibility boundaries and representative regression results. For visual work, record both themes and the affected responsive/state cases.

Every phase exit requires no untriaged finding in its changed scope. Critical/high correctness, security, accessibility or data-loss defects block that exit. Other findings need resolution or an explicit product decision with an owner and reason; a deferred known defect prevents an unqualified 10/10 claim.

Keep three final conclusions separate: code quality, UI quality and release/environment readiness. A provider outage alone is not evidence of bad code or visual design. It does keep the applicable real-provider release check failed. Missing physical-device or usability evidence limits the supported UI-quality conclusion.

## Change safety and rollback

- Preserve the existing working tree. Identify change boundaries before execution; do not bundle unrelated historical edits into a new commit or reset them.
- Separate structural extraction, behavioral fixes and visual migration into reviewable changes. Keep comparison evidence so reviewers can distinguish intended changes from regressions.
- Keep compatibility adapters until all consumers migrate, then remove the unused path and verify imports. Never leave two independent sources of a domain rule.
- Backward-compatible changes are preferred. If a database, backup, queue or draft schema needs alteration, define versioning, migration/rollback, old-client behavior and a synthetic restore drill before applying it. Never run a personal database reset.
- On a failed gate, pause that slice, reproduce the issue, fix and rerun affected checks. Reverting concerns only the known change for that slice; it must preserve later user edits and compatible persisted data.
- Keep local heavy checks sequential on this machine because concurrent runs previously exhausted memory. CI concurrency may differ on adequately provisioned isolated jobs.
- Do not delete meaningful regression cases, loosen assertions or raise timeouts merely to obtain green results. Retry transient external failures visibly and retain failed evidence.

## Final quality scorecards

Use these weights to identify improvement priorities, not to average away a release blocker. Each category records evidence, remaining gaps and reviewer judgment. A high weighted score never overrides a failed mandatory gate.

| Code dimension | Weight | Evidence |
| --- | ---: | --- |
| Architecture and maintainability | 20% | Cohesive modules, reviewed dependency boundaries, comprehensible state ownership |
| Domain correctness and data integrity | 20% | Rule tables, edge cases, transaction/race/restore checks |
| Type and contract safety | 15% | Validated boundaries, typed errors, audited exceptions, compatible contracts |
| Reliability and recovery | 15% | Offline, conflict, retry, save/session/worker/restart behavior |
| Security and privacy | 10% | Applicable security review, scoping tests, secret/log/dependency hygiene |
| Performance and resource use | 10% | Measured route, interaction, query and workload budgets |
| Verification and release discipline | 10% | Reproducible tests, enforced gates, useful failure artifacts and runbooks |

| UI dimension | Weight | Evidence |
| --- | ---: | --- |
| Hierarchy and visual clarity | 20% | Real-content screen comparisons and primary-action clarity |
| Workflow usability | 20% | Core journey completion, error recovery and observed task testing |
| Consistent components and content | 15% | Shared primitives, typography, spacing, icons and vocabulary |
| Accessibility | 20% | Automated findings plus keyboard, screen-reader and visual checks |
| Responsive and real-device use | 15% | Responsive matrix, actual mobile keyboard/touch/sleep results |
| Feedback, motion and perceived speed | 10% | Accurate save/pending/conflict states, stable layout and measured responsiveness |

The final report distinguishes implemented, verified, externally blocked and not tested. A 10/10 claim requires evidence across all dimensions and independent human feedback; it is not guaranteed by this plan or automated tests.

## Planning review

The first review found missing precision in evidence traceability, visual-baseline approval, zoom/reflow testing and separation of product quality from external availability. The final revision adds those requirements above. This is a review of plan completeness; implementation results are still pending.

| Plan acceptance question | Final review |
| --- | --- |
| 1. Does it address observed KRAMA problems and specific files? | Addressed: baseline evidence and gap register |
| 2. Does it preserve the personal-workspace rules? | Addressed: module invariants and rule-to-test mapping |
| 3. Does it cover the entire visible product? | Addressed: rollout slices, supporting screens and state matrix |
| 4. Is the order executable with clear dependencies? | Addressed: baseline, contracts/design, pilot, rollout, qualification |
| 5. Does each phase produce a reviewable result and an exit gate? | Addressed: deliverables and acceptance criteria per phase |
| 6. Are data, compatibility and rollback risks handled? | Addressed: isolated fixtures, adapters, versioning and scoped changes |
| 7. Are performance, security and recovery measurable? | Addressed: fixed baseline budgets, applicable controls and fault cases |
| 8. Are UI quality and accessibility checked beyond screenshots? | Addressed: keyboard/screen reader, zoom, physical devices and observed tasks |
| 9. Will future releases detect regressions? | Addressed: required checks, artifacts and remote-enforcement verification |
| 10. Can completion be traced without hiding failures or uncertainty? | Addressed: work register, separate scorecards and explicit pending evidence |

All ten planning requirements are addressed in the reviewed document. This does not assign a scientifically meaningful perfect score to the plan. Reassess it if Phase 0 uncovers a new constraint, then record the revision before dependent implementation. Implementation has started; remaining phases stay pending until their gates pass.
