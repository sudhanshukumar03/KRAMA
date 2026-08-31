# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('apps/web/src/components/planner/PlannerMatrix.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Make the grid headers pure white instead of slate-50/50
content = content.replace(
    '<div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] border-b border-border flex-shrink-0 bg-slate-50/50">',
    '<div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] border-b border-border flex-shrink-0 bg-white">'
)

# Remove the gray background from today header
content = content.replace(
    'isToday ? "bg-blue-50/30" : ""',
    'isToday ? "bg-transparent" : ""'
)

# Make legend white instead of slate-50/50
content = content.replace(
    '<div className="flex-shrink-0 border-t border-border bg-slate-50/50 p-1.5 flex flex-col items-center justify-center gap-1.5">',
    '<div className="flex-shrink-0 border-t border-border bg-white pt-4 pb-12 flex flex-col items-center justify-center gap-3">'
)
content = content.replace(
    '<div className="flex items-center justify-center gap-4 flex-wrap text-[9px] font-bold uppercase tracking-wider text-slate-500">',
    '<div className="flex items-center justify-center gap-6 flex-wrap text-[10px] font-bold text-slate-500">'
)

with codecs.open('apps/web/src/components/planner/PlannerMatrix.tsx', 'w', 'utf-8') as f:
    f.write(content)
