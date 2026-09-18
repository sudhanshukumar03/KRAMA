-- AlterTable: Make pageId nullable and add documentId to KnowledgeChunk
ALTER TABLE "KnowledgeChunk" ALTER COLUMN "pageId" DROP NOT NULL;
ALTER TABLE "KnowledgeChunk" ADD COLUMN "documentId" TEXT;

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create HNSW Vector Index
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx" ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);

-- Drop unused tables
DROP TABLE IF EXISTS "Certification" CASCADE;
DROP TABLE IF EXISTS "CareerMilestone" CASCADE;
