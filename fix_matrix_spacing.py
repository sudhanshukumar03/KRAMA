# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('apps/web/src/components/planner/PlannerMatrix.tsx', 'r', 'utf-8') as f:
    content = f.read()

# DAY HEADERS padding
content = content.replace(
    '<div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] border-b border-border flex-shrink-0">',
    '<div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] border-b border-border flex-shrink-0 bg-slate-50/50">'
)
content = content.replace(
    'grid-cols-[160px_repeat(7,minmax(0,1fr))]',
    'grid-cols-[140px_repeat(7,minmax(0,1fr))]'
)

# Header padding
content = content.replace('p-3 flex flex-col justify-start pt-3', 'p-2 flex flex-col justify-start pt-2')
content = content.replace('p-2 flex flex-col justify-center', 'p-1.5 flex flex-col justify-center')

# CategoryHeader padding
content = content.replace('p-3 flex flex-col text-left', 'p-2 flex flex-col text-left')

# MatrixRow padding
content = content.replace('p-3 flex items-center text-left', 'p-2 flex items-center text-left')

# Text sizes
content = content.replace('text-[11px]', 'text-[10px]')
content = content.replace('text-[13px]', 'text-[12px]')
content = content.replace('min-h-[40px]', 'min-h-[36px]')
content = content.replace('min-h-[60px]', 'min-h-[40px]')

with codecs.open('apps/web/src/components/planner/PlannerMatrix.tsx', 'w', 'utf-8') as f:
    f.write(content)
