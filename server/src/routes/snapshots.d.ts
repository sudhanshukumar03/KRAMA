declare const router: import("express-serve-static-core").Router;
export declare function runSnapshotJob(forceNew?: boolean): Promise<{
    createdCount: number;
    updatedCount: number;
    checkedGoalsCount: number;
}>;
export declare function startSnapshotScheduler(): void;
export default router;
//# sourceMappingURL=snapshots.d.ts.map