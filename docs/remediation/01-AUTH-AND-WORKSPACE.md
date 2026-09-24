# 01 — Authentication & Multi-Tenant Workspace Architecture

**Priority:** P0 (2.1 blocks core multi-workspace usage) · P2 (UI gap)  
**Depends on:** `12-DATABASE-SCHEMA-MIGRATIONS.md` §12.2 (expanded `userAuthSelect`)  
**Touches:** `apps/web/src/contexts/AuthContext.tsx`, `apps/server/src/utils/selectors.ts`, `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/AppShell.tsx`, `apps/web/src/components/WorkspaceSwitcher.tsx`

---

## 1. Scope

Fix the bootstrap logic that silently discards the user's saved workspace choice on every reload, add the missing workspace-switcher UI, and clean up token/identity leakage on logout. This is a client-state bug, not a backend data bug — the backend already supports multi-workspace membership correctly.

## 2. Hard Rules for This Section

- Do not change the JWT payload shape (`{ sub, sessionId, email, name }`). Every downstream `req.user!.id` read depends on `sub` staying the userId.
- Do not remove `krama_refresh` httpOnly cookie handling or move the refresh token into localStorage/JS-accessible storage. It is httpOnly by design.
- `switchWorkspace(id)` must remain the single source of truth for changing active workspace — do not create a second code path that sets `krama_active_workspace` directly from a component.

---

## 3. AUTH-01 — Multi-Workspace Reload Trap (Ref: Audit §2.1)

**Symptom:** User switches workspace, page reloads, user is silently returned to their first workspace every time.

**Root cause:** `AuthContext.tsx` bootstrap ran:
```ts
let wid = meData.user.memberships?.[0]?.workspaceId || null;
if (!wid) {
  const savedWid = localStorage.getItem('krama_active_workspace');
  wid = savedWid || null;
}
```
`memberships[0]` is truthy for any valid user, so the `if (!wid)` branch that reads the saved workspace **never executed**. Compounding this: `switchWorkspace` was never called anywhere in `apps/web` — there was no UI that invoked it (see AUTH-02).

**File:** `apps/web/src/contexts/AuthContext.tsx`, lines 98–105 (bootstrap) and 142–149 (logout).

**Fix — replace the bootstrap workspace-resolution block:**
```tsx
const savedWid = localStorage.getItem('krama_active_workspace');
const memberships = meData.user.memberships || [];
const hasSavedMembership = memberships.some((m: any) => m.workspaceId === savedWid);
const wid = (hasSavedMembership ? savedWid : null) || memberships[0]?.workspaceId || null;

api.setWorkspaceId(wid);
if (wid) localStorage.setItem('krama_active_workspace', wid);
```
The saved ID now wins whenever it still corresponds to a real membership; it only falls back to the first membership if the saved one is stale (e.g. the user was removed from that workspace).

**Fix — logout cleanup**, same file, `logout()` / `onGlobalLogout()`:
```tsx
const handleLogout = useCallback(async () => {
  try {
    if (authState.status === 'authed') {
      await api.auth.logout();
    }
  } catch (err) {
    console.error('Logout error', err);
  } finally {
    api.setAccessToken(null);
    api.setWorkspaceId(null);
    localStorage.removeItem('krama_active_workspace');
    localStorage.removeItem('krama_user');
    setAuthState({ status: 'anon' });
  }
}, [authState]);
```
This closes the "tokens leak in memory on logout" and "unread `krama_user` in localStorage" findings from the audit's health matrix in one pass — both were caused by logout not clearing state it had accumulated.

**Verify:**
1. Log in with a user that belongs to 2+ workspaces.
2. Switch to the second workspace via the new Workspace Switcher UI.
3. Reload the page (`F5`). Confirm the active workspace is still the second one, not the first membership.
4. Log out. Confirm `localStorage` contains no `krama_active_workspace` or `krama_user` keys and `api.currentAccessToken` is `null`.

---

## 4. AUTH-02 — Missing Workspace Switcher UI (Ref: Audit §9.1)

**Symptom:** There was no way to switch workspaces in the product at all — `switchWorkspace(id)` existed in `AuthContext.tsx` but was dead code because nothing called it.

**Files:** `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/AppShell.tsx`, `apps/web/src/components/WorkspaceSwitcher.tsx`.

**Fix:** Built a dedicated `WorkspaceSwitcher` component and integrated into:
- `Sidebar.tsx` header (below the brand bar, above search)
- `AppShell.tsx` collapsed desktop breadcrumb bar
- `AppShell.tsx` mobile top header

The component:
- Reads `user.memberships` (including `workspace.name` from AUTH-03) to render the list.
- Highlights the currently active `workspaceId` with a checkmark and active styling.
- Calls `switchWorkspace(id)` on selection — preserving centralized reload/localStorage logic.
- Is always reachable regardless of viewport or sidebar collapse state.

**Verify:** With 2+ workspace memberships, the dropdown is visible, shows both workspace names (not just the active one), and clicking the inactive one calls `switchWorkspace` and results in AUTH-01's reload landing on the newly selected workspace.

---

## 5. AUTH-03 — Backend Selector Doesn't Return Workspace Names (Ref: Audit §2.1 pt. 4)

**Symptom:** Even once the switcher UI exists, it had nothing to render — the `/auth/me` response only contained `workspaceId` and `role` per membership, never the workspace's display name.

**File:** `apps/server/src/utils/selectors.ts`, lines 8–13 (`userAuthSelect`).

**Fix:** Expanded the membership selection to include the related workspace's display fields:
```ts
export const userAuthSelect = {
  id: true,
  name: true,
  email: true,
  metadata: true,
  memberships: {
    select: {
      workspaceId: true,
      role: true,
      workspace: {
        select: { id: true, name: true, productivityScore: true },
      },
    },
  },
} satisfies Prisma.UserSelect;
```
This is the schema-level companion to `12-DATABASE-SCHEMA-MIGRATIONS.md` — no migration needed here, this is a Prisma `select` shape change only.

**Verify:** `GET /auth/me` response for a multi-workspace user includes `memberships[].workspace.name` for every membership, not just the active one.

---

## 6. Cleanup

None specific to this file — the dead-`switchWorkspace` finding is resolved by AUTH-02 wiring it up, not by removing it.

## 7. Section Completion Checklist

- [x] Reload no longer discards a valid saved workspace selection (AUTH-01).
- [x] Logout clears `krama_active_workspace`, `krama_user`, in-memory access token, and in-memory workspace ID (AUTH-01).
- [x] A visible, working workspace switcher exists in the Sidebar, collapsed header, and mobile bar (AUTH-02).
- [x] `/auth/me` returns workspace names for every membership (AUTH-03).
- [x] Zero compilation or lint errors across both client (`tsc -b`, `oxlint`) and server (`tsc --noEmit`).
