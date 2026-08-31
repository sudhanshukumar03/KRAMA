import re
with open('apps/server/src/repositories/task.repository.ts', 'r') as f:
    text = f.read()

target1 = "include: { project: { include: { goal: true } }, sprint: true, childTasks: true, blockedBy: true }"
replacement1 = "include: { project: { include: { goal: true } }, sprint: true, childTasks: true, blockedBy: true, comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, image: true } } } } }"
if 'comments:' not in text:
    text = text.replace(target1, replacement1)

target2 = "return (tx || prisma).task.findMany({"
replacement2 = "return (tx || prisma).task.findMany({"

# findManyByWorkspace does:
# return (tx || prisma).task.findMany({
#   where,
#   include: { project: true, sprint: true, labels: { include: { label: true } }, blockedBy: true, blocking: true },
#   orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }]
# });

with open('apps/server/src/repositories/task.repository.ts', 'w') as f:
    f.write(text)
