import re
with open('apps/web/src/components/planner/PlannerPage.tsx', 'r') as f:
    text = f.read()

text = text.replace('const handleAddTimeBlock = (day: Date) => {', 'const handleAddTimeBlock = (day?: Date) => {')
text = text.replace('const handleAddTask = (day: Date) => {', 'const handleAddTask = (day?: Date) => {')
text = text.replace('const handleAddRoutine = (_day: Date) => {', 'const handleAddRoutine = (_day?: Date) => {')

with open('apps/web/src/components/planner/PlannerPage.tsx', 'w') as f:
    f.write(text)
