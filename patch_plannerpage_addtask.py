# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = r'const handleAddTask = \(day: Date\) => \{'
replacement = 'const handleAddTask = (day?: Date) => {'
content = re.sub(pattern, replacement, content)

pattern2 = r'setCaptureDate\(day\);'
replacement2 = 'setCaptureDate(day || new Date());'
content = re.sub(pattern2, replacement2, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
