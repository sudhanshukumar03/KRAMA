import { prisma } from '../prisma';
export class WorkspaceRepository {
    async findById(id, tx) {
        return (tx || prisma).workspace.findUnique({ where: { id } });
    }
    async findAll(options, tx) {
        return (tx || prisma).workspace.findMany(options || {});
    }
    async create(data, tx) {
        return (tx || prisma).workspace.create({ data });
    }
    async update(id, data, tx) {
        return (tx || prisma).workspace.update({ where: { id }, data });
    }
    async delete(id, tx) {
        return (tx || prisma).workspace.delete({ where: { id } });
    }
    async addMember(workspaceId, userId, role, tx) {
        await (tx || prisma).workspaceMember.create({
            data: {
                workspaceId,
                userId,
                role: role,
            }
        });
    }
}
export const workspaceRepository = new WorkspaceRepository();
//# sourceMappingURL=workspace.repository.js.map