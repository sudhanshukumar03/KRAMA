import express, {} from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
const router = express.Router();
router.use(requireAuth);
router.get('/', async (_req, res) => {
    try {
        const sprints = await prisma.sprint.findMany({
            include: { issues: true, project: true },
            orderBy: { startDate: 'desc' },
        });
        res.json(sprints);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const sprint = await prisma.sprint.findUnique({
            where: { id: req.params.id },
            include: { issues: true, project: true },
        });
        if (!sprint) {
            res.status(404).json({ error: 'Sprint not found' });
            return;
        }
        res.json(sprint);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, startDate, endDate, projectId } = req.body;
        if (!name || !startDate || !endDate || !projectId) {
            res.status(400).json({ error: 'Name, startDate, endDate, and projectId are required' });
            return;
        }
        const sprint = await prisma.sprint.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                projectId,
            },
            include: { issues: true, project: true },
        });
        res.status(201).json(sprint);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { name, startDate, endDate, projectId } = req.body;
        const sprint = await prisma.sprint.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(startDate !== undefined && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: new Date(endDate) }),
                ...(projectId !== undefined && { projectId }),
            },
            include: { issues: true, project: true },
        });
        res.json(sprint);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await prisma.issue.updateMany({
            where: { sprintId: req.params.id },
            data: { sprintId: null },
        });
        await prisma.sprint.delete({
            where: { id: req.params.id },
        });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=sprints.js.map