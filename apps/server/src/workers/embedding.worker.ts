import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { prisma } from '../prisma';
import { getEmbedding } from '../lib/embedding';
import { createChunks } from '../services/rag/chunker';

export const embeddingWorker = new Worker(
  QUEUE_NAMES.EMBEDDING,
  async (job) => {
    const { pageId, documentId, content } = job.data;
    if ((!pageId && !documentId) || !content) {
      return { skipped: true, reason: 'Missing data' };
    }

    let workspaceId: string | null = null;
    if (documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        include: { space: { select: { workspaceId: true } } }
      });
      if (!doc) {
        return { skipped: true, reason: 'Document not found' };
      }
      workspaceId = doc.space?.workspaceId || null;
    } else if (pageId) {
      const page = await prisma.page.findUnique({
        where: { id: pageId },
        select: { workspaceId: true }
      });
      if (!page) {
        return { skipped: true, reason: 'Page not found' };
      }
      workspaceId = page.workspaceId;
    }

    if (!workspaceId) {
      return { skipped: true, reason: 'Workspace not found' };
    }

    const entityLabel = documentId ? `document ${documentId}` : `page ${pageId}`;
    console.log(`[Worker:Embedding] Chunking and embedding ${entityLabel}...`);
    
    // 1. Chunk content
    const chunks = createChunks(content, 800, 100);

    // 2. Delete old chunks
    if (documentId) {
      await prisma.knowledgeChunk.deleteMany({
        where: { documentId }
      });
    } else {
      await prisma.knowledgeChunk.deleteMany({
        where: { pageId }
      });
    }

    // 3. Embed and save new chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i] as string;
      const embeddingArray = await getEmbedding(chunkText);
      const vectorString = `[${embeddingArray.join(',')}]`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO "KnowledgeChunk" ("id", "workspaceId", "pageId", "documentId", "content", "chunkIndex", "embedding", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector, NOW(), NOW())
      `, workspaceId, pageId || null, documentId || null, chunkText, i, vectorString);
    }

    return { pageId, documentId, success: true, chunksCount: chunks.length };
  },
  { connection }
);

embeddingWorker.on('completed', (job, result) => {
  if (!result?.skipped) {
    const id = result.documentId || result.pageId;
    console.log(`[Worker:Embedding] Completed for ${id}`);
  }
});

embeddingWorker.on('failed', (job, err) => {
  console.error(`[Worker:Embedding] Failed:`, err);
});

embeddingWorker.on('error', () => {
  // Suppress uncaught redis connection error spam
});
