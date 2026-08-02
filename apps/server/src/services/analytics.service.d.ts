export declare const analyticsService: {
    getOverview(workspaceId: string, range: "7d" | "30d" | "90d"): Promise<{
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        workspaceId: string;
        date: Date;
        weeklyVelocity: number;
        activeStreaks: number;
        okrPace: number;
        deepWorkLogged: number;
    }[]>;
    getFocusHistory(workspaceId: string, range: "7d" | "30d" | "90d"): Promise<({
        user: {
            name: string | null;
            id: string;
            email: string;
        };
        task: {
            id: string;
            title: string;
        } | null;
        project: {
            name: string;
            id: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        workspaceId: string;
        projectId: string | null;
        startTime: Date;
        endTime: Date | null;
        duration: number;
        completed: boolean;
        type: string;
        taskId: string | null;
    })[]>;
    getHabitHeatmap(workspaceId: string, habitId: string, range: "30d" | "90d" | "365d"): Promise<{
        id: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string;
        notes: string | null;
        habitId: string;
        completedAt: Date;
    }[]>;
};
//# sourceMappingURL=analytics.service.d.ts.map
