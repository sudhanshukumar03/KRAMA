import express, {} from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
const router = express.Router();
router.use(requireAuth);
const goalInclude = {
    childGoals: true,
    linkedProjects: {
        include: {
            issues: {
                select: { id: true, status: true },
            },
            _count: {
                select: { issues: true, sprints: true, roadmapItems: true, docs: true },
            },
        },
    },
    habits: true,
    snapshots: {
        orderBy: { date: 'desc' },
        take: 20,
    },
};
// Hierarchical server-side rollup calculation
export async function recalculateGoalRollups(goalId) {
    if (!goalId)
        return;
    try {
        const parent = await prisma.goal.findUnique({
            where: { id: goalId },
            include: { childGoals: true },
        });
        if (!parent)
            return;
        // Zero-children division-by-zero protection: do not override progress if no children exist
        if (!parent.childGoals || parent.childGoals.length === 0) {
            return;
        }
        const totalProgress = parent.childGoals.reduce((sum, child) => sum + (child.progress || 0), 0);
        const avgProgress = Math.round(totalProgress / parent.childGoals.length);
        if (parent.progress !== avgProgress) {
            const updatedParent = await prisma.goal.update({
                where: { id: parent.id },
                data: { progress: avgProgress },
            });
            // Recursively climb up hierarchical tree (e.g. Monthly ➔ Quarterly ➔ Yearly)
            if (updatedParent.parentGoalId) {
                await recalculateGoalRollups(updatedParent.parentGoalId);
            }
        }
    }
    catch (err) {
        console.error(`Failed to recalculate rollups for goal ${goalId}:`, err);
    }
}
router.get('/', async (_req, res) => {
    try {
        const goals = await prisma.goal.findMany({
            include: goalInclude,
            orderBy: { createdAt: 'desc' },
        });
        res.json(goals);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const goal = await prisma.goal.findUnique({
            where: { id: req.params.id },
            include: goalInclude,
        });
        if (!goal) {
            res.status(404).json({ error: 'Goal not found' });
            return;
        }
        res.json(goal);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const { title, type, targetDate, parentGoalId, progress } = req.body;
        if (!title || !type) {
            res.status(400).json({ error: 'Title and type are required' });
            return;
        }
        const goal = await prisma.goal.create({
            data: {
                title,
                type,
                targetDate: targetDate ? new Date(targetDate) : null,
                parentGoalId: parentGoalId || null,
                progress: progress !== undefined ? Number(progress) : 0,
            },
            include: goalInclude,
        });
        if (goal.parentGoalId) {
            await recalculateGoalRollups(goal.parentGoalId);
        }
        res.status(201).json(goal);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { title, type, targetDate, parentGoalId, progress } = req.body;
        const oldGoal = await prisma.goal.findUnique({ where: { id: req.params.id }, select: { parentGoalId: true } });
        const goal = await prisma.goal.update({
            where: { id: req.params.id },
            data: {
                ...(title !== undefined && { title }),
                ...(type !== undefined && { type }),
                ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
                ...(parentGoalId !== undefined && { parentGoalId }),
                ...(progress !== undefined && { progress: Number(progress) }),
            },
            include: goalInclude,
        });
        if (goal.parentGoalId) {
            await recalculateGoalRollups(goal.parentGoalId);
        }
        if (oldGoal?.parentGoalId && oldGoal.parentGoalId !== goal.parentGoalId) {
            await recalculateGoalRollups(oldGoal.parentGoalId);
        }
        res.json(goal);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const oldGoal = await prisma.goal.findUnique({ where: { id: req.params.id }, select: { parentGoalId: true } });
        const snapshot = await prisma.goal.findUnique({
            where: { id: req.params.id },
            include: {
                snapshots: true,
            },
        });
        await prisma.goal.updateMany({
            where: { parentGoalId: req.params.id },
            data: { parentGoalId: null },
        });
        await prisma.project.updateMany({
            where: { goalId: req.params.id },
            data: { goalId: null },
        });
        await prisma.goal.delete({
            where: { id: req.params.id },
        });
        if (oldGoal?.parentGoalId) {
            await recalculateGoalRollups(oldGoal.parentGoalId);
        }
        res.json({ message: 'Goal deleted successfully', snapshot });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/restore', async (req, res) => {
    try {
        const { id, title, type, targetDate, parentGoalId, progress, snapshots = [] } = req.body;
        const goal = await prisma.$transaction(async (tx) => {
            const g = await tx.goal.create({
                data: {
                    ...(id && { id }),
                    title,
                    type: type || 'quarterly',
                    targetDate: targetDate ? new Date(targetDate) : null,
                    parentGoalId: parentGoalId || null,
                    progress: progress || 0,
                },
            });
            for (const s of snapshots) {
                await tx.goalProgressSnapshot.create({
                    data: {
                        ...(s.id && { id: s.id }),
                        goalId: g.id,
                        progress: s.progress,
                        date: new Date(s.date),
                        note: s.note || null,
                    },
                });
            }
            return await tx.goal.findUnique({
                where: { id: g.id },
                include: goalInclude,
            });
        });
        res.status(201).json(goal);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=goals.js.map