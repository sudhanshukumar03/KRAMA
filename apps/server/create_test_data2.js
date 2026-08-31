import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const workspace = await prisma.workspace.findFirst();
const task = await prisma.task.create({
  data: {
    title: 'MCP Task for Planner',
    status: 'TODO',
    scheduledDate: new Date('2026-08-30T00:00:00.000Z'),
    workspaceId: workspace.id,
    createdBy: '60513bfc-1e21-426d-9a60-9a11b1bab92f',
    updatedBy: '60513bfc-1e21-426d-9a60-9a11b1bab92f'
  }
});
console.log('Created task:', task.id);
await prisma.$disconnect();
