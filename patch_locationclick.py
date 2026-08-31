# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerHeader.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(' onClick={onLocationClick}>', '>')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
