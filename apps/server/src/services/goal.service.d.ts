export declare class GoalService {
    listGoals(workspaceId: string): Promise<{
        type: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        workspaceId: string;
        createdBy: string | null;
        updatedBy: string | null;
        title: string;
        progress: number;
        targetDate: Date | null;
        parentGoalId: string | null;
    }[]>;
    getGoal(id: string, workspaceId: string): Promise<{
        type: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        workspaceId: string;
        createdBy: string | null;
        updatedBy: string | null;
        title: string;
        progress: number;
        targetDate: Date | null;
        parentGoalId: string | null;
    }>;
    createGoal(data: any, userId: string): Promise<{
        type: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        workspaceId: string;
        createdBy: string | null;
        updatedBy: string | null;
        title: string;
        progress: number;
        targetDate: Date | null;
        parentGoalId: string | null;
    }>;
    updateGoal(id: string, workspaceId: string, data: any, userId: string): Promise<{
        type: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        workspaceId: string;
        createdBy: string | null;
        updatedBy: string | null;
        title: string;
        progress: number;
        targetDate: Date | null;
        parentGoalId: string | null;
    }>;
    deleteGoal(id: string, workspaceId: string, userId: string): Promise<{
        type: string;
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        workspaceId: string;
        createdBy: string | null;
        updatedBy: string | null;
        title: string;
        progress: number;
        targetDate: Date | null;
        parentGoalId: string | null;
    }>;
}
export declare const goalService: GoalService;
//# sourceMappingURL=goal.service.d.ts.map