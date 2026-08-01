import { CreateHabitSchema, UpdateHabitSchema } from '@krama/validation';
import { habitService } from '../services/habit.service';
export const listHabits = async (req, res) => {
    try {
        const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
        if (!workspaceId)
            return res.status(400).json({ message: 'workspaceId is required' });
        const habits = await habitService.listHabits(workspaceId);
        return res.status(200).json(habits);
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const getHabit = async (req, res) => {
    try {
        const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId);
        const habit = await habitService.getHabit(req.params.id, workspaceId);
        return res.status(200).json(habit);
    }
    catch (error) {
        if (error.message === 'Habit not found')
            return res.status(404).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const createHabit = async (req, res) => {
    try {
        const data = CreateHabitSchema.parse(req.body);
        // @ts-ignore
        const habit = await habitService.createHabit(data, req.user.id);
        return res.status(201).json(habit);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateHabit = async (req, res) => {
    try {
        const data = UpdateHabitSchema.parse(req.body);
        // @ts-ignore
        const habit = await habitService.updateHabit(req.params.id, data.workspaceId, data, req.user.id);
        return res.status(200).json(habit);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        if (error.message === 'Habit not found')
            return res.status(404).json({ message: error.message });
        if (error.message.includes('Conflict'))
            return res.status(409).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const deleteHabit = async (req, res) => {
    try {
        const workspaceId = (req.headers['x-workspace-id'] || req.query.workspaceId);
        // @ts-ignore
        await habitService.deleteHabit(req.params.id, workspaceId, req.user.id);
        return res.status(200).json({ message: 'Habit deleted' });
    }
    catch (error) {
        if (error.message === 'Habit not found')
            return res.status(404).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const logHabit = async (req, res) => {
    try {
        const workspaceId = (req.headers['x-workspace-id'] || req.body.workspaceId);
        // @ts-ignore
        const habit = await habitService.logHabitCompletion(req.params.id, workspaceId, req.user.id);
        return res.status(200).json(habit);
    }
    catch (error) {
        if (error.message === 'Habit not found')
            return res.status(404).json({ message: error.message });
        if (error.message === 'Habit already logged for today')
            return res.status(400).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
//# sourceMappingURL=habit.controller.js.map