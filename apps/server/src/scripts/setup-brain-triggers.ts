import { prisma } from '../prisma';

async function main() {
  console.log('Setting up PostgreSQL text search triggers...');

  // Add the searchVector column (already done via Prisma schema push)
  // Ensure we create a GIN index and a trigger to update searchVector on insert/update

  // Since we use Prisma push, Unsupported("tsvector")? is just a column without automatic trigger in Prisma.
  // We need to create the trigger manually.

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
    BEFORE INSERT OR UPDATE ON "Document"
    FOR EACH ROW EXECUTE PROCEDURE document_search_vector_update();
  `);

  // Create GIN index if it doesn't exist
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS document_search_vector_idx ON "Document" USING GIN ("searchVector");
  `);

  console.log('Successfully set up triggers and indexes.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
