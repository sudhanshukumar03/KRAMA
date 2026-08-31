# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

old_str = "onClickTimeBlock\nonAddMilestone,"
new_str = "onClickTimeBlock,\nonAddMilestone,"
content = content.replace(old_str, new_str)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
