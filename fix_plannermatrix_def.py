# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

old_def = """export function PlannerMatrix({
  data,
  days,
  occurrenceFor,
  onToggleRoutine,
  onAddBlock,
}: PlannerMatrixProps) {"""

new_def = """export function PlannerMatrix({
  data,
  days,
  occurrenceFor,
  onToggleRoutine,
  onAddBlock,
  onAddMilestone,
}: PlannerMatrixProps & { onAddMilestone?: () => void }) {"""

content = content.replace(old_def, new_def)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
