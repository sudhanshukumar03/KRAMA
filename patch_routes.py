# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/server/src/routes/planner.routes.ts'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

milestones_routes = """
// Milestones
router.post('/milestones', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const schema = z.object({
      title: z.string().min(1),
      date: z.coerce.date(),
      projectId: z.string().min(1),
    });
    
    const body = schema.parse(req.body);
    const date = startOfDay(body.date);

    const milestone = await prisma.milestone.create({
      data: {
        userId,
        title: body.title,
        date: date,
        projectId: body.projectId,
      },
    });

    return res.json(milestone);
  } catch (error) {
    console.error('Create milestone:', error);
    return res.status(400).json({ message: 'Unable to create milestone' });
  }
});

router.patch('/milestones/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const schema = z.object({
      title: z.string().min(1).optional(),
      date: z.coerce.date().optional(),
      projectId: z.string().min(1).optional(),
      completed: z.boolean().optional(),
    });
    
    const body = schema.parse(req.body);
    const dataToUpdate: any = { ...body };
    if (body.date) {
      dataToUpdate.date = startOfDay(body.date);
    }

    const milestone = await prisma.milestone.update({
      where: { id: req.params.id, userId },
      data: dataToUpdate,
    });

    return res.json(milestone);
  } catch (error) {
    console.error('Update milestone:', error);
    return res.status(400).json({ message: 'Unable to update milestone' });
  }
});

router.delete('/milestones/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await prisma.milestone.delete({
      where: { id: req.params.id, userId },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete milestone:', error);
    return res.status(400).json({ message: 'Unable to delete milestone' });
  }
});

"""

content = content.replace("export default router;", milestones_routes + "export default router;")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
