# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Replace `}: PlannerMatrixProps) {` with `onAddMilestone, }: PlannerMatrixProps & { onAddMilestone?: () => void }) {`
content = content.replace("}: PlannerMatrixProps) {", "onAddMilestone,\n}: PlannerMatrixProps & { onAddMilestone?: () => void }) {")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
