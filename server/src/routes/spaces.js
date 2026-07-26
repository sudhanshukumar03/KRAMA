import express, {} from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
const router = express.Router();
router.use(requireAuth);
router.get('/', async (_req, res) => {
    try {
        const spaces = await prisma.space.findMany({
            include: { pages: true, projects: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(spaces);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const space = await prisma.space.findUnique({
            where: { id: req.params.id },
            include: { pages: true, projects: true },
        });
        if (!space) {
            res.status(404).json({ error: 'Space not found' });
            return;
        }
        res.json(space);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, workspaceId } = req.body;
        if (!name || !workspaceId) {
            res.status(400).json({ error: 'Name and workspaceId are required' });
            return;
        }
        const space = await prisma.space.create({
            data: { name, workspaceId },
            include: { pages: true, projects: true },
        });
        res.status(201).json(space);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { name, workspaceId } = req.body;
        const space = await prisma.space.update({
            where: { id: req.params.id },
            data: { name, workspaceId },
            include: { pages: true, projects: true },
        });
        res.json(space);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await prisma.space.delete({
            where: { id: req.params.id },
        });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=spaces.js.map