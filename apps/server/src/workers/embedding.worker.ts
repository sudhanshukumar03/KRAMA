import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { prisma } from '../prisma';
import { getEmbedding } from '../lib/embedding';
import { createChunks } from '../services/rag/chunker';

export const embeddingWorker = new Worker(
  QUEUE_NAMES.EMBEDDING,
  async (job) => {
    const { documentId, content } = job.data;
    if (!documentId || !content) {
      return { skipped: true, reason: 'Missing documentId or content' };
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { space: { select: { workspaceId: true } } }
    });
    if (!doc) {
      return { skipped: true, reason: 'Document not found' };
    }
    const workspaceId = doc.space?.workspaceId || null;

    if (!workspaceId) {
      return { skipped: true, reason: 'Workspace not found' };
    }

    console.log(`[Worker:Embedding] Chunking and embedding document ${documentId}...`);

    // Skip (and purge) if the document was soft-deleted after this job was
    // queued. Embed jobs run on a 2s delay, so a delete racing an autosave could
    // otherwise resurrect chunks for a deleted document and let them surface in
    // RAG answers.
    if (doc.deletedAt) {
      await prisma.knowledgeChunk.deleteMany({ where: { documentId } });
      return { skipped: true, reason: 'Document deleted' };
    }

    // 1. Chunk content
    const chunks = createChunks(content, 800, 100);

    // 2. Embed everything first (network calls to the embedding provider) so the
    //    DB transaction below stays short and never holds a connection open on a
    //    remote call.
    const embedded: { text: string; vector: string }[] = [];
    for (const chunkText of chunks) {
      const embeddingArray = await getEmbedding(chunkText as string);
      embedded.push({ text: chunkText as string, vector: `[${embeddingArray.join(',')}]` });
    }

    // 3. Swap old chunks for new ones atomically. The previous loop deleted first
    //    and inserted one row at a time without a transaction, so a mid-loop
    //    failure left the document with a partial (or empty) embedding set.
    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId } });
      for (let i = 0; i < embedded.length; i++) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "KnowledgeChunk" ("id", "workspaceId", "documentId", "content", "chunkIndex", "embedding", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, NOW(), NOW())
        `, workspaceId, documentId, embedded[i]!.text, i, embedded[i]!.vector);
      }
    });

    return { documentId, success: true, chunksCount: embedded.length };
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
