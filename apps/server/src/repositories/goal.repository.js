import { prisma } from '../prisma';
export class GoalRepository {
    async findById(id, tx) {
        return (tx || prisma).goal.findUnique({
            where: { id },
            include: { projects: true },
        });
    }
    async findAll(options, tx) {
        return (tx || prisma).goal.findMany(options || {});
    }
    async findManyByWorkspace(workspaceId, tx) {
        return (tx || prisma).goal.findMany({
            where: {
                workspaceId,
                deletedAt: null,
            },
            include: { projects: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(data, tx) {
        return (tx || prisma).goal.create({
            data,
            include: { projects: true },
        });
    }
    async update(id, data, tx) {
        return (tx || prisma).goal.update({
            where: { id },
            data,
            include: { projects: true },
        });
    }
    async delete(id, tx) {
        return (tx || prisma).goal.delete({ where: { id } });
    }
}
export const goalRepository = new GoalRepository();
//# sourceMappingURL=goal.repository.js.map