# Krama final audit — October 15, 2026

Latest implementation: [all six connected-flow findings are fixed](2026-10-15-connected-flow-fixes.md), with added coverage beyond the original audit. The older review and verification history below is retained for context.

The earlier [fix recheck](2026-10-15-fix-recheck.md) reproduced two Goal/Focus edge cases beyond the original scenarios; both are included in the latest fixes above.

The earlier [workflow review and fixes](2026-10-15-workflow-review.md) covered nine additional defects and recorded 107 browser/module scenarios and 21 backend suites at that stage. This document retains the original four-finding audit below.

**Original four-finding pass: all four findings were fixed and regression-verified.** At that stage, 92 module/mocked-browser tests and 20 backend unit suites passed, along with validation, builds, lint, and TypeScript checks. Latest results are in the implementation report linked above. Live integration coverage limits still apply.

The initial findings and pre-fix verification below are retained as historical evidence. See **Fixes and verification** at the end for the implemented changes and current results.

The initial audit covered the working tree, including existing uncommitted changes and the Focus new-tab fix. Application code was not changed during that initial review; the later implementation is recorded below. Local reproduction scripts were added under `.audit/`.

## Findings

### 1. P1 — Task reordering can use a different workspace from the permission check

Locations: [task controller](../../apps/server/src/controllers/task.controller.ts), lines 70–71; [task routes](../../apps/server/src/routes/task.routes.ts), lines 9–11 and 24; [task service](../../apps/server/src/services/task.service.ts), lines 168–186.

The route checks MEMBER access against `x-workspace-id`, but the controller forwards the request body's `workspaceId` to the reorder service. Unlike the project and goal routes, task routes do not reject conflicting header/body workspace IDs. The service checks the task against that supplied workspace, without independently checking the caller's membership there.

A caller who can write workspace A and knows a task ID and version in workspace B can target B while presenting A for authorization. The service changes the task's position and returns its detailed record, including related records loaded by the repository.

**Evidence:** a local HTTP probe using the real router, authentication middleware, role middleware, and controller returned 200. It recorded one membership check for A and a mutation call targeting B. Database/session responses and the final mutation were stubbed; no real workspace records were accessed or modified. The actual service and repository were inspected to confirm the missing target-membership check.

**Fix:** derive the reorder workspace from the middleware-verified scope, reject conflicting body scopes, and add a regression asserting that authorization and mutation always use the same workspace.

### 2. P1 — A dirty goal draft can overwrite another goal

Locations: [Goals](../../apps/web/src/components/Goals.tsx), lines 629–634; [goal drawer](../../apps/web/src/components/goals/GoalDetailDrawer.tsx), lines 42–44, 105–107, and 207–220.

The same drawer instance is reused when selecting a parent or child goal. Its `goalId` changes, but the synchronization effect exits while `draftDirty` is true. The previous goal's draft fields and version remain attached to the newly selected goal.

**Reproduction:** open a child goal, enter an unsaved title in Edit Settings, use the header's parent-goal link, then save. The browser displayed the parent heading while retaining the child's title draft. The captured request was `PATCH /api/v1/goals/parent` with `title: "Unsaved child draft"` and `version: 1`. With matching record versions, the usual optimistic-lock check does not prevent the wrong-record write.

**Fix:** scope draft state to the goal ID and explicitly handle unsaved edits before switching goals. A keyed drawer can isolate records, but navigation also needs a preserve/discard decision to avoid silently losing drafts. Test parent/child switching with matching and differing versions.

### 3. P2 — Task-only Focus links can reject valid tasks with linked meetings

Location: [usePlannerFocus](../../apps/web/src/hooks/usePlannerFocus.ts), lines 17–21.

When no explicit block ID is supplied, the hook chooses the first non-external block linked to the task. That selection can be a MEETING or PERSONAL block. It then marks the whole selection invalid, even though the task itself is valid and has an estimate. Planner's task action filters those block types before building its link, so the receiving hook can undo that decision by selecting them again.

**Evidence:** a browser reproduction opened a valid TODO task with a 45-minute estimate and an associated meeting through `/focus?task=task-1&date=2026-10-15`. Focus displayed “This scheduled task is unavailable. Return to Planner.”

**Fix:** filter eligible focus blocks before implicit selection. If a task has no eligible block, use its task estimate. Continue rejecting explicitly requested unavailable or non-focus blocks.

### 4. P2 — Dark primary buttons fail the existing text-contrast check

Locations: [theme tokens](../../apps/web/src/styles/theme.css), lines 111 and 123–124; [primary button styles](../../apps/web/src/index.css), lines 335–342.

The dark theme combines near-white button text with a bright blue accent. The rendered Sign In button measured **2.98:1**, below the existing test's **4.5:1** requirement. The shared primary-button style means the problem extends beyond the login screen wherever that token combination is used. Hover makes the background lighter.

**Evidence:** the full browser suite failed `primary contrast and mobile auth layout: dark` with `Received: 2.9830196761218954`. A separate browser measurement reproduced that value at 390px, and its screenshot was inspected.

**Fix:** adjust the dark primary-button foreground/background pair and its hover state, then rerun the contrast check for both themes.

## Validation results

