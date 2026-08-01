import { CreateGoalSchema, UpdateGoalSchema } from '@krama/validation';
import { goalService } from '../services/goal.service';
export const listGoals = async (req, res) => {
    try {
        const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId);
        if (!workspaceId)
            return res.status(400).json({ message: 'workspaceId is required' });
        const goals = await goalService.listGoals(workspaceId);
        return res.status(200).json(goals);
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const getGoal = async (req, res) => {
    try {
        const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId);
        const goal = await goalService.getGoal(req.params.id, workspaceId);
        return res.status(200).json(goal);
    }
    catch (error) {
        if (error.message === 'Goal not found')
            return res.status(404).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const createGoal = async (req, res) => {
    try {
        const data = CreateGoalSchema.parse(req.body);
        // @ts-ignore
        const goal = await goalService.createGoal(data, req.user.id);
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
        const data = UpdateGoalSchema.parse(req.body);
        // @ts-ignore
        const goal = await goalService.updateGoal(req.params.id, data.workspaceId, data, req.user.id);
        return res.status(200).json(goal);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        if (error.message === 'Goal not found')
            return res.status(404).json({ message: error.message });
        if (error.message.includes('Conflict'))
            return res.status(409).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const deleteGoal = async (req, res) => {
    try {
        const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId);
        // @ts-ignore
        await goalService.deleteGoal(req.params.id, workspaceId, req.user.id);
        return res.status(200).json({ message: 'Goal deleted' });
    }
    catch (error) {
        if (error.message === 'Goal not found')
            return res.status(404).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
//# sourceMappingURL=goal.controller.js.map