const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany();
  console.log(tasks.map(t => `${t.id} - ${t.title}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
