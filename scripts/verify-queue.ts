import { prisma } from '../apps/server/src/prisma';
import { embeddingQueue } from '../apps/server/src/queues';
import { extractTextFromBlocks } from '../apps/server/src/controllers/page.controller';
import { UpdatePageSchema } from '../packages/validation/src/execution';

async function run() {
  console.log('--- 1. P6 BACKFILL SIZING AUDIT ---');
  const totalPages = await prisma.page.count({ where: { deletedAt: null } });
  const totalChunks = await prisma.knowledgeChunk.count();
  const pagesWithVersionGt1 = await prisma.page.count({ where: { version: { gt: 1 }, deletedAt: null } });
  const pagesWithChunks = await prisma.page.count({
    where: {
      deletedAt: null,
      knowledgeChunks: { some: {} }
    }
  });
  const pagesWithoutChunks = await prisma.page.count({
    where: {
      deletedAt: null,
      knowledgeChunks: { none: {} }
    }
  });

  console.log('Total non-deleted pages in DB:', totalPages);
  console.log('Total KnowledgeChunk rows in DB:', totalChunks);
  console.log('Pages WITH knowledge chunks:', pagesWithChunks);
  console.log('Pages WITHOUT knowledge chunks:', pagesWithoutChunks);
  console.log('Pages with version > 1 (edited after creation):', pagesWithVersionGt1);

  const allPages = await prisma.page.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, version: true, createdAt: true, updatedAt: true, _count: { select: { knowledgeChunks: true } } }
  });
  console.log('\nPage detail breakdown:');
  for (const p of allPages) {
    console.log(`- Page "${p.title}" (ID: ${p.id}): version=${p.version}, chunks=${p._count.knowledgeChunks}, created=${p.createdAt.toISOString()}, updated=${p.updatedAt.toISOString()}`);
  }

  console.log('\n--- 2. LIVE QUEUE FIRING VERIFICATION ---');
  const ws = await prisma.workspace.findFirst();
  const user = await prisma.user.findFirst();

  if (!ws || !user) {
    throw new Error('No workspace or user found');
  }

  // Create a temporary test page
  const testPage = await prisma.page.create({
    data: {
      title: 'Queue Verification Page',
      workspaceId: ws.id,
      createdBy: user.id,
      version: 1,
      blocks: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First draft content' }] }]
      }
    }
  });

  console.log('Created test page:', testPage.id, 'initial version:', testPage.version);

  // Simulate updatePage with revised blocks
  const updatePayload = {
    workspaceId: ws.id,
    blocks: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Revised engineering specification second draft' }] }]
    }
  };

  const parsed = UpdatePageSchema.parse(updatePayload);
  const updatedPage = await prisma.page.update({
    where: { id: testPage.id },
    data: {
      blocks: parsed.blocks,
      version: { increment: 1 }
    }
  });

  console.log('Updated page version:', updatedPage.version);

  const text = extractTextFromBlocks(updatedPage.blocks);
  console.log('Extracted text from blocks:', text);

  // Add to embeddingQueue exactly as page.controller.ts:127 does
  const job = await embeddingQueue.add('upsert', { pageId: updatedPage.id, content: text });
  if (!job.id) {
    throw new Error('Queue job was added but no job ID was returned');
  }
  console.log('Queue job added successfully! Job ID:', job.id, 'Queue name:', embeddingQueue.name);

  // Read job back from Redis queue to prove it arrived in Redis
  const retrievedJob = await embeddingQueue.getJob(job.id);
  console.log('Retrieved job from Redis queue:', {
    id: retrievedJob?.id,
    name: retrievedJob?.name,
    data: retrievedJob?.data
  });

  // Cleanup
  await prisma.page.delete({ where: { id: testPage.id } });
  await retrievedJob?.remove();
  console.log('Verification and cleanup complete!');
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    await embeddingQueue.close().catch(() => {});
    process.exit(0);
  });
