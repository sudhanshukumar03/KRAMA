# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = r"\{dayBlocks\.map\(\(block\) => \([\s\S]*?\}\)\)\}"
replacement = """{dayBlocks.map((block) => (
                          <DroppableTimeBlock key={block.id} block={block} tasks={data.tasks || []} onClickTimeBlock={onClickTimeBlock} />
                        ))}"""

content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
