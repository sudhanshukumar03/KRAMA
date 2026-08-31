import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    const user = await prisma.user.findFirst();
    console.log('User:', user.id);
    const block = await prisma.timeBlock.create({
      data: {
        userId: user.id,
        title: 'Test Block',
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        type: 'WORK'
      }
    });
    console.log('Created block:', block.id);
    await prisma.timeBlock.delete({ where: { id: block.id } });
    console.log('Deleted block');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
