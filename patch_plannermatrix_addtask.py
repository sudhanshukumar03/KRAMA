# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = r'<CategoryHeader icon={<CheckCircle2 size=\{13\} className="text-purple-500" />} label="Tasks" \n?subtitle="From Daily Schedule" onToggle=\{\(\) => handleToggle\("tasks"\)\} />'
replacement = '<CategoryHeader icon={<CheckCircle2 size={13} className="text-purple-500" />} label="Tasks" subtitle="From Daily Schedule" onToggle={() => handleToggle("tasks")} onAdd={onAddTask} />'
content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
