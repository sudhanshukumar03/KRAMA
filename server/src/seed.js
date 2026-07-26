import { prisma } from './prisma';
async function main() {
    console.log('🌱 Starting Krama OS Database Seeding...');
    // Clean existing records in reverse dependency order
    await prisma.goalProgressSnapshot.deleteMany();
    await prisma.dailyLog.deleteMany();
    await prisma.habit.deleteMany();
    await prisma.issue.deleteMany();
    await prisma.roadmapItem.deleteMany();
    await prisma.sprint.deleteMany();
    await prisma.page.deleteMany();
    await prisma.project.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.space.deleteMany();
    await prisma.workspace.deleteMany();
    console.log('🧹 Cleared old records.');
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    const past2Weeks = new Date(today);
    past2Weeks.setDate(today.getDate() - 14);
    // 1. Workspace
    const workspace = await prisma.workspace.create({
        data: {
            name: 'Personal Engineering OS',
        }
    });
    // 2. Spaces
    const kbSpace = await prisma.space.create({
        data: {
            name: 'Knowledge Base',
            workspaceId: workspace.id,
        }
    });
    const projSpace = await prisma.space.create({
        data: {
            name: 'Engineering & Execution',
            workspaceId: workspace.id,
        }
    });
    // 3. Goals
    const okrGoal = await prisma.goal.create({
        data: {
            title: 'Q3 OKR: Ship Krama OS Distributed Engine & Bridge Layer',
            type: 'quarterly',
            progress: 65,
            targetDate: nextMonth,
            snapshots: {
                create: [
                    { progress: 20, date: past2Weeks },
                    { progress: 45, date: new Date(today.getTime() - 7 * 86400000) },
                    { progress: 65, date: today },
                ]
            }
        }
    });
    const aiGoal = await prisma.goal.create({
        data: {
            title: 'Master Autonomous Agentic Coding Architecture',
            type: 'yearly',
            progress: 40,
            targetDate: new Date('2026-12-31'),
        }
    });
    // 4. Projects
    const kramaProject = await prisma.project.create({
        data: {
            name: 'KRAMA OS Core Engine',
            problemStatement: 'Engineers need strategic objectives linked directly to daily execution workflows without context switching.',
            status: 'active',
            spaceId: projSpace.id,
            goalId: okrGoal.id,
        }
    });
    await prisma.project.create({
        data: {
            name: 'Agentic Research & Bridge Patterns',
            problemStatement: 'Exploring AST analysis, self-referencing dependency graphs, and token-efficient execution loops.',
            status: 'active',
            spaceId: kbSpace.id,
            goalId: aiGoal.id,
        }
    });
    // 5. Sprints & Roadmap Items
    const sprint12 = await prisma.sprint.create({
        data: {
            name: 'Sprint 12: Backend Foundation & API Wiring',
            startDate: past2Weeks,
            endDate: nextWeek,
            projectId: kramaProject.id,
        }
    });
    await prisma.roadmapItem.createMany({
        data: [
            {
                title: 'Phase 3: Relational PostgreSQL Engine',
                version: 'v0.3.0',
                order: 1,
                status: 'completed',
                projectId: kramaProject.id,
            },
            {
                title: 'Phase 4: Frontend API Synchronization & Real-time Rollup',
                version: 'v0.4.0',
                order: 2,
                status: 'in_progress',
                projectId: kramaProject.id,
            },
            {
                title: 'Phase 5: Distributed Habit Intelligence Engine',
                version: 'v0.5.0',
                order: 3,
                status: 'planned',
                projectId: kramaProject.id,
            }
        ]
    });
    // 6. Pages & Docs (with Tiptap JSON blocks)
    await prisma.page.create({
        data: {
            title: 'Krama OS Master Architectural Specification',
            icon: 'brain',
            spaceId: kbSpace.id,
            linkedProjectId: kramaProject.id,
            tags: ['architecture', 'spec', 'database'],
            blocks: {
                type: 'doc',
                content: [
                    {
                        type: 'heading',
                        attrs: { level: 1 },
                        content: [{ type: 'text', text: 'Krama OS Distributed Engineering Architecture' }]
                    },
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Krama OS connects strategic high-level OKRs directly to daily execution sprints and habits via a self-referencing relational graph in PostgreSQL.' }]
                    },
                    {
                        type: 'heading',
                        attrs: { level: 2 },
                        content: [{ type: 'text', text: 'Key Technical Decisions' }]
                    },
                    {
                        type: 'bulletList',
                        content: [
                            {
                                type: 'listItem',
                                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Distributed Habit Tracking: Habits are rolled up inside strategic goals rather than siloed.' }] }]
                            },
                            {
                                type: 'listItem',
                                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Token-Based UI: Single bounded tabular layouts with hairline internal dividers.' }] }]
                            }
                        ]
                    }
                ]
            }
        }
    });
    // 7. Issues (with self-referencing blockedBy dependency graph!)
    const issue1 = await prisma.issue.create({
        data: {
            title: 'Design Prisma Schema with blockedBy/blocking self-reference',
            description: 'Implement many-to-many join tables for issue dependencies.',
            status: 'done',
            priority: 'high',
            estimate: 3,
            assignee: 'sksin',
            projectId: kramaProject.id,
            sprintId: sprint12.id,
            labels: ['backend', 'database'],
            completedAt: today,
        }
    });
    const issue2 = await prisma.issue.create({
        data: {
            title: 'Wire Frontend Kanban Board to Live PostgreSQL API',
            description: 'Replace in-memory mock client with fetchApi wrapper and React Query synchronization.',
            status: 'in_progress',
            priority: 'urgent',
            estimate: 5,
            assignee: 'sksin',
            projectId: kramaProject.id,
            sprintId: sprint12.id,
            labels: ['api', 'frontend', 'bridge'],
            dueDate: nextWeek,
            blockedBy: {
                connect: [{ id: issue1.id }]
            },
            childIssues: {
                create: [
                    {
                        title: 'Configure Vite proxy to localhost:3001',
                        status: 'done',
                        priority: 'medium',
                        projectId: kramaProject.id,
                        sprintId: sprint12.id,
                    },
                    {
                        title: 'Implement universal fetchApi wrapper with auto-login',
                        status: 'done',
                        priority: 'high',
                        projectId: kramaProject.id,
                        sprintId: sprint12.id,
                    },
                    {
                        title: 'Test Kanban drag-and-drop against live DB',
                        status: 'todo',
                        priority: 'high',
                        projectId: kramaProject.id,
                        sprintId: sprint12.id,
                    }
                ]
            }
        }
    });
    await prisma.issue.create({
        data: {
            title: 'Implement Habit Card streak increment mutation in UI',
            description: 'Connect check-off button to POST /api/v1/habits/:id/complete endpoint.',
            status: 'todo',
            priority: 'normal',
            estimate: 2,
            assignee: 'sksin',
            projectId: kramaProject.id,
            sprintId: sprint12.id,
            labels: ['habits', 'ui'],
            blockedBy: {
                connect: [{ id: issue2.id }]
            }
        }
    });
    // 8. Distributed Habits
    await prisma.habit.createMany({
        data: [
            {
                name: '90-Minute Morning Deep Work Architecture Block',
                cadence: 'daily',
                category: 'Deep Work',
                timeOfDay: 'morning',
                difficulty: 'Hard',
                duration: 90,
                streak: 14,
                linkedGoalId: okrGoal.id,
            },
            {
                name: 'Daily Engineering System Review & Log',
                cadence: 'daily',
                category: 'Review',
                timeOfDay: 'evening',
                difficulty: 'Medium',
                duration: 15,
                streak: 21,
                linkedGoalId: okrGoal.id,
            },
            {
                name: 'Read 20 mins of Distributed Systems & Database Architecture Papers',
                cadence: 'daily',
                category: 'Learning',
                timeOfDay: 'anytime',
                difficulty: 'Easy',
                duration: 20,
                streak: 5,
                linkedGoalId: aiGoal.id,
            }
        ]
    });
    // 9. Daily Log
    await prisma.dailyLog.create({
        data: {
            date: today,
            wins: ['Successfully wired React frontend to Express + PostgreSQL backend', 'Executed zero-error pre-flight system audit across client and server'],
            blockers: ['None — all systems operational'],
            mood: 'Focused & Energized',
            energy: 'High',
            deepWorkMinutes: 210,
            notes: 'Phase 4 API wiring completed cleanly. Data synchronization verified.'
        }
    });
    console.log('✅ Seeding completed successfully! Krama OS database is ready.');
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map