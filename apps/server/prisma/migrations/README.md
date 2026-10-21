# Database migrations

Krama uses committed Prisma migrations for deployment. This directory contains a squashed baseline, `00000000000000_baseline`, followed by `00000000000001_add_habit_best_streak`. The baseline creates the database structure and vector index; the additive migration supplies `Habit.bestStreak`.

## Deploy a fresh database

Configure a PostgreSQL instance with pgvector and a valid `DATABASE_URL`, then run from the repository root:

```sh
pnpm --filter server exec prisma migrate deploy
pnpm --filter server exec prisma migrate status
```

Production Compose runs migration deployment as a separate service before starting the API and worker. Use the [development guide](../../../../docs/development/README.md) for the full setup.

## Adopt an existing database

An existing database needs its structure and migration history checked before it can adopt the squashed baseline. Back up its data and compare its tables, columns, constraints, and indexes with the baseline. A successful application startup alone does not prove that the schemas match.

Only when the existing database is known to match the baseline should the baseline be marked as applied:

```sh
pnpm --filter server exec prisma migrate resolve --applied 00000000000000_baseline
pnpm --filter server exec prisma migrate deploy
```

`migrate resolve` records history; it does not create missing tables or repair a mismatched schema. Use it after reviewing the database, not as a general response to a migration error. The later migration uses an idempotent column addition, but that does not make arbitrary baseline adoption safe.

## Vector index maintenance

The baseline creates the HNSW cosine-similarity index on `KnowledgeChunk.embedding`:

```sql
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx"
  ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);
```

Prisma represents the embedding column as an unsupported vector type and does not model this HNSW index in the ordinary schema. Schema-diff workflows can therefore propose dropping it. Inspect generated migration SQL before applying a local schema change, and preserve the index deliberately.

`migrate deploy` applies the committed SQL without generating a new schema diff. The server's [bootstrap helper](../../src/utils/bootstrap.ts) also creates the vector index if it is absent. If the index must be restored manually, run the SQL above against the intended database and then check its catalog state.

## Deployment and test databases

Deployment uses migration files. The primary CI database and the separate integration database are disposable and are both prepared with committed migration deployment. Do not use the disposable CI procedure as an upgrade plan for a database containing personal records.
