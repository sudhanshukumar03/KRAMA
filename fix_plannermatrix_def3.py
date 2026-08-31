# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("}: Props) {", "onAddMilestone,\n}: Props & { onAddMilestone?: () => void }) {")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
