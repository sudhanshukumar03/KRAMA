import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = re.sub(
    r'defaultDate={selectedDay}\r?\n\s*isSubmitting={createTimeBlockMutation.isPending}',
    'defaultDate={selectedDay}\n        isSubmitting={createTimeBlockMutation.isPending}\n        tasks={data.tasks}\n        projects={data.projects}',
    content
)

content = re.sub(
    r'defaultDate={new Date\(editingTask\.date\)}\r?\n\s*isSubmitting={updateTaskMutation\.isPending}',
    'defaultDate={new Date(editingTask.date)}\n        isSubmitting={updateTaskMutation.isPending}\n        tasks={data.tasks}\n        projects={data.projects}',
    content
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
