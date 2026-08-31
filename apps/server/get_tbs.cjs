const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tbs = await prisma.timeBlock.findMany();
  console.log(tbs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
