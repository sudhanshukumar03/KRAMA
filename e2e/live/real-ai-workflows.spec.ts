import { test, expect } from './fixtures';

test.skip(process.env.KRAMA_AI_VERIFY !== '1', 'Requires explicit real-provider opt-in');

test('real worker embeddings support isolated Brain keyword and semantic retrieval', async ({ account }) => {
  test.setTimeout(90000);
  const space = await account.call('POST', 'spaces', { name: 'Synthetic provider verification' }, 201);
  const doc = await account.call('POST', 'documents', { title: 'Synthetic release launch', spaceId: space.id,
    contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The synthetic launch identifier is SAPPHIRE42. The mission concerns a ceramic observatory on the moon.' }] }] },
  }, 201);
  const { prisma } = await import('../../apps/server/src/prisma');
  await expect.poll(() => prisma.knowledgeChunk.count({ where: { documentId: doc.id, content: { contains: 'SAPPHIRE42' } } }), { timeout: 60000 }).toBeGreaterThan(0);
  const { getEmbedding } = await import('../../apps/server/src/lib/embedding');
  const { vectorSearch, keywordSearch, mergeAndRank } = await import('../../apps/server/src/services/rag/retriever');
  const embedding = await getEmbedding('Which synthetic mission describes a lunar astronomical observation building?');
  expect(embedding).toHaveLength(768); expect(embedding.every(Number.isFinite)).toBe(true);
  const vectors = await vectorSearch(account.workspaceId, embedding, 20);
  expect(vectors.some(row => row.documentId === doc.id && Number.isFinite(row.similarity))).toBe(true);
  const keywords = await keywordSearch(account.workspaceId, 'SAPPHIRE42', 20);
  expect(mergeAndRank(vectors, keywords).some(row => row.documentId === doc.id)).toBe(true);
  const found = await account.call('GET', `workspaces/${account.workspaceId}/search?q=SAPPHIRE42`);
  expect(JSON.stringify(found)).toContain(doc.id);
  const other = await account.call('POST', 'workspaces', { name: 'Separate retrieval scope' }, 201);
  expect((await vectorSearch(other.id, embedding, 20)).some(row => row.documentId === doc.id)).toBe(false);
  await account.call('DELETE', `documents/${doc.id}`);
  expect((await vectorSearch(account.workspaceId, embedding, 20)).some(row => row.documentId === doc.id)).toBe(false);
});
