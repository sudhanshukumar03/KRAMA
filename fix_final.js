const fs = require('fs');

// 1. space.controller.ts
let space = fs.readFileSync('apps/server/src/controllers/space.controller.ts', 'utf8');
space = space.replace(/const workspaceId = req\.headers\['x-workspace-id'\];/g, "const workspaceId = req.headers['x-workspace-id'] as string;");
fs.writeFileSync('apps/server/src/controllers/space.controller.ts', space);

// 2. task.controller.ts
let task = fs.readFileSync('apps/server/src/controllers/task.controller.ts', 'utf8');
task = task.replace(/const workspaceId = \(req\.headers\['x-workspace-id'\] as string\) \|\| \(req\.query\.workspaceId as string\);/g, "const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);");
// wait, the error is at line 152 and 158.
// Let's just cast them.
task = task.replace(/const workspaceId = req\.headers\['x-workspace-id'\]/g, "const workspaceId = req.headers['x-workspace-id'] as string");
task = task.replace(/const workspaceId = \(req\.headers\['x-workspace-id'\] as string\)/g, "const workspaceId = (req.headers['x-workspace-id'] as string)");

// Wait, let's fix user: { select: { name: true, image: true } } in task.controller.ts line 162
task = task.replace(/user: \{ select/g, "author: { select");

// Let's fix userId instead of uthorId on line 158
task = task.replace(/userId\n/g, "authorId: userId,\n");
// Wait, the body was:
/*
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: id,
        userId
      },
      include: {
*/
task = task.replace(/userId\n/g, "authorId: userId\n");

fs.writeFileSync('apps/server/src/controllers/task.controller.ts', task);
console.log('done');
