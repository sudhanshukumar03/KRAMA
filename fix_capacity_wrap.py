# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/CapacitySummary.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    '<a href="#" className="text-[10px] font-bold text-blue-500 hover:underline">Edit Capacity</a>',
    '<a href="#" className="text-[10px] font-bold text-blue-500 hover:underline whitespace-nowrap">Edit</a>'
)

with codecs.open('apps/web/src/components/planner/CapacitySummary.tsx', 'w', 'utf-8') as f:
    f.write(content)
