const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany();
  console.log(tasks.map(t => `${t.title} - ${t.workspaceId}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
