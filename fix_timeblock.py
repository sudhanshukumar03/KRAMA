import re
with open('apps/web/src/components/planner/TimeBlockModal.tsx', 'r') as f:
    text = f.read()

text = re.sub(r'export interface CreateTimeBlockInput \{[\s\S]*?\}', '', text)

with open('apps/web/src/components/planner/TimeBlockModal.tsx', 'w') as f:
    f.write(text)
