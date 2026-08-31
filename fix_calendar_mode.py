import re
with open('apps/web/src/components/planner/CalendarMode.tsx', 'r') as f:
    text = f.read()

text = re.sub(r'\(routine, idx\)', '(routine)', text)

with open('apps/web/src/components/planner/CalendarMode.tsx', 'w') as f:
    f.write(text)
