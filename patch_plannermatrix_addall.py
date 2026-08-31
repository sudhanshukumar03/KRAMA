# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern1 = r'<CategoryHeader icon={<Target size=\{13\} className="text-purple-500" />} label="Routines" \n?subtitle=\{\`\$\{data\.routines\.length\} routines\`\} onToggle=\{\(\) => handleToggle\("routines"\)\} />'
replacement1 = '<CategoryHeader icon={<Target size={13} className="text-purple-500" />} label="Routines" subtitle={`${data.routines.length} routines`} onToggle={() => handleToggle("routines")} onAdd={onAddRoutine} />'
content = re.sub(pattern1, replacement1, content)

pattern2 = r'<CategoryHeader icon={<Clock size=\{13\} className="text-slate-500 dark:text-slate-400" />} \n?label="Time Blocks" subtitle="Planned time" onToggle=\{\(\) => handleToggle\("timeBlocks"\)\} />'
replacement2 = '<CategoryHeader icon={<Clock size={13} className="text-slate-500 dark:text-slate-400" />} label="Time Blocks" subtitle="Planned time" onToggle={() => handleToggle("timeBlocks")} onAdd={onAddTimeBlock} />'
content = re.sub(pattern2, replacement2, content)


with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
