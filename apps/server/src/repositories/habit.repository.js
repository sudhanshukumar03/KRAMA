import { prisma } from '../prisma';
export class HabitRepository {
    async findById(id, tx) {
        return (tx || prisma).habit.findUnique({
            where: { id },
            include: {
                completions: {
                    orderBy: { completedAt: 'desc' },
                    take: 30, // Last 30 completions
                }
            }
        });
    }
    async findAll(options, tx) {
        return (tx || prisma).habit.findMany(options || {});
    }
    async findManyByWorkspace(workspaceId, tx) {
        return (tx || prisma).habit.findMany({
            where: {
                workspaceId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(data, tx) {
        return (tx || prisma).habit.create({ data });
    }
    async update(id, data, tx) {
        return (tx || prisma).habit.update({
            where: { id },
            data,
        });
    }
    async delete(id, tx) {
        return (tx || prisma).habit.delete({ where: { id } });
    }
    async addCompletion(data, tx) {
        return (tx || prisma).habitCompletion.create({ data });
    }
    async getCompletionCountToday(habitId, todayStart, todayEnd, tx) {
        return (tx || prisma).habitCompletion.count({
            where: {
                habitId,
                completedAt: {
                    gte: todayStart,
                    lte: todayEnd,
                },
            }
        });
    }
}
export const habitRepository = new HabitRepository();
//# sourceMappingURL=habit.repository.js.map