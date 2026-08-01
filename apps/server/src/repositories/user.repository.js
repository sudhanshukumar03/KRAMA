import { prisma } from '../prisma';
export class UserRepository {
    async findById(id, tx) {
        return (tx || prisma).user.findUnique({ where: { id } });
    }
    async findByEmail(email, tx) {
        return (tx || prisma).user.findUnique({
            where: { email },
            include: {
                memberships: {
                    select: { workspaceId: true, role: true }
                }
            }
        });
    }
    async findAll(options, tx) {
        return (tx || prisma).user.findMany(options || {});
    }
    async create(data, tx) {
        return (tx || prisma).user.create({ data });
    }
    async update(id, data, tx) {
        return (tx || prisma).user.update({ where: { id }, data });
    }
    async delete(id, tx) {
        return (tx || prisma).user.delete({ where: { id } });
    }
}
export const userRepository = new UserRepository();
//# sourceMappingURL=user.repository.js.map