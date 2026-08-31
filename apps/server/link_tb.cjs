const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const task = await prisma.task.findFirst();
  if (task) {
    await prisma.timeBlock.update({
      where: { id: '969d990e-c1de-4cbe-8dbb-abc032d1db44' },
      data: { taskId: task.id }
    });
    console.log('Linked to task:', task.title);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
