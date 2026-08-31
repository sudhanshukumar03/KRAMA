import re

with open('apps/web/src/components/planner/PlannerPage.tsx', 'r') as f:
    code = f.read()

code = code.replace('\
', '\n')

with open('apps/web/src/components/planner/PlannerPage.tsx', 'w') as f:
    f.write(code)
