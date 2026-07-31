import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
const connection = new Redis('redis://:krama_redis_secret@localhost:6379', { maxRetriesPerRequest: null });
const sprintReportQueue = new Queue('sprint-report', { connection });
const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000/api/v1';
async function fetchApi(endpoint, options = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
}
async function runTests() {
    console.log("=== STAGE 4 BACKGROUND WORKER TESTS ===");
    // 1. Setup Data
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const signupRes = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniqueEmail, password: 'password123', name: 'Test User' })
    });
    const { accessToken } = await signupRes.json();
    const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await meRes.json();
    console.log('Me Response:', data);
    const wid = data.user.memberships[0].workspaceId;
    const authHeader = {
        'Authorization': `Bearer ${accessToken}`,
        'x-workspace-id': wid
    };
    // Verify Initial Productivity Score
    const wsBefore = await prisma.workspace.findUnique({ where: { id: wid } });
    console.log(`Initial Productivity Score: ${wsBefore?.productivityScore}`);
    // Create a Task
    const task = await fetchApi('/tasks', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ title: 'Async Test Task', workspaceId: wid })
    });
    console.log(`Created Task: ${task.id}`);
    // Complete Task
    console.log(`Completing Task...`);
    await fetchApi(`/tasks/${task.id}/complete`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({ version: 1 })
    });
    // Wait for background worker
    console.log("Waiting 3s for BullMQ to process TaskCompleted event...");
    await new Promise(r => setTimeout(r, 3000));
    // Check Productivity Score
    const wsAfter = await prisma.workspace.findUnique({ where: { id: wid } });
    if (wsAfter?.productivityScore !== (wsBefore?.productivityScore || 0) + 10) {
        throw new Error(`Expected score ${(wsBefore?.productivityScore || 0) + 10}, got ${wsAfter?.productivityScore}`);
    }
    console.log(`✅ Productivity score incremented successfully: ${wsAfter.productivityScore}`);
    // Check Notification created
    const notifs = await prisma.notification.findMany({ where: { workspaceId: wid } });
    if (notifs.length === 0) {
        throw new Error("Notification not created!");
    }
    console.log(`✅ Notification created: ${notifs[0].message}`);
    // 2. Sprint Report Idempotency
    console.log("Triggering sprint report twice...");
    const sprint = await prisma.sprint.create({
        data: {
            name: 'Idempotency Test Sprint',
            startDate: new Date(Date.now() - 14 * 86400000), // 2 weeks ago
            endDate: new Date(Date.now() - 2 * 86400000), // Ended 2 days ago
            workspaceId: wid,
            status: 'completed'
        }
    });
    await sprintReportQueue.add('generate', {});
    await sprintReportQueue.add('generate', {});
    console.log("Waiting 3s for BullMQ sprint jobs...");
    await new Promise(r => setTimeout(r, 3000));
    const reports = await prisma.sprintReport.findMany({ where: { sprintId: sprint.id } });
    if (reports.length !== 1) {
        throw new Error(`Expected exactly 1 sprint report due to idempotency, got ${reports.length}`);
    }
    console.log(`✅ Sprint Report Idempotency verified. Generated 1 report.`);
    console.log("All tests passed!");
    process.exit(0);
}
runTests().catch(e => {
    console.error("Test Failed:");
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=background_test.js.map