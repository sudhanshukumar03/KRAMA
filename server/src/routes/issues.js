import express, {} from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
const router = express.Router();
router.use(requireAuth);
router.get('/', async (_req, res) => {
    try {
        const issues = await prisma.issue.findMany({
            include: { project: true, sprint: true, blockedBy: true, blocking: true, childIssues: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(issues);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const issue = await prisma.issue.findUnique({
            where: { id: req.params.id },
            include: { project: true, sprint: true, blockedBy: true, blocking: true, childIssues: true },
        });
        if (!issue) {
            res.status(404).json({ error: 'Issue not found' });
            return;
        }
        res.json(issue);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const { title, description, status, priority, estimate, assignee, projectId, sprintId, parentIssueId, labels, dueDate, scheduledDate, blockedByIds, blockedBy, } = req.body;
        if (!title || !status || !priority || !projectId) {
            res.status(400).json({ error: 'Title, status, priority, and projectId are required' });
            return;
        }
        const depIds = blockedByIds !== undefined && Array.isArray(blockedByIds)
            ? blockedByIds
            : (blockedBy && Array.isArray(blockedBy) ? blockedBy.map((b) => typeof b === 'string' ? b : b.id) : undefined);
        const issue = await prisma.issue.create({
            data: {
                title,
                description: description || null,
                status,
                priority,
                estimate: estimate !== undefined ? Number(estimate) : null,
                assignee: assignee || null,
                projectId,
                sprintId: sprintId || null,
                parentIssueId: parentIssueId || null,
                labels: labels || [],
                dueDate: dueDate ? new Date(dueDate) : null,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                completedAt: status === 'done' ? new Date() : null,
                ...(depIds && Array.isArray(depIds) && depIds.length > 0 && {
                    blockedBy: {
                        connect: depIds.map((id) => ({ id })),
                    },
                }),
            },
            include: { project: true, sprint: true, blockedBy: true, blocking: true, childIssues: true },
        });
        res.status(201).json(issue);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { title, description, status, priority, estimate, assignee, sprintId, parentIssueId, labels, dueDate, scheduledDate, blockedByIds, blockedBy, } = req.body;
        const existing = await prisma.issue.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ error: 'Issue not found' });
            return;
        }
        let completedAt = existing.completedAt;
        if (status === 'done' && existing.status !== 'done') {
            completedAt = new Date();
        }
        else if (status && status !== 'done') {
            completedAt = null;
        }
        const depIds = blockedByIds !== undefined && Array.isArray(blockedByIds)
            ? blockedByIds
            : (blockedBy !== undefined && Array.isArray(blockedBy) ? blockedBy.map((b) => typeof b === 'string' ? b : b.id) : undefined);
        const issue = await prisma.issue.update({
            where: { id: req.params.id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status }),
                ...(priority !== undefined && { priority }),
                ...(estimate !== undefined && { estimate: estimate !== null ? Number(estimate) : null }),
                ...(assignee !== undefined && { assignee }),
                ...(sprintId !== undefined && { sprintId }),
                ...(parentIssueId !== undefined && { parentIssueId }),
                ...(labels !== undefined && { labels }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
                completedAt,
                ...(depIds !== undefined && Array.isArray(depIds) && {
                    blockedBy: {
                        set: depIds.map((id) => ({ id })),
                    },
                }),
            },
            include: { project: true, sprint: true, blockedBy: true, blocking: true, childIssues: true },
        });
        res.json(issue);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const snapshot = await prisma.issue.findUnique({
            where: { id: req.params.id },
            include: { project: true, sprint: true, blockedBy: true, blocking: true, childIssues: true },
        });
        // Prevent foreign key constraint violation if issue has child issues
        await prisma.issue.updateMany({
            where: { parentIssueId: req.params.id },
            data: { parentIssueId: null },
        });
        await prisma.issue.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Issue deleted successfully', snapshot });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/restore', async (req, res) => {
    try {
        const { id, title, description, status, priority, estimate, assignee, projectId, sprintId, parentIssueId, labels, dueDate, scheduledDate, completedAt, blockedBy = [] } = req.body;
        const depIds = Array.isArray(blockedBy) ? blockedBy.map((b) => typeof b === 'string' ? b : b.id) : [];
        const issue = await prisma.issue.create({
            data: {
                ...(id && { id }),
                title,
                description: description || null,
                status: status || 'todo',
                priority: priority || 'medium',
                estimate: estimate !== undefined && estimate !== null ? Number(estimate) : null,
                assignee: assignee || null,
                projectId: projectId || null,
                sprintId: sprintId || null,
                parentIssueId: parentIssueId || null,
                labels: labels || [],
                dueDate: dueDate ? new Date(dueDate) : null,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                completedAt: completedAt ? new Date(completedAt) : null,
                ...(depIds.length > 0 && {
                    blockedBy: {
                        connect: depIds.map((id) => ({ id })),
                    },
                }),
            },
            include: { project: true, sprint: true, blockedBy: true, blocking: true, childIssues: true },
        });
        res.status(201).json(issue);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=issues.js.map