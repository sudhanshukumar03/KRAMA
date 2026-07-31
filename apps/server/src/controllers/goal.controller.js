import { PrismaClient } from '@prisma/client';
import { CreateGoalSchema, UpdateGoalSchema } from '@krama/validation';
const prisma = new PrismaClient();
export const listGoals = async (req, res) => {
    try {
        const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
        if (!workspaceId)
            return res.status(400).json({ message: 'workspaceId is required' });
        const goals = await prisma.goal.findMany({
            where: {
                workspaceId,
                deletedAt: null,
            },
            include: {
                projects: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(goals);
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const getGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
        const goal = await prisma.goal.findUnique({
            where: { id },
            include: { projects: true },
        });
        if (!goal || goal.deletedAt || goal.workspaceId !== workspaceId) {
            return res.status(404).json({ message: 'Goal not found' });
        }
        return res.status(200).json(goal);
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const createGoal = async (req, res) => {
    try {
        const data = CreateGoalSchema.parse(req.body);
        const goal = await prisma.goal.create({
            data: {
                ...data,
                createdBy: req.user.id,
            },
            include: { projects: true },
        });
        return res.status(201).json(goal);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const data = UpdateGoalSchema.parse(req.body);
        const existing = await prisma.goal.findUnique({ where: { id } });
        if (!existing || existing.deletedAt || existing.workspaceId !== data.workspaceId) {
            return res.status(404).json({ message: 'Goal not found' });
        }
        if (existing.version !== data.version) {
            return res.status(409).json({ message: 'Conflict: version mismatch' });
        }
        const { version, workspaceId, ...updateData } = data;
        const goal = await prisma.goal.update({
            where: { id },
            data: {
                ...updateData,
                version: { increment: 1 },
                updatedBy: req.user.id,
            },
            include: { projects: true },
        });
        return res.status(200).json(goal);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
        const existing = await prisma.goal.findUnique({ where: { id } });
        if (!existing || existing.deletedAt || existing.workspaceId !== workspaceId) {
            return res.status(404).json({ message: 'Goal not found' });
        }
        await prisma.goal.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                updatedBy: req.user.id,
            },
        });
        return res.status(200).json({ message: 'Goal deleted' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
//# sourceMappingURL=goal.controller.js.map