# Krama fix recheck — October 15, 2026

**Current status: RC-01 and RC-02 are fixed and regression-verified.** See [the implementation report](2026-10-15-connected-flow-fixes.md). The unresolved status and failing tests below describe the original review.

The subsequent [connected-flow review](2026-10-15-connected-flow-review.md) originally confirmed these two issues and recorded four additional gaps. All six are now covered by the implementation report above.

**Original result: two P2 edge cases reproduced.** The earlier nine scenarios retained their fixes, but Goal draft protection and Focus completion recovery did not yet cover these navigation/save combinations. That recheck changed diagnostic tests and documentation only; the later application fixes are recorded above.

## Findings

### RC-01 — P2: Saving a Goal check-in discards unsaved settings

Location: [GoalDetailDrawer.tsx](../../apps/web/src/components/goals/GoalDetailDrawer.tsx), check-in success handler at line 234 and draft-to-server synchronization at line 145.

Settings fields and check-in fields share one `draftDirty` flag, draft revision, and recovery record. A successful check-in clears that entire dirty flag and recovery record even though its PATCH contains only progress/note, with no settings fields. The synchronization effect then replaces the unsaved settings with server values.

Reproduction:

1. Open a goal and change its title in Edit Settings without saving.
2. Switch to Strategic Cockpit, enter a check-in note, and save the check-in.
3. Return to Edit Settings.

Observed: the unsaved title `Still unsaved settings` becomes `Original title`. The captured check-in request has no title, so the title was neither saved nor retained. The new browser check fails on that exact value assertion.

Required correction: track dirty state for settings and check-in separately. A successful partial save should clear only the fields it actually saved, retain the other draft, and advance its base version without silently replacing its values. Cover both check-in → settings and settings → check-in save combinations.

### RC-02 — P2: Late Focus acknowledgement leaves a completed selection stuck

Location: [FocusPage.tsx](../../apps/web/src/components/FocusPage.tsx), selection persistence at line 368, completion acknowledgement at line 438, and review control at line 983.

Successful completion clears the in-memory session and the pending-completion record. Clearing the persisted selection's active snapshot relies on the component's persistence effect running afterward. If that selection has unmounted during navigation, the effect does not run. Returning restores the stale completed session at zero seconds; its non-null session ref disables Review session and blocks restarting.

Reproduction:

1. Finish a one-minute selected task and hold its save response.
2. Navigate within the SPA to another task. Retry the pending completion there so the server acknowledges the same completion ID.
3. Release the original successful response and navigate Back.

Observed: the original task returns at `00:00`, with **Review session disabled** despite its completion being saved. The new browser check fails on that enabled-state assertion.

Required correction: retire/update the matching persisted active snapshot as part of acknowledging the completion, independently of a mounted component effect. Compare completion IDs before modifying the snapshot so an older response cannot clear a newer timer. Returning should offer the completion decision rather than restore an active zero-second session.

## Verification

| Check | Result |
| --- | --- |
| Existing browser/module regressions | 107 passed in one full run |
| Additional edge-case browser checks | 2 failed, reproducing RC-01 and RC-02 |
| Backend unit/service suites | 21 passed |
| Shared validation tests | 25 passed |
| Production build | Passed |
| Workspace lint | Passed |
| Test/configuration TypeScript | Passed |

PowerShell reported a `NativeCommandError` while redirecting the browser run's Node color warning, producing a wrapper exit status of 1. Playwright itself completed with `107 passed`; its recorded run status is passed. This is separate from the two new edge-case checks, which fail their behavioral assertions.

Evidence:

- [Additional browser checks](../../.audit/fix-recheck-edgecases.spec.ts)
- [Isolated browser configuration](../../.audit/fix-recheck.config.ts)
- [Edge-case failure log](../../.audit/fix-recheck-edges.log)
- [Existing regression log](../../.audit/fix-recheck-browser.log)
- [Backend regression log](../../.audit/fix-recheck-server.log)

```powershell
corepack pnpm exec playwright test --reporter=list
corepack pnpm exec playwright test --config .audit/fix-recheck.config.ts --reporter=list
corepack pnpm --filter server test
corepack pnpm -r run build
corepack pnpm -r run lint
corepack pnpm exec tsc --noEmit
corepack pnpm --filter @krama/validation test
```

All browser API responses are mocked. Backend unit/service tests replace database/cache IO. No live workspace records were modified. Isolated database/Redis integration and deployed production behavior remain unverified.
