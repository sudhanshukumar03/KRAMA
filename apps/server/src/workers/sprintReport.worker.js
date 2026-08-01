// @ts-nocheck
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { QUEUE_NAMES } from '../queues';
import { connection } from '../lib/redis';
const prisma = new PrismaClient();
export const sprintReportWorker = new Worker(QUEUE_NAMES.SPRINT_REPORT, async (job) => {
    console.log(`[Worker:SprintReport] Running weekly report generation...`);
    // Find all sprints that ended in the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const endedSprints = await prisma.sprint.findMany({
        where: {
            endDate: {
                gte: oneWeekAgo,
                lte: new Date(),
            },
            deletedAt: null,
        },
        include: {
            tasks: {
                where: { deletedAt: null },
            },
        },
    });
    let generatedCount = 0;
    for (const sprint of endedSprints) {
        // Check if report already exists (idempotency)
        const existingReport = await prisma.sprintReport.findUnique({
            where: { sprintId: sprint.id },
        });
        if (existingReport)
            continue;
        const tasksCompleted = sprint.tasks.filter(t => t.status === 'done').length;
        const tasksPlanned = sprint.tasks.length;
        await prisma.sprintReport.create({
            data: {
                sprintId: sprint.id,
                workspaceId: sprint.workspaceId,
                tasksCompleted,
                tasksPlanned,
            },
        });
        generatedCount++;
    }
    return { generatedReports: generatedCount };
}, { connection });
sprintReportWorker.on('completed', (job, result) => {
    console.log(`[Worker:SprintReport] Generated ${result.generatedReports} reports.`);
});
sprintReportWorker.on('failed', (job, err) => {
    console.error(`[Worker:SprintReport] Failed:`, err);
});
//# sourceMappingURL=sprintReport.worker.js.map