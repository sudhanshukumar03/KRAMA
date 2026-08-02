import { prisma } from './prisma';

async function checkOrphans() {
  const decisions = await prisma.decision.findMany();
  let decisionOrphans = 0;
  for (const d of decisions) {
    if (d.workspaceId) {
      const w = await prisma.workspace.findUnique({ where: { id: d.workspaceId } });
      if (!w) decisionOrphans++;
    }
  }

  const comments = await prisma.comment.findMany();
  let commentOrphans = 0;
  for (const c of comments) {
    if (c.authorId) {
      const u = await prisma.user.findUnique({ where: { id: c.authorId } });
      if (!u) commentOrphans++;
    }
  }

  console.log(`Decision orphans: ${decisionOrphans}`);
  console.log(`Comment orphans: ${commentOrphans}`);
  process.exit(0);
}

checkOrphans().catch(e => { console.error(e); process.exit(1); });
