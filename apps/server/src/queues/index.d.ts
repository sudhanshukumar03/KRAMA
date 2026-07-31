import { Queue } from 'bullmq';
export declare const QUEUE_NAMES: {
    NOTIFICATIONS: string;
    HABIT_STREAK: string;
    SPRINT_REPORT: string;
    ANALYTICS: string;
};
export declare const notificationsQueue: Queue<any, any, string, any, any, string, import("bullmq").RedisQueueBackend>;
export declare const habitStreakQueue: Queue<any, any, string, any, any, string, import("bullmq").RedisQueueBackend>;
export declare const sprintReportQueue: Queue<any, any, string, any, any, string, import("bullmq").RedisQueueBackend>;
export declare const analyticsQueue: Queue<any, any, string, any, any, string, import("bullmq").RedisQueueBackend>;
//# sourceMappingURL=index.d.ts.map