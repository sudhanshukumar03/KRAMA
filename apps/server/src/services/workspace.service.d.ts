export declare class WorkspaceService {
    listWorkspaces(): Promise<{
        name: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        createdBy: string | null;
        updatedBy: string | null;
        productivityScore: number;
    }[]>;
    getWorkspace(id: string): Promise<{
        name: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        createdBy: string | null;
        updatedBy: string | null;
        productivityScore: number;
    }>;
    createWorkspace(data: any, userId: string): Promise<{
        name: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        createdBy: string | null;
        updatedBy: string | null;
        productivityScore: number;
    }>;
    updateWorkspace(id: string, data: any): Promise<{
        name: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        createdBy: string | null;
        updatedBy: string | null;
        productivityScore: number;
    }>;
    deleteWorkspace(id: string): Promise<{
        name: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        createdBy: string | null;
        updatedBy: string | null;
        productivityScore: number;
    }>;
}
export declare const workspaceService: WorkspaceService;
//# sourceMappingURL=workspace.service.d.ts.map