import re

# 1. space.controller.ts
with open('apps/server/src/controllers/space.controller.ts', 'r') as f:
    text = f.read()

text = re.sub(r"const workspaceId = req\.headers\['x-workspace-id'\];", "const workspaceId = req.headers['x-workspace-id'] as string;", text)
text = re.sub(r"req\.headers\['x-workspace-id'\]\s*\|\|\s*req\.query\.workspaceId", "(req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string)", text)

with open('apps/server/src/controllers/space.controller.ts', 'w') as f:
    f.write(text)

# 2. task.controller.ts
with open('apps/server/src/controllers/task.controller.ts', 'r') as f:
    text = f.read()

text = re.sub(r"const workspaceId = req\.headers\['x-workspace-id'\] as string \|\| req\.query\.workspaceId as string;", "const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);", text)
text = re.sub(r"const workspaceId = \(req\.headers\['x-workspace-id'\] as string\) \|\| \(req\.query\.workspaceId as string\);", "const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);", text)
text = re.sub(r"req\.headers\['x-workspace-id'\]\s*\|\|\s*req\.query\.workspaceId", "(req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string)", text)

text = re.sub(r"userId\n\s*\},", "authorId: userId\n      },", text)
text = re.sub(r"include:\s*\{\s*user:\s*\{\s*select", "include: {\n        author: { select", text)

with open('apps/server/src/controllers/task.controller.ts', 'w') as f:
    f.write(text)
