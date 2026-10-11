# Schema changes and migration safety

This record explains the schema dependencies in the original repair plan. It is historical design rationale, not SQL to replay against a current installation. Current deployment and baseline-adoption instructions are maintained in the [migration guide](../../../../apps/server/prisma/migrations/README.md).

## 12.1: workspace ownership for time blocks

Time blocks originally carried a user identifier without a workspace boundary. The plan introduced a workspace relation and index so personal planner and focus queries could filter by both values.

For an existing database, the column first had to allow nulls. Linked tasks or projects could provide evidence of the intended workspace. Rows with ambiguous or conflicting links required review before assignment. Only after verifying the backfill and confirming no nulls remained could the field become mandatory.

The original proposal used a user's oldest membership as a fallback for standalone blocks. That is not reliable evidence when the person belongs to several workspaces. Such rows require an explicit assignment decision rather than an automatic guess.

## 12.2: authentication selection

Adding workspace names to the authentication response changed the Prisma selection, not the schema. It did not require a migration. The [authentication record](01-auth-workspace.md) describes the corresponding interface repair.

## 12.3 and 12.4: document relations and removed models

The knowledge interface used `Document`, but Project still carried a legacy Page relation. The plan connected Project to Document with an optional project reference, a `SetNull` deletion policy and an index. Project counts then needed to read the actual document relation.

Removal of the unused Page and Decision models required coordinated foreign-key and application changes. Dropping a table before its consumers and references were dealt with would not be a safe cleanup. The [code cleanup record](10-code-cleanup.md) describes the application side.

## 12.5: milestone queries

Milestone ownership checks were application work. Adding a redundant unique constraint around an existing primary key was not the repair. Generated Prisma types and the actual query contract needed to guide the mutation shape.

## 12.6: full-text and vector indexes

Full-text search used a `tsvector` built from weighted document title, subtitle and Markdown content, with a GIN index and an update trigger. Trigger definitions and indexes needed reproducible SQL in the database setup rather than a manual operation known only to one installation.

Vector retrieval used an HNSW cosine index over stored embeddings. PostgreSQL-specific types and indexes are not fully represented by Prisma's ordinary model fields. Migration diffs therefore require review so a schema-generation step does not accidentally remove SQL-managed search infrastructure.

The current [bootstrap code](../../../../apps/server/src/utils/bootstrap.ts) and migration files are the implementation references. Historical snippets in the original plan were proposals, not a substitute for those files.

## 12.7: Focus reused existing fields

Focus used existing session records, task estimates, time blocks, user capacity and timer preferences. It did not need another schema migration merely because a new interface consumed those fields.

## Deployment and verification

The migration history was later consolidated into a baseline and a subsequent best-streak migration. Applying those tracked migrations is different from replaying the older step-by-step repair plan. An existing database must be compared with the baseline before marking it as applied; recording migration history does not create missing tables or repair incompatible data.

The main CI test database is prepared from the schema, while isolated integration and deployment checks exercise migrations. Those paths verify different contracts and should be described separately. The [development guide](../../../development/README.md) and [migration guide](../../../../apps/server/prisma/migrations/README.md) give the current commands.
