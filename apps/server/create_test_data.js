import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const workspace = await prisma.workspace.findFirst();
const task = await prisma.task.create({
  data: {
    title: 'MCP Task for Planner',
    status: 'TODO',
    scheduledDate: '2026-08-30',
    workspaceId: workspace.id,
    createdBy: '60513bfc-1e21-426d-9a60-9a11b1bab92f',
    updatedBy: '60513bfc-1e21-426d-9a60-9a11b1bab92f'
  }
});
const project = await prisma.project.create({
  data: {
    name: 'MCP Project for Planner',
    status: 'ACTIVE',
    workspaceId: workspace.id,
    createdBy: '60513bfc-1e21-426d-9a60-9a11b1bab92f',
    updatedBy: '60513bfc-1e21-426d-9a60-9a11b1bab92f'
  }
});
console.log('Created task and project:', task.id, project.id);
await prisma.$disconnect();
