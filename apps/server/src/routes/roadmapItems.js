import express, {} from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
const router = express.Router();
router.use(requireAuth);
router.get('/', async (_req, res) => {
    try {
        const items = await prisma.roadmapItem.findMany({
            include: { project: true },
            orderBy: { order: 'asc' },
        });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const item = await prisma.roadmapItem.findUnique({
            where: { id: req.params.id },
            include: { project: true },
        });
        if (!item) {
            res.status(404).json({ error: 'RoadmapItem not found' });
            return;
        }
        res.json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const { title, status, projectId, version, order } = req.body;
        if (!title || !status || !projectId) {
            res.status(400).json({ error: 'Title, status, and projectId are required' });
            return;
        }
        const item = await prisma.roadmapItem.create({
            data: {
                title,
                status,
                projectId,
                version: version || null,
                order: order !== undefined ? Number(order) : 0,
            },
            include: { project: true },
        });
        res.status(201).json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { title, status, projectId, version, order } = req.body;
        const item = await prisma.roadmapItem.update({
            where: { id: req.params.id },
            data: {
                ...(title !== undefined && { title }),
                ...(status !== undefined && { status }),
                ...(projectId !== undefined && { projectId }),
                ...(version !== undefined && { version }),
                ...(order !== undefined && { order: Number(order) }),
            },
            include: { project: true },
        });
        res.json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await prisma.roadmapItem.delete({
            where: { id: req.params.id },
        });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=roadmapItems.js.map