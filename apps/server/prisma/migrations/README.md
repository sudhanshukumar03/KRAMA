# Migrations

The database migration history is structured into:

1. `00000000000000_baseline`: Squashed baseline recreating the full HEAD schema (including `Sprint`, `DailyLog`, `SprintReport`, and `Task.sprintId`) from empty in one file, along with the `KnowledgeChunk` HNSW vector index.
2. `00000000000001_add_habit_best_streak`: Additive migration that idempotently adds `Habit.bestStreak` column (`IF NOT EXISTS`) for habit recalculation support.

### Deployment on Fresh Databases
Run:
```bash
pnpm --filter server exec prisma migrate deploy
```
This runs `00000000000000_baseline` followed by `00000000000001_add_habit_best_streak`.

### Upgrading an Existing Database (from HEAD)
For an existing database that already matches the HEAD schema:
1. Mark the baseline as applied:
   ```bash
   pnpm --filter server exec prisma migrate resolve --applied 00000000000000_baseline
   ```
2. Deploy subsequent migrations:
   ```bash
   pnpm --filter server exec prisma migrate deploy
   ```
   This safely executes `00000000000001_add_habit_best_streak` to add `bestStreak` without touching any existing tables.

## Known caveat: the HNSW vector index

The last statement in the baseline creates:

```sql
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx"
  ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);
```

This index lives on the `embedding Unsupported("vector(768)")` column, which
Prisma's datamodel cannot represent (`@@index(..., type: Hnsw)` is rejected with
"Unknown index type: Hnsw"). As a result, **bare `prisma migrate dev` will report
drift and try to generate a migration that DROPs this index.** Do not accept that drop.

Three things keep the index healthy despite this:

1. It ships in the baseline migration, so `prisma migrate deploy` (aka `pnpm db:deploy`)
   creates it on any fresh environment. `migrate deploy` only applies migration files
   and never diffs against the datamodel, so it never drops the index.
2. The server recreates it at startup via `ensureVectorIndexes()` in
   `src/utils/bootstrap.ts` (`CREATE INDEX IF NOT EXISTS ...`), so a booted app
   self-heals even if a stray `migrate dev` dropped it.
3. This note.

**Preferred workflow:** apply migrations with `pnpm db:deploy` and check state with
`pnpm db:status`. Avoid bare `prisma migrate dev` on this project. If you must use it
for a local schema change, delete the spurious
`DROP INDEX "KnowledgeChunk_embedding_hnsw_idx"` line from the generated SQL before
applying, or just restart the server afterward to let the bootstrap recreate it:

```bash
psql "$DATABASE_URL" -c 'CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx" ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);'
```
