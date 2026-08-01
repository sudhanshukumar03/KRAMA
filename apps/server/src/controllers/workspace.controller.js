import { workspaceService } from '../services/workspace.service';
export const listWorkspaces = async (req, res) => {
    try {
        const workspaces = await workspaceService.listWorkspaces();
        return res.status(200).json(workspaces);
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const getWorkspace = async (req, res) => {
    try {
        const workspace = await workspaceService.getWorkspace(req.params.id);
        return res.status(200).json(workspace);
    }
    catch (error) {
        if (error.message === 'Workspace not found')
            return res.status(404).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const createWorkspace = async (req, res) => {
    try {
        // @ts-ignore
        const workspace = await workspaceService.createWorkspace(req.body, req.user.id);
        return res.status(201).json(workspace);
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateWorkspace = async (req, res) => {
    try {
        const workspace = await workspaceService.updateWorkspace(req.params.id, req.body);
        return res.status(200).json(workspace);
    }
    catch (error) {
        if (error.message === 'Workspace not found')
            return res.status(404).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const deleteWorkspace = async (req, res) => {
    try {
        await workspaceService.deleteWorkspace(req.params.id);
        return res.status(200).json({ message: 'Workspace deleted' });
    }
    catch (error) {
        if (error.message === 'Workspace not found')
            return res.status(404).json({ message: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
//# sourceMappingURL=workspace.controller.js.map