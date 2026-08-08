const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const workspaceId = '00000000-0000-4000-8000-000000000002';
  const userId = '00000000-0000-4000-8000-000000000001';
  
  const task = await prisma.task.create({
    data: {
      title: 'Cross View Live Verification Task',
      workspaceId,
      createdBy: userId,
      updatedBy: userId,
      position: 100,
      status: 'TODO'
    }
  });
  console.log('--- Before Completion ---');
  console.log('Task Created:', task.id, task.title, task.status);

  // Mark Complete via API to simulate Dashboard toggle
  const res = await fetch(http://localhost:3000/api/v1/tasks/, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
    body: JSON.stringify({ status: 'DONE', version: task.version })
  });
  
  console.log('API Response Status:', res.status);
  
  // Wait a moment for background worker
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('--- After Completion ---');
  const taskAfter = await prisma.task.findUnique({ where: { id: task.id } });
  console.log('Task Status (Kanban View Source):', taskAfter.status);
  
  const notifications = await prisma.notification.findMany({
    where: { userId, message: { contains: task.title } }
  });
  console.log('Notifications (Stage 4 check):', notifications);
  
  process.exit(0);
}
run();
