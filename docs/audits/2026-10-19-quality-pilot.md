# Quality improvement: baseline and Goal detail pilot

Date: 2026-10-19. Execution authorized by the user's “go on”. This is an implementation record for the first slices of the [quality plan](../development/quality-improvement-plan.md), not a whole-product completion or 10/10 rating.

## Changes and responsibility boundaries

Goal detail was a 1,221-line component combining fetching, editing, recovery, connections and rendering. It now composes a header, overview, settings and check-in views. Feature hooks own the query/mutation model, independent drafts and connected-entity writes. The public `api.goals` facade remains compatible through a typed domain adapter; authenticated transport and refresh coordination remain in the existing client.

The shared confirmation defaults to continuing editing, traps focus, cancels on Escape and returns focus to the opener. Goal discard now uses this dialog and preserves the requested close/navigation action. Settings and check-in remain independently dirty and recoverable. Shared text fields associate labels, hints and errors, and phone inputs use 16px text. The development-only component showcase is not a production entry point.

Two visual/state defects were reproduced before repair: long mobile goal titles were clipped, and completed/paused/cancelled goals could be labelled overdue. The repaired title wraps fully. Timing feedback now respects goal status and the presence of an actual target date.

The server error boundary accepts unknown thrown values without crashing on non-string messages or circular objects. Task controller input uses the parsed schema's inferred type. Dependency remediation and its reproduced proxy regression are documented separately in the [dependency review](2026-10-19-dependency-review.md).

## Host inspection

| Concern | Result |
| --- | --- |
| Framework and route | React 19.2, Vite 8.1, React Router 7.18; `/app/goals?goal=<id>` |
| Existing components | BaseButton, IconPicker, ErrorState, ConfirmDeleteButton and `useModalA11y` retained |
| Data and state | React Query 5.101; existing account/workspace/entity-scoped recovery |
| Styles and icons | Tailwind 4.3, semantic theme variables, Inter and existing Lucide 1.26 icons |
| Added runtime | None; semantic HTML, React, CSS and existing focus management |
| Registry installation | None |

## Composition plan and implementation

The job is to understand a goal and update it without losing work. The primary action belongs to the currently edited settings or check-in section. A single scrollable working area keeps the mobile drawer usable.

| Region | Purpose and state handoff | Published component ID |
| --- | --- | --- |
| Header | Full identity, native status selection, secondary actions | none |
| Overview | Progress, motivation, connections; loading and partial failure | none |
| Settings | Dirty → pending → saved/error; retained draft | none |
| Check-in | Independent progress/reflection revision and save feedback | none |
| Confirmation | Safe initial focus; cancel retains work; confirmed discard continues the original action | none |

Both themes share the same semantic roles. The drawer fills 320/390px viewports and is bounded at 768/1440px. Reduced motion removes arrival travel while preserving state and focus handoffs. The canonical specification is [the interface system](../design/system.md).

## Verified evidence

| Acceptance area | Result and limit |
| --- | --- |
| Build | All-package production build passed after dependency updates and the goal-status correction |
| Static checks | Fresh lint, root TypeScript, unit, validation, integration and source/chunk quality gates all passed |
| Responsive geometry | 320, 390, 768 and 1440px, both themes: full title visible; minimum measured control target 44×44px; zero target offenders |
| Keyboard and focus | Safe initial confirmation focus, trap, Escape cancellation, opener focus return and keyboard pace disclosure passed |
| State and recovery | Focused tests cover independent sections, partial save failures, stale versions, draft restoration and closing during a delayed detail request |
| Reduced motion | Geometry/focus checks run with reduced motion; no arrival travel required for operation |
| Theme review | Captures inspected for phone dark, desktop light and both-theme component states |
| Complete mocked run | 239 passed, zero skipped/flaky/unexpected, before dependency updates and the final status correction |
| Latest affected checks | 31 passed after dependency updates and status correction, including six status/date combinations |
| Runtime diagnostics | Focused scope passed. Follow-up on 2026-10-20 traced the Project timeline NaN warning to a fixture missing required `updatedAt`; the corrected calendar-date case passed without the warning |
| Live / production HTTPS / performance | Current full requalification in progress; prior successful runs are not substituted for these changes |
| Screen reader / physical device | Not performed; no physical device connected |

Private reproducible logs, source snapshots, screenshots and machine measurements are under ignored `.audit/quality-2026-10-19/`. The source snapshot records the pre-change working tree, not Git HEAD, and excludes environment files and credentials.

## Regression gates

The maintained quality check records an AST source inventory, ratchets existing explicit `any` allowances, rejects literal browser imports of server/Node code, and enforces fixed gzip budgets by logical chunk group. It covers literal static, export and dynamic imports; it is not a complete proof against computed runtime imports or unsafe casts.

CI now includes dependency audit, quality gates and a production-client measurement run. The measurement fixture uses isolated synthetic records, a fresh build, both themes, phone/desktop layouts, editor input/save samples and 50 reads/writes at ten synthetic clients. These controlled local results do not establish field Web Vitals or mature-workspace performance. Remote CI enforcement has not been activated.

## Remaining work

The pilot does not close the complete workspace migration. Subsequent shell/search and bounded task/Brain list work, mature-workspace qualification and AI/error repairs are recorded in the [work register](../development/quality-work-register.md), [mature report](2026-10-20-quality-scale.md) and [security checkpoint](2026-10-20-security-review.md). Remaining feature decomposition, broader control migration/security review, screen-reader checks and observed usability tasks remain open. Physical-device, public-hosting, real-storage and remote-enforcement evidence require their actual environments.
