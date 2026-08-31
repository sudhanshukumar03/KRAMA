import re
with open('apps/server/src/controllers/task.controller.ts', 'r') as f:
    text = f.read()

# Add import at the top
import_statement = "import { evaluateEvent } from '../services/automation.service';\n"
if "automation.service" not in text:
    text = import_statement + text

# Inject after task is updated
injection = """      const task = await taskService.updateTask((req.params.id as string), workspaceId, data, req.user!.id);
      
      // Fire Automation Engine event in the background
      evaluateEvent(workspaceId, 'TASK_UPDATED', {
        taskId: task.id,
        status: task.status,
        priority: task.priority,
        userId: req.user!.id
      });
"""

text = text.replace("      const task = await taskService.updateTask((req.params.id as string), workspaceId, data, req.user!.id);", injection)

with open('apps/server/src/controllers/task.controller.ts', 'w') as f:
    f.write(text)
