const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const task = await prisma.task.findUnique({
    where: { id: '84cce8be-cbd5-4603-91c2-257f88291f97' }
  });
  console.log('task date:', task.scheduledDate, task.dueDate);
}
main().catch(console.error).finally(() => prisma.$disconnect());
