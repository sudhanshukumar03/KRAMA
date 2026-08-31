const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.timeBlock.update({
    where: { id: '969d990e-c1de-4cbe-8dbb-abc032d1db44' },
    data: { taskId: '0510ed55-3081-45d8-bfaa-9a14f24f6d54' }
  });
  console.log('Linked to Review quarterly goals');
}
main().catch(console.error).finally(() => prisma.$disconnect());
