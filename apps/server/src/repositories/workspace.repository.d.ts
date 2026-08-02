import type { BaseRepository } from './base.repository';
import type { Workspace, Prisma } from '@prisma/client';
import type { TxClient } from './user.repository';
export declare class WorkspaceRepository implements BaseRepository<Workspace, Prisma.WorkspaceCreateInput, Prisma.WorkspaceUpdateInput> {
    findById(id: string, tx?: TxClient): Promise<Workspace | null>;
    findAll(options?: Prisma.WorkspaceFindManyArgs, tx?: TxClient): Promise<Workspace[]>;
    create(data: Prisma.WorkspaceCreateInput, tx?: TxClient): Promise<Workspace>;
    update(id: string, data: Prisma.WorkspaceUpdateInput, tx?: TxClient): Promise<Workspace>;
    delete(id: string, tx?: TxClient): Promise<Workspace>;
    addMember(workspaceId: string, userId: string, role: string, tx?: TxClient): Promise<void>;
}
export declare const workspaceRepository: WorkspaceRepository;
//# sourceMappingURL=workspace.repository.d.ts.map
