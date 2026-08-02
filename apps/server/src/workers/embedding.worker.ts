import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
import { prisma } from '../prisma';

let pipeline: any = null;

export const embeddingWorker = new Worker(
  QUEUE_NAMES.EMBEDDING,
  async (job) => {
    const { pageId, content } = job.data;
    if (!pageId || !content) {
      return { skipped: true, reason: 'Missing data' };
    }
    
    if (!pipeline) {
      console.log(`[Worker:Embedding] Loading Xenova/all-MiniLM-L6-v2 (lazy load)...`);
      const { pipeline: transformersPipeline } = await import('@xenova/transformers');
      pipeline = await transformersPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log(`[Worker:Embedding] Model loaded successfully.`);
    }

    console.log(`[Worker:Embedding] Generating embedding for page ${pageId}...`);
    
    // Generate embedding
    const output = await pipeline(content, { pooling: 'mean', normalize: true });
    
    const embeddingArray = Array.from(output.data);
    const vectorString = `[${embeddingArray.join(',')}]`;
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PageEmbedding" ("id", "pageId", "embedding", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2::vector, NOW())
      ON CONFLICT ("pageId")
      DO UPDATE SET "embedding" = $2::vector, "updatedAt" = NOW()
    `, pageId, vectorString);

    return { pageId, success: true };
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
