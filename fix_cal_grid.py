# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/CalendarMode.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    'className="grid grid-cols-7 gap-0 flex-1 overflow-y-auto hide-scrollbar border-l border-t border-slate-100"',
    'className="grid grid-cols-7 auto-rows-fr gap-0 flex-1 overflow-y-auto hide-scrollbar border-l border-t border-slate-100"'
)

content = content.replace(
    'className={lex flex-col min-h-[120px] p-2',
    'className={lex flex-col min-h-0 p-2'
)

with codecs.open('apps/web/src/components/planner/CalendarMode.tsx', 'w', 'utf-8') as f:
    f.write(content)
