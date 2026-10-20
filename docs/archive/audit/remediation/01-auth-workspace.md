# Authentication and workspace selection

The original review found that the frontend could discard a valid saved workspace on reload. The repairs connected workspace selection, authentication state and the membership data returned by the backend. This is part of the [audit history](../README.md).

## AUTH-01: preserving the selected workspace

Bootstrap selected the user's first membership before checking the saved workspace. Because that first membership usually existed, the saved selection was never read. The repaired sequence preferred the saved workspace only when it still appeared in the user's memberships, then fell back to an available membership.

Logout also needed to clear the in-memory access token and workspace scope, the saved workspace key and the unused saved user record. Cleanup belonged in the final logout path so it still ran when the logout request failed.

The session contract remained unchanged: the JWT subject identified the user, and the refresh token stayed in the HTTP-only `krama_refresh` cookie. The repair did not require making the refresh token accessible to browser JavaScript.

## AUTH-02: a reachable switcher

The authentication context exposed `switchWorkspace`, but no interface called it. A shared switcher was added to the sidebar, the collapsed desktop header and the mobile header. All placements used the same context method so storage, scope changes and reload behavior stayed consistent.

## AUTH-03: membership display data

The authentication selector returned workspace identifiers and roles without workspace names. Expanding its relation selection supplied the display data needed by the switcher. This was a query-shape change, not a database migration.

## Recorded verification

The original checks used an account with multiple memberships, selected a second workspace and reloaded the page. They also checked logout cleanup and the workspace names returned by `/auth/me`. Compilation and lint checks were recorded for that revision.

For current implementation, start with [AuthContext](../../../../apps/web/src/contexts/AuthContext.tsx) and the [authentication selector](../../../../apps/server/src/utils/selectors.ts). Use the [development guide](../../../development/README.md) when repeating verification.
