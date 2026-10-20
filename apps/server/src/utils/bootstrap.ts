import { prisma } from '../prisma';

const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';
const LOCAL_WORKSPACE_ID = '00000000-0000-4000-8000-000000000002';

export async function ensureLocalUser() {
  try {
    let user = await prisma.user.findUnique({ where: { id: LOCAL_USER_ID } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: LOCAL_USER_ID,
          email: 'local2@krama.os',
          name: 'Local User',
          passwordHash: 'none',
          emailVerifiedAt: new Date(),
        }
      });
      console.log('[Bootstrap] Created default Local User');
    }

    let workspace = await prisma.workspace.findUnique({ where: { id: LOCAL_WORKSPACE_ID } });
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: LOCAL_WORKSPACE_ID,
          name: 'Local Workspace',
          createdBy: LOCAL_USER_ID,
        }
      });
      
      await prisma.workspaceMember.create({
        data: {
          userId: LOCAL_USER_ID,
          workspaceId: LOCAL_WORKSPACE_ID,
          role: 'OWNER'
        }
      });
      console.log('[Bootstrap] Created default Local Workspace');
    }
  } catch (error) {
    console.error('[Bootstrap] Failed to ensure local user/workspace:', error);
  }
}

// The HNSW index on KnowledgeChunk.embedding lives on an `Unsupported("vector")`
// column, which Prisma's datamodel cannot represent. It ships in the baseline
// migration (so `prisma migrate deploy` creates it), but bare `prisma migrate dev`
// diffs against the datamodel and will try to DROP it (see prisma/migrations/README.md).
// Recreating it here at startup makes it self-healing: any environment that has
// run the migrations — or accidentally lost the index to a stray `migrate dev` —
// converges to having it. `IF NOT EXISTS` keeps this a no-op on the happy path.
export async function ensureVectorIndexes() {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx" ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);`
    );
  } catch (error) {
    // Non-fatal: RAG similarity search still works without the index (just slower).
    console.error('[Bootstrap] Failed to ensure vector indexes:', error);
  }
}

// Ensure Document.searchVector trigger and GIN index on Document table.
// Prisma's datamodel cannot represent Postgres triggers or the Unsupported("tsvector")
// generated expressions, so we self-heal it on server boot.
export async function ensureSearchVectorIndex() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION document_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.subtitle, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW."contentMarkdown", '')), 'C');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS document_search_vector_trigger ON "Document";
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER document_search_vector_trigger
      BEFORE INSERT OR UPDATE OF title, subtitle, "contentMarkdown" ON "Document"
      FOR EACH ROW EXECUTE FUNCTION document_search_vector_update();
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Document_searchVector_gin_idx" ON "Document" USING gin ("searchVector");
    `);

    // Backfill any documents that have null searchVector
    await prisma.$executeRawUnsafe(`
      UPDATE "Document"
      SET "searchVector" =
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
        setweight(to_tsvector('english', coalesce("contentMarkdown", '')), 'C')
      WHERE "searchVector" IS NULL;
    `);
  } catch (error) {
    console.error('[Bootstrap] Failed to ensure Document searchVector index:', error);
  }
}
