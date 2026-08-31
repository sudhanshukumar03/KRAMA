import re

# 1. Update task.service.ts
with open('apps/server/src/services/task.service.ts', 'r') as f:
    text = f.read()

rebalance_service = '''
  async rebalanceTasks(workspaceId: string): Promise<void> {
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      orderBy: [
        { status: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    
    let currentStatus = '';
    let currentOrder = 0;
    
    for (const task of tasks) {
      if (task.status !== currentStatus) {
        currentStatus = task.status;
        currentOrder = 1000;
      } else {
        currentOrder += 1000;
      }
      
      await prisma.task.update({
        where: { id: task.id },
        data: { sortOrder: currentOrder }
      });
    }
  },'''

if 'rebalanceTasks' not in text:
    text = text.replace('async listTasks', rebalance_service + '\n\n  async listTasks')
    with open('apps/server/src/services/task.service.ts', 'w') as f:
        f.write(text)

# 2. Update task.controller.ts
with open('apps/server/src/controllers/task.controller.ts', 'r') as f:
    text = f.read()

rebalance_controller = '''
export const rebalanceTasks = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    await taskService.rebalanceTasks(workspaceId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
'''

if 'rebalanceTasks' not in text:
    text = text + '\n' + rebalance_controller
    with open('apps/server/src/controllers/task.controller.ts', 'w') as f:
        f.write(text)

# 3. Update task.routes.ts
with open('apps/server/src/routes/task.routes.ts', 'r') as f:
    text = f.read()

if 'rebalanceTasks' not in text:
    text = text.replace('import { listTasks, getTask, createTask, updateTask, deleteTask, reorderTask, completeTask, restoreTask }', 
                        'import { listTasks, getTask, createTask, updateTask, deleteTask, reorderTask, completeTask, restoreTask, rebalanceTasks }')
    text = text.replace('router.post(\'/:id/restore\', requireWorkspaceRole(\'MEMBER\'), restoreTask);',
                        'router.post(\'/:id/restore\', requireWorkspaceRole(\'MEMBER\'), restoreTask);\nrouter.post(\'/rebalance\', requireWorkspaceRole(\'MEMBER\'), rebalanceTasks);')
    with open('apps/server/src/routes/task.routes.ts', 'w') as f:
        f.write(text)