| Check | Result |
| --- | --- |
| `corepack pnpm -r run build` | Passed for shared types, validation, API, and frontend |
| `corepack pnpm -r run lint` | Passed for API and frontend |
| `corepack pnpm exec tsc --noEmit -p tsconfig.json` | Passed for browser tests and configuration |
| `corepack pnpm --filter @krama/validation test` | 25 tests passed |
| `corepack pnpm --filter server test` | 19 suites passed, zero failed |
| `corepack pnpm exec playwright test --project=unit --project=chromium` | 84 passed, one failed: dark primary-button contrast |
| Local authorization probe | Reproduced finding 1 |
| Local browser probes | Reproduced findings 2–3 and measured finding 4 |

The browser suite exercised document saving and conflict recovery, task navigation, Planner, Focus new tabs and session completion, goal/project forms across screen sizes and themes, password changes, and selected keyboard/focus flows. Successful checks apply to those scenarios and fixtures.

The reproduction scripts intentionally assert the observed defective behavior; their passing results confirm reproduction, not product correctness. To rerun them:

```powershell
corepack pnpm --filter server exec tsx ../../.audit/scope-probe.ts
corepack pnpm exec playwright test --config .audit/playwright.config.ts
```

The UI review also used the current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## Coverage limits

- Database integration and live API/browser suites were not run. PostgreSQL and Redis containers are running, but `TEST_DATABASE_URL` and `TEST_REDIS_URL` are absent. Application stores were not used as substitutes.
- Production container builds, migration deployment, backup restoration, and live AI/storage-provider calls were not verified in this audit.
- No dependency-advisory scan or exhaustive security certification was performed.
- The host's nested root build/lint scripts initially selected an incompatible pnpm installation. Direct recursive commands with Corepack's pinned pnpm succeeded; this was treated as a local tooling condition.

The initial recommendation was to resolve findings 1 and 2 before sign-off, then findings 3 and 4, and rerun regression and integration checks. The implementation results below supersede that initial status.

## Follow-up verification before implementation — October 15, 2026

Checked the current `chore/baseline-and-typing` working tree at the user's request to check the fixes. **All four audit findings remain reproducible.**

- The isolated authorization probe again returned 200 after checking workspace A and forwarding workspace B to the reorder mutation.
- Browser probes again captured a child draft submitted to its parent goal and a valid task rejected by Focus because of a linked meeting.
- Dark primary-button contrast remained 2.983:1.
- The earlier Focus new-tab navigation fix passed all **9 targeted browser regression tests**, including task completion, unscheduled tasks, keyboard activation, Dashboard, sidebar, and command-palette entry points.

No application source was changed during this verification. The probes intentionally reproduce defects, so their passing status does not mean those defects are fixed. Full builds and the complete automated suite were not repeated in this follow-up; their earlier results are recorded above.

## Fixes and verification — October 15, 2026

Implemented at the user's request after the follow-up above:

| Finding | Implemented change | Observed verification |
| --- | --- | --- |
| P1 workspace authorization | Task routes reject conflicting header/query and body scopes. The reorder controller uses the middleware-verified workspace for validation and mutation. | The original probe now returns 403 before mutation. Seven permanent backend regressions cover conflicting scopes, unauthorized body-only requests, valid header/body/fallback scopes, and direct controller defense. |
| P1 goal draft isolation | The drawer is keyed by goal ID. Parent/child selection and drawer dismissal confirm before discarding unsaved edits; page unload warns while dirty. Life-pillar edits also mark the draft dirty. | Browser regressions cancel navigation and Escape without losing the draft, accept a switch, verify the destination's own title/version, save only the intended goal, and return with browser history. Both equal and differing parent/child versions pass. |
| P2 Focus selection | Automatic task-to-block resolution skips MEETING and PERSONAL blocks. Without an eligible block, Focus uses the task estimate. Explicit selection of either excluded type remains invalid. | Browser regressions cover both excluded types, explicit rejection, and selection of a valid work block after a meeting. |
| P2 button contrast | Dark `--text-on-accent` now uses a dark foreground against the bright accent background. | Rendered contrast is **6.32:1 normally** and **7.65:1 on hover**, exceeding 4.5:1. Light/dark contrast tests pass, and the updated dark login screenshot was inspected. |

Current checks:

| Check | Result |
| --- | --- |
| `corepack pnpm -r run build` | Passed for all four packages |
| `corepack pnpm -r run lint` | Passed |
| `corepack pnpm exec tsc --noEmit -p tsconfig.json` | Passed |
| `corepack pnpm --filter @krama/validation test` | 25 tests passed |
| `corepack pnpm --filter server test` | 20 suites passed, zero failures |
| New regressions plus existing UI audit | 34 browser tests passed |
| Remaining default module/mocked-browser files | 58 tests passed |
| Total default module/mocked-browser check set | **92 passed, zero failures**, across the two non-overlapping runs above |
| Updated isolated authorization and contrast probes | Passed |

Permanent regressions are in [task_workspace_scope.test.ts](../../apps/server/src/__tests__/task_workspace_scope.test.ts) and [audit-fixes.spec.ts](../../e2e/mocked/audit-fixes.spec.ts). The local `.audit` probes now assert the corrected behavior rather than reproducing the historical defects.

The original Focus new-tab checks pass within the 58-test run. Browser coverage includes the existing 320–1440px layout checks, both themes, keyboard/focus flows, and reduced-motion graph behavior. No custom animation was added to the unsaved-edit confirmation; it uses the browser's native dialog.

Database integration, production containers/migrations, and live external-provider checks remain outside this verification. Application data was not used as a substitute for isolated test services.
