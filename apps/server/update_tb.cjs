const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.timeBlock.update({
    where: { id: '969d990e-c1de-4cbe-8dbb-abc032d1db44' },
    data: { userId: '6bf71903-3f66-4cdb-82b2-755d5b653cae' }
  });
  console.log('Updated');
}
main().catch(console.error).finally(() => prisma.$disconnect());
