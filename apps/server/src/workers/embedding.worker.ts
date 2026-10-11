import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { prisma } from '../prisma';
import { getEmbedding } from '../lib/embedding';
import { commitDocumentIndex } from '../services/documentContent.service';
import { createChunks } from '../services/rag/chunker';

export const embeddingWorker = new Worker(
  QUEUE_NAMES.EMBEDDING,
  async (job) => {
    const { documentId, content } = job.data;
    if (!documentId || typeof content !== 'string') {
      return { skipped: true, reason: 'Missing documentId or content' };
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { space: { include: { workspace: true } } }
    });
    if (!doc) {
      return { skipped: true, reason: 'Document not found' };
    }
    const workspaceId = doc.space?.workspaceId || null;

    if (!workspaceId) {
      return { skipped: true, reason: 'Workspace not found' };
    }

    console.log(`[Worker:Embedding] Chunking and embedding document ${documentId}...`);

    // Skip stale or deleted source content before spending a provider request.
    // commitDocumentIndex checks it again after embedding, under the row lock,
    // because the document can change while the network request is running.
    if (doc.deletedAt || doc.space.deletedAt || doc.space.workspace.deletedAt || (doc.contentMarkdown ?? '') !== content) {
      return { skipped: true, reason: 'Document changed or deleted' };
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

    // 3. Swap all chunks atomically so a failed insert cannot leave a partial index.
    const committed = await commitDocumentIndex(documentId, content, embedded).catch(error => {
      if (error.message === 'Document not found') return false;
      throw error;
    });
    if (!committed) return { skipped: true, reason: 'Document changed or deleted during indexing' };

    return { documentId, success: true, chunksCount: embedded.length };
  },
  { connection }
);

embeddingWorker.on('completed', (_job, result) => {
  if (!result?.skipped) {
    const id = result.documentId || result.pageId;
    console.log(`[Worker:Embedding] Completed for ${id}`);
  }
});

embeddingWorker.on('failed', (_job, err) => {
  console.error(`[Worker:Embedding] Failed:`, err);
});

embeddingWorker.on('error', () => {
  // Suppress uncaught redis connection error spam
});
