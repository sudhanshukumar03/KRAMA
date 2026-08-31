# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/CapacitySummary.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('p-4 flex flex-col gap-2', 'p-3 flex flex-col gap-1.5')
content = content.replace('size={16}', 'size={14}')
content = content.replace('text-2xl', 'text-xl')
content = content.replace('text-[11px]', 'text-[10px]')
content = content.replace('text-[13px]', 'text-[11px]')
content = content.replace('text-sm', 'text-xs')
content = content.replace('h-1.5', 'h-1')

with codecs.open('apps/web/src/components/planner/CapacitySummary.tsx', 'w', 'utf-8') as f:
    f.write(content)
