import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { prisma } from '../prisma';
import { getEmbedding } from '../lib/embedding';
import { createChunks } from '../services/rag/chunker';

export const embeddingWorker = new Worker(
  QUEUE_NAMES.EMBEDDING,
  async (job) => {
    const { pageId, content } = job.data;
    if (!pageId || !content) {
      return { skipped: true, reason: 'Missing data' };
    }

    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { workspaceId: true }
    });

    if (!page) {
      return { skipped: true, reason: 'Page not found' };
    }

    console.log(`[Worker:Embedding] Chunking and embedding page ${pageId}...`);
    
    // 1. Chunk content
    const chunks = createChunks(content, 800, 100);

    // 2. Delete old chunks
    await prisma.knowledgeChunk.deleteMany({
      where: { pageId }
    });

    // 3. Embed and save new chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i] as string;
      const embeddingArray = await getEmbedding(chunkText);
      const vectorString = `[${embeddingArray.join(',')}]`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO "KnowledgeChunk" ("id", "workspaceId", "pageId", "content", "chunkIndex", "embedding", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, NOW(), NOW())
      `, page.workspaceId, pageId, chunkText, i, vectorString);
    }

    return { pageId, success: true, chunksCount: chunks.length };
  },
  { connection }
);

embeddingWorker.on('completed', (job, result) => {
  if (!result?.skipped) {
    console.log(`[Worker:Embedding] Completed for page ${result.pageId}`);
  }
});

embeddingWorker.on('failed', (job, err) => {
  console.error(`[Worker:Embedding] Failed:`, err);
});
