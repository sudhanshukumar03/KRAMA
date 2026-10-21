import type { Prisma } from '@prisma/client';

/** Keep revision validation in the same write that moves the document. */
export async function updateDocumentMove(
  document: Pick<Prisma.TransactionClient['document'], 'update' | 'updateMany'>,
  id: string,
  data: Prisma.DocumentUncheckedUpdateInput,
  expectedUpdatedAt?: string,
) {
  if (!expectedUpdatedAt) { await document.update({ where: { id }, data }); return; }
  const updated = await document.updateMany({ where: { id, updatedAt: new Date(expectedUpdatedAt), deletedAt: null }, data });
  if (updated.count !== 1) throw Object.assign(new Error('This document changed. Reload it before moving.'), { status: 409 });
}
