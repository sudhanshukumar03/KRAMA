import { randomUUID, createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { embeddingQueue } from '../queues';
import { calculateCounts, extractEntityLinks, extractMarkdown, extractPlainText } from '../utils/tiptap';

export async function documentLinkExists(tx: Prisma.TransactionClient, workspaceId: string, link: { targetType: string; targetId: string }) {
    const where = { id: link.targetId, deletedAt: null };
    const target = link.targetType === 'DOCUMENT'
      ? await tx.document.findFirst({ where: { ...where, space: { workspaceId, deletedAt: null, workspace: { deletedAt: null } } }, select: { id: true } })
      : link.targetType === 'TASK'
        ? await tx.task.findFirst({ where: { ...where, workspaceId }, select: { id: true } })
        : await tx.project.findFirst({ where: { ...where, workspaceId }, select: { id: true } });
    return Boolean(target);
}

export async function reconcileDocumentLinks(tx: Prisma.TransactionClient, documentId: string, workspaceId: string, previous: any, content: any, userId: string) {
  const links = extractEntityLinks(content);
  for (const link of links) {
    if (!await documentLinkExists(tx, workspaceId, link)) throw Object.assign(new Error('Referenced entity must be active in this workspace'), { statusCode: 400 });
  }
  const key = (l: { targetType: string; targetId: string }) => `${l.targetType}:${l.targetId}`;
  const before = new Set(extractEntityLinks(previous).map(key));
  const after = new Set(links.map(key));
  const existing = await tx.entityLink.findMany({ where: { sourceType: 'DOCUMENT', sourceId: documentId } });
  const removed = existing.filter(l => l.linkType === 'REFERENCE' && before.has(key(l)) && !after.has(key(l)));
  if (removed.length) await tx.entityLink.deleteMany({ where: { id: { in: removed.map(l => l.id) } } });
  const existingKeys = new Set(existing.map(key));
  const added = links.filter(l => !existingKeys.has(key(l)));
  if (added.length) await tx.entityLink.createMany({ data: added.map(l => ({ sourceType: 'DOCUMENT' as const, sourceId: documentId, ...l, linkType: 'REFERENCE' as const, createdById: userId })), skipDuplicates: true });
}

// Every caller holds this row lock: snapshots and index commits share the same
// boundary, so a slow worker cannot restore search text from an older revision.
export async function lockDocument(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Document" WHERE id = ${id} FOR UPDATE`;
  const doc = await tx.document.findFirst({ where: { id, deletedAt: null, space: { deletedAt: null, workspace: { deletedAt: null } } }, include: { space: true } });
  if (!doc) throw new Error('Document not found');
  return doc;
}

export async function snapshotDocument(tx: Prisma.TransactionClient, id: string, userId: string, content?: any, jobId?: string) {
  const doc = await lockDocument(tx, id);
  const snapshotId = jobId ? `snapshot-${createHash('sha256').update(`${id}/${jobId}`).digest('hex')}` : randomUUID();
  const existing = await tx.documentVersion.findUnique({ where: { id: snapshotId } });
  if (existing) return existing;
  const latest = await tx.documentVersion.findFirst({ where: { documentId: id }, orderBy: { versionNumber: 'desc' } });
  return tx.documentVersion.create({ data: { id: snapshotId, documentId: id, versionNumber: (latest?.versionNumber ?? 0) + 1, contentJson: content ?? doc.contentJson, editedById: userId } });
}

export async function saveDocumentContent(id: string, contentJson: any, userId: string, expectedUpdatedAt?: string, snapshotBefore = false) {
  return prisma.$transaction(async tx => {
    const doc = await lockDocument(tx, id);
    if (expectedUpdatedAt && doc.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) throw Object.assign(new Error('Document was modified elsewhere. Refresh to load the latest version.'), { statusCode: 409 });
    await reconcileDocumentLinks(tx, id, doc.space.workspaceId, doc.contentJson, contentJson, userId);
    if (snapshotBefore) await snapshotDocument(tx, id, userId);
    const contentMarkdown = extractMarkdown(contentJson);
    const counts = calculateCounts(extractPlainText(contentJson));
    // Never serve the old body while the new index is queued, including empty saves.
    await tx.knowledgeChunk.deleteMany({ where: { documentId: id } });
    return tx.document.update({ where: { id }, data: { contentJson, contentMarkdown, ...counts, lastEditedById: userId } });
  });
}

export async function queueDocumentEmbedding(doc: { id: string; contentMarkdown: string | null }) {
  return embeddingQueue.add('embed-document', { documentId: doc.id, content: doc.contentMarkdown ?? '' }, { jobId: `embed-doc-${doc.id}-${randomUUID()}`, delay: 2000 });
}

export async function commitDocumentIndex(documentId: string, content: string, embedded: { text: string; vector: string }[]) {
  return prisma.$transaction(async tx => {
    const doc = await lockDocument(tx, documentId);
    if ((doc.contentMarkdown ?? '') !== content) return false;
    await tx.knowledgeChunk.deleteMany({ where: { documentId } });
    for (const [i, chunk] of embedded.entries()) {
      await tx.$executeRawUnsafe(`INSERT INTO "KnowledgeChunk" ("id", "workspaceId", "documentId", "content", "chunkIndex", "embedding", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, NOW(), NOW())`, doc.space.workspaceId, documentId, chunk.text, i, chunk.vector);
    }
    return true;
  });
}
