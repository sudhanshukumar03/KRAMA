-- 1. Add the column as nullable first
ALTER TABLE "TimeBlock" ADD COLUMN "workspaceId" TEXT;

-- 2. Backfill Source A: If tied to a Task, inherit the Task's workspace
UPDATE "TimeBlock" tb
SET "workspaceId" = t."workspaceId"
FROM "Task" t
WHERE tb."taskId" = t.id AND tb."workspaceId" IS NULL;

-- 3. Backfill Source B: If tied directly to a Project, inherit the Project's workspace
UPDATE "TimeBlock" tb
SET "workspaceId" = p."workspaceId"
FROM "Project" p
WHERE tb."projectId" = p.id AND tb."workspaceId" IS NULL;

-- 4. Backfill Source C (Fallback): For the 5 purely personal rows with no structural ties
UPDATE "TimeBlock" tb
SET "workspaceId" = (
  SELECT wm."workspaceId" 
  FROM "WorkspaceMember" wm 
  WHERE wm."userId" = tb."userId" 
  ORDER BY wm."createdAt" ASC 
  LIMIT 1
)
WHERE tb."workspaceId" IS NULL;

-- 5. Enforce the NOT NULL constraint 
ALTER TABLE "TimeBlock" ALTER COLUMN "workspaceId" SET NOT NULL;

-- 6. Enforce the relational foreign key (RESTRICT by default, blocking Workspace hard-deletes)
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_workspaceId_fkey" 
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE;
