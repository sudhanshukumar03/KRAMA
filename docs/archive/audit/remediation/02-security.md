# Membership, roles and resource isolation

The security work addressed routes that used a workspace header or resource identifier without fully checking the caller's access. It combined membership checks, role policy and scoped resource queries. These findings describe the earlier review state; current behavior must be verified against the routes and tests.

## SEC-01: global search

Global search previously accepted a workspace header and queried that workspace directly. The repair put membership and role validation before the search query. The essential test used a user belonging only to Workspace A and a request selecting Workspace B; the request had to be rejected rather than return search results.

## SEC-02: sprint reports

A report lookup by sprint identifier did not establish that the sprint belonged to the validated workspace. The repair checked scope and soft-deletion before returning report data. A resource identifier from another workspace was treated as not found, avoiding disclosure of that resource's existence.

## SEC-03: workspace and space mutations

Workspace rename and deletion needed ownership checks. Space mutations needed both a validated workspace and a resource lookup within that scope. Knowing a space identifier was insufficient authorization.

The shared role hierarchy is `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`, then `GUEST`. An ordinary read requiring `VIEWER` also permits higher roles; a mutation requiring `MEMBER` excludes read-only roles. Destructive workspace actions require `OWNER`. Route-specific policy remains the source of truth, rather than a historical code snippet.

## SEC-04: personal calendar scope

Time blocks originally belonged to a user without a workspace boundary. A person in multiple workspaces could therefore see unrelated blocks and project references in the active planner. Adding workspace ownership to the model and filtering reads and writes by both user and workspace closed that boundary.

Existing rows required a reviewed backfill before the field could become mandatory. The [database record](12-database.md) explains that dependency; current deployment instructions are in the [migration guide](../../../../apps/server/prisma/migrations/README.md).

## SEC-05: bounded uploads

Memory-backed uploads had no file-size limit. The recorded repair imposed a 10 MB limit and mapped an oversized upload to HTTP 413 rather than allowing an unbounded in-memory request. Later image validation is separate from enabling object storage. R2 uploads remain Coming soon in the personal workspace configuration.

## What verification needed to cover

The checks used foreign workspace fixtures and real resource identifiers, including a user with memberships in more than one workspace. Membership in one workspace must not authorize access to a resource in another. Read, create, update and delete policy all matter; applying a guard only to deletion leaves other mutation paths exposed.

The earlier record included cross-workspace rejection, read-only role checks, personal planner isolation, upload limits and compilation checks. See the [audit overview](../README.md) for later verification and the [development guide](../../../development/README.md) for current commands.
