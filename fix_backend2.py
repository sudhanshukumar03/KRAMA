import os

with open('apps/server/src/controllers/automation.controller.ts', 'r') as f:
    text = f.read()

text = text.replace("const { id } = req.params;", "const id = req.params.id as string;")

with open('apps/server/src/controllers/automation.controller.ts', 'w') as f:
    f.write(text)

with open('apps/server/src/services/automation.service.ts', 'r') as f:
    text = f.read()

text = text.replace("type: 'SYSTEM',", "workspaceId,")

with open('apps/server/src/services/automation.service.ts', 'w') as f:
    f.write(text)
