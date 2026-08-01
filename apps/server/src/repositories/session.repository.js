import { prisma } from '../prisma';
export class SessionRepository {
    async findById(id, tx) {
        return (tx || prisma).session.findUnique({ where: { id } });
    }
    async findByHash(hash, tx) {
        return (tx || prisma).session.findUnique({ where: { refreshTokenHash: hash } });
    }
    async findAll(options, tx) {
        return (tx || prisma).session.findMany(options || {});
    }
    async findActiveByUserId(userId, tx) {
        return (tx || prisma).session.findMany({
            where: { userId, revokedAt: null },
        });
    }
    async create(data, tx) {
        return (tx || prisma).session.create({ data });
    }
    async update(id, data, tx) {
        return (tx || prisma).session.update({ where: { id }, data });
    }
    async updateByHash(hash, data, tx) {
        return (tx || prisma).session.update({ where: { refreshTokenHash: hash }, data });
    }
    async updateManyActiveByUserId(userId, data, tx) {
        await (tx || prisma).session.updateMany({
            where: { userId, revokedAt: null },
            data,
        });
    }
    async delete(id, tx) {
        return (tx || prisma).session.delete({ where: { id } });
    }
}
export const sessionRepository = new SessionRepository();
//# sourceMappingURL=session.repository.js.map