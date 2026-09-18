import { Worker, Job } from 'bullmq';
import { connection } from '../lib/redis';
import { QUEUE_NAMES } from '../queues';
import { prisma } from '../prisma';

export const documentVersionWorker = new Worker(
  QUEUE_NAMES.DOCUMENT_VERSION,
  async (job: Job<{ documentId: string; userId: string; contentJson: any }>) => {
    const { documentId, userId, contentJson } = job.data;
    
    // Find highest version number for this document
    const latestVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersion = (latestVersion?.versionNumber || 0) + 1;

    await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersion,
        contentJson,
        editedById: userId,
      }
    });

    console.log(`[DocumentVersionWorker] Snapshot created for doc ${documentId}, version ${nextVersion}`);
  },
  { connection, concurrency: 5 }
);

documentVersionWorker.on('failed', (job, err) => {
  console.error(`[DocumentVersionWorker] Job ${job?.id} failed:`, err);
});
