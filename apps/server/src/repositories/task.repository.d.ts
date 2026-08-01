import type { BaseRepository } from './base.repository';
import type { Task, Prisma, TaskStatus } from '@prisma/client';
import type { TxClient } from './user.repository';
export declare class TaskRepository implements BaseRepository<Task, Prisma.TaskUncheckedCreateInput, Prisma.TaskUncheckedUpdateInput> {
    findById(id: string, tx?: TxClient): Promise<Task | null>;
    findAll(options?: Prisma.TaskFindManyArgs, tx?: TxClient): Promise<Task[]>;
    findManyByWorkspace(workspaceId: string, filters: {
        projectId?: string;
        sprintId?: string;
        status?: TaskStatus;
    }, tx?: TxClient): Promise<Task[]>;
    findMaxPosition(workspaceId: string, tx?: TxClient): Promise<number>;
    create(data: Prisma.TaskUncheckedCreateInput, tx?: TxClient): Promise<Task>;
    update(id: string, data: Prisma.TaskUncheckedUpdateInput, tx?: TxClient): Promise<Task>;
    delete(id: string, tx?: TxClient): Promise<Task>;
}
export declare const taskRepository: TaskRepository;
//# sourceMappingURL=task.repository.d.ts.map