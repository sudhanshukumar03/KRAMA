import { prisma } from '../prisma';
export class TaskRepository {
    async findById(id, tx) {
        return (tx || prisma).task.findUnique({
            where: { id },
            include: { project: true, sprint: true },
        });
    }
    async findAll(options, tx) {
        return (tx || prisma).task.findMany(options || {});
    }
    async findManyByWorkspace(workspaceId, filters, tx) {
        const where = { workspaceId, deletedAt: null };
        if (filters.projectId)
            where.projectId = filters.projectId;
        if (filters.sprintId)
            where.sprintId = filters.sprintId;
        if (filters.status)
            where.status = filters.status;
        return (tx || prisma).task.findMany({
            where,
            include: { project: true, sprint: true },
            orderBy: { position: 'asc' },
        });
    }
    async findMaxPosition(workspaceId, tx) {
        const lastTask = await (tx || prisma).task.findFirst({
            where: { workspaceId, deletedAt: null },
            orderBy: { position: 'desc' },
            select: { position: true },
        });
        return lastTask?.position || 0;
    }
    async create(data, tx) {
        return (tx || prisma).task.create({
            data,
            include: { project: true, sprint: true },
        });
    }
    async update(id, data, tx) {
        return (tx || prisma).task.update({
            where: { id },
            data,
            include: { project: true, sprint: true },
        });
    }
    async delete(id, tx) {
        return (tx || prisma).task.delete({ where: { id } });
    }
}
export const taskRepository = new TaskRepository();
//# sourceMappingURL=task.repository.js.map