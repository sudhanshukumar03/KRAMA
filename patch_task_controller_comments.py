# 1. Update task.controller.ts
with open('apps/server/src/controllers/task.controller.ts', 'r') as f:
    text = f.read()

comments_controller = '''
export const addComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    if (!content) return res.status(400).json({ message: 'Content is required' });

    const { prisma } = await import('../prisma');
    
    // Check task exists
    const task = await prisma.task.findUnique({ where: { id, workspaceId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: id,
        userId
      },
      include: {
        user: { select: { name: true, image: true } }
      }
    });

    return res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
'''

if 'addComment' not in text:
    text = text + '\n' + comments_controller
    with open('apps/server/src/controllers/task.controller.ts', 'w') as f:
        f.write(text)

# 2. Update task.routes.ts
with open('apps/server/src/routes/task.routes.ts', 'r') as f:
    text = f.read()

if 'addComment' not in text:
    text = text.replace('import { listTasks', 'import { addComment, listTasks')
    text = text.replace("router.post('/rebalance', requireWorkspaceRole('MEMBER'), rebalanceTasks);", "router.post('/rebalance', requireWorkspaceRole('MEMBER'), rebalanceTasks);\nrouter.post('/:id/comments', requireWorkspaceRole('MEMBER'), addComment);")
    with open('apps/server/src/routes/task.routes.ts', 'w') as f:
        f.write(text)
