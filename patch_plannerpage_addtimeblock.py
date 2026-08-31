# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = r'const handleAddTimeBlock = \(day: Date\) => \{'
replacement = 'const handleAddTimeBlock = (day?: Date) => {'
content = re.sub(pattern, replacement, content)

pattern2 = r'setSelectedDay\(day\);'
replacement2 = 'setSelectedDay(day || new Date());'
content = re.sub(pattern2, replacement2, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
