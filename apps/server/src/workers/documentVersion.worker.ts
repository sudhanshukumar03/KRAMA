import { Worker, Job } from 'bullmq';
import { connection } from '../lib/redis';
import { QUEUE_NAMES } from '../queues';
import { snapshotDocument } from '../services/documentContent.service';
import { socketService } from '../services/socket.service';
import { prisma } from '../prisma';

export const documentVersionWorker = new Worker(
  QUEUE_NAMES.DOCUMENT_VERSION,
  async (job: Job<{ documentId: string; userId: string; contentJson: any }>) => {
    const { documentId, userId, contentJson } = job.data;
    
    const version = await prisma.$transaction(tx => snapshotDocument(tx, documentId, userId, contentJson, job.id));
    const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { space: { select: { workspaceId: true } } } });
    if (doc) socketService.emitToWorkspace(doc.space.workspaceId, 'document:version:created', { documentId, versionId: version.id });
  },
  { connection, concurrency: 5 }
);

documentVersionWorker.on('failed', (job, err) => {
  console.error(`[DocumentVersionWorker] Job ${job?.id} failed:`, err);
});
