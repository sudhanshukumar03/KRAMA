const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tb = await prisma.timeBlock.findUnique({
    where: { id: '969d990e-c1de-4cbe-8dbb-abc032d1db44' }
  });
  console.log('tb.taskId:', tb.taskId);
}
main().catch(console.error).finally(() => prisma.$disconnect());
