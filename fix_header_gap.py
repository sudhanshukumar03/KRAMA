# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/PlannerHeader.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('<div className="flex flex-col gap-6">', '<div className="flex flex-col gap-4">')

with codecs.open('apps/web/src/components/planner/PlannerHeader.tsx', 'w', 'utf-8') as f:
    f.write(content)
