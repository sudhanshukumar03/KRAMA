import { prisma } from './prisma';
import { embeddingQueue } from './queues';

function extractTextFromBlocks(blocksData: any): string {
  if (!blocksData || !Array.isArray(blocksData.blocks)) return '';
  return blocksData.blocks
    .map((b: any) => b?.data?.text || '')
    .filter(Boolean)
    .join('\n');
}

async function backfill() {
  console.log('Starting embedding backfill...');
  const pages = await prisma.page.findMany({
    where: { deletedAt: null }
  });

  console.log(`Found ${pages.length} non-deleted pages. Enqueueing...`);
  let count = 0;
  for (const page of pages) {
    if (page.blocks) {
      const text = extractTextFromBlocks(page.blocks);
      if (text.trim()) {
        await embeddingQueue.add('upsert', { pageId: page.id, content: text });
        count++;
      }
    }
  }

  console.log(`Successfully enqueued ${count} embedding jobs.`);
  process.exit(0);
}

backfill().catch(err => {
  console.error(err);
  process.exit(1);
});
