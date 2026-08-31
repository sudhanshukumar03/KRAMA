import re
with open('apps/server/src/repositories/task.repository.ts', 'r') as f:
    text = f.read()

target = "include: { project: { include: { goal: true } }, sprint: true, blockedBy: true, childTasks: true },"
replacement = "include: { project: { include: { goal: true } }, sprint: true, blockedBy: true, childTasks: true, comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, image: true } } } } },"
if 'comments: {' not in target:
    text = text.replace(target, replacement)

with open('apps/server/src/repositories/task.repository.ts', 'w') as f:
    f.write(text)
